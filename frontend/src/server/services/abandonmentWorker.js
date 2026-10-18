import { supabase } from '../config/supabase.js';
import { NotificationService } from './notificationService.js';
import { getStoreSettings } from '../controllers/settingsController.js';

export class AbandonmentWorker {
  static isRunning = false;

  static startWorker(intervalMs = 60000) {
    console.log('⏰ [AbandonmentWorker] Background draft abandonment worker started.');
    setInterval(() => this.checkAbandonedDrafts(), intervalMs);
  }

  static async checkAbandonedDrafts() {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      console.log(`🔍 [AbandonmentWorker] Scanning for abandoned draft orders inactive since ${fifteenMinutesAgo}...`);

      if (supabase) {
        const { data: drafts, error } = await supabase
          .from('orders')
          .select('*')
          .eq('status', 'Draft')
          .is('reminder_sent_at', null)
          .lt('last_activity_at', fifteenMinutesAgo);

        if (error) {
          console.error('Error scanning abandoned drafts:', error);
        } else if (drafts && drafts.length > 0) {
          console.log(`💡 Found ${drafts.length} abandoned drafts eligible for reminders.`);
          for (const draft of drafts) {
            await this.processDraftReminder(draft);
          }
        }
      }
    } catch (err) {
      console.error('Error in AbandonmentWorker execution:', err);
    } finally {
      this.isRunning = false;
    }
  }

  static async resolveStoreName(storeId) {
    if (storeId && supabase) {
      try {
        const { data: store } = await supabase.from('stores').select('name').eq('id', storeId).single();
        if (store?.name) return store.name;
      } catch (e) { /* ignore */ }
      try {
        const { data: owner } = await supabase.from('users').select('store_name').eq('store_id', storeId).eq('role', 'owner').limit(1).maybeSingle();
        if (owner?.store_name) return owner.store_name;
      } catch (e) { /* ignore */ }
    }
    return process.env.SENDER_NAME || 'Our Store';
  }

  static async resolveConfirmationMedia(draft, storeId = null) {
    try {
      if (storeId) {
        const storeSettings = getStoreSettings(storeId);
        if (storeSettings && storeSettings.include_confirmation_media === false) {
          return null;
        }
      }

      let productId = null;
      if (draft.items && draft.items.length > 0 && draft.items[0].product_id) {
        productId = draft.items[0].product_id;
      }

      if (!productId && draft.form_embed_key && supabase) {
        const { data: form } = await supabase
          .from('forms')
          .select('linked_product_id')
          .eq('embed_key', draft.form_embed_key)
          .maybeSingle();
        if (form?.linked_product_id) {
          productId = form.linked_product_id;
        }
      }

      if (!supabase) return null;

      let query = supabase.from('products').select('id, name, images');
      const isUUID = (str) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str);
      if (productId && isUUID(productId)) {
        query = query.eq('id', productId);
      } else if (draft.items && draft.items[0] && draft.items[0].name) {
        const rawName = draft.items[0].name.split('—')[0].trim();
        query = query.ilike('name', `%${rawName}%`);
      } else {
        return null;
      }

      if (storeId && isUUID(storeId)) {
        query = query.eq('store_id', storeId);
      }

      const { data: prods, error } = await query.limit(1);
      if (!error && prods && prods.length > 0) {
        const prod = prods[0];
        if (Array.isArray(prod.images) && prod.images.length > 0) {
          const conf = prod.images.find(img => img && typeof img === 'object' && img.is_confirmation);
          if (conf && conf.url && typeof conf.url === 'string' && conf.url.trim().startsWith('http')) {
            const u = conf.url.trim();
            return {
              url: u,
              type: conf.type || (/\.(mp4|mov|webm)(\?.*)?$/i.test(u) ? 'video' : 'image')
            };
          }
        }
      }
    } catch (err) {
      console.warn('⚠️ [AbandonmentWorker] Could not resolve confirmation media:', err.message);
    }
    return null;
  }

  static async processDraftReminder(draft) {
    const storeName = await this.resolveStoreName(draft.store_id);
    return await this.sendDraftReminder(draft, storeName);
  }

  /**
   * Dispatches recovery notification via Brevo Email (if available) and SMS/WhatsApp
   */
  static async sendDraftReminder(draft, storeName = null) {
    if (!draft) return { success: false, error: 'No draft provided' };
    if (!draft.customer_phone && !draft.customer_email) {
      return { success: false, error: 'Neither customer phone nor email available' };
    }

    const resolvedStore = storeName || await this.resolveStoreName(draft.store_id);
    const baseUrl = process.env.APP_URL || 'https://crm.olistores.com.ng';
    const confirmationMedia = await this.resolveConfirmationMedia(draft, draft.store_id);

    // Attach form parameter if known so form can immediately load
    let formParam = '';
    if (draft.form_embed_key) {
      formParam = `&form=${encodeURIComponent(draft.form_embed_key)}`;
    } else if (draft.confirmation_call_notes) {
      try {
        const meta = typeof draft.confirmation_call_notes === 'string' ? JSON.parse(draft.confirmation_call_notes) : draft.confirmation_call_notes;
        if (meta?.form_embed_key) {
          formParam = `&form=${encodeURIComponent(meta.form_embed_key)}`;
        }
      } catch (e) {}
    }

    const resumeLink = `${baseUrl.replace(/\/+$/, '')}/checkout?resume=${encodeURIComponent(draft.resume_token || draft.id)}${formParam}`;
    const productName = (draft.items && draft.items[0]?.name) || 'your selected item';
    const customerName = draft.customer_name || 'Valued Customer';
    const totalFormatted = (draft.total_amount || 0).toLocaleString();

    let emailSent = false;
    let smsSent = false;

    // Optional confirmation media (image or video) html block for recovery email
    let mediaRecoveryHtml = '';
    if (confirmationMedia && confirmationMedia.url && typeof confirmationMedia.url === 'string' && confirmationMedia.url.trim().startsWith('http')) {
      const mediaUrl = confirmationMedia.url.trim();
      const isVideo = confirmationMedia.type === 'video' || /\.(mp4|mov|webm)(\?.*)?$/i.test(mediaUrl);

      if (isVideo) {
        mediaRecoveryHtml = `
          <div style="background-color: #0f172a; border: 1px solid #334155; border-radius: 10px; padding: 18px 14px; margin: 18px 0; text-align: center;">
            <div style="font-size: 12px; font-weight: bold; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">🎥 Reserved Item Demonstration</div>
            <a href="${mediaUrl}" target="_blank" style="display: inline-block; background-color: #ef4444; color: #ffffff; text-decoration: none; padding: 11px 22px; border-radius: 6px; font-weight: bold; font-size: 13px; box-shadow: 0 4px 10px rgba(239, 68, 68, 0.35);">
              ▶ Watch Demonstration Video
            </a>
            <p style="margin: 8px 0 0 0; font-size: 11px; color: #94a3b8;">See how your reserved item works before completing your order.</p>
          </div>
        `;
      } else {
        mediaRecoveryHtml = `
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin: 18px 0; text-align: center;">
            <div style="font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">📸 Your Reserved Item</div>
            <img src="${mediaUrl}" alt="${productName}" style="max-width: 100%; max-height: 240px; object-fit: contain; border-radius: 6px; border: 1px solid #cbd5e1; display: inline-block;" />
          </div>
        `;
      }
    }

    // ── 1. Brevo Email Recovery ──
    if (draft.customer_email && draft.customer_email.trim().includes('@')) {
      const emailSubject = `⚠️ Did network interrupt your order, ${customerName}? [${productName} Reserved]`;
      const emailText = `Hi ${customerName}, we noticed you didn't get to finish your order for ${productName}! We have temporarily reserved your package with Payment on Delivery (COD). Complete your delivery details here: ${resumeLink}`;
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; color: #1e293b;">
          <div style="background-color: #4f46e5; padding: 18px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
            <h2 style="color: #ffffff; margin: 0; font-size: 20px;">📦 Your Order Has Been Safely Saved!</h2>
            <p style="color: #e0e7ff; margin: 6px 0 0 0; font-size: 13px;">A unit of <strong>${productName}</strong> is reserved at <strong>${resolvedStore}</strong></p>
          </div>

          <p style="font-size: 14px; color: #334155; line-height: 1.6;">Hello <strong>${customerName}</strong>,</p>
          <p style="font-size: 14px; color: #334155; line-height: 1.6;">We noticed you didn't get to finish placing your order for <strong>${productName}</strong>. To make sure you don't miss out on promo stock, we have temporarily held a reserved unit for you with <strong>Payment on Delivery (COD)</strong>.</p>

          ${mediaRecoveryHtml}

          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%; font-size: 13px;">
              <tr><td style="color: #64748b; padding: 4px 0;">Reserved Item:</td><td style="font-weight: bold; color: #0f172a; text-align: right;">${productName}</td></tr>
              ${draft.total_amount ? `<tr><td style="color: #64748b; padding: 4px 0;">Total (Pay on Delivery):</td><td style="font-weight: bold; color: #059669; text-align: right;">₦${totalFormatted}</td></tr>` : ''}
              <tr><td style="color: #64748b; padding: 4px 0;">Payment Terms:</td><td style="color: #059669; font-weight: 600; text-align: right;">Pay on Delivery (Inspect First)</td></tr>
              <tr><td style="color: #64748b; padding: 4px 0;">Dispatch Method:</td><td style="color: #475569; text-align: right;">Fast Doorstep Courier Delivery</td></tr>
            </table>
          </div>

          <!-- Trust Badges Strip -->
          <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 12px; margin-bottom: 20px; text-align: center;">
            <div style="font-size: 12px; color: #065f46; font-weight: 600; line-height: 1.6;">
              🚚 Fast Doorstep Delivery &nbsp;•&nbsp; 💵 Pay on Delivery &nbsp;•&nbsp; 🛡️ 100% Genuine Guaranteed
            </div>
          </div>

          <div style="text-align: center; margin: 26px 0;">
            <a href="${resumeLink}" style="background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 14px 34px; border-radius: 8px; font-size: 15px; font-weight: bold; display: inline-block; box-shadow: 0 4px 8px -1px rgba(79, 70, 229, 0.35);">
              Confirm My Delivery Address &rarr;
            </a>
          </div>

          <p style="font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.5;">Or copy and paste this link into your browser:<br/><a href="${resumeLink}" style="color: #4f46e5; word-break: break-all;">${resumeLink}</a></p>
          <p style="font-size: 12px; color: #64748b; text-align: center; margin-top: 18px;">Have questions? Feel free to reply directly to this email or contact <strong>${resolvedStore}</strong>.</p>
          <p style="font-size: 11px; color: #cbd5e1; text-align: center; margin-top: 20px; border-top: 1px solid #f1f5f9; padding-top: 12px;">&copy; ${new Date().getFullYear()} ${resolvedStore}. All rights reserved.</p>
        </div>
      `;

      try {
        const emailRes = await NotificationService.sendEmail(
          draft.customer_email.trim(),
          emailSubject,
          emailText,
          emailHtml,
          resolvedStore
        );
        emailSent = emailRes?.success || false;
        console.log(`📧 Draft reminder email sent to ${draft.customer_email}:`, emailRes?.provider);
      } catch (err) {
        console.error(`Failed to send recovery email to ${draft.customer_email}:`, err);
      }
    }

    // ── 2. SMS Recovery ──
    if (draft.customer_phone) {
      try {
        await NotificationService.send({
          templateName: 'draft_reminder',
          recipient: draft.customer_phone,
          channel: 'sms',
          variables: {
            customer_name: customerName,
            product_name: productName,
            resume_link: resumeLink
          }
        });
        smsSent = true;
      } catch (err) {
        console.error(`Failed to send recovery SMS to ${draft.customer_phone}:`, err);
      }
    }

    // ── 3. WhatsApp Recovery (opt-in in store settings, OFF by default) ──
    let whatsappSent = false;
    const storeSettings = getStoreSettings(draft.store_id);
    if (storeSettings?.reminder_whatsapp && draft.customer_phone) {
      try {
        await NotificationService.send({
          templateName: 'draft_reminder_whatsapp',
          recipient: draft.customer_phone,
          channel: 'whatsapp',
          variables: {
            customer_name: customerName,
            product_name: productName,
            resume_link: resumeLink
          },
          storeId: draft.store_id,
          mediaOptions: confirmationMedia
        });
        whatsappSent = true;
      } catch (err) {
        console.error(`Failed to send recovery WhatsApp to ${draft.customer_phone}:`, err);
      }
    }

    // ── 4. Update Database Stamp ──
    const nowIso = new Date().toISOString();
    if (supabase) {
      await supabase
        .from('orders')
        .update({ reminder_sent_at: nowIso })
        .eq('id', draft.id);
    }
    draft.reminder_sent_at = nowIso;

    console.log(`✅ Sent draft abandonment reminder (Email: ${emailSent}, SMS: ${smsSent}, WhatsApp: ${whatsappSent}) for Draft #${draft.order_number || draft.id}`);
    return { success: true, emailSent, smsSent, whatsappSent, reminder_sent_at: nowIso };
  }
}

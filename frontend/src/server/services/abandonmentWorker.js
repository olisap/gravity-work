import { supabase } from '../config/supabase.js';
import { NotificationService } from './notificationService.js';

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

  static async processDraftReminder(draft) {
    const storeName = await this.resolveStoreName(draft.store_id);
    return await this.sendDraftReminder(draft, storeName);
  }

  /**
   * Dispatches recovery notification via Brevo Email (if available) and SMS
   */
  static async sendDraftReminder(draft, storeName = null) {
    if (!draft) return { success: false, error: 'No draft provided' };
    if (!draft.customer_phone && !draft.customer_email) {
      return { success: false, error: 'Neither customer phone nor email available' };
    }

    const resolvedStore = storeName || await this.resolveStoreName(draft.store_id);
    const baseUrl = process.env.APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://app.olistores.com.ng');
    const resumeLink = `${baseUrl.replace(/\/+$/, '')}/checkout?resume=${encodeURIComponent(draft.resume_token || draft.id)}`;
    const productName = (draft.items && draft.items[0]?.name) || 'your selected item';
    const customerName = draft.customer_name || 'Valued Customer';
    const totalFormatted = (draft.total_amount || 0).toLocaleString();

    let emailSent = false;
    let smsSent = false;

    // ── 1. Brevo Email Recovery ──
    if (draft.customer_email && draft.customer_email.trim().includes('@')) {
      const emailSubject = `🛒 Incomplete Order: Complete your purchase at ${resolvedStore}`;
      const emailText = `Hi ${customerName}, you left your order for ${productName} incomplete! Complete your order here: ${resumeLink}`;
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; color: #1e293b;">
          <div style="background-color: #f59e0b; padding: 18px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
            <h2 style="color: #ffffff; margin: 0; font-size: 20px;">⚠️ You Left Items in Your Cart!</h2>
            <p style="color: #fef3c7; margin: 6px 0 0 0; font-size: 13px;">Your order at <strong>${resolvedStore}</strong> is waiting for you</p>
          </div>

          <p style="font-size: 14px; color: #334155; line-height: 1.6;">Hello <strong>${customerName}</strong>,</p>
          <p style="font-size: 14px; color: #334155; line-height: 1.6;">We noticed you started placing an order for <strong>${productName}</strong>, but didn't finish. We've reserved your item so you don't lose out on stock!</p>

          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%; font-size: 13px;">
              <tr><td style="color: #64748b; padding: 4px 0;">Item:</td><td style="font-weight: bold; color: #0f172a; text-align: right;">${productName}</td></tr>
              ${draft.total_amount ? `<tr><td style="color: #64748b; padding: 4px 0;">Total (Pay on Delivery):</td><td style="font-weight: bold; color: #059669; text-align: right;">₦${totalFormatted}</td></tr>` : ''}
              <tr><td style="color: #64748b; padding: 4px 0;">Delivery Terms:</td><td style="color: #475569; text-align: right;">Payment on Delivery (COD)</td></tr>
            </table>
          </div>

          <div style="text-align: center; margin: 28px 0;">
            <a href="${resumeLink}" style="background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.3);">
              Complete My Order Now &rarr;
            </a>
          </div>

          <p style="font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.5;">Or copy and paste this link into your browser:<br/><a href="${resumeLink}" style="color: #4f46e5; word-break: break-all;">${resumeLink}</a></p>
          <p style="font-size: 11px; color: #cbd5e1; text-align: center; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 12px;">&copy; ${new Date().getFullYear()} ${resolvedStore}. All rights reserved.</p>
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

    // ── 3. Update Database Stamp ──
    const nowIso = new Date().toISOString();
    if (supabase) {
      await supabase
        .from('orders')
        .update({ reminder_sent_at: nowIso })
        .eq('id', draft.id);
    }
    draft.reminder_sent_at = nowIso;

    console.log(`✅ Sent draft abandonment reminder (Email: ${emailSent}, SMS: ${smsSent}) for Draft #${draft.order_number || draft.id}`);
    return { success: true, emailSent, smsSent, reminder_sent_at: nowIso };
  }
}

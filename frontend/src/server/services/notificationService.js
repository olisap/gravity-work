import { supabase } from '../config/supabase.js';
import nodemailer from 'nodemailer';

export class NotificationService {
  /**
   * Send notification via SMS or Email
   */
  static async send({ templateName, recipient, channel = 'sms', variables = {} }) {
    console.log(`💬 [NotificationService] Queued ${channel.toUpperCase()} to ${recipient} (Template: ${templateName})`);

    // Compile template string
    let messageBody = this.compileTemplate(templateName, variables);

    // Track in notification logs
    const logEntry = {
      template_name: templateName,
      recipient,
      channel,
      status: 'sent',
      payload: { variables, body: messageBody },
      created_at: new Date().toISOString()
    };

    if (supabase) {
      await supabase.from('notification_logs').insert([logEntry]);
    }

    if (channel === 'sms') {
      return await this.sendSMS(recipient, messageBody);
    } else {
      return await this.sendEmail(recipient, variables.subject || 'Order Update', messageBody);
    }
  }

  /**
   * Helper to format templates with {{variable}} substitution
   */
  static compileTemplate(templateName, variables) {
    const defaultTemplates = {
      draft_reminder: 'Hi {{customer_name}}, you left your order for {{product_name}} incomplete! Complete your delivery order here: {{resume_link}}',
      order_confirmed_receipt: 'Hi {{customer_name}}, your order {{order_number}} for {{product_name}} has been confirmed for delivery. Total: ₦{{total_amount}} COD.',
      order_delivered_receipt: 'Thank you {{customer_name}}! Order {{order_number}} has been delivered. Amount paid: ₦{{total_amount}}. Enjoy your purchase!',
      post_delivery_upsell: 'Hi {{customer_name}}, how are you enjoying your product? Get 20% off {{offer_product_name}} today! Order here: {{offer_link}}'
    };

    let text = defaultTemplates[templateName] || 'Notification from CRM: {{order_number}}';
    Object.keys(variables).forEach(key => {
      text = text.replace(new RegExp(`{{${key}}}`, 'g'), variables[key] || '');
    });
    return text;
  }

  /**
   * Termii SMS Adapter with sandbox fallback
   */
  static async sendSMS(phone, text) {
    const apiKey = process.env.TERMII_API_KEY;
    const cleanPhone = phone ? phone.replace(/\s+/g, '').replace('+', '') : '';
    if (apiKey && apiKey !== 'your-termii-api-key') {
      try {
        const response = await fetch('https://api.ng.termii.com/api/sms/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: cleanPhone,
            from: process.env.TERMII_SENDER_ID || 'N-ALERT',
            sms: text,
            type: 'plain',
            channel: 'generic',
            api_key: apiKey
          })
        });
        const resData = await response.json();
        console.log(`📱 Termii SMS API Response (${cleanPhone}):`, resData);
        return { success: true, provider: 'Termii', response: resData };
      } catch (err) {
        console.error(`Failed to send SMS to ${phone} via Termii:`, err);
      }
    }

    console.log(`📱 [SMS Sandbox Mode] To: ${phone} | Text: "${text}"`);
    return { success: true, provider: 'Sandbox', mockSent: true };
  }

  /**
   * Universal Email Adapter supporting Standard SMTP (Gmail, SendGrid, Mailgun),
   * Resend API, Brevo API / SMTP, and sandbox fallback.
   */
  static async sendEmail(email, subject, text, htmlBody = null) {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT || 587;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort == 465;

    const brevoKey = process.env.BREVO_API_KEY;
    const resendKey = process.env.RESEND_API_KEY;
    const senderEmail = process.env.SENDER_EMAIL || process.env.SMTP_USER || 'olisapaul12@gmail.com';
    const senderName = process.env.SENDER_NAME || 'E-Commerce Order System';

    const defaultHtml = `<div style="font-family:Arial,sans-serif;padding:20px;color:#1e293b;"><h2 style="color:#4f46e5;">Order Update</h2><p>${text}</p></div>`;
    const finalHtml = htmlBody || defaultHtml;

    const logNotification = async (provider, status, details = {}) => {
      if (supabase) {
        try {
          await supabase.from('notification_logs').insert([{
            template_name: subject,
            recipient: email,
            channel: 'email',
            status,
            payload: { provider, subject, text, details },
            created_at: new Date().toISOString()
          }]);
        } catch (e) {
          // ignore DB log errors
        }
      }
    };

    // 1. Standard Custom SMTP / Gmail SMTP (if configured in .env)
    if (smtpHost && smtpUser && smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: Number(smtpPort),
          secure: smtpSecure,
          auth: { user: smtpUser, pass: smtpPass }
        });
        const info = await transporter.sendMail({
          from: `"${senderName}" <${senderEmail}>`,
          to: email,
          subject,
          html: finalHtml,
          text
        });
        console.log(`📧 [Custom SMTP Email Sent] To: ${email} | Host: ${smtpHost} | MessageId:`, info.messageId);
        await logNotification(`SMTP (${smtpHost})`, 'sent', { messageId: info.messageId });
        return { success: true, provider: `SMTP (${smtpHost})`, messageId: info.messageId };
      } catch (err) {
        console.error(`❌ Failed to send Email via Custom SMTP (${smtpHost}) to ${email}:`, err.message);
        await logNotification(`SMTP (${smtpHost})`, 'failed', { error: err.message });
      }
    }

    // 2. Try Resend API
    if (resendKey && resendKey !== 'your-resend-api-key') {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendKey}`
          },
          body: JSON.stringify({
            from: process.env.RESEND_FROM_EMAIL || `"${senderName}" <onboarding@resend.dev>`,
            to: [email],
            subject,
            html: finalHtml
          })
        });
        const resData = await response.json();
        if (response.ok) {
          console.log(`📧 [Resend Email API Response] To: ${email} | Result:`, resData);
          await logNotification('Resend', 'sent', resData);
          return { success: true, provider: 'Resend', response: resData };
        } else {
          console.error(`❌ Resend Email API Error for ${email}:`, resData);
          await logNotification('Resend', 'failed', resData);
        }
      } catch (err) {
        console.error(`Failed to send Email via Resend to ${email}:`, err.message);
      }
    }

    // 3. Brevo REST API (for xkeysib keys)
    if (brevoKey && brevoKey !== 'your-brevo-api-key' && !brevoKey.startsWith('xsmtpsib')) {
      try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': brevoKey
          },
          body: JSON.stringify({
            sender: { name: senderName, email: senderEmail },
            to: [{ email }],
            subject,
            htmlContent: finalHtml
          })
        });
        const resData = await response.json();
        if (response.ok) {
          console.log(`📧 [Brevo API Response] To: ${email} | Result:`, resData);
          await logNotification('Brevo API', 'sent', resData);
          return { success: true, provider: 'Brevo API', response: resData };
        } else {
          console.error(`❌ Brevo API Email Error for ${email}:`, resData.message || resData);
          await logNotification('Brevo API', 'failed', resData);
          return { success: false, provider: 'Brevo API', error: resData.message || 'Brevo API Error' };
        }
      } catch (err) {
        console.error(`Failed to send Email via Brevo API to ${email}:`, err.message);
      }
    }

    // 4. Brevo SMTP Transporter (for xsmtpsib keys)
    if (brevoKey && brevoKey.startsWith('xsmtpsib')) {
      try {
        const transporter = nodemailer.createTransport({
          host: 'smtp-relay.brevo.com',
          port: 587,
          secure: false,
          auth: {
            user: process.env.BREVO_SMTP_USER || senderEmail,
            pass: brevoKey
          }
        });
        const info = await transporter.sendMail({
          from: `"${senderName}" <${senderEmail}>`,
          to: email,
          subject,
          html: finalHtml
        });
        console.log(`📧 [Brevo SMTP Email Sent] To: ${email} | MessageId:`, info.messageId);
        await logNotification('Brevo SMTP', 'sent', { messageId: info.messageId });
        return { success: true, provider: 'Brevo SMTP', messageId: info.messageId };
      } catch (err) {
        console.error(`Failed to send Email via Brevo SMTP to ${email}:`, err.message);
        await logNotification('Brevo SMTP', 'failed', { error: err.message });
      }
    }

    console.log(`📧 [Email Sandbox Mode] To: ${email} | Subject: "${subject}" | Content length: ${finalHtml.length} chars`);
    await logNotification('Sandbox', 'sent_sandbox', { note: 'No live email credentials active or all providers failed' });
    return { success: true, provider: 'Sandbox', mockSent: true };
  }

  /**
   * Send all three notifications when an order is completed/finalized:
   * 1. Merchant Notification Email (form notification_email / store owner)
   * 2. Customer Receipt Email (if customer_email provided)
   * 3. Customer Order Confirmation SMS (to customer_phone)
   */
  static async sendOrderFinalizedNotifications(order, merchantEmail = 'olisapaul1@gmail.com') {
    if (!order) return;

    const mainProductName = (order.items && order.items[0]) ? order.items[0].name : 'Product Order';
    const totalFormatted = (order.total_amount || 0).toLocaleString();
    const itemsList = order.items || [];

    // ── 1. Merchant Order Alert Email ──
    const targetMerchantEmail = merchantEmail || process.env.SENDER_EMAIL || 'olisapaul1@gmail.com';
    const merchantSubject = `🛒 NEW ORDER ALERT: #${order.order_number} - ${order.customer_name}`;
    const merchantHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; color: #1e293b;">
        <div style="background-color: #4f46e5; padding: 18px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
          <h2 style="color: #ffffff; margin: 0; font-size: 20px;">🛒 New Order Received!</h2>
          <p style="color: #e0e7ff; margin: 6px 0 0 0; font-size: 13px;">Order Ref: <strong>#${order.order_number}</strong></p>
        </div>

        <h3 style="font-size: 14px; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; border-bottom: 2px solid #f1f5f9; padding-bottom: 6px;">Customer Information</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 20px;">
          <tr><td style="padding: 6px 0; color: #64748b; width: 140px;">Full Name:</td><td style="font-weight: bold; color: #0f172a;">${order.customer_name}</td></tr>
          <tr><td style="padding: 6px 0; color: #64748b;">Phone Number:</td><td style="font-weight: bold; color: #4f46e5;"><a href="tel:${order.customer_phone}" style="color: #4f46e5; text-decoration: none;">${order.customer_phone}</a></td></tr>
          <tr><td style="padding: 6px 0; color: #64748b;">Email Address:</td><td style="color: #0f172a;">${order.customer_email || 'Not provided'}</td></tr>
          <tr><td style="padding: 6px 0; color: #64748b;">Delivery Address:</td><td style="color: #0f172a;">${order.delivery_address}, ${order.state}, ${order.country}</td></tr>
        </table>

        <h3 style="font-size: 14px; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; border-bottom: 2px solid #f1f5f9; padding-bottom: 6px;">Order Summary</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #f8fafc; text-align: left; font-size: 12px; color: #64748b;">
              <th style="padding: 8px;">Product Description</th>
              <th style="padding: 8px; text-align: center;">Qty</th>
              <th style="padding: 8px; text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsList.map(i => `
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 8px; font-weight: 600; color: #1e293b;">${i.name}</td>
                <td style="padding: 10px 8px; text-align: center; color: #475569;">${i.quantity}</td>
                <td style="padding: 10px 8px; text-align: right; color: #1e293b;">₦${(i.unit_price_at_time_of_order * i.quantity).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; padding: 16px; border-radius: 8px; margin-top: 16px;">
          <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; color: #065f46;">
            <span>Total Payable on Delivery (COD):</span>
            <span>₦${totalFormatted}</span>
          </div>
        </div>
      </div>
    `;

    await this.sendEmail(
      targetMerchantEmail,
      merchantSubject,
      `New order #${order.order_number} from ${order.customer_name} (${order.customer_phone}). Total: ₦${totalFormatted}`,
      merchantHtml
    );

    // ── 2. Customer Receipt Email ──
    if (order.customer_email && order.customer_email.trim().includes('@')) {
      const customerSubject = `🧾 Order Confirmation & Receipt - #${order.order_number}`;
      const customerHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; color: #1e293b;">
          <div style="background-color: #10b981; padding: 18px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
            <h2 style="color: #ffffff; margin: 0; font-size: 20px;">Thank You For Your Order!</h2>
            <p style="color: #ecfdf5; margin: 6px 0 0 0; font-size: 13px;">Order Reference: <strong>#${order.order_number}</strong></p>
          </div>

          <p style="font-size: 14px; color: #334155; line-height: 1.6;">Dear <strong>${order.customer_name}</strong>,</p>
          <p style="font-size: 14px; color: #334155; line-height: 1.6;">We have successfully received your order. Below is a summary receipt of your order details:</p>

          <h3 style="font-size: 14px; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 20px; margin-bottom: 12px; border-bottom: 2px solid #f1f5f9; padding-bottom: 6px;">Order Details</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #f8fafc; text-align: left; font-size: 12px; color: #64748b;">
                <th style="padding: 8px;">Item</th>
                <th style="padding: 8px; text-align: center;">Qty</th>
                <th style="padding: 8px; text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsList.map(i => `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 10px 8px; font-weight: 600; color: #1e293b;">${i.name}</td>
                  <td style="padding: 10px 8px; text-align: center; color: #475569;">${i.quantity}</td>
                  <td style="padding: 10px 8px; text-align: right; color: #1e293b;">₦${(i.unit_price_at_time_of_order * i.quantity).toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 14px; border-radius: 8px; margin-bottom: 20px;">
            <div style="font-size: 13px; font-weight: bold; color: #0f172a; margin-bottom: 4px;">Delivery Address:</div>
            <div style="font-size: 13px; color: #475569;">${order.delivery_address}, ${order.state}, ${order.country}</div>
          </div>

          <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; padding: 16px; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; color: #065f46;">
              <span>Total Payable on Delivery (COD):</span>
              <span>₦${totalFormatted}</span>
            </div>
          </div>

          <p style="font-size: 13px; color: #64748b; margin-top: 24px; text-align: center; line-height: 1.5;">Our representative will call your phone number (<strong>${order.customer_phone}</strong>) shortly to confirm delivery dispatch.</p>
        </div>
      `;

      await this.sendEmail(
        order.customer_email.trim(),
        customerSubject,
        `Thank you ${order.customer_name}! Your order #${order.order_number} for ₦${totalFormatted} (Pay on Delivery) has been confirmed.`,
        customerHtml
      );
    }

    // ── 3. Customer Order Confirmation SMS ──
    if (order.customer_phone) {
      const smsMessage = `Hi ${order.customer_name}, your order #${order.order_number} for ${mainProductName} is confirmed! Total: ₦${totalFormatted} (Pay on Delivery). Our rep will call you shortly to confirm delivery.`;
      await this.sendSMS(order.customer_phone, smsMessage);
    }
  }
}

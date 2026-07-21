import { supabase } from '../config/supabase.js';

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
    if (apiKey) {
      try {
        const response = await fetch('https://api.ng.termii.com/api/sms/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: phone,
            from: process.env.TERMII_SENDER_ID || 'N-ALERT',
            sms: text,
            type: 'plain',
            channel: 'generic',
            api_key: apiKey
          })
        });
        const resData = await response.json();
        console.log('📱 Termii SMS API Response:', resData);
        return { success: true, provider: 'Termii', response: resData };
      } catch (err) {
        console.error('Failed to send SMS via Termii:', err);
      }
    }

    console.log(`📱 [SMS Sandbox Mode] To: ${phone} | Text: "${text}"`);
    return { success: true, provider: 'Sandbox', mockSent: true };
  }

  /**
   * Brevo / Email Adapter with sandbox fallback
   */
  static async sendEmail(email, subject, text) {
    const apiKey = process.env.BREVO_API_KEY;
    if (apiKey) {
      try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': apiKey
          },
          body: JSON.stringify({
            sender: { name: 'E-Commerce CRM', email: process.env.SENDER_EMAIL || 'orders@merchant.ng' },
            to: [{ email }],
            subject,
            htmlContent: `<div style="font-family:sans-serif;padding:20px;"><h2>Order Update</h2><p>${text}</p></div>`
          })
        });
        const resData = await response.json();
        console.log('📧 Brevo Email API Response:', resData);
        return { success: true, provider: 'Brevo', response: resData };
      } catch (err) {
        console.error('Failed to send Email via Brevo:', err);
      }
    }

    console.log(`📧 [Email Sandbox Mode] To: ${email} | Subject: "${subject}" | Text: "${text}"`);
    return { success: true, provider: 'Sandbox', mockSent: true };
  }
}

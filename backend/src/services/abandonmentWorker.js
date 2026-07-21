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

  static async processDraftReminder(draft) {
    if (!draft.customer_phone) return;

    const resumeLink = `http://localhost:5173/checkout?resume=${draft.resume_token || draft.id}`;
    const productName = (draft.items && draft.items[0]?.name) || 'selected item';

    await NotificationService.send({
      templateName: 'draft_reminder',
      recipient: draft.customer_phone,
      channel: 'sms',
      variables: {
        customer_name: draft.customer_name || 'Valued Customer',
        product_name: productName,
        resume_link: resumeLink
      }
    });

    if (supabase) {
      await supabase
        .from('orders')
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq('id', draft.id);
    }

    console.log(`✅ Sent draft abandonment reminder to ${draft.customer_phone} for Order ${draft.order_number || draft.id}`);
  }
}

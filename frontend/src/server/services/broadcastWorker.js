import { whatsappService } from './whatsappService.js';
import { NotificationService } from './notificationService.js';
import { supabase } from '../config/supabase.js';

export class BroadcastWorker {
  // Store-isolated active campaign state: map of storeId -> campaign state
  static campaigns = new Map();

  static resolveStoreId(storeId) {
    const DEFAULT_STORE_ID = '00000000-0000-0000-0000-784723738041';
    if (!storeId || typeof storeId !== 'string' || storeId.trim() === '') return DEFAULT_STORE_ID;
    return storeId.trim();
  }

  static getCampaign(storeId) {
    const sid = this.resolveStoreId(storeId);
    if (!this.campaigns.has(sid)) {
      this.campaigns.set(sid, {
        id: null,
        storeId: sid,
        status: 'idle', // 'idle' | 'running' | 'paused' | 'completed' | 'cancelled'
        channel: 'whatsapp',
        template: '',
        total: 0,
        sentCount: 0,
        failCount: 0,
        currentIndex: 0,
        currentCustomer: null,
        minDelaySec: 6,
        maxDelaySec: 12,
        startedAt: null,
        lastSentAt: null,
        completedAt: null,
        error: null,
        recentLogs: [],
        audience: []
      });
    }
    return this.campaigns.get(sid);
  }

  /**
   * Helper to sleep with promise
   */
  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Natural variation for greetings and text spinning to prevent spam fingerprinting
   */
  static personalizeMessage(template, customer) {
    const rawName = (customer.customer_name || 'Customer').trim();
    const firstName = rawName.split(' ')[0] || rawName;

    const itemsSummary = (customer.items && customer.items.length > 0)
      ? customer.items.map(i => `${i.quantity || 1}x ${i.name || i.product_name || 'Item'}`).join(', ')
      : (customer.product_name || 'your ordered item');

    const totalFormatted = Number(customer.total_amount || 0).toLocaleString();

    let text = template
      .replace(/{{customer_name}}/g, rawName)
      .replace(/{{first_name}}/g, firstName)
      .replace(/{{order_number}}/g, customer.order_number || '')
      .replace(/{{product_name}}/g, itemsSummary)
      .replace(/{{total_amount}}/g, totalFormatted);

    // Natural greeting variation if template starts with standard greetings
    const greetings = ['Hello', 'Hi', 'Good day', 'Greetings'];
    const chosenGreeting = greetings[Math.floor(Math.random() * greetings.length)];
    if (/^(hi|hello|hey|good day)/i.test(text)) {
      text = text.replace(/^(hi|hello|hey|good day)/i, chosenGreeting);
    }

    return text;
  }

  /**
   * Start a new campaign for a store
   */
  static startCampaign(storeId, { channel = 'whatsapp', template = '', audience = [], minDelaySec = 6, maxDelaySec = 12 }) {
    const sid = this.resolveStoreId(storeId);
    let campaign = this.getCampaign(sid);

    if (campaign.status === 'running') {
      return { success: false, error: 'A broadcast campaign is already running for this store.' };
    }

    if (!Array.isArray(audience) || audience.length === 0) {
      return { success: false, error: 'Audience list is empty. Select target recipients first.' };
    }

    if (!template || !template.trim()) {
      return { success: false, error: 'Message template cannot be empty.' };
    }

    // Verify WhatsApp gateway is connected if sending via WhatsApp
    if (channel === 'whatsapp') {
      const status = whatsappService.getStatus(sid);
      if (status.status !== 'connected') {
        return {
          success: false,
          error: `WhatsApp phone gateway is disconnected for this store. Please link your phone in Settings or Marketing Hub before starting.`
        };
      }
    }

    campaign = {
      id: `CAMP-${Date.now()}`,
      storeId: sid,
      status: 'running',
      channel,
      template,
      audience: [...audience],
      total: audience.length,
      sentCount: 0,
      failCount: 0,
      currentIndex: 0,
      currentCustomer: null,
      minDelaySec: Math.max(3, Number(minDelaySec) || 6),
      maxDelaySec: Math.max(Number(minDelaySec) || 6, Number(maxDelaySec) || 12),
      startedAt: new Date().toISOString(),
      lastSentAt: null,
      completedAt: null,
      error: null,
      recentLogs: []
    };

    this.campaigns.set(sid, campaign);

    console.log(`🚀 [BroadcastWorker] Launching background campaign ${campaign.id} for store ${sid} (${campaign.total} recipients, channel: ${channel}, pacing: ${campaign.minDelaySec}-${campaign.maxDelaySec}s)...`);

    // Kick off worker execution asynchronously
    this.runCampaignLoop(sid);

    return {
      success: true,
      message: `Broadcast campaign started in background for ${campaign.total} recipients.`,
      campaign: this.serializeCampaign(campaign)
    };
  }

  /**
   * Main background dispatch loop
   */
  static async runCampaignLoop(storeId) {
    const sid = this.resolveStoreId(storeId);
    const campaign = this.getCampaign(sid);

    while (campaign.currentIndex < campaign.audience.length) {
      // Check status flags
      if (campaign.status === 'paused') {
        console.log(`⏸️ [BroadcastWorker] Campaign ${campaign.id} for store ${sid} is paused.`);
        return;
      }
      if (campaign.status === 'cancelled') {
        console.log(`🛑 [BroadcastWorker] Campaign ${campaign.id} for store ${sid} was cancelled.`);
        return;
      }

      const customer = campaign.audience[campaign.currentIndex];
      const phone = customer.customer_phone;
      campaign.currentCustomer = `${customer.customer_name || 'Customer'} (${phone})`;

      const personalizedText = this.personalizeMessage(campaign.template, customer);

      let sendSuccess = false;
      let sendError = null;

      try {
        if (campaign.channel === 'whatsapp') {
          // Verify connection is still open
          const gwStatus = whatsappService.getStatus(sid);
          if (gwStatus.status !== 'connected') {
            campaign.status = 'paused';
            campaign.error = 'WhatsApp disconnected during broadcast. Reconnect phone to resume.';
            console.warn(`⚠️ [BroadcastWorker] WhatsApp disconnected. Paused campaign ${campaign.id}.`);
            return;
          }

          const res = await whatsappService.sendMessage(phone, personalizedText, sid);
          if (res.success) {
            sendSuccess = true;
          } else {
            sendError = res.error || 'Failed to send';
          }
        } else if (campaign.channel === 'sms') {
          const res = await NotificationService.sendSMS(phone, personalizedText);
          if (res.success) {
            sendSuccess = true;
          } else {
            sendError = res.error || 'Failed to send SMS';
          }
        }

        if (sendSuccess) {
          campaign.sentCount++;
          campaign.lastSentAt = new Date().toISOString();
        } else {
          campaign.failCount++;
        }
      } catch (err) {
        campaign.failCount++;
        sendError = err.message;
        console.error(`❌ [BroadcastWorker] Error dispatching to ${phone}:`, err.message);
      }

      // Add to recent logs
      campaign.recentLogs.unshift({
        phone,
        name: customer.customer_name || 'Customer',
        status: sendSuccess ? 'Delivered' : 'Failed',
        error: sendError,
        time: new Date().toLocaleTimeString()
      });
      if (campaign.recentLogs.length > 30) {
        campaign.recentLogs.pop();
      }

      campaign.currentIndex++;

      // Log in notification_logs table (best effort)
      if (supabase) {
        supabase.from('notification_logs').insert([{
          template_name: `Broadcast: ${campaign.template.slice(0, 30)}...`,
          recipient: `${customer.customer_name || 'Customer'} (${phone})`,
          channel: campaign.channel,
          status: sendSuccess ? 'Delivered' : 'Failed',
          payload: { store_id: sid, campaign_id: campaign.id, error: sendError },
          created_at: new Date().toISOString()
        }]).then(() => {}).catch(() => {});
      }

      // If finished
      if (campaign.currentIndex >= campaign.audience.length) {
        campaign.status = 'completed';
        campaign.completedAt = new Date().toISOString();
        campaign.currentCustomer = null;
        console.log(`🏁 [BroadcastWorker] Campaign ${campaign.id} completed! Sent: ${campaign.sentCount}, Failed: ${campaign.failCount}`);
        return;
      }

      // ── Anti-Ban Jitter & Safe Delay ──
      // 1. Mini batch pause every 25 messages
      if (campaign.currentIndex % 25 === 0) {
        const batchPauseMs = Math.floor(Math.random() * 15000) + 20000; // 20 - 35s pause
        console.log(`⏳ [BroadcastWorker] Batch of 25 sent. Taking anti-ban human pause of ${Math.round(batchPauseMs / 1000)}s...`);
        await this.sleep(batchPauseMs);
      } else {
        // 2. Random jitter between minDelaySec and maxDelaySec
        const delayRangeMs = (campaign.maxDelaySec - campaign.minDelaySec) * 1000;
        const randomJitterMs = Math.floor(Math.random() * delayRangeMs) + (campaign.minDelaySec * 1000);
        await this.sleep(randomJitterMs);
      }
    }
  }

  static pauseCampaign(storeId) {
    const sid = this.resolveStoreId(storeId);
    const campaign = this.getCampaign(sid);
    if (campaign.status === 'running') {
      campaign.status = 'paused';
      return { success: true, message: 'Campaign paused.', campaign: this.serializeCampaign(campaign) };
    }
    return { success: false, error: 'No campaign is currently running to pause.' };
  }

  static resumeCampaign(storeId) {
    const sid = this.resolveStoreId(storeId);
    const campaign = this.getCampaign(sid);
    if (campaign.status === 'paused') {
      campaign.status = 'running';
      campaign.error = null;
      this.runCampaignLoop(sid);
      return { success: true, message: 'Campaign resumed.', campaign: this.serializeCampaign(campaign) };
    }
    return { success: false, error: 'Campaign is not paused.' };
  }

  static cancelCampaign(storeId) {
    const sid = this.resolveStoreId(storeId);
    const campaign = this.getCampaign(sid);
    if (campaign.status === 'running' || campaign.status === 'paused') {
      campaign.status = 'cancelled';
      campaign.currentCustomer = null;
      return { success: true, message: 'Campaign cancelled.', campaign: this.serializeCampaign(campaign) };
    }
    return { success: false, error: 'No active campaign to cancel.' };
  }

  static getStatus(storeId) {
    const sid = this.resolveStoreId(storeId);
    const campaign = this.getCampaign(sid);
    return this.serializeCampaign(campaign);
  }

  static serializeCampaign(campaign) {
    const progressPercent = campaign.total > 0
      ? Math.round((campaign.currentIndex / campaign.total) * 100)
      : 0;

    return {
      id: campaign.id,
      storeId: campaign.storeId,
      status: campaign.status,
      channel: campaign.channel,
      total: campaign.total,
      sentCount: campaign.sentCount,
      failCount: campaign.failCount,
      currentIndex: campaign.currentIndex,
      currentCustomer: campaign.currentCustomer,
      progressPercent,
      minDelaySec: campaign.minDelaySec,
      maxDelaySec: campaign.maxDelaySec,
      startedAt: campaign.startedAt,
      lastSentAt: campaign.lastSentAt,
      completedAt: campaign.completedAt,
      error: campaign.error,
      recentLogs: campaign.recentLogs || []
    };
  }
}

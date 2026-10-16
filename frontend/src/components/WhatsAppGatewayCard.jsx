import React, { useState, useEffect } from 'react';
import { MessageSquare, Smartphone, QrCode, CheckCircle2, AlertCircle, RefreshCw, Unlink, Send, ShieldCheck, Loader2 } from 'lucide-react';
import { apiUrl } from '../utils/apiUrl';

export default function WhatsAppGatewayCard({ onStatusChange }) {
  const [status, setStatus] = useState('disconnected'); // 'disconnected' | 'connecting' | 'connected'
  const [qrCode, setQrCode] = useState(null);
  const [connectedUser, setConnectedUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', text: '' });

  const getHeaders = () => {
    const token = localStorage.getItem('gravity_crm_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  };

  const fetchStatus = async () => {
    try {
      const res = await fetch(apiUrl('/api/whatsapp/status'), {
        headers: getHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(data.status);
        setQrCode(data.qrCode);
        setConnectedUser(data.user);
        if (onStatusChange) onStatusChange(data);
      }
    } catch (err) {
      console.error('Failed to fetch WhatsApp gateway status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // Poll status while waiting for scan
  useEffect(() => {
    let interval = null;
    if (status === 'connecting') {
      interval = setInterval(() => {
        fetchStatus();
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status]);

  const handleConnect = async () => {
    setConnecting(true);
    setFeedback({ type: '', text: '' });
    try {
      const res = await fetch(apiUrl('/api/whatsapp/connect'), {
        method: 'POST',
        headers: getHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(data.status);
        setQrCode(data.qrCode);
        setConnectedUser(data.user);
      } else {
        const err = await res.json();
        setFeedback({ type: 'error', text: err.error || 'Failed to start WhatsApp connection' });
      }
    } catch (e) {
      setFeedback({ type: 'error', text: 'Network error connecting to WhatsApp gateway' });
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to unlink your WhatsApp number? Automated order confirmations will be paused until re-linked.')) {
      return;
    }
    setDisconnecting(true);
    setFeedback({ type: '', text: '' });
    try {
      const res = await fetch(apiUrl('/api/whatsapp/disconnect'), {
        method: 'POST',
        headers: getHeaders()
      });
      if (res.ok) {
        setStatus('disconnected');
        setQrCode(null);
        setConnectedUser(null);
        setFeedback({ type: 'success', text: 'WhatsApp unlinked successfully.' });
      }
    } catch (e) {
      setFeedback({ type: 'error', text: 'Error disconnecting WhatsApp' });
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSendTest = async (e) => {
    e.preventDefault();
    if (!testPhone.trim()) {
      setFeedback({ type: 'error', text: 'Please enter a recipient phone number for the test' });
      return;
    }
    setSendingTest(true);
    setFeedback({ type: '', text: '' });
    try {
      const res = await fetch(apiUrl('/api/whatsapp/test'), {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          phone: testPhone.trim(),
          message: testMessage.trim() || '🧪 Test WhatsApp order message from your E-Commerce CRM!'
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ type: 'success', text: `Test message sent successfully to ${testPhone}!` });
        setTestMessage('');
      } else {
        setFeedback({ type: 'error', text: data.error || 'Failed to send test message' });
      }
    } catch (err) {
      setFeedback({ type: 'error', text: 'Error dispatching test message' });
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div className="glass p-5 rounded-2xl border border-slate-800 space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              WhatsApp Phone Automation Gateway
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                status === 'connected' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                status === 'connecting' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse' :
                'bg-slate-800 text-slate-400 border border-slate-700'
              }`}>
                {status === 'connected' ? '🟢 Linked & Active' : status === 'connecting' ? '🟡 Waiting for QR Scan' : '⚪ Offline / Unlinked'}
              </span>
            </h3>
            <p className="text-xs text-slate-400">Send instant order confirmation messages directly through your own phone number for ₦0.</p>
          </div>
        </div>

        {status === 'connected' && (
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="btn-danger text-xs px-3 py-1.5 flex items-center gap-1.5 self-start sm:self-auto"
          >
            {disconnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlink className="w-3.5 h-3.5" />}
            Unlink Phone
          </button>
        )}
      </div>

      {feedback.text && (
        <div className={`p-3 rounded-xl text-xs flex items-center gap-2 animate-fade-in ${
          feedback.type === 'success'
            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
            : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{feedback.text}</span>
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
          <span>Checking WhatsApp connection...</span>
        </div>
      ) : status === 'connected' ? (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-100">
                  {connectedUser?.phone ? `+${connectedUser.phone}` : 'Connected Phone'}
                </p>
                <p className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Ready to send automated confirmations to incoming order form buyers
                </p>
              </div>
            </div>

            <button
              onClick={fetchStatus}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800"
              title="Refresh connection status"
            >
              <RefreshCw className="w-3 h-3" /> Sync Status
            </button>
          </div>

          {/* Test WhatsApp Message Sender */}
          <form onSubmit={handleSendTest} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-3">
            <p className="text-xs font-bold text-slate-200">Send Test WhatsApp Message</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Recipient Phone Number (e.g. 08123456789)</label>
                <input
                  type="text"
                  className="input text-xs"
                  placeholder="08123456789"
                  value={testPhone}
                  onChange={e => setTestPhone(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Message Preview</label>
                <input
                  type="text"
                  className="input text-xs"
                  placeholder="Hello! Order test from iSmartyShop"
                  value={testMessage}
                  onChange={e => setTestMessage(e.target.value)}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={sendingTest || !testPhone.trim()}
              className="btn-primary text-xs py-2 px-4 flex items-center gap-2"
            >
              {sendingTest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Send Test Message
            </button>
          </form>
        </div>
      ) : status === 'connecting' && qrCode ? (
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-amber-500/30 flex flex-col md:flex-row items-center gap-6 animate-fade-in">
          <div className="p-3 bg-white rounded-2xl shadow-xl shrink-0 flex items-center justify-center">
            <img src={qrCode} alt="WhatsApp QR Code" className="w-48 h-48 rounded-lg" />
          </div>

          <div className="space-y-3 flex-1 text-left">
            <h4 className="text-sm font-bold text-amber-300 flex items-center gap-2">
              <QrCode className="w-4 h-4" /> Scan with WhatsApp on your Phone
            </h4>
            <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
              <li>Open <strong>WhatsApp</strong> on your mobile phone.</li>
              <li>Tap <strong>Settings</strong> (or the 3 dots menu on Android) $\rightarrow$ <strong>Linked Devices</strong>.</li>
              <li>Tap <strong>Link a Device</strong> and point your phone's camera at this QR code.</li>
            </ol>
            <p className="text-[11px] text-slate-400 italic">
              Once scanned, this window will automatically switch to "Linked & Active" within 3 seconds.
            </p>
            <button
              onClick={handleDisconnect}
              className="text-xs text-slate-400 hover:text-rose-400 underline pt-1 block"
            >
              Cancel QR pairing
            </button>
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 text-center space-y-4">
          <div className="max-w-md mx-auto space-y-2">
            <Smartphone className="w-10 h-10 text-emerald-400 mx-auto" />
            <h4 className="text-sm font-bold text-slate-200">Connect Your WhatsApp Number</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Link your WhatsApp once to automatically deliver order receipts and dispatch updates straight to buyers when they submit your order forms.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="btn-primary py-2.5 px-6 text-xs flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500"
            >
              {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
              {connecting ? 'Generating QR Code...' : 'Link WhatsApp (Generate QR Code)'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

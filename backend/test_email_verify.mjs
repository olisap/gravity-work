import dotenv from 'dotenv';
dotenv.config();

import { supabase } from './src/config/supabase.js';

const brevoKey = process.env.BREVO_API_KEY;
const senderEmail = process.env.SENDER_EMAIL;
const senderName = process.env.SENDER_NAME || 'Order Notifications';

console.log('======================================================');
console.log('EMAIL VERIFICATION TEST');
console.log('======================================================');
console.log('BREVO_API_KEY configured:', brevoKey ? `YES (starts with: ${brevoKey.slice(0,10)}...)` : 'NO');
console.log('SENDER_EMAIL:', senderEmail);
console.log('');

// ─── TEST 1: Form Save (notification_email persists) ──────────────────────────
console.log('--- TEST 1: Form notification_email save ---');
const { data: form } = await supabase
  .from('forms')
  .select('*')
  .eq('embed_key', 'EMBED-POTKNOBORD-5463')
  .maybeSingle();

if (!form) {
  console.log('SKIP - Form not found in Supabase');
} else {
  const cfg = form.fields_config || {};
  const currentNotifEmail = form.notification_email || cfg.notification_email || '';
  const currentThankYouUrl = form.thank_you_url || cfg.thank_you_url || '';

  console.log('Current notification_email in DB:', currentNotifEmail);
  console.log('Current thank_you_url (from fields_config):', cfg.thank_you_url || '(not set)');

  // Simulate updating notification_email
  const testEmail = 'VERIFY-TEST-' + Date.now() + '@example.com';
  const { data: saved, error: saveErr } = await supabase
    .from('forms')
    .update({
      notification_email: testEmail,
      fields_config: { ...cfg, thank_you_url: cfg.thank_you_url || currentThankYouUrl }
    })
    .eq('embed_key', 'EMBED-POTKNOBORD-5463')
    .select();

  if (saveErr) {
    console.log('FAIL - Form save errored:', saveErr.message);
  } else {
    const readback = saved[0]?.notification_email;
    if (readback === testEmail) {
      console.log('PASS - notification_email saved and read back correctly:', readback);
    } else {
      console.log('FAIL - notification_email saved as:', readback, '(expected:', testEmail, ')');
    }
  }

  // Restore
  await supabase
    .from('forms')
    .update({ notification_email: currentNotifEmail, fields_config: cfg })
    .eq('embed_key', 'EMBED-POTKNOBORD-5463');
  console.log('Restored original notification_email:', currentNotifEmail);
}

console.log('');

// ─── TEST 2: Email routing logic (resolveMerchantNotificationEmail) ────────────
console.log('--- TEST 2: Email routing logic ---');
const isPlaceholder = (val) => !val || !val.trim() || val.trim().toLowerCase() === 'merchant@gmail.com';

// Simulate what EmbedFormWidget sends
const { data: liveForm } = await supabase
  .from('forms')
  .select('*')
  .eq('embed_key', 'EMBED-POTKNOBORD-5463')
  .maybeSingle();

if (liveForm) {
  const cfg = liveForm.fields_config || {};
  const formattedNotifEmail = liveForm.notification_email || cfg.notification_email || '';
  const formattedThankYouUrl = liveForm.thank_you_url || cfg.thank_you_url || '';

  console.log('Widget will receive notification_email:', formattedNotifEmail || '(empty - would fall to env)');
  console.log('Widget will receive thank_you_url:', formattedThankYouUrl || '(empty - no redirect)');
  console.log('Widget will receive store_id:', liveForm.store_id);

  // Simulate resolveMerchantNotificationEmail
  let resolvedMerchantEmail = null;
  if (!isPlaceholder(formattedNotifEmail)) {
    resolvedMerchantEmail = formattedNotifEmail.trim();
    console.log('PASS - Merchant email resolved from form (priority 1):', resolvedMerchantEmail);
  } else {
    console.log('WARN - Form notification_email is empty/placeholder, would fall back to DB lookup by store_id');
    resolvedMerchantEmail = process.env.SENDER_EMAIL || null;
    console.log('INFO - Env fallback would be:', resolvedMerchantEmail);
  }
}

console.log('');

// ─── TEST 3: Brevo API live email send to merchant ────────────────────────────
console.log('--- TEST 3: Live Brevo email send to merchant notification_email ---');

const { data: testForm } = await supabase
  .from('forms')
  .select('notification_email, fields_config')
  .eq('embed_key', 'EMBED-POTKNOBORD-5463')
  .maybeSingle();

const merchantEmail = testForm?.notification_email || testForm?.fields_config?.notification_email || senderEmail;
console.log('Sending test to merchant email:', merchantEmail);

const merchantHtml = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:24px;color:#1e293b;">
  <div style="background:#4f46e5;padding:18px;border-radius:8px;text-align:center;margin-bottom:20px;">
    <h2 style="color:#fff;margin:0;">VERIFICATION: Merchant Alert Email</h2>
  </div>
  <p>This is a verification test to confirm that merchant order alert emails are routing correctly to this address.</p>
  <table style="width:100%;font-size:14px;border-collapse:collapse;">
    <tr><td style="padding:6px 0;color:#64748b;">Merchant Email:</td><td style="font-weight:bold;">${merchantEmail}</td></tr>
    <tr><td style="padding:6px 0;color:#64748b;">Sender Email (env):</td><td>${senderEmail}</td></tr>
    <tr><td style="padding:6px 0;color:#64748b;">Email Provider:</td><td>Brevo API</td></tr>
    <tr><td style="padding:6px 0;color:#64748b;">Status:</td><td style="color:#10b981;font-weight:bold;">ROUTING CORRECTLY</td></tr>
  </table>
  <p style="margin-top:20px;font-size:13px;color:#64748b;">If you received this email, order notification emails are working correctly for your form.</p>
</div>`;

const merchantRes = await fetch('https://api.brevo.com/v3/smtp/email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'api-key': brevoKey },
  body: JSON.stringify({
    sender: { name: senderName, email: senderEmail },
    to: [{ email: merchantEmail }],
    subject: '[VERIFY] Merchant Order Alert Email Test',
    htmlContent: merchantHtml
  })
});
const merchantResult = await merchantRes.json();
if (merchantRes.ok) {
  console.log('PASS - Merchant email sent! MessageId:', merchantResult.messageId);
} else {
  console.log('FAIL - Merchant email failed:', merchantResult.message || JSON.stringify(merchantResult));
}

console.log('');

// ─── TEST 4: Live Brevo email send to customer ────────────────────────────────
console.log('--- TEST 4: Live Brevo email send to customer receipt ---');

// Use SENDER_EMAIL as test customer (so you can verify receipt)
const customerTestEmail = senderEmail;
console.log('Sending test customer receipt to:', customerTestEmail);

const customerHtml = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:24px;color:#1e293b;">
  <div style="background:#10b981;padding:18px;border-radius:8px;text-align:center;margin-bottom:20px;">
    <h2 style="color:#fff;margin:0;">VERIFICATION: Customer Receipt Email</h2>
    <p style="color:#ecfdf5;margin:6px 0 0 0;font-size:13px;">Order Reference: <strong>#TEST-VERIFY-001</strong></p>
  </div>
  <p style="font-size:14px;color:#334155;">Dear <strong>Test Customer</strong>,</p>
  <p style="font-size:14px;color:#334155;">This is a verification test to confirm that customer receipt emails are working correctly.</p>
  <div style="background:#ecfdf5;border:1px solid #a7f3d0;padding:16px;border-radius:8px;">
    <div style="font-size:16px;font-weight:bold;color:#065f46;">Total Payable on Delivery: NGN 18,500</div>
  </div>
  <p style="font-size:13px;color:#64748b;margin-top:24px;text-align:center;">Our representative will call your phone shortly to confirm delivery dispatch.</p>
</div>`;

const customerRes = await fetch('https://api.brevo.com/v3/smtp/email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'api-key': brevoKey },
  body: JSON.stringify({
    sender: { name: senderName, email: senderEmail },
    to: [{ email: customerTestEmail }],
    subject: '[VERIFY] Customer Order Receipt Email Test',
    htmlContent: customerHtml
  })
});
const customerResult = await customerRes.json();
if (customerRes.ok) {
  console.log('PASS - Customer receipt email sent! MessageId:', customerResult.messageId);
} else {
  console.log('FAIL - Customer receipt email failed:', customerResult.message || JSON.stringify(customerResult));
}

console.log('');
console.log('======================================================');
console.log('VERIFICATION COMPLETE');
console.log('======================================================');

/**
 * Copy Order / Draft details to clipboard with clean formatting
 */
export function copyOrderToClipboard(order, currency = '₦') {
  if (!order) return;
  const isDraft = order.status === 'Draft';
  const itemsText = (order.items && order.items.length > 0)
    ? order.items.map(i => `${i.quantity}x ${i.name} (${currency}${(i.unit_price_at_time_of_order * i.quantity).toLocaleString()})`).join('\n   - ')
    : 'N/A';

  const formattedText = isDraft
    ? `⚠️ ABANDONED DRAFT DETAILS
📌 Order Ref: #${order.order_number || 'DRAFT'}
👤 Customer: ${order.customer_name || 'Guest'}
📞 Phone: ${order.customer_phone || 'N/A'}
📧 Email: ${order.customer_email || 'N/A'}
📍 State: ${order.state || 'N/A'}, ${order.country || 'Nigeria'}
📍 Address: ${order.delivery_address || 'Not completed'}
📊 Step Reached: Step ${order.form_step_reached || 1} of 3
🛍️ Item Chosen:
   - ${itemsText}
💰 Total Amount: ${currency}${(order.total_amount || 0).toLocaleString()}
🔗 Resume Token: ${order.resume_token || 'N/A'}`
    : `📦 ORDER DETAILS
📌 Order Ref: #${order.order_number || 'N/A'}
👤 Customer Name: ${order.customer_name || 'N/A'}
📞 Phone Number: ${order.customer_phone || 'N/A'}
📧 Email Address: ${order.customer_email || 'N/A'}
📍 Delivery Address: ${order.delivery_address || 'N/A'}, ${order.state || ''}, ${order.country || ''}
🛍️ Items Ordered:
   - ${itemsText}
💰 Total Payable (COD): ${currency}${(order.total_amount || 0).toLocaleString()}
⚡ Order Status: ${order.status || 'Pending'}`;

  const showToast = () => {
    // Custom toast feedback
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-5 right-5 z-[9999] bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-2xl flex items-center gap-2 animate-bounce';
    toast.innerHTML = `<span>✅ Order #${order.order_number || ''} copied to clipboard!</span>`;
    document.body.appendChild(toast);
    setTimeout(() => {
      if (document.body.contains(toast)) document.body.removeChild(toast);
    }, 2500);
  };

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(formattedText)
      .then(() => showToast())
      .catch(() => {
        fallbackCopy(formattedText);
        showToast();
      });
  } else {
    fallbackCopy(formattedText);
    showToast();
  }
}

function fallbackCopy(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
  } catch (err) {
    console.error('Fallback copy failed', err);
  }
  document.body.removeChild(textarea);
}

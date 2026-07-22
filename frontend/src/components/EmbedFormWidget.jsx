import React, { useState, useEffect } from 'react';
import { ShoppingBag, CheckCircle, ArrowRight, ArrowLeft, ShieldCheck, Zap } from 'lucide-react';
import { AFRICAN_LOCATIONS } from '../data/africanLocations';

export default function EmbedFormWidget({ products = [], allProducts = [], formConfig = null, onOrderSubmitted, lightMode = true }) {
  const [selectedProduct, setSelectedProduct] = useState(products[0] || null);
  const [quantity, setQuantity] = useState(1);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('Nigeria');
  const [selectedState, setSelectedState] = useState('Lagos');
  
  // Upsell Bump State
  const [addUpsellBump, setAddUpsellBump] = useState(false);
  const [draftId, setDraftId] = useState(null);
  const [resumeToken, setResumeToken] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState(null);

  useEffect(() => {
    if (products.length > 0 && !selectedProduct) {
      setSelectedProduct(products[0]);
    }
  }, [products]);

  const currentCountryObj = AFRICAN_LOCATIONS.find(c => c.country === selectedCountry) || AFRICAN_LOCATIONS[0];
  const unitPrice = selectedProduct?.base_price || 18500;
  const deliveryFee = 2000;

  // Dynamic Upsell Config
  const isUpsellEnabled = formConfig?.upsell_enabled !== false;
  const upsellProduct = (allProducts || []).find(p => p.id === formConfig?.upsell_product_id) || null;
  const bumpPrice = formConfig?.upsell_price ? Number(formConfig.upsell_price) : (upsellProduct?.base_price || 7000);
  const bumpTitle = formConfig?.upsell_title || 'Special 1-Click Offer!';
  const bumpDesc = formConfig?.upsell_description || (upsellProduct ? `Add ${upsellProduct.name} for only ${currentCountryObj.currency}${bumpPrice.toLocaleString()} extra!` : `Add a Portable USB Juicer Cup for only ${currentCountryObj.currency}7,000 extra!`);
  
  const subtotal = (unitPrice * quantity) + (addUpsellBump && isUpsellEnabled ? bumpPrice : 0);
  const totalAmount = subtotal + deliveryFee;

  const theme = {
    panel: lightMode 
      ? "bg-white p-6 max-w-lg mx-auto my-2 border border-slate-200 rounded-2xl relative w-full shadow-md text-slate-800" 
      : "glass-panel p-5 max-w-lg mx-auto my-2 border border-indigo-500/30 rounded-2xl relative w-full text-slate-100",
    headerTitle: lightMode ? "text-slate-800 font-bold text-xs uppercase tracking-wider" : "font-bold text-slate-200 text-xs uppercase tracking-wider",
    headerSub: lightMode ? "text-[10px] text-slate-500" : "text-[10px] text-slate-400",
    badge: lightMode 
      ? "text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1"
      : "text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1",
    sectionTitle: lightMode ? "font-bold text-slate-700 text-xs uppercase tracking-wider" : "font-bold text-slate-300 text-xs uppercase tracking-wider",
    label: lightMode ? "text-xs font-semibold text-slate-600 block mb-1" : "text-xs font-semibold text-slate-400 block mb-1",
    input: lightMode
      ? "w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
      : "w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:border-indigo-500 outline-none transition-all",
    select: lightMode
      ? "w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:border-indigo-500 focus:bg-white outline-none transition-all cursor-pointer"
      : "w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:border-indigo-500 outline-none transition-all",
    quantityContainer: lightMode 
      ? "flex items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded-xl"
      : "flex items-center justify-between bg-slate-950 border border-slate-800 p-3 rounded-xl",
    quantityBtn: lightMode
      ? "w-8 h-8 rounded-lg bg-slate-200 border border-slate-300 text-slate-700 font-bold hover:bg-slate-300 flex items-center justify-center text-base active:scale-95 transition-all"
      : "w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 font-bold hover:bg-slate-700 flex items-center justify-center text-base active:scale-95 transition-all",
    orderBump: lightMode
      ? "p-3 bg-indigo-50/60 border border-indigo-200 rounded-xl text-slate-800"
      : "p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl",
    orderBumpTitle: lightMode ? "text-xs font-bold text-indigo-700 flex items-center gap-1 select-none" : "text-xs font-bold text-amber-300 flex items-center gap-1 select-none",
    orderBumpText: lightMode ? "text-[11px] text-slate-600 mt-0.5 select-none leading-relaxed" : "text-[11px] text-slate-300 mt-0.5 select-none leading-relaxed",
    summaryContainer: lightMode
      ? "p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5 text-slate-600"
      : "p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 text-xs space-y-1.5",
    summaryItemLabel: lightMode ? "text-slate-500" : "text-slate-400",
    summaryItemValue: lightMode ? "text-slate-800 font-semibold" : "text-slate-300",
    divider: lightMode ? "flex items-center gap-2 border-b border-slate-200 pb-2 mb-2" : "flex items-center gap-2 border-b border-slate-800/80 pb-2 mb-2"
  };

  // Persist draft to backend
  const saveDraft = async (isFinal = false) => {
    if (!customerPhone) return;
    setIsSubmitting(isFinal);
    try {
      // Determine step reached based on fields filled
      let stepReached = 1;
      if (customerPhone && customerName) stepReached = 2;
      if (deliveryAddress) stepReached = 3;

      const payload = {
        id: draftId,
        resume_token: resumeToken,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail,
        delivery_address: deliveryAddress,
        country: selectedCountry,
        state: selectedState,
        form_step_reached: stepReached,
        is_final_submit: isFinal,
        delivery_fee: deliveryFee,
        items: [
          {
            product_id: selectedProduct?.id || 'p1',
            name: selectedProduct?.name || 'Item',
            quantity: quantity,
            unit_price_at_time_of_order: unitPrice
          },
          ...(addUpsellBump ? [{
            product_id: 'p4000000-0000-0000-0000-000000000004',
            name: 'Portable Electric USB Juicer Cup (Order Bump Addon)',
            quantity: 1,
            unit_price_at_time_of_order: bumpPrice,
            is_upsell: true
          }] : [])
        ]
      };

      const res = await fetch('/api/orders/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (data.id) setDraftId(data.id);
      if (data.resume_token) setResumeToken(data.resume_token);

      if (isFinal) {
        setSubmittedOrder(data);
        if (onOrderSubmitted) onOrderSubmitted(data);

        // Redirect to Thank You Page on the same tab if configured
        const redirectUrl = formConfig?.thank_you_url || data?.thank_you_url;
        if (redirectUrl && redirectUrl.trim() !== '' && redirectUrl !== 'http://yourthankyoupage.com') {
          let targetUrl = redirectUrl.trim();
          if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
            targetUrl = 'https://' + targetUrl;
          }
          setTimeout(() => {
            try {
              if (window.top) {
                window.top.location.href = targetUrl;
              } else {
                window.location.href = targetUrl;
              }
            } catch (e) {
              window.location.href = targetUrl;
            }
          }, 300);
        }
      }
    } catch (err) {
      console.error('Failed to save form draft:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFieldBlur = () => {
    saveDraft(false);
  };

  if (submittedOrder) {
    return (
      <div className={lightMode ? "bg-white p-6 text-center max-w-md mx-auto my-4 border border-slate-200 rounded-2xl shadow-md text-slate-800" : "glass-panel p-6 text-center max-w-md mx-auto my-4 border-emerald-500/30 rounded-2xl"}>
        <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto mb-3">
          <CheckCircle className="w-6 h-6" />
        </div>
        <h3 className={lightMode ? "font-bold text-slate-800 text-lg" : "font-bold text-slate-100 text-lg"}>Order Placed Successfully!</h3>
        <p className="text-xs text-slate-400 mt-1">Order Ref: <span className="font-mono text-emerald-600 font-bold">{submittedOrder.order_number}</span></p>
        <div className={lightMode ? "my-4 p-3.5 bg-slate-50 rounded-xl text-left text-xs space-y-1.5 border border-slate-200 text-slate-700" : "my-4 p-3.5 bg-slate-900/60 rounded-xl text-left text-xs space-y-1.5 border border-slate-800"}>
          <p className={lightMode ? "text-slate-600" : "text-slate-300"}><strong>Customer:</strong> {submittedOrder.customer_name} ({submittedOrder.customer_phone})</p>
          <p className={lightMode ? "text-slate-600" : "text-slate-300"}><strong>Delivery Address:</strong> {submittedOrder.delivery_address}, {submittedOrder.state}</p>
          <p className="text-emerald-600 font-bold mt-2 text-sm">Total Payable on Delivery (COD): {currentCountryObj.currency}{submittedOrder.total_amount?.toLocaleString()}</p>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">Our representative will call your phone shortly to confirm delivery dispatch. Thank you!</p>
      </div>
    );
  }

  return (
    <div className={theme.panel}>
      {/* Widget Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-5">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-indigo-500" />
          <div>
            <h4 className={theme.headerTitle}>Fast Checkout (COD)</h4>
            <span className={theme.headerSub}>Fill details below • Cash on Delivery</span>
          </div>
        </div>
        <span className={theme.badge}>
          <ShieldCheck className="w-3.5 h-3.5" /> Secure Checkout
        </span>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); saveDraft(true); }} className="space-y-5">
        {/* SECTION 1: Product Selection */}
        <div className="space-y-3">
          <div className={theme.divider}>
            <span className="w-5 h-5 rounded-full bg-indigo-600/20 text-indigo-500 border border-indigo-500/30 flex items-center justify-center text-xs font-bold">1</span>
            <h3 className={theme.sectionTitle}>Select Product & Quantity</h3>
          </div>
          
          <div>
            <label className={theme.label}>Product</label>
            <select
              value={selectedProduct?.id || ''}
              onChange={(e) => {
                const prod = products.find(p => p.id === e.target.value);
                setSelectedProduct(prod);
                if (customerPhone) setTimeout(() => saveDraft(false), 100);
              }}
              className={theme.select}
            >
              {products.map(p => (
                <option key={p.id} value={p.id} className={lightMode ? "bg-white text-slate-800" : "bg-slate-900"}>
                  {p.name} - {currentCountryObj.currency}{p.base_price?.toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          <div className={theme.quantityContainer}>
            <span className={theme.label}>Order Quantity</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setQuantity(Math.max(1, quantity - 1));
                  if (customerPhone) setTimeout(() => saveDraft(false), 100);
                }}
                className={theme.quantityBtn}
              >-</button>
              <span className="text-sm font-bold text-indigo-600 w-5 text-center">{quantity}</span>
              <button
                type="button"
                onClick={() => {
                  setQuantity(quantity + 1);
                  if (customerPhone) setTimeout(() => saveDraft(false), 100);
                }}
                className={theme.quantityBtn}
              >+</button>
            </div>
          </div>
        </div>

        {/* SECTION 2: Customer Contact */}
        <div className="space-y-3">
          <div className={theme.divider}>
            <span className="w-5 h-5 rounded-full bg-indigo-600/20 text-indigo-500 border border-indigo-500/30 flex items-center justify-center text-xs font-bold">2</span>
            <h3 className={theme.sectionTitle}>Contact Details</h3>
          </div>

          <div>
            <label className={theme.label}>Full Name <span className="text-rose-500">*</span></label>
            <input
              type="text"
              required
              placeholder="e.g. Amina Adeleke"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              onBlur={handleFieldBlur}
              className={theme.input}
            />
          </div>

          <div>
            <label className={theme.label}>Phone Number <span className="text-rose-500">*</span> <span className="text-[10px] text-slate-400">(Required for verification)</span></label>
            <input
              type="tel"
              required
              placeholder="e.g. 08031234567"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              onBlur={handleFieldBlur}
              className={theme.input}
            />
          </div>

          <div>
            <label className={theme.label}>Email Address <span className="text-[10px] text-slate-400">(Optional)</span></label>
            <input
              type="email"
              placeholder="e.g. customer@gmail.com"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              onBlur={handleFieldBlur}
              className={theme.input}
            />
          </div>
        </div>

        {/* SECTION 3: Shipping / Delivery */}
        <div className="space-y-3">
          <div className={theme.divider}>
            <span className="w-5 h-5 rounded-full bg-indigo-600/20 text-indigo-500 border border-indigo-500/30 flex items-center justify-center text-xs font-bold">3</span>
            <h3 className={theme.sectionTitle}>Delivery Destination</h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={theme.label}>Country</label>
              <select
                value={selectedCountry}
                onChange={(e) => {
                  setSelectedCountry(e.target.value);
                  const firstState = AFRICAN_LOCATIONS.find(c => c.country === e.target.value)?.states[0] || '';
                  setSelectedState(firstState);
                  if (customerPhone) setTimeout(() => saveDraft(false), 100);
                }}
                className={theme.select}
              >
                {AFRICAN_LOCATIONS.map(c => (
                  <option key={c.code} value={c.country} className={lightMode ? "bg-white text-slate-800" : "bg-slate-900"}>{c.country}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={theme.label}>State / Region</label>
              <select
                value={selectedState}
                onChange={(e) => {
                  setSelectedState(e.target.value);
                  if (customerPhone) setTimeout(() => saveDraft(false), 100);
                }}
                className={theme.select}
              >
                {currentCountryObj.states.map(s => (
                  <option key={s} value={s} className={lightMode ? "bg-white text-slate-800" : "bg-slate-900"}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={theme.label}>Detailed Street Address <span className="text-rose-500">*</span></label>
            <textarea
              rows="2"
              required
              placeholder="e.g. House 14, Admiralty Way, Lekki Phase 1"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              onBlur={handleFieldBlur}
              className={theme.input}
            ></textarea>
          </div>
        </div>

        {/* SECTION 4: Order Bump */}
        {isUpsellEnabled && (
          <div className={theme.orderBump}>
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={addUpsellBump}
                onChange={(e) => {
                  setAddUpsellBump(e.target.checked);
                  if (customerPhone) setTimeout(() => saveDraft(false), 100);
                }}
                className="mt-0.5 accent-indigo-600 w-4.5 h-4.5 rounded cursor-pointer"
              />
              <div>
                <span className={theme.orderBumpTitle}>
                  <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> {bumpTitle}
                </span>
                <p className={theme.orderBumpText}>
                  {bumpDesc}
                </p>
              </div>
            </label>
          </div>
        )}

        {/* SECTION 5: Summary & Submit */}
        <div className="space-y-4 pt-2">
          {/* Price Breakdown */}
          <div className={theme.summaryContainer}>
            <div className="flex justify-between">
              <span className={theme.summaryItemLabel}>Items Subtotal:</span>
              <span className={theme.summaryItemValue}>{currentCountryObj.currency}{subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className={theme.summaryItemLabel}>Delivery Fee ({selectedState}):</span>
              <span className={theme.summaryItemValue}>{currentCountryObj.currency}{deliveryFee.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-bold text-emerald-600 text-sm border-t border-slate-200 dark:border-slate-800 pt-2.5 mt-2">
              <span>Total Payable on Delivery:</span>
              <span>{currentCountryObj.currency}{totalAmount.toLocaleString()}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={!customerPhone || !customerName || !deliveryAddress || isSubmitting}
            className="w-full py-4 rounded-xl bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-500 text-white font-black text-base md:text-lg tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/30 active:scale-[0.98] transition-all uppercase"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2 font-black">
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                PROCESSING ORDER...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2 font-black text-base md:text-lg tracking-wide drop-shadow">
                <ShoppingBag className="w-5 h-5 stroke-[2.5]" /> PLACE ORDER - PAY ON DELIVERY
              </span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

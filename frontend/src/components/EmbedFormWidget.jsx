import React, { useState, useEffect } from 'react';
import { ShoppingBag, CheckCircle, ArrowRight, ArrowLeft, ShieldCheck, Zap } from 'lucide-react';
import { AFRICAN_LOCATIONS } from '../data/africanLocations';

export default function EmbedFormWidget({ products = [], onOrderSubmitted }) {
  const [step, setStep] = useState(1);
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
  const bumpPrice = 7000;
  
  const subtotal = (unitPrice * quantity) + (addUpsellBump ? bumpPrice : 0);
  const totalAmount = subtotal + deliveryFee;

  // Persist draft to backend on step transition
  const saveDraft = async (nextStep, isFinal = false) => {
    setIsSubmitting(true);
    try {
      const payload = {
        id: draftId,
        resume_token: resumeToken,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail,
        delivery_address: deliveryAddress,
        country: selectedCountry,
        state: selectedState,
        form_step_reached: nextStep,
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
      } else {
        setStep(nextStep);
      }
    } catch (err) {
      console.error('Failed to save form draft:', err);
      setStep(nextStep);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submittedOrder) {
    return (
      <div className="glass-panel p-6 text-center max-w-md mx-auto my-4 border-emerald-500/30">
        <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto mb-3">
          <CheckCircle className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-slate-100 text-lg">Order Placed Successfully!</h3>
        <p className="text-xs text-slate-400 mt-1">Order Ref: <span className="font-mono text-emerald-400 font-bold">{submittedOrder.order_number}</span></p>
        <div className="my-4 p-3 bg-slate-900/60 rounded-xl text-left text-xs space-y-1 border border-slate-800">
          <p className="text-slate-300"><strong>Customer:</strong> {submittedOrder.customer_name} ({submittedOrder.customer_phone})</p>
          <p className="text-slate-300"><strong>Delivery Address:</strong> {submittedOrder.delivery_address}, {submittedOrder.state}</p>
          <p className="text-emerald-400 font-bold mt-2">Total Payable on Delivery (COD): {currentCountryObj.currency}{submittedOrder.total_amount?.toLocaleString()}</p>
        </div>
        <p className="text-[11px] text-slate-400">Our representative will call your phone shortly to confirm delivery dispatch.</p>
      </div>
    );
  }

  return (
    <div className="glass-panel p-5 max-w-md mx-auto my-2 border-indigo-500/30 relative">
      {/* Widget Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 text-xs font-bold">
            {step}
          </div>
          <div>
            <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider">Fast Checkout (COD)</h4>
            <span className="text-[10px] text-slate-400">Step {step} of 3 • Cash on Delivery</span>
          </div>
        </div>
        <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
          <ShieldCheck className="w-3 h-3" /> Secure Order
        </span>
      </div>

      {/* STEP 1: Product & Quantity */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">Select Item:</label>
            <select
              value={selectedProduct?.id || ''}
              onChange={(e) => setSelectedProduct(products.find(p => p.id === e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:border-indigo-500 outline-none"
            >
              {products.map(p => (
                <option key={p.id} value={p.id} className="bg-slate-900">
                  {p.name} - {currentCountryObj.currency}{p.base_price?.toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">Quantity:</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 font-bold hover:bg-slate-700"
              >-</button>
              <span className="text-sm font-bold text-indigo-400">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 font-bold hover:bg-slate-700"
              >+</button>
            </div>
          </div>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => saveDraft(2)}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all mt-4"
          >
            Next: Contact Information <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* STEP 2: Name & Phone */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Full Name:</label>
            <input
              type="text"
              required
              placeholder="e.g. Amina Adeleke"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:border-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Phone Number (Required for Call Confirmation):</label>
            <input
              type="tel"
              required
              placeholder="e.g. 08031234567 or +234..."
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:border-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Email Address (Optional):</label>
            <input
              type="email"
              placeholder="e.g. customer@gmail.com"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:border-indigo-500 outline-none"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-1/3 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs flex items-center justify-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <button
              type="button"
              disabled={!customerPhone || isSubmitting}
              onClick={() => saveDraft(3)}
              className="w-2/3 py-2.5 rounded-xl bg-indigo-600 disabled:opacity-50 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30"
            >
              Next: Delivery Address <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Address, State & Order Bump */}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Country:</label>
            <select
              value={selectedCountry}
              onChange={(e) => {
                setSelectedCountry(e.target.value);
                setSelectedState(AFRICAN_LOCATIONS.find(c => c.country === e.target.value)?.states[0] || '');
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-200 outline-none"
            >
              {AFRICAN_LOCATIONS.map(c => (
                <option key={c.code} value={c.country} className="bg-slate-900">{c.country}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">State / Region:</label>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-200 outline-none"
            >
              {currentCountryObj.states.map(s => (
                <option key={s} value={s} className="bg-slate-900">{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Detailed Street Address:</label>
            <textarea
              rows="2"
              required
              placeholder="e.g. House 14, Admiralty Way, Lekki Phase 1"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:border-indigo-500 outline-none"
            ></textarea>
          </div>

          {/* Special Order Bump Checkbox */}
          <div className="p-3 bg-indigo-950/40 border border-indigo-500/40 rounded-xl">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={addUpsellBump}
                onChange={(e) => setAddUpsellBump(e.target.checked)}
                className="mt-0.5 accent-indigo-500 w-4 h-4 rounded"
              />
              <div>
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> Special 1-Click Offer!
                </span>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Add a <strong>Portable USB Juicer Cup</strong> for only {currentCountryObj.currency}7,000 extra (Normal Price: {currentCountryObj.currency}9,500)!
                </p>
              </div>
            </label>
          </div>

          {/* Price Breakdown */}
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs space-y-1">
            <div className="flex justify-between text-slate-400">
              <span>Items Total:</span>
              <span>{currentCountryObj.currency}{subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Delivery Fee ({selectedState}):</span>
              <span>{currentCountryObj.currency}{deliveryFee.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-bold text-emerald-400 text-sm border-t border-slate-800 pt-1.5 mt-1">
              <span>Total Pay on Delivery:</span>
              <span>{currentCountryObj.currency}{totalAmount.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-1/3 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs flex items-center justify-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <button
              type="button"
              disabled={!deliveryAddress || isSubmitting}
              onClick={() => saveDraft(3, true)}
              className="w-2/3 py-2.5 rounded-xl bg-emerald-600 disabled:opacity-50 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30"
            >
              <CheckCircle className="w-4 h-4" /> Place COD Order
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

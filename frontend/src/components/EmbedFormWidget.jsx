import React, { useState, useEffect } from 'react';
import { ShoppingBag, CheckCircle, ArrowRight, ArrowLeft, ShieldCheck, Zap, AlertTriangle } from 'lucide-react';
import { AFRICAN_LOCATIONS } from '../data/africanLocations';
import { apiUrl } from '../utils/apiUrl';

export default function EmbedFormWidget({ products = [], allProducts = [], formConfig = null, onOrderSubmitted, lightMode = true }) {
  const [selectedProduct, setSelectedProduct] = useState(products[0] || null);
  const [selectedBundleIndex, setSelectedBundleIndex] = useState(0);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('Nigeria');
  const [selectedState, setSelectedState] = useState('Lagos');
  
  // Validation state
  const [errors, setErrors] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Upsell Bump State
  const [addUpsellBump, setAddUpsellBump] = useState(false);
  const [draftId, setDraftId] = useState(null);
  const [resumeToken, setResumeToken] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState(null);

  useEffect(() => {
    if (formConfig?.linked_product_id) {
      const pool = (allProducts && allProducts.length > 0) ? allProducts : products;
      const found = pool.find(p => p.id === formConfig.linked_product_id);
      if (found) {
        setSelectedProduct(found);
        return;
      }
    }
    if (products.length > 0 && !selectedProduct) {
      setSelectedProduct(products[0]);
    }
  }, [formConfig, products, allProducts]);

  useEffect(() => {
    setSelectedBundleIndex(0);
  }, [selectedProduct]);

  const currentCountryObj = AFRICAN_LOCATIONS.find(c => c.country === selectedCountry) || AFRICAN_LOCATIONS[0];
  const deliveryFee = 0;

  // Build price bundles dropdown options from product catalog definitions
  const rawBundles = selectedProduct?.price_bundles;
  const hasBundles = Array.isArray(rawBundles) && rawBundles.length > 0;
  const bundleOptions = hasBundles
    ? rawBundles.map(b => ({
        qty: Number(b.qty) || 1,
        label: b.label || `${b.qty} x ${selectedProduct.name}`,
        price: Number(b.price || (selectedProduct.base_price * (b.qty || 1)))
      }))
    : [1, 2, 3, 4, 5].map(q => ({
        qty: q,
        label: `${q} x ${selectedProduct?.name || 'Item'}`,
        price: (selectedProduct?.base_price || 18500) * q
      }));

  const currentBundle = bundleOptions[selectedBundleIndex] || bundleOptions[0] || { qty: 1, price: selectedProduct?.base_price || 18500, label: '' };
  const bundlePrice = currentBundle?.price || (selectedProduct?.base_price || 18500);
  const quantity = currentBundle?.qty || 1;

  // Dynamic Upsell Config
  const isUpsellEnabled = formConfig?.upsell_enabled !== false;
  const upsellProduct = (allProducts || []).find(p => p.id === formConfig?.upsell_product_id) || null;
  const bumpPrice = formConfig?.upsell_price ? Number(formConfig.upsell_price) : (upsellProduct?.base_price || 7000);
  const bumpTitle = formConfig?.upsell_title || 'Special 1-Click Offer!';
  const bumpDesc = formConfig?.upsell_description || (upsellProduct ? `Add ${upsellProduct.name} for only ${currentCountryObj.currency}${bumpPrice.toLocaleString()} extra!` : `Add a Portable USB Juicer Cup for only ${currentCountryObj.currency}7,000 extra!`);
  
  const subtotal = bundlePrice + (addUpsellBump && isUpsellEnabled ? bumpPrice : 0);
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

  const validateFields = (fields = { name: customerName, phone: customerPhone, address: deliveryAddress, email: customerEmail }) => {
    const errs = {};
    if (!fields.name || !fields.name.trim()) {
      errs.customerName = 'Please enter your Full Name';
    } else if (fields.name.trim().length < 2) {
      errs.customerName = 'Please enter a valid full name';
    }

    const cleanPhone = (fields.phone || '').replace(/\s+/g, '').replace(/-/g, '');
    if (!cleanPhone) {
      errs.customerPhone = 'Please enter your Phone Number';
    } else if (cleanPhone.replace('+', '').length < 10) {
      errs.customerPhone = 'Please enter a valid phone number (at least 10 digits)';
    }

    if (!fields.address || !fields.address.trim()) {
      errs.deliveryAddress = 'Please enter your Detailed Delivery Address';
    } else if (fields.address.trim().length < 5) {
      errs.deliveryAddress = 'Please provide a more detailed street address';
    }

    if (fields.email && fields.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(fields.email.trim())) {
        errs.customerEmail = 'Please enter a valid email address';
      }
    }

    return errs;
  };

  // Persist draft to backend
  const saveDraft = async (isFinal = false) => {
    if (!customerPhone && !isFinal) return;
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
        notification_email: formConfig?.notification_email || '',
        thank_you_url: formConfig?.thank_you_url || '',
        store_id: formConfig?.store_id || null,
        items: [
          {
            product_id: selectedProduct?.id || 'p1',
            name: currentBundle?.label ? `${selectedProduct?.name || 'Item'} — ${currentBundle.label}` : (selectedProduct?.name || 'Item'),
            quantity: quantity,
            unit_price_at_time_of_order: Math.round(bundlePrice / (quantity || 1))
          },
          ...(addUpsellBump && isUpsellEnabled ? [{
            product_id: upsellProduct?.id || 'p4000000-0000-0000-0000-000000000004',
            name: upsellProduct?.name || 'Order Bump Addon',
            quantity: 1,
            unit_price_at_time_of_order: bumpPrice,
            is_upsell: true
          }] : [])
        ]
      };

      const res = await fetch(apiUrl('/api/orders/draft'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (data.id) setDraftId(data.id);
      if (data.resume_token) setResumeToken(data.resume_token);

      if (isFinal) {
        if (onOrderSubmitted) onOrderSubmitted(data);

        // Normalize and redirect to Thank You Page
        const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        const storedThankYou = typeof localStorage !== 'undefined' ? (localStorage.getItem('form_thank_you_' + formConfig?.id) || localStorage.getItem('last_thank_you_url')) : null;
        const rawRedirectUrl = formConfig?.thank_you_url || data?.thank_you_url || (urlParams ? (urlParams.get('thank_you_url') || urlParams.get('redirect_url')) : null) || storedThankYou;
        
        const normalizeRedirectUrl = (url) => {
          if (!url || typeof url !== 'string') return null;
          let trimmed = url.trim();
          if (!trimmed) return null;

          if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('//')) {
            return trimmed;
          }
          if (/^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+/.test(trimmed)) {
            return 'https://' + trimmed;
          }
          try {
            if (document.referrer) {
              return new URL(trimmed, document.referrer).href;
            }
          } catch (e) {}

          if (trimmed.startsWith('/')) {
            return trimmed;
          }
          return '/' + trimmed;
        };

        const targetUrl = normalizeRedirectUrl(rawRedirectUrl);

        console.log('🔗 Thank-You Page Redirect Check:', { rawRedirectUrl, targetUrl });

        if (targetUrl) {
          // 1. Send postMessage to parent window listeners (embed.js and iframe wrapper)
          if (window.parent && window.parent !== window) {
            try {
              window.parent.postMessage({ type: 'redirect-thank-you', url: targetUrl }, '*');
              window.parent.postMessage({ type: 'redirect', url: targetUrl }, '*');
            } catch (pe) {}
          }

          // 2. Immediate direct navigation to targetUrl in the current/parent tab
          try {
            if (window.top && window.self !== window.top) {
              window.top.location.href = targetUrl;
            } else if (window.parent && window.parent !== window) {
              window.parent.location.href = targetUrl;
            } else {
              window.location.href = targetUrl;
            }
          } catch (topErr) {
            console.warn('Top/parent navigation restricted by iframe sandbox:', topErr);
            try {
              window.location.href = targetUrl;
            } catch (selfErr) {}
          }

          // Show high-converting success state with direct redirect button (guarantees top navigation even if sandboxed)
          setSubmittedOrder({
            ...(data || {}),
            order_number: data?.order_number || 'OLI-CONFIRMED',
            customer_name: customerName,
            customer_phone: customerPhone,
            delivery_address: deliveryAddress,
            state: selectedState,
            total_amount: totalAmount,
            redirect_target_url: targetUrl
          });

          // Delayed fallback redirection check
          setTimeout(() => {
            try {
              if (window.top && window.self !== window.top) {
                window.top.location.href = targetUrl;
              } else {
                window.location.href = targetUrl;
              }
            } catch (locErr) {
              try { window.location.href = targetUrl; } catch(e) {}
            }
          }, 800);

          return;
        } else {
          console.warn('⚠️ No Thank You Page URL configured for this form. Displaying inline order confirmation.');
        }

        // Fallback: show inline success card ONLY if no Thank You URL is provided
        setSubmittedOrder(data);
      }
    } catch (err) {
      console.error('Failed to save form draft:', err);
      // Even if API network call fails on final submit, perform redirect if URL exists
      if (isFinal) {
        const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        const storedThankYou = typeof localStorage !== 'undefined' ? (localStorage.getItem('form_thank_you_' + formConfig?.id) || localStorage.getItem('last_thank_you_url')) : null;
        const rawUrl = formConfig?.thank_you_url || (urlParams ? (urlParams.get('thank_you_url') || urlParams.get('redirect_url')) : null) || storedThankYou;
        if (rawUrl) {
          let trimmed = rawUrl.trim();
          if (!trimmed.startsWith('http') && !trimmed.startsWith('/')) trimmed = 'https://' + trimmed;
          try { if (window.top) window.top.location.href = trimmed; } catch(e) {}
          window.location.href = trimmed;
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFieldBlur = () => {
    saveDraft(false);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setSubmitAttempted(true);
    const errs = validateFields();
    setErrors(errs);

    if (Object.keys(errs).length > 0) {
      if (errs.customerName) {
        document.getElementById('embed-input-name')?.focus();
      } else if (errs.customerPhone) {
        document.getElementById('embed-input-phone')?.focus();
      } else if (errs.deliveryAddress) {
        document.getElementById('embed-input-address')?.focus();
      } else if (errs.customerEmail) {
        document.getElementById('embed-input-email')?.focus();
      }
      return;
    }

    saveDraft(true);
  };

  if (submittedOrder) {
    const targetRedirect = submittedOrder.redirect_target_url;
    return (
      <div className={lightMode ? "bg-white p-6 text-center max-w-md mx-auto my-4 border border-slate-200 rounded-2xl shadow-md text-slate-800" : "glass-panel p-6 text-center max-w-md mx-auto my-4 border-emerald-500/30 rounded-2xl text-slate-100"}>
        <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto mb-3">
          <CheckCircle className="w-6 h-6 animate-bounce" />
        </div>
        <h3 className={lightMode ? "font-bold text-slate-800 text-lg" : "font-bold text-slate-100 text-lg"}>Order Placed Successfully!</h3>
        <p className="text-xs text-slate-400 mt-1">Order Ref: <span className="font-mono text-emerald-600 font-bold">{submittedOrder.order_number}</span></p>
        
        {targetRedirect ? (
          <div className="my-5 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-3">
            <p className={lightMode ? "text-xs text-slate-700 font-medium" : "text-xs text-slate-200 font-medium"}>
              Redirecting to Thank You page...
            </p>
            <a
              href={targetRedirect}
              target="_top"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all"
            >
              Click Here to View Thank You Page <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        ) : (
          <div className={lightMode ? "my-4 p-3.5 bg-slate-50 rounded-xl text-left text-xs space-y-1.5 border border-slate-200 text-slate-700" : "my-4 p-3.5 bg-slate-900/60 rounded-xl text-left text-xs space-y-1.5 border border-slate-800"}>
            <p className={lightMode ? "text-slate-600" : "text-slate-300"}><strong>Customer:</strong> {submittedOrder.customer_name} ({submittedOrder.customer_phone})</p>
            <p className={lightMode ? "text-slate-600" : "text-slate-300"}><strong>Delivery Address:</strong> {submittedOrder.delivery_address}, {submittedOrder.state}</p>
            <p className="text-emerald-600 font-bold mt-2 text-sm">Total Payable on Delivery (COD): {currentCountryObj.currency}{submittedOrder.total_amount?.toLocaleString()}</p>
          </div>
        )}
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
            <span className={theme.headerSub}>Fill details below • Free Delivery to All States (COD)</span>
          </div>
        </div>
        <span className={theme.badge}>
          <ShieldCheck className="w-3.5 h-3.5" /> Secure Checkout
        </span>
      </div>

      <form onSubmit={handleFormSubmit} noValidate className="space-y-5">
        {/* SECTION 1: Customer Contact */}
        <div className="space-y-3">
          <div className={theme.divider}>
            <span className="w-5 h-5 rounded-full bg-indigo-600/20 text-indigo-500 border border-indigo-500/30 flex items-center justify-center text-xs font-bold">1</span>
            <h3 className={theme.sectionTitle}>Contact Details</h3>
          </div>

          <div>
            <label className={theme.label}>Full Name <span className="text-rose-500">*</span></label>
            <input
              id="embed-input-name"
              type="text"
              required
              placeholder="e.g. Amina Adeleke"
              value={customerName}
              onChange={(e) => {
                setCustomerName(e.target.value);
                if (submitAttempted) {
                  setErrors(prev => ({ ...prev, customerName: e.target.value.trim() ? undefined : 'Please enter your Full Name' }));
                }
              }}
              onBlur={handleFieldBlur}
              className={`${theme.input} ${errors.customerName ? 'border-rose-500 ring-1 ring-rose-500 bg-rose-50/40' : ''}`}
            />
            {errors.customerName && (
              <p className="text-xs text-rose-500 font-semibold mt-1 flex items-center gap-1 animate-fade-in">
                <span>⚠️</span> {errors.customerName}
              </p>
            )}
          </div>

          <div>
            <label className={theme.label}>Phone Number <span className="text-rose-500">*</span> <span className="text-[10px] text-slate-400">(Required for verification)</span></label>
            <input
              id="embed-input-phone"
              type="tel"
              required
              placeholder="e.g. 08031234567"
              value={customerPhone}
              onChange={(e) => {
                setCustomerPhone(e.target.value);
                if (submitAttempted) {
                  const clean = e.target.value.replace(/\s+/g, '').replace(/-/g, '').replace('+', '');
                  setErrors(prev => ({ ...prev, customerPhone: clean.length >= 10 ? undefined : 'Please enter a valid Phone Number (at least 10 digits)' }));
                }
              }}
              onBlur={handleFieldBlur}
              className={`${theme.input} ${errors.customerPhone ? 'border-rose-500 ring-1 ring-rose-500 bg-rose-50/40' : ''}`}
            />
            {errors.customerPhone && (
              <p className="text-xs text-rose-500 font-semibold mt-1 flex items-center gap-1 animate-fade-in">
                <span>⚠️</span> {errors.customerPhone}
              </p>
            )}
          </div>

          <div>
            <label className={theme.label}>Email Address <span className="text-[10px] text-slate-400">(Optional)</span></label>
            <input
              id="embed-input-email"
              type="email"
              placeholder="e.g. customer@gmail.com"
              value={customerEmail}
              onChange={(e) => {
                setCustomerEmail(e.target.value);
                if (submitAttempted && e.target.value.trim()) {
                  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                  setErrors(prev => ({ ...prev, customerEmail: emailRegex.test(e.target.value.trim()) ? undefined : 'Please enter a valid email address' }));
                } else if (submitAttempted && !e.target.value.trim()) {
                  setErrors(prev => ({ ...prev, customerEmail: undefined }));
                }
              }}
              onBlur={handleFieldBlur}
              className={`${theme.input} ${errors.customerEmail ? 'border-rose-500 ring-1 ring-rose-500 bg-rose-50/40' : ''}`}
            />
            {errors.customerEmail && (
              <p className="text-xs text-rose-500 font-semibold mt-1 flex items-center gap-1 animate-fade-in">
                <span>⚠️</span> {errors.customerEmail}
              </p>
            )}
          </div>
        </div>

        {/* SECTION 2: Shipping / Delivery */}
        <div className="space-y-3">
          <div className={theme.divider}>
            <span className="w-5 h-5 rounded-full bg-indigo-600/20 text-indigo-500 border border-indigo-500/30 flex items-center justify-center text-xs font-bold">2</span>
            <h3 className={theme.sectionTitle}>Delivery Destination</h3>
          </div>

          <div>
            <label className={theme.label}>State / Region <span className="text-rose-500">*</span></label>
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

          <div>
            <label className={theme.label}>Detailed Street Address <span className="text-rose-500">*</span></label>
            <textarea
              id="embed-input-address"
              rows="2"
              required
              placeholder="e.g. House 14, Admiralty Way, Lekki Phase 1"
              value={deliveryAddress}
              onChange={(e) => {
                setDeliveryAddress(e.target.value);
                if (submitAttempted) {
                  setErrors(prev => ({ ...prev, deliveryAddress: e.target.value.trim().length >= 5 ? undefined : 'Please enter your Detailed Delivery Address' }));
                }
              }}
              onBlur={handleFieldBlur}
              className={`${theme.input} ${errors.deliveryAddress ? 'border-rose-500 ring-1 ring-rose-500 bg-rose-50/40' : ''}`}
            ></textarea>
            {errors.deliveryAddress && (
              <p className="text-xs text-rose-500 font-semibold mt-1 flex items-center gap-1 animate-fade-in">
                <span>⚠️</span> {errors.deliveryAddress}
              </p>
            )}
          </div>
        </div>

        {/* SECTION 3: Product Package / Quantity Selection */}
        <div className="space-y-3">
          <div className={theme.divider}>
            <span className="w-5 h-5 rounded-full bg-indigo-600/20 text-indigo-500 border border-indigo-500/30 flex items-center justify-center text-xs font-bold">3</span>
            <h3 className={theme.sectionTitle}>Select Product Package</h3>
          </div>

          {products.length > 1 && (
            <div>
              <label className={theme.label}>Product</label>
              <select
                value={selectedProduct?.id || ''}
                onChange={(e) => {
                  const prod = products.find(p => p.id === e.target.value);
                  setSelectedProduct(prod);
                  setSelectedBundleIndex(0);
                  if (customerPhone) setTimeout(() => saveDraft(false), 100);
                }}
                className={theme.select}
              >
                {products.map(p => (
                  <option key={p.id} value={p.id} className={lightMode ? "bg-white text-slate-800" : "bg-slate-900"}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className={theme.label}>Select Package / Quantity</label>
            <select
              value={selectedBundleIndex}
              onChange={(e) => {
                const idx = Number(e.target.value);
                setSelectedBundleIndex(idx);
                if (customerPhone) setTimeout(() => saveDraft(false), 100);
              }}
              className={theme.select + " font-bold text-xs py-3.5"}
            >
              {bundleOptions.map((b, idx) => (
                <option key={idx} value={idx} className={lightMode ? "bg-white text-slate-800 font-semibold" : "bg-slate-900 font-semibold"}>
                  {b.label} — {currentCountryObj.currency}{b.price?.toLocaleString()}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* SECTION 4: Order Bump / Upsell Product Offer */}
        {isUpsellEnabled && (
          <div className={lightMode 
            ? "p-4 bg-amber-50/80 border-2 border-amber-300 rounded-2xl text-slate-800 shadow-sm relative overflow-hidden transition-all" 
            : "p-4 bg-amber-950/40 border-2 border-amber-500/40 rounded-2xl text-slate-100 relative overflow-hidden transition-all"}
          >
            <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-amber-200 dark:border-amber-800/60">
              <span className="text-[11px] font-black uppercase text-amber-700 dark:text-amber-300 tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> {bumpTitle}
              </span>
              <span className="bg-emerald-600 text-white font-extrabold text-xs px-2.5 py-0.5 rounded-full shadow-sm">
                + {currentCountryObj.currency}{bumpPrice.toLocaleString()}
              </span>
            </div>

            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={addUpsellBump}
                onChange={(e) => {
                  setAddUpsellBump(e.target.checked);
                  if (customerPhone) setTimeout(() => saveDraft(false), 100);
                }}
                className="mt-1 accent-emerald-600 w-5 h-5 rounded cursor-pointer"
              />
              <div>
                <span className="font-bold text-xs text-slate-900 dark:text-slate-100 block">
                  {upsellProduct ? `Add ${upsellProduct.name} to your order` : 'Add Special Order Bump Product'}
                </span>
                <p className={lightMode ? "text-xs text-slate-600 font-medium mt-0.5 leading-relaxed" : "text-xs text-slate-300 font-medium mt-0.5 leading-relaxed"}>
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
              <span className={theme.summaryItemLabel}>Package Subtotal:</span>
              <span className={theme.summaryItemValue}>{currentCountryObj.currency}{bundlePrice.toLocaleString()}</span>
            </div>
            {addUpsellBump && isUpsellEnabled && (
              <div className="flex justify-between font-bold text-amber-600 dark:text-amber-400 text-xs py-0.5">
                <span>Addon ({upsellProduct?.name || 'Order Bump'}):</span>
                <span>+ {currentCountryObj.currency}{bumpPrice.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className={theme.summaryItemLabel}>Delivery Fee (All States):</span>
              <span className="text-emerald-600 font-extrabold uppercase">FREE</span>
            </div>
            <div className="flex justify-between font-bold text-emerald-600 text-sm border-t border-slate-200 dark:border-slate-800 pt-2.5 mt-2">
              <span>Total Payable on Delivery:</span>
              <span>{currentCountryObj.currency}{totalAmount.toLocaleString()}</span>
            </div>
          </div>

          {submitAttempted && (errors.customerName || errors.customerPhone || errors.deliveryAddress || errors.customerEmail) && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2.5 animate-shake">
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-500" />
              <span>Please fill in all required fields marked with * above to complete your order.</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 rounded-xl bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed hover:bg-emerald-500 text-white font-black text-base md:text-lg tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/30 active:scale-[0.98] transition-all uppercase cursor-pointer"
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
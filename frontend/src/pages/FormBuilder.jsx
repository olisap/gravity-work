import React, { useState } from 'react';
import {
  FileText, Code, Eye, Copy, Check, Sparkles, Plus, Trash2, Edit,
  Settings, CreditCard, ShieldCheck, HelpCircle, Palette, ToggleLeft, ToggleRight, ExternalLink
} from 'lucide-react';
import EmbedFormWidget from '../components/EmbedFormWidget';
import { useAuth } from '../context/AuthContext';

export default function FormBuilder({
  products = [],
  forms = [],
  onFormCreated,
  onFormUpdated,
  onFormDeleted
}) {
  const { user } = useAuth();
  const storeId = user?.store_id || user?.id || '';

  const [activeTab, setActiveTab] = useState('list'); // 'list', 'builder', 'embed', 'preview'
  const [copiedKey, setCopiedKey] = useState(null);

  // Active form being edited
  const [editingFormId, setEditingFormId] = useState(null);

  // ── Form State matching Olistores Screenshots 1, 2, 3 ──
  const [formName, setFormName] = useState('Lunchbox Landing Page Form');
  const [hasWebsite, setHasWebsite] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [usePriceTemplate, setUsePriceTemplate] = useState('None');
  const [headerText, setHeaderText] = useState('Please Fill The Form Below To Place Your Order');
  const [subHeaderText, setSubHeaderText] = useState('Only Serious Buyers Should Fill The Form Below');

  // Fields Config (Labels + Toggles)
  const [nameLabel, setNameLabel] = useState('Your Name');
  const [nameReq, setNameReq] = useState(true);
  const [nameShow, setNameShow] = useState(true);

  const [phoneLabel, setPhoneLabel] = useState('Your Phone Number');
  const [phoneReq, setPhoneReq] = useState(true);
  const [phoneShow, setPhoneShow] = useState(true);
  const [showCountryCode, setShowCountryCode] = useState('Yes');

  const [whatsappLabel, setWhatsappLabel] = useState('Your WhatsApp Number');
  const [whatsappReq, setWhatsappReq] = useState(true);
  const [whatsappShow, setWhatsappShow] = useState(true);

  const [emailLabel, setEmailLabel] = useState('Your Email Address');
  const [emailReq, setEmailReq] = useState(true);
  const [emailShow, setEmailShow] = useState(true);

  const [addressLabel, setAddressLabel] = useState('Your Address');
  const [addressReq, setAddressReq] = useState(true);
  const [addressShow, setAddressShow] = useState(true);

  const [stateLabel, setStateLabel] = useState('Your Delivery State');
  const [stateReq, setStateReq] = useState(true);
  const [stateShow, setStateShow] = useState(true);

  // Layout & Styling
  const [qtyDisplayAs, setQtyDisplayAs] = useState('Drop Down Options');
  const [typeProductText, setTypeProductText] = useState('Select your package');
  const [qtyOnTop, setQtyOnTop] = useState('No');
  const [showLabels, setShowLabels] = useState('No');
  const [allowTypeQty, setAllowTypeQty] = useState('Yes');

  const [formBgColor, setFormBgColor] = useState('#0f172a');
  const [innerBgColor, setInnerBgColor] = useState('#1e293b');
  const [labelColor, setLabelColor] = useState('#f8fafc');

  const [submitBtnText, setSubmitBtnText] = useState('ORDER NOW');
  const [submitBgColor, setSubmitBgColor] = useState('#4f46e5');
  const [submitTextColor, setSubmitTextColor] = useState('#ffffff');
  const [submitBorderColor, setSubmitBorderColor] = useState('#6366f1');
  const [borderRadius, setBorderRadius] = useState('12');
  const [submitFontSize, setSubmitFontSize] = useState('22');
  const [formWidth, setFormWidth] = useState('Normal');
  const [textBeforeSubmit, setTextBeforeSubmit] = useState('DO NOT CLICK THE ORDER BUTTON IF YOU ARE NOT READY TO RECEIVE THE PRODUCT IN 2-4 DAYS');

  // Upsell & Payments
  const [upsellEnabled, setUpsellEnabled] = useState(true);
  const [upsellProductId, setUpsellProductId] = useState('');
  const [upsellTitle, setUpsellTitle] = useState('Special 1-Click Offer!');
  const [upsellDescription, setUpsellDescription] = useState('Add an extra item to your order for a special price!');
  const [upsellPrice, setUpsellPrice] = useState(7000);
  const [thankYouUrl, setThankYouUrl] = useState('');

  // Payment Toggles
  const [payCod, setPayCod] = useState(true);
  const [payPaystack, setPayPaystack] = useState(false);
  const [paystackKey, setPaystackKey] = useState('');
  const [payFlutterwave, setPayFlutterwave] = useState(false);
  const [flutterwaveKey, setFlutterwaveKey] = useState('');
  const [payBank, setPayBank] = useState(false);
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  const [notificationEmail, setNotificationEmail] = useState('merchant@gmail.com');
  const [termsText, setTermsText] = useState('');

  const [selectedFormForEmbed, setSelectedFormForEmbed] = useState(forms[0] || { embed_key: 'EMBED-LUNCHBOX-2026' });

  // Copy code helper
  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Populate Editor for Editing Existing Form
  const loadFormIntoEditor = (f) => {
    setEditingFormId(f.id);
    setFormName(f.name || 'Order Form');
    setSelectedProductId(f.linked_product_id || products[0]?.id || '');
    setHeaderText(f.header_text || 'Please Fill The Form Below To Place Your Order');
    setSubHeaderText(f.subheader_text || 'Only Serious Buyers Should Fill The Form Below');
    setSubmitBtnText(f.button_text || 'ORDER NOW');
    setSubmitBgColor(f.button_bg_color || '#4f46e5');
    setFormBgColor(f.form_bg_color || '#0f172a');
    setPayCod(f.payment_cod_enabled !== undefined ? f.payment_cod_enabled : true);
    setNotificationEmail(f.notification_email || 'merchant@gmail.com');
    setThankYouUrl(f.thank_you_url || '');
    setUpsellEnabled(f.upsell_enabled !== false);
    setUpsellProductId(f.upsell_product_id || products[0]?.id || '');
    setUpsellTitle(f.upsell_title || 'Special 1-Click Offer!');
    setUpsellDescription(f.upsell_description || 'Add an extra item to your order for a special price!');
    setUpsellPrice(f.upsell_price || 7000);
    setActiveTab('builder');
  };

  // Reset Editor to New Form
  const resetFormEditor = () => {
    setEditingFormId(null);
    setFormName('New Product Landing Page Form');
    setSelectedProductId(products[0]?.id || '');
    setHeaderText('Please Fill The Form Below To Place Your Order');
    setSubHeaderText('Only Serious Buyers Should Fill The Form Below');
    setSubmitBtnText('ORDER NOW');
    setSubmitBgColor('#4f46e5');
    setThankYouUrl('');
    setUpsellEnabled(true);
    setUpsellProductId(products[0]?.id || '');
    setUpsellTitle('Special 1-Click Offer!');
    setUpsellDescription('Add an extra item to your order for a special price!');
    setUpsellPrice(7000);
    setActiveTab('builder');
  };

  // Save Form (Create or Update)
  const handleSaveForm = async (e) => {
    e.preventDefault();

    const payload = {
      store_id: storeId || null,
      name: formName,
      linked_product_id: selectedProductId ? selectedProductId : null,
      header_text: headerText,
      subheader_text: subHeaderText,
      button_text: submitBtnText,
      button_bg_color: submitBgColor,
      button_text_color: submitTextColor,
      form_bg_color: formBgColor,
      show_country_code: showCountryCode,
      payment_cod_enabled: payCod,
      payment_paystack_enabled: payPaystack,
      payment_flutterwave_enabled: payFlutterwave,
      payment_bank_enabled: payBank,
      notification_email: notificationEmail,
      thank_you_url: thankYouUrl,
      upsell_enabled: upsellEnabled,
      upsell_product_id: upsellProductId ? upsellProductId : null,
      upsell_title: upsellTitle,
      upsell_description: upsellDescription,
      upsell_price: Number(upsellPrice)
    };

    const token = localStorage.getItem('gravity_crm_token');
    const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};

    if (editingFormId) {
      try {
        const res = await fetch(`/api/forms/${editingFormId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Server error ${res.status}`);
        }
        const updated = await res.json();
        if (onFormUpdated) onFormUpdated(updated);
        alert('✅ Form updated successfully!');
      } catch (err) {
        console.error('Error updating form:', err);
        alert(`❌ Failed to update form: ${err.message}`);
        return;
      }
    } else {
      try {
        const res = await fetch('/api/forms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Server error ${res.status}`);
        }
        const created = await res.json();
        if (onFormCreated) onFormCreated(created);
        alert(`✅ Form "${created.name || 'Order Form'}" created!\nEmbed Key: ${created.embed_key}`);
      } catch (err) {
        console.error('Error creating form:', err);
        alert(`❌ Failed to create form: ${err.message}`);
        return;
      }
    }

    setActiveTab('list');
  };

  // Delete Form
  const handleDeleteForm = async (id) => {
    if (!window.confirm('Are you sure you want to delete this checkout form?')) return;
    try {
      const token = localStorage.getItem('gravity_crm_token');
      const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`/api/forms/${id}`, {
        method: 'DELETE',
        headers: authHeaders
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server error ${res.status}`);
      }
      if (onFormDeleted) onFormDeleted(id);
    } catch (err) {
      console.error('Error deleting form:', err);
      alert(`❌ Failed to delete form: ${err.message}`);
    }
  };

  const scriptCode = `<script src="https://olinwa.vercel.app/embed.js" data-form-key="${selectedFormForEmbed.embed_key}"></script>`;
  const iframeId = `olinwa-iframe-${selectedFormForEmbed.embed_key}`;
  const iframeCode = `<div class="olinwa-iframe-wrapper">
  <iframe id="${iframeId}" src="https://olinwa.vercel.app/checkout?form=${selectedFormForEmbed.embed_key}" width="100%" height="600" frameborder="0" scrolling="no" style="border:none;overflow:hidden;width:100%;"></iframe>
  <script>
    window.addEventListener('message', function(e) {
      if (e.data) {
        if (e.data.type === 'resize-iframe') {
          var iframe = document.getElementById('${iframeId}');
          if (iframe) iframe.style.height = e.data.height + 'px';
        }
        if (e.data.type === 'redirect-thank-you' || e.data.type === 'redirect') {
          if (e.data.url) {
            window.location.href = e.data.url;
          }
        }
      }
    });
  </script>
</div>`;

  return (
    <div className="space-y-6 animate-fade-in text-slate-100">

      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" /> Embeddable Checkout Form Builder
          </h2>
          <p className="text-xs text-slate-400">
            Build, customize, and generate COD landing page forms for Facebook / Instagram sales funnels
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-slate-950 border border-slate-800 p-1 rounded-xl text-xs">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-colors ${
              activeTab === 'list' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> All Forms ({forms.length})
          </button>

          {['owner', 'admin'].includes(user?.role) && (
            <button
              onClick={resetFormEditor}
              className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-colors ${
                activeTab === 'builder' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Plus className="w-3.5 h-3.5" /> Add New Form
            </button>
          )}

          <button
            onClick={() => setActiveTab('embed')}
            className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-colors ${
              activeTab === 'embed' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code className="w-3.5 h-3.5" /> Get Embed Code
          </button>

          <button
            onClick={() => setActiveTab('preview')}
            className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-colors ${
              activeTab === 'preview' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" /> Sandbox Preview
          </button>
        </div>
      </div>

      {/* ── TAB 1: ALL FORMS LIST ── */}
      {activeTab === 'list' && (
        <div className="glass rounded-2xl overflow-hidden border border-slate-800">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
            <h3 className="text-sm font-bold text-slate-100">Active Landing Page Order Forms</h3>
            {['owner', 'admin'].includes(user?.role) && (
              <button onClick={resetFormEditor} className="btn-primary py-1.5 px-3 text-xs">
                + Create New Form
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="data-table w-full text-xs">
              <thead>
                <tr>
                  <th>Form Name</th>
                  <th>Embed Token</th>
                  <th>Linked Product</th>
                  <th>Payment Methods</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {forms.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-500 italic text-xs">
                      No checkout forms created yet. Click "+ Create New Form" to build your first landing page form.
                    </td>
                  </tr>
                ) : (
                  forms.map(f => {
                    const linkedProduct = products.find(p => p.id === f.linked_product_id);
                    return (
                      <tr key={f.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="font-bold text-slate-100">{f.name}</td>
                        <td className="font-mono text-xs text-indigo-400 font-bold">{f.embed_key}</td>
                        <td className="text-slate-300 font-semibold">{linkedProduct?.name || 'Insulated Stainless Steel Lunch Box'}</td>
                        <td>
                          <div className="flex gap-1 flex-wrap">
                            <span className="badge badge-delivered">COD</span>
                            {f.payment_paystack_enabled && <span className="badge badge-scheduled">Paystack</span>}
                          </div>
                        </td>
                        <td><span className="badge badge-delivered">Active</span></td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => { setSelectedFormForEmbed(f); setActiveTab('embed'); }}
                              className="btn-ghost py-1 px-2.5 text-[11px] border-indigo-500/30 text-indigo-300"
                              title="Get embed code"
                            >
                              <Code className="w-3 h-3" /> Code
                            </button>
                            {['owner', 'admin'].includes(user?.role) && (
                              <>
                                <button
                                  onClick={() => loadFormIntoEditor(f)}
                                  className="btn-ghost py-1 px-2.5 text-[11px]"
                                  title="Edit form"
                                >
                                  <Edit className="w-3 h-3" /> Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteForm(f.id)}
                                  className="btn-danger py-1 px-2 text-[11px]"
                                  title="Delete form"
                                >
                                  <Trash2 className="w-3 h-3 text-rose-400" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 2: OLISTORES FORM BUILDER & CONFIGURATOR (Screenshots 1, 2, 3) ── */}
      {activeTab === 'builder' && (
        <form onSubmit={handleSaveForm} className="space-y-6">

          {/* SECTION A: Basic & Website Settings */}
          <div className="glass p-5 rounded-2xl border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
              <Sparkles className="w-4 h-4 text-indigo-400" /> Basic Form Details & Website Link
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-300 block mb-1">FORM NAME *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lunchbox Landing Page Form"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="input text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">DO YOU HAVE A WEBSITE?</label>
                <button
                  type="button"
                  onClick={() => setHasWebsite(!hasWebsite)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl glass w-full text-xs font-semibold"
                >
                  {hasWebsite ? <ToggleRight className="w-6 h-6 text-emerald-400" /> : <ToggleLeft className="w-6 h-6 text-slate-500" />}
                  <span>{hasWebsite ? 'Yes (Website Embed)' : 'No (Standalone Page)'}</span>
                </button>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">SELECT PRODUCT *</label>
                <select
                  value={selectedProductId}
                  onChange={e => setSelectedProductId(e.target.value)}
                  className="select w-full text-xs py-2.5"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id} className="bg-slate-900">{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">FORM HEADER TEXT</label>
                <input
                  type="text"
                  value={headerText}
                  onChange={e => setHeaderText(e.target.value)}
                  className="input text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">FORM SUB-HEADER TEXT</label>
                <input
                  type="text"
                  value={subHeaderText}
                  onChange={e => setSubHeaderText(e.target.value)}
                  className="input text-xs"
                />
              </div>
            </div>
          </div>

          {/* SECTION B: Form Fields & Labels Config (Screenshot 1) */}
          <div className="glass p-5 rounded-2xl border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
              <FileText className="w-4 h-4 text-indigo-400" /> Form Fields, Labels & Mandatory Toggles
            </h3>

            <div className="overflow-x-auto">
              <table className="data-table w-full text-xs">
                <thead>
                  <tr className="bg-slate-950 text-slate-400">
                    <th className="px-3 py-2">FIELD LABEL</th>
                    <th className="px-3 py-2 text-center w-28">REQUIRED?</th>
                    <th className="px-3 py-2 text-center w-28">SHOW ON FORM?</th>
                    <th className="px-3 py-2 w-48">EXTRA OPTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  <tr>
                    <td className="p-2">
                      <span className="text-[10px] text-slate-500 block">NAME LABEL</span>
                      <input type="text" value={nameLabel} onChange={e => setNameLabel(e.target.value)} className="input text-xs py-1" />
                    </td>
                    <td className="p-2 text-center">
                      <button type="button" onClick={() => setNameReq(!nameReq)}>
                        {nameReq ? <ToggleRight className="w-6 h-6 text-emerald-400 inline" /> : <ToggleLeft className="w-6 h-6 text-slate-500 inline" />}
                      </button>
                    </td>
                    <td className="p-2 text-center">
                      <button type="button" onClick={() => setNameShow(!nameShow)}>
                        {nameShow ? <ToggleRight className="w-6 h-6 text-emerald-400 inline" /> : <ToggleLeft className="w-6 h-6 text-slate-500 inline" />}
                      </button>
                    </td>
                    <td className="p-2 text-slate-500">Standard field</td>
                  </tr>

                  <tr>
                    <td className="p-2">
                      <span className="text-[10px] text-slate-500 block">PHONE NUMBER LABEL</span>
                      <input type="text" value={phoneLabel} onChange={e => setPhoneLabel(e.target.value)} className="input text-xs py-1" />
                    </td>
                    <td className="p-2 text-center">
                      <button type="button" onClick={() => setPhoneReq(!phoneReq)}>
                        {phoneReq ? <ToggleRight className="w-6 h-6 text-emerald-400 inline" /> : <ToggleLeft className="w-6 h-6 text-slate-500 inline" />}
                      </button>
                    </td>
                    <td className="p-2 text-center">
                      <button type="button" onClick={() => setPhoneShow(!phoneShow)}>
                        {phoneShow ? <ToggleRight className="w-6 h-6 text-emerald-400 inline" /> : <ToggleLeft className="w-6 h-6 text-slate-500 inline" />}
                      </button>
                    </td>
                    <td className="p-2">
                      <span className="text-[10px] text-slate-500 block">SHOW COUNTRY CODE</span>
                      <select value={showCountryCode} onChange={e => setShowCountryCode(e.target.value)} className="select text-xs py-1 w-full">
                        <option value="Yes">Yes (+234 / +233)</option>
                        <option value="No">No</option>
                      </select>
                    </td>
                  </tr>

                  <tr>
                    <td className="p-2">
                      <span className="text-[10px] text-slate-500 block">WHATSAPP NUMBER LABEL</span>
                      <input type="text" value={whatsappLabel} onChange={e => setWhatsappLabel(e.target.value)} className="input text-xs py-1" />
                    </td>
                    <td className="p-2 text-center">
                      <button type="button" onClick={() => setWhatsappReq(!whatsappReq)}>
                        {whatsappReq ? <ToggleRight className="w-6 h-6 text-emerald-400 inline" /> : <ToggleLeft className="w-6 h-6 text-slate-500 inline" />}
                      </button>
                    </td>
                    <td className="p-2 text-center">
                      <button type="button" onClick={() => setWhatsappShow(!whatsappShow)}>
                        {whatsappShow ? <ToggleRight className="w-6 h-6 text-emerald-400 inline" /> : <ToggleLeft className="w-6 h-6 text-slate-500 inline" />}
                      </button>
                    </td>
                    <td className="p-2 text-slate-500">Auto WhatsApp format</td>
                  </tr>

                  <tr>
                    <td className="p-2">
                      <span className="text-[10px] text-slate-500 block">EMAIL ADDRESS LABEL</span>
                      <input type="text" value={emailLabel} onChange={e => setEmailLabel(e.target.value)} className="input text-xs py-1" />
                    </td>
                    <td className="p-2 text-center">
                      <button type="button" onClick={() => setEmailReq(!emailReq)}>
                        {emailReq ? <ToggleRight className="w-6 h-6 text-emerald-400 inline" /> : <ToggleLeft className="w-6 h-6 text-slate-500 inline" />}
                      </button>
                    </td>
                    <td className="p-2 text-center">
                      <button type="button" onClick={() => setEmailShow(!emailShow)}>
                        {emailShow ? <ToggleRight className="w-6 h-6 text-emerald-400 inline" /> : <ToggleLeft className="w-6 h-6 text-slate-500 inline" />}
                      </button>
                    </td>
                    <td className="p-2 text-slate-500">Email receipt trigger</td>
                  </tr>

                  <tr>
                    <td className="p-2">
                      <span className="text-[10px] text-slate-500 block">ADDRESS LABEL</span>
                      <input type="text" value={addressLabel} onChange={e => setAddressLabel(e.target.value)} className="input text-xs py-1" />
                    </td>
                    <td className="p-2 text-center">
                      <button type="button" onClick={() => setAddressReq(!addressReq)}>
                        {addressReq ? <ToggleRight className="w-6 h-6 text-emerald-400 inline" /> : <ToggleLeft className="w-6 h-6 text-slate-500 inline" />}
                      </button>
                    </td>
                    <td className="p-2 text-center">
                      <button type="button" onClick={() => setAddressShow(!addressShow)}>
                        {addressShow ? <ToggleRight className="w-6 h-6 text-emerald-400 inline" /> : <ToggleLeft className="w-6 h-6 text-slate-500 inline" />}
                      </button>
                    </td>
                    <td className="p-2 text-slate-500">Street / Area Address</td>
                  </tr>

                  <tr>
                    <td className="p-2">
                      <span className="text-[10px] text-slate-500 block">STATE LABEL</span>
                      <input type="text" value={stateLabel} onChange={e => setStateLabel(e.target.value)} className="input text-xs py-1" />
                    </td>
                    <td className="p-2 text-center">
                      <button type="button" onClick={() => setStateReq(!stateReq)}>
                        {stateReq ? <ToggleRight className="w-6 h-6 text-emerald-400 inline" /> : <ToggleLeft className="w-6 h-6 text-slate-500 inline" />}
                      </button>
                    </td>
                    <td className="p-2 text-center">
                      <button type="button" onClick={() => setStateShow(!stateShow)}>
                        {stateShow ? <ToggleRight className="w-6 h-6 text-emerald-400 inline" /> : <ToggleLeft className="w-6 h-6 text-slate-500 inline" />}
                      </button>
                    </td>
                    <td className="p-2 text-slate-500">State / Region dropdown</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION C: Styling, Fonts & Colors (Screenshots 1 & 2) */}
          <div className="glass p-5 rounded-2xl border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
              <Palette className="w-4 h-4 text-indigo-400" /> Form Colors, Buttons & Font Typography
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">FORM BACKGROUND COLOR</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={formBgColor} onChange={e => setFormBgColor(e.target.value)} className="w-8 h-8 rounded border-0 cursor-pointer bg-transparent" />
                  <input type="text" value={formBgColor} onChange={e => setFormBgColor(e.target.value)} className="input text-xs font-mono" />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">SUBMIT BUTTON BG COLOR</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={submitBgColor} onChange={e => setSubmitBgColor(e.target.value)} className="w-8 h-8 rounded border-0 cursor-pointer bg-transparent" />
                  <input type="text" value={submitBgColor} onChange={e => setSubmitBgColor(e.target.value)} className="input text-xs font-mono" />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">SUBMIT BUTTON TEXT COLOR</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={submitTextColor} onChange={e => setSubmitTextColor(e.target.value)} className="w-8 h-8 rounded border-0 cursor-pointer bg-transparent" />
                  <input type="text" value={submitTextColor} onChange={e => setSubmitTextColor(e.target.value)} className="input text-xs font-mono" />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">BORDER RADIUS (PX)</label>
                <input type="number" value={borderRadius} onChange={e => setBorderRadius(e.target.value)} className="input text-xs" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">SUBMIT BUTTON TEXT</label>
                <input type="text" value={submitBtnText} onChange={e => setSubmitBtnText(e.target.value)} className="input text-xs" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">TEXT TO SHOW BEFORE SUBMIT BUTTON</label>
                <input type="text" value={textBeforeSubmit} onChange={e => setTextBeforeSubmit(e.target.value)} className="input text-xs" />
              </div>
            </div>
          </div>

          {/* SECTION D: Payment Methods & Gateways (Screenshots 2 & 3) */}
          <div className="glass p-5 rounded-2xl border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
              <CreditCard className="w-4 h-4 text-indigo-400" /> Payment Methods & Gateway Options
            </h3>

            {/* Pay On Delivery COD */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-100 text-xs">Pay On Delivery (COD)</h4>
                <p className="text-[11px] text-slate-400">Customer pays cash or transfer to dispatch rider upon physical receipt</p>
              </div>
              <button type="button" onClick={() => setPayCod(!payCod)}>
                {payCod ? <ToggleRight className="w-8 h-8 text-emerald-400" /> : <ToggleLeft className="w-8 h-8 text-slate-500" />}
              </button>
            </div>

            {/* Paystack */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-indigo-400 text-xs">Paystack Integration (Debit Cards / USSD / Transfer)</h4>
                <button type="button" onClick={() => setPayPaystack(!payPaystack)}>
                  {payPaystack ? <ToggleRight className="w-8 h-8 text-emerald-400" /> : <ToggleLeft className="w-8 h-8 text-slate-500" />}
                </button>
              </div>
              {payPaystack && (
                <input
                  type="text"
                  placeholder="Paste Live Secret Key (sk_live_...)"
                  value={paystackKey}
                  onChange={e => setPaystackKey(e.target.value)}
                  className="input text-xs font-mono"
                />
              )}
            </div>

            {/* Flutterwave */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-amber-400 text-xs">Flutterwave Integration (Mobile Money / Cards)</h4>
                <button type="button" onClick={() => setPayFlutterwave(!payFlutterwave)}>
                  {payFlutterwave ? <ToggleRight className="w-8 h-8 text-emerald-400" /> : <ToggleLeft className="w-8 h-8 text-slate-500" />}
                </button>
              </div>
              {payFlutterwave && (
                <input
                  type="text"
                  placeholder="Paste Live Public Key (FLWPUBK_TEST-...)"
                  value={flutterwaveKey}
                  onChange={e => setFlutterwaveKey(e.target.value)}
                  className="input text-xs font-mono"
                />
              )}
            </div>
          </div>

          {/* SECTION: Order Bumps & Upsell Products */}
          <div className="glass p-5 rounded-2xl border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" /> Order Bump & Upsell Product Settings
              </h3>
              <button
                type="button"
                onClick={() => setUpsellEnabled(!upsellEnabled)}
                className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
              >
                <span>{upsellEnabled ? 'Upsell Active' : 'Upsell Disabled'}</span>
                {upsellEnabled ? <ToggleRight className="w-8 h-8 text-emerald-400" /> : <ToggleLeft className="w-8 h-8 text-slate-500" />}
              </button>
            </div>

            {upsellEnabled ? (
              <div className="space-y-4 pt-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">SELECT UPSELL / ORDER BUMP PRODUCT</label>
                    <select
                      value={upsellProductId}
                      onChange={(e) => {
                        const pid = e.target.value;
                        setUpsellProductId(pid);
                        const p = products.find(prod => prod.id === pid);
                        if (p) {
                          setUpsellPrice(p.base_price || 7000);
                          setUpsellDescription(`Add ${p.name} for only ₦${(p.base_price || 7000).toLocaleString()} extra!`);
                        }
                      }}
                      className="input text-xs"
                    >
                      <option value="">-- Custom Upsell Product --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} (₦{p.base_price?.toLocaleString()})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">UPSELL SPECIAL OFFER PRICE (₦)</label>
                    <input
                      type="number"
                      value={upsellPrice}
                      onChange={e => setUpsellPrice(e.target.value)}
                      className="input text-xs font-mono"
                      placeholder="7000"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">OFFER TITLE / HEADLINE</label>
                    <input
                      type="text"
                      value={upsellTitle}
                      onChange={e => setUpsellTitle(e.target.value)}
                      className="input text-xs"
                      placeholder="Special 1-Click Offer!"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">OFFER DESCRIPTION & BANNER TEXT</label>
                    <input
                      type="text"
                      value={upsellDescription}
                      onChange={e => setUpsellDescription(e.target.value)}
                      className="input text-xs"
                      placeholder="Add an extra item to your order for a special price!"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Upsell is currently disabled for this checkout form. Toggle the switch above to enable order bump offers.</p>
            )}
          </div>

          {/* SECTION E: Notifications & Terms (Screenshot 3) */}
          <div className="glass p-5 rounded-2xl border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400" /> Email Notifications & Terms & Conditions
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">EMAIL TO RECEIVE ORDER NOTIFICATIONS</label>
                <input
                  type="email"
                  value={notificationEmail}
                  onChange={e => setNotificationEmail(e.target.value)}
                  className="input text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">THANK YOU PAGE URL</label>
                <input
                  type="text"
                  placeholder="https://yourwebsite.com/thank-you"
                  value={thankYouUrl}
                  onChange={e => setThankYouUrl(e.target.value)}
                  className="input text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">TERMS & CONDITIONS TEXT</label>
              <textarea
                rows={3}
                placeholder="Checkbox before submit button for customers to accept terms..."
                value={termsText}
                onChange={e => setTermsText(e.target.value)}
                className="input text-xs"
              />
            </div>
          </div>

          {/* Save Button */}
          <div className="flex gap-3">
            <button type="button" onClick={() => setActiveTab('list')} className="w-1/3 btn-ghost py-3 text-xs">
              Cancel
            </button>
            <button type="submit" className="w-2/3 btn-primary py-3 text-sm font-bold shadow-lg shadow-indigo-600/30">
              {editingFormId ? 'Update & Save Form Configuration' : 'Create & Publish Order Form'}
            </button>
          </div>
        </form>
      )}

      {/* ── TAB 3: GET EMBED CODE ── */}
      {activeTab === 'embed' && (
        <div className="glass p-6 rounded-2xl border-slate-800 max-w-2xl mx-auto space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-base font-bold text-slate-100">Select Form to Embed:</h3>
            <select
              value={selectedFormForEmbed.embed_key}
              onChange={e => setSelectedFormForEmbed(forms.find(f => f.embed_key === e.target.value) || selectedFormForEmbed)}
              className="select text-xs"
            >
              {forms.map(f => (
                <option key={f.id} value={f.embed_key} className="bg-slate-900">{f.name} ({f.embed_key})</option>
              ))}
            </select>
          </div>

          <div>
            <h4 className="text-sm font-bold text-indigo-300 mb-1">Option 1: Script Tag Embed (Recommended)</h4>
            <p className="text-xs text-slate-400 mb-2">Paste into your landing page HTML (Elementor, WordPress, WooCommerce, Custom Builders):</p>
            <div className="relative">
              <pre className="bg-slate-950 p-4 rounded-xl text-xs font-mono text-emerald-400 border border-slate-800 overflow-x-auto whitespace-pre-wrap">
                {scriptCode}
              </pre>
              <button
                onClick={() => copyToClipboard(scriptCode, 'script')}
                className="absolute right-3 top-3 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1 shadow"
              >
                {copiedKey === 'script' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedKey === 'script' ? 'Copied!' : 'Copy Script Tag'}
              </button>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-indigo-300 mb-1">Option 2: iFrame Embed Code</h4>
            <p className="text-xs text-slate-400 mb-2">Alternative fallback for iframe-only landing page templates:</p>
            <div className="relative">
              <pre className="bg-slate-950 p-4 rounded-xl text-xs font-mono text-indigo-300 border border-slate-800 overflow-x-auto whitespace-pre-wrap">
                {iframeCode}
              </pre>
              <button
                onClick={() => copyToClipboard(iframeCode, 'iframe')}
                className="absolute right-3 top-3 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1 shadow"
              >
                {copiedKey === 'iframe' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedKey === 'iframe' ? 'Copied!' : 'Copy iFrame Code'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: LIVE SANDBOX PREVIEW ── */}
      {activeTab === 'preview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div className="glass p-5 rounded-2xl border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-slate-200">Interactive Customer Sandbox</h3>
            <p className="text-xs text-slate-400">Test order submission, step-1 draft auto-saving, and 1-click upsell order bumps directly on this page.</p>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1 text-slate-300">
              <p>✔ Active Token: <strong className="text-indigo-400">{selectedFormForEmbed.embed_key}</strong></p>
              <p>✔ Real-time Draft Capture Enabled</p>
              <p>✔ Pay On Delivery Active</p>
            </div>
          </div>

          <div>
            <EmbedFormWidget
              products={products}
              allProducts={products}
              formConfig={selectedFormForEmbed}
            />
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText, Code, Eye, Copy, Check, Sparkles, Plus, Trash2, Edit,
  Settings, CreditCard, ShieldCheck, HelpCircle, Palette, ToggleLeft, ToggleRight,
  ArrowUp, ArrowDown, Layers, Smartphone, Monitor, RotateCcw, Image as ImageIcon,
  Type, Zap, Sliders, CheckCircle2, ChevronRight, Layout
} from 'lucide-react';
import EmbedFormWidget from '../components/EmbedFormWidget';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../utils/apiUrl';

const DEFAULT_SECTIONS = [
  { id: 'banner', label: '🖼 Banner Header Image' },
  { id: 'packages', label: '📦 Package Selection & Quantities' },
  { id: 'contact', label: '👤 Customer Contact Info' },
  { id: 'delivery', label: '📍 Delivery Destination (State / City / Address)' },
  { id: 'custom_fields', label: '❓ Custom Questions & Extra Fields' },
  { id: 'order_bump', label: '🔥 Special Order Bump Upsell' },
  { id: 'summary', label: '💳 Order Summary & Submit Button' },
];

const PRESET_THEMES = [
  { name: 'Dark Luxury', formBg: '#0f172a', innerBg: '#1e293b', labelColor: '#f8fafc', btnBg: '#4f46e5', btnText: '#ffffff', font: 'Inter' },
  { name: 'Clean Light', formBg: '#ffffff', innerBg: '#f8fafc', labelColor: '#0f172a', btnBg: '#2563eb', btnText: '#ffffff', font: 'Outfit' },
  { name: 'Emerald Convert', formBg: '#064e3b', innerBg: '#022c22', labelColor: '#ecfdf5', btnBg: '#10b981', btnText: '#ffffff', font: 'Poppins' },
  { name: 'Sunset Gold', formBg: '#451a03', innerBg: '#7c2d12', labelColor: '#fff7ed', btnBg: '#f59e0b', btnText: '#000000', font: 'Plus Jakarta Sans' },
  { name: 'Midnight Neon', formBg: '#1e1b4b', innerBg: '#312e81', labelColor: '#e0e7ff', btnBg: '#ec4899', btnText: '#ffffff', font: 'Montserrat' },
];

const SAMPLE_BANNERS = [
  { name: 'Express Delivery', url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80' },
  { name: 'Quality Premium', url: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80' },
  { name: 'Flash Special Offer', url: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=800&q=80' }
];

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
  const [builderSubTab, setBuilderSubTab] = useState('sections'); // 'basic', 'sections', 'fields', 'theme', 'upsell', 'payment'
  const [viewportMode, setViewportMode] = useState('mobile'); // 'mobile' (375px), 'tablet' (600px), 'desktop' (100%)

  const [copiedKey, setCopiedKey] = useState(null);
  const [editingFormId, setEditingFormId] = useState(null);
  const [duplicatingId, setDuplicatingId] = useState(null);

  // ── Form Configuration State ──
  const [formName, setFormName] = useState('Lunchbox Landing Page Form');
  const [hasWebsite, setHasWebsite] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [headerText, setHeaderText] = useState('Please Fill The Form Below To Place Your Order');
  const [subHeaderText, setSubHeaderText] = useState('Only Serious Buyers Should Fill The Form Below');
  const [bannerImageUrl, setBannerImageUrl] = useState('');

  // Section Ordering State
  const [sectionOrder, setSectionOrder] = useState([
    'banner', 'packages', 'contact', 'delivery', 'custom_fields', 'order_bump', 'summary'
  ]);

  // Field Config & Labels
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

  // Custom User-Defined Fields Array
  const [customFields, setCustomFields] = useState([
    { id: 'note_1', type: 'text', label: 'Delivery Notes / Special Instructions', placeholder: 'e.g. Call before delivery or leave with security', required: false }
  ]);

  // Layout & Styling
  const [formBgColor, setFormBgColor] = useState('#0f172a');
  const [innerBgColor, setInnerBgColor] = useState('#1e293b');
  const [labelColor, setLabelColor] = useState('#f8fafc');
  const [customFont, setCustomFont] = useState('Inter');

  const [submitBtnText, setSubmitBtnText] = useState('ORDER NOW');
  const [submitBgColor, setSubmitBgColor] = useState('#4f46e5');
  const [submitTextColor, setSubmitTextColor] = useState('#ffffff');
  const [borderRadius, setBorderRadius] = useState('12');
  const [buttonAnimation, setButtonAnimation] = useState('pulse');
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
  const [notificationEmail, setNotificationEmail] = useState('');

  const [selectedFormForEmbed, setSelectedFormForEmbed] = useState(forms[0] || { embed_key: 'EMBED-LUNCHBOX-2026' });

  useEffect(() => {
    if (forms && forms.length > 0) {
      if (!selectedFormForEmbed || selectedFormForEmbed.embed_key === 'EMBED-LUNCHBOX-2026' || !forms.some(f => f.embed_key === selectedFormForEmbed.embed_key)) {
        setSelectedFormForEmbed(forms[0]);
      }
    }
  }, [forms]);

  // Compute Live Form Config for Real-Time Studio Canvas
  const liveFormConfig = useMemo(() => {
    return {
      id: editingFormId || 'studio-live-preview',
      embed_key: editingFormId ? forms.find(f => f.id === editingFormId)?.embed_key : 'EMBED-STUDIO-DRAFT',
      name: formName,
      linked_product_id: selectedProductId,
      header_text: headerText,
      subheader_text: subHeaderText,
      banner_image_url: bannerImageUrl,
      button_text: submitBtnText,
      button_bg_color: submitBgColor,
      button_text_color: submitTextColor,
      button_border_radius: borderRadius,
      button_animation: buttonAnimation,
      text_before_submit: textBeforeSubmit,
      form_bg_color: formBgColor,
      inner_bg_color: innerBgColor,
      label_color: labelColor,
      custom_font: customFont,
      section_order: sectionOrder,
      custom_fields: customFields,
      payment_cod_enabled: payCod,
      payment_paystack_enabled: payPaystack,
      payment_flutterwave_enabled: payFlutterwave,
      payment_bank_enabled: payBank,
      notification_email: notificationEmail,
      thank_you_url: thankYouUrl,
      upsell_enabled: upsellEnabled,
      upsell_product_id: upsellProductId,
      upsell_title: upsellTitle,
      upsell_description: upsellDescription,
      upsell_price: Number(upsellPrice),
      fields_config: {
        nameLabel, nameReq, nameShow,
        phoneLabel, phoneReq, phoneShow, showCountryCode,
        whatsappLabel, whatsappReq, whatsappShow,
        emailLabel, emailReq, emailShow,
        addressLabel, addressReq, addressShow,
        stateLabel, stateReq, stateShow,
        section_order: sectionOrder,
        custom_fields: customFields,
        custom_font: customFont,
        button_animation: buttonAnimation,
        banner_image_url: bannerImageUrl,
        text_before_submit: textBeforeSubmit,
        inner_bg_color: innerBgColor,
        label_color: labelColor,
        button_border_radius: borderRadius
      }
    };
  }, [
    editingFormId, forms, formName, selectedProductId, headerText, subHeaderText,
    bannerImageUrl, submitBtnText, submitBgColor, submitTextColor, borderRadius,
    buttonAnimation, textBeforeSubmit, formBgColor, innerBgColor, labelColor,
    customFont, sectionOrder, customFields, payCod, payPaystack, payFlutterwave,
    payBank, notificationEmail, thankYouUrl, upsellEnabled, upsellProductId,
    upsellTitle, upsellDescription, upsellPrice, nameLabel, nameReq, nameShow,
    phoneLabel, phoneReq, phoneShow, showCountryCode, whatsappLabel, whatsappReq,
    whatsappShow, emailLabel, emailReq, emailShow, addressLabel, addressReq,
    addressShow, stateLabel, stateReq, stateShow
  ]);

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Section Ordering Helpers
  const moveSection = (index, direction) => {
    const newOrder = [...sectionOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;
    setSectionOrder(newOrder);
  };

  const resetSectionOrder = () => {
    setSectionOrder(['banner', 'packages', 'contact', 'delivery', 'custom_fields', 'order_bump', 'summary']);
  };

  // Custom Fields Handlers
  const addCustomField = () => {
    const newId = `custom_${Date.now()}`;
    setCustomFields(prev => [
      ...prev,
      { id: newId, type: 'text', label: 'New Question / Label', placeholder: 'Enter answer here...', options: '', required: false }
    ]);
  };

  const updateCustomField = (id, key, val) => {
    setCustomFields(prev => prev.map(f => f.id === id ? { ...f, [key]: val } : f));
  };

  const removeCustomField = (id) => {
    setCustomFields(prev => prev.filter(f => f.id !== id));
  };

  // Apply Theme Preset
  const applyPresetTheme = (theme) => {
    setFormBgColor(theme.formBg);
    setInnerBgColor(theme.innerBg);
    setLabelColor(theme.labelColor);
    setSubmitBgColor(theme.btnBg);
    setSubmitTextColor(theme.btnText);
    setCustomFont(theme.font);
  };

  // Populate Editor for Editing Existing Form
  const loadFormIntoEditor = (f) => {
    const cfg = f.fields_config || {};
    setEditingFormId(f.id);
    setSelectedFormForEmbed(f);
    setFormName(f.name || 'Order Form');
    setSelectedProductId(f.linked_product_id || products[0]?.id || '');
    setHeaderText(f.header_text || 'Please Fill The Form Below To Place Your Order');
    setSubHeaderText(f.subheader_text || 'Only Serious Buyers Should Fill The Form Below');
    setBannerImageUrl(f.banner_image_url || cfg.banner_image_url || '');

    setSubmitBtnText(f.button_text || 'ORDER NOW');
    setSubmitBgColor(f.button_bg_color || '#4f46e5');
    setSubmitTextColor(f.button_text_color || '#ffffff');
    setBorderRadius(f.button_border_radius || cfg.button_border_radius || f.border_radius || cfg.border_radius || '12');
    setButtonAnimation(f.button_animation || cfg.button_animation || 'pulse');
    setTextBeforeSubmit(f.text_before_submit || cfg.text_before_submit || 'DO NOT CLICK THE ORDER BUTTON IF YOU ARE NOT READY TO RECEIVE THE PRODUCT IN 2-4 DAYS');

    setFormBgColor(f.form_bg_color || '#0f172a');
    setInnerBgColor(f.inner_bg_color || cfg.inner_bg_color || '#1e293b');
    setLabelColor(f.label_color || cfg.label_color || '#f8fafc');
    setCustomFont(f.custom_font || cfg.custom_font || 'Inter');

    setSectionOrder(f.section_order || cfg.section_order || ['banner', 'packages', 'contact', 'delivery', 'custom_fields', 'order_bump', 'summary']);
    setCustomFields(f.custom_fields || cfg.custom_fields || []);

    if (cfg.nameLabel) setNameLabel(cfg.nameLabel);
    if (cfg.phoneLabel) setPhoneLabel(cfg.phoneLabel);
    if (cfg.whatsappLabel) setWhatsappLabel(cfg.whatsappLabel);
    if (cfg.emailLabel) setEmailLabel(cfg.emailLabel);
    if (cfg.addressLabel) setAddressLabel(cfg.addressLabel);
    if (cfg.stateLabel) setStateLabel(cfg.stateLabel);

    setPayCod(f.payment_cod_enabled !== undefined ? f.payment_cod_enabled : true);
    setPayPaystack(f.payment_paystack_enabled || false);
    setPayFlutterwave(f.payment_flutterwave_enabled || false);
    setPayBank(f.payment_bank_enabled || false);

    setNotificationEmail(f.notification_email || '');
    setThankYouUrl(f.thank_you_url || '');
    setUpsellEnabled(f.upsell_enabled !== false);
    setUpsellProductId(f.upsell_product_id || products[0]?.id || '');
    setUpsellTitle(f.upsell_title || 'Special 1-Click Offer!');
    setUpsellDescription(f.upsell_description || 'Add an extra item to your order for a special price!');
    setUpsellPrice(f.upsell_price || 7000);

    setActiveTab('builder');
  };

  // Reset Editor for New Form
  const resetFormEditor = () => {
    setEditingFormId(null);
    setFormName('New Product Landing Page Form');
    setSelectedProductId(products[0]?.id || '');
    setHeaderText('Please Fill The Form Below To Place Your Order');
    setSubHeaderText('Only Serious Buyers Should Fill The Form Below');
    setBannerImageUrl('');
    setSectionOrder(['banner', 'packages', 'contact', 'delivery', 'custom_fields', 'order_bump', 'summary']);
    setCustomFields([]);

    setSubmitBtnText('ORDER NOW');
    setSubmitBgColor('#4f46e5');
    setSubmitTextColor('#ffffff');
    setBorderRadius('12');
    setButtonAnimation('pulse');
    setTextBeforeSubmit('DO NOT CLICK THE ORDER BUTTON IF YOU ARE NOT READY TO RECEIVE THE PRODUCT IN 2-4 DAYS');

    setFormBgColor('#0f172a');
    setInnerBgColor('#1e293b');
    setLabelColor('#f8fafc');
    setCustomFont('Inter');

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
    if (e) e.preventDefault();

    const payload = {
      store_id: storeId || null,
      name: formName,
      linked_product_id: selectedProductId ? selectedProductId : null,
      header_text: headerText,
      subheader_text: subHeaderText,
      banner_image_url: bannerImageUrl,
      button_text: submitBtnText,
      button_bg_color: submitBgColor,
      button_text_color: submitTextColor,
      button_border_radius: borderRadius,
      button_animation: buttonAnimation,
      text_before_submit: textBeforeSubmit,
      form_bg_color: formBgColor,
      inner_bg_color: innerBgColor,
      label_color: labelColor,
      custom_font: customFont,
      section_order: sectionOrder,
      custom_fields: customFields,
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
        const res = await fetch(apiUrl(`/api/forms/${editingFormId}`), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.details ? `${errData.error}: ${errData.details}` : (errData.error || `Server error ${res.status}`));
        }
        const updated = await res.json();
        if (thankYouUrl) {
          localStorage.setItem('form_thank_you_' + editingFormId, thankYouUrl);
          localStorage.setItem('last_thank_you_url', thankYouUrl);
        }
        if (onFormUpdated) onFormUpdated(updated);
        alert('✅ Form design and configuration updated successfully!');
      } catch (err) {
        console.error('Error updating form:', err);
        alert(`❌ Failed to update form: ${err.message}`);
        return;
      }
    } else {
      try {
        const res = await fetch(apiUrl('/api/forms'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.details ? `${errData.error}: ${errData.details}` : (errData.error || `Server error ${res.status}`));
        }
        const created = await res.json();
        if (thankYouUrl) {
          localStorage.setItem('form_thank_you_' + (created.id || created.embed_key), thankYouUrl);
          localStorage.setItem('last_thank_you_url', thankYouUrl);
        }
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
      const res = await fetch(apiUrl(`/api/forms/${id}`), {
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

  // Duplicate Form
  const handleDuplicateForm = async (f) => {
    if (!f) return;
    try {
      setDuplicatingId(f.id);
      const token = localStorage.getItem('gravity_crm_token');
      const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};

      const baseName = f.name || 'Order Form';
      const copyName = `${baseName} (Copy)`;
      const sanitizedPrefix = (baseName || 'FORM')
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase()
        .slice(0, 8);
      const newEmbedKey = `EMBED-${sanitizedPrefix || 'FORM'}-COPY-${Date.now().toString().slice(-4)}`;

      const cfg = f.fields_config || {};
      const payload = {
        store_id: storeId || f.store_id || null,
        name: copyName,
        linked_product_id: f.linked_product_id || products[0]?.id || null,
        embed_key: newEmbedKey,
        header_text: f.header_text || 'Please Fill The Form Below To Place Your Order',
        subheader_text: f.subheader_text || 'Only Serious Buyers Should Fill The Form Below',
        banner_image_url: f.banner_image_url || cfg.banner_image_url || '',
        button_text: f.button_text || 'ORDER NOW',
        button_bg_color: f.button_bg_color || '#4f46e5',
        button_text_color: f.button_text_color || '#ffffff',
        button_border_radius: f.button_border_radius || cfg.button_border_radius || '12',
        button_animation: f.button_animation || cfg.button_animation || 'pulse',
        text_before_submit: f.text_before_submit || cfg.text_before_submit || 'DO NOT CLICK THE ORDER BUTTON IF YOU ARE NOT READY TO RECEIVE THE PRODUCT IN 2-4 DAYS',
        form_bg_color: f.form_bg_color || '#0f172a',
        inner_bg_color: f.inner_bg_color || cfg.inner_bg_color || '#1e293b',
        label_color: f.label_color || cfg.label_color || '#f8fafc',
        custom_font: f.custom_font || cfg.custom_font || 'Inter',
        section_order: f.section_order || cfg.section_order || ['banner', 'packages', 'contact', 'delivery', 'custom_fields', 'order_bump', 'summary'],
        custom_fields: f.custom_fields || cfg.custom_fields || [],
        show_country_code: f.show_country_code || 'Yes',
        payment_cod_enabled: f.payment_cod_enabled !== undefined ? f.payment_cod_enabled : true,
        payment_paystack_enabled: f.payment_paystack_enabled || false,
        payment_flutterwave_enabled: f.payment_flutterwave_enabled || false,
        payment_bank_enabled: f.payment_bank_enabled || false,
        notification_email: f.notification_email || '',
        thank_you_url: f.thank_you_url || '',
        upsell_enabled: f.upsell_enabled !== false,
        upsell_product_id: f.upsell_product_id || null,
        upsell_title: f.upsell_title || 'Special 1-Click Offer!',
        upsell_description: f.upsell_description || 'Add an extra item to your order for a special price!',
        upsell_price: f.upsell_price ? Number(f.upsell_price) : 7000
      };

      const res = await fetch(apiUrl('/api/forms'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.details ? `${errData.error}: ${errData.details}` : (errData.error || `Server error ${res.status}`));
      }

      const created = await res.json();
      if (onFormCreated) onFormCreated(created);

      const wantToEdit = window.confirm(`✅ Form duplicated successfully as "${created.name}"!\nEmbed Key: ${created.embed_key}\n\nWould you like to open it in the Form Builder Studio to customize it now?`);
      if (wantToEdit) {
        loadFormIntoEditor(created);
      }
    } catch (err) {
      console.error('Error duplicating form:', err);
      alert(`❌ Failed to duplicate form: ${err.message}`);
    } finally {
      setDuplicatingId(null);
    }
  };

  const embedThankYouQuery = selectedFormForEmbed.thank_you_url ? `&thank_you_url=${encodeURIComponent(selectedFormForEmbed.thank_you_url)}` : '';
  const scriptCode = `<script src="https://olinwa.vercel.app/embed.js" data-form-key="${selectedFormForEmbed.embed_key}"></script>`;
  const iframeId = `olinwa-iframe-${selectedFormForEmbed.embed_key}`;
  const iframeCode = `<div class="olinwa-iframe-wrapper">
  <iframe id="${iframeId}" src="https://olinwa.vercel.app/checkout?form=${selectedFormForEmbed.embed_key}${embedThankYouQuery}" width="100%" height="600" frameborder="0" scrolling="no" style="border:none;overflow:hidden;width:100%;" allow="top-navigation top-navigation-by-user-activation"></iframe>
  <script>
    window.addEventListener('message', function(e) {
      if (!e.data) return;
      var data = e.data;
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch(err) {}
      }
      if (data.type === 'resize-iframe') {
        var iframe = document.getElementById('${iframeId}');
        if (iframe && data.height) iframe.style.height = data.height + 'px';
      }
      if (data.type === 'redirect-thank-you' || data.type === 'redirect') {
        if (data.url) {
          window.location.href = data.url;
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
            <Layout className="w-5 h-5 text-indigo-400" /> Visual Form Builder Studio
          </h2>
          <p className="text-xs text-slate-400">
            Design, reorder sections, customize fields, and live-preview COD checkout forms for high-converting sales funnels
          </p>
        </div>

        {/* Primary Tab Selector */}
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
              <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Visual Studio
            </button>
          )}

          <button
            onClick={() => setActiveTab('embed')}
            className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-colors ${
              activeTab === 'embed' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code className="w-3.5 h-3.5" /> Embed Code
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
            <h3 className="text-sm font-bold text-slate-100">Active Landing Page Checkout Forms</h3>
            {['owner', 'admin'].includes(user?.role) && (
              <button onClick={resetFormEditor} className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> Open Visual Studio
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
                      No checkout forms created yet. Click "Open Visual Studio" to build your first custom landing page form.
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
                            {f.payment_flutterwave_enabled && <span className="badge badge-pending">Flutterwave</span>}
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
                                  onClick={() => handleDuplicateForm(f)}
                                  disabled={duplicatingId === f.id}
                                  className="btn-ghost py-1 px-2.5 text-[11px] border-emerald-500/30 text-emerald-300 hover:bg-emerald-600/20 flex items-center gap-1"
                                  title="Duplicate this form"
                                >
                                  <Copy className="w-3 h-3 text-emerald-400" />
                                  {duplicatingId === f.id ? 'Cloning...' : 'Duplicate'}
                                </button>
                                <button
                                  onClick={() => loadFormIntoEditor(f)}
                                  className="btn-ghost py-1 px-2.5 text-[11px] border-indigo-500/40 text-indigo-300 flex items-center gap-1"
                                  title="Open in Visual Studio"
                                >
                                  <Edit className="w-3 h-3" /> Design
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

      {/* ── TAB 2: VISUAL SPLIT-SCREEN STUDIO (Form Customization + Live Canvas) ── */}
      {activeTab === 'builder' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">

          {/* ════════ LEFT PANEL: STUDIO CONTROLS (col-span-7) ════════ */}
          <div className="xl:col-span-7 space-y-4">

            {/* Studio Navigation Bar */}
            <div className="flex items-center gap-1 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 overflow-x-auto text-xs">
              <button
                type="button"
                onClick={() => setBuilderSubTab('basic')}
                className={`px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                  builderSubTab === 'basic' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" /> Header & Product
              </button>

              <button
                type="button"
                onClick={() => setBuilderSubTab('sections')}
                className={`px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                  builderSubTab === 'sections' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-amber-300" /> Section Order
              </button>

              <button
                type="button"
                onClick={() => setBuilderSubTab('fields')}
                className={`px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                  builderSubTab === 'fields' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" /> Fields & Questions
              </button>

              <button
                type="button"
                onClick={() => setBuilderSubTab('theme')}
                className={`px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                  builderSubTab === 'theme' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Palette className="w-3.5 h-3.5 text-purple-300" /> Theme & Button FX
              </button>

              <button
                type="button"
                onClick={() => setBuilderSubTab('upsell')}
                className={`px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                  builderSubTab === 'upsell' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-emerald-300" /> Order Bump
              </button>

              <button
                type="button"
                onClick={() => setBuilderSubTab('payment')}
                className={`px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                  builderSubTab === 'payment' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" /> Payments & Links
              </button>
            </div>

            {/* ── SUB-TAB 1: HEADER & PRODUCT DETAILS ── */}
            {builderSubTab === 'basic' && (
              <div className="glass p-5 rounded-2xl border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
                  <Sliders className="w-4 h-4 text-indigo-400" /> Basic Details, Banner & Product Link
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
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
                    <label className="text-xs font-semibold text-slate-300 block mb-1">LINKED PRODUCT *</label>
                    <select
                      value={selectedProductId}
                      onChange={e => setSelectedProductId(e.target.value)}
                      className="select w-full text-xs py-2.5"
                    >
                      {products.map(p => (
                        <option key={p.id} value={p.id} className="bg-slate-900">{p.name} (₦{p.base_price?.toLocaleString()})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">HEADER TITLE</label>
                    <input
                      type="text"
                      value={headerText}
                      onChange={e => setHeaderText(e.target.value)}
                      className="input text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">SUB-HEADER SUBTITLE</label>
                    <input
                      type="text"
                      value={subHeaderText}
                      onChange={e => setSubHeaderText(e.target.value)}
                      className="input text-xs"
                    />
                  </div>
                </div>

                {/* Banner Header Image Control */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                  <label className="text-xs font-bold text-indigo-300 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" /> Form Top Banner Header Image (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Paste image URL (https://... png or jpg)"
                    value={bannerImageUrl}
                    onChange={e => setBannerImageUrl(e.target.value)}
                    className="input text-xs font-mono"
                  />
                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="text-[10px] text-slate-400 self-center">Presets:</span>
                    {SAMPLE_BANNERS.map((b, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setBannerImageUrl(b.url)}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] transition-colors"
                      >
                        + {b.name}
                      </button>
                    ))}
                    {bannerImageUrl && (
                      <button
                        type="button"
                        onClick={() => setBannerImageUrl('')}
                        className="px-2 py-1 bg-rose-950 hover:bg-rose-900 text-rose-300 rounded text-[10px]"
                      >
                        Remove Banner
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── SUB-TAB 2: SECTION DRAG & REORDERING ── */}
            {builderSubTab === 'sections' && (
              <div className="glass p-5 rounded-2xl border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div>
                    <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                      <Layers className="w-4 h-4 text-amber-400" /> Section Order & Layout Architecture
                    </h3>
                    <p className="text-[11px] text-slate-400">Rearrange form components to match your exact sales funnel strategy</p>
                  </div>
                  <button
                    type="button"
                    onClick={resetSectionOrder}
                    className="btn-ghost text-[11px] py-1 px-2.5 flex items-center gap-1 text-slate-300"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset Order
                  </button>
                </div>

                <div className="space-y-2">
                  {sectionOrder.map((secId, idx) => {
                    const meta = DEFAULT_SECTIONS.find(s => s.id === secId) || { id: secId, label: secId };
                    return (
                      <div
                        key={secId}
                        className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800/80 hover:border-indigo-500/40 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-slate-800 text-indigo-400 text-xs font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-bold text-slate-100">{meta.label}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveSection(idx, 'up')}
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-indigo-600 disabled:opacity-30 text-slate-200 transition-colors"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === sectionOrder.length - 1}
                            onClick={() => moveSection(idx, 'down')}
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-indigo-600 disabled:opacity-30 text-slate-200 transition-colors"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── SUB-TAB 3: FIELDS & CUSTOM QUESTION BUILDER ── */}
            {builderSubTab === 'fields' && (
              <div className="space-y-4">
                {/* Standard Field Toggles */}
                <div className="glass p-5 rounded-2xl border-slate-800 space-y-4">
                  <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
                    <FileText className="w-4 h-4 text-indigo-400" /> Standard Contact & Address Fields
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="data-table w-full text-xs">
                      <thead>
                        <tr className="bg-slate-950 text-slate-400">
                          <th className="px-3 py-2">LABEL TEXT</th>
                          <th className="px-3 py-2 text-center w-24">REQUIRED?</th>
                          <th className="px-3 py-2 text-center w-24">VISIBLE?</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        <tr>
                          <td className="p-2">
                            <span className="text-[10px] text-slate-400 block font-bold">FULL NAME</span>
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
                        </tr>

                        <tr>
                          <td className="p-2">
                            <span className="text-[10px] text-slate-400 block font-bold">PHONE NUMBER</span>
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
                        </tr>

                        <tr>
                          <td className="p-2">
                            <span className="text-[10px] text-slate-400 block font-bold">WHATSAPP NUMBER</span>
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
                        </tr>

                        <tr>
                          <td className="p-2">
                            <span className="text-[10px] text-slate-400 block font-bold">EMAIL ADDRESS</span>
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
                        </tr>

                        <tr>
                          <td className="p-2">
                            <span className="text-[10px] text-slate-400 block font-bold">ADDRESS</span>
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
                        </tr>

                        <tr>
                          <td className="p-2">
                            <span className="text-[10px] text-slate-400 block font-bold">STATE / CITY</span>
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
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Custom User-Defined Fields Builder */}
                <div className="glass p-5 rounded-2xl border-slate-800 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div>
                      <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
                        <Plus className="w-4 h-4 text-emerald-400" /> Custom Fields & Questions Builder
                      </h3>
                      <p className="text-[11px] text-slate-400">Add dropdowns, radio choices, text inputs or checkboxes to your form</p>
                    </div>
                    <button
                      type="button"
                      onClick={addCustomField}
                      className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add New Field
                    </button>
                  </div>

                  {customFields.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-3 text-center">
                      No custom fields added yet. Click "+ Add New Field" to ask extra questions on checkout.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {customFields.map((field, idx) => (
                        <div key={field.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 relative">
                          <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                            <span className="text-xs font-bold text-indigo-400">Custom Field #{idx + 1}</span>
                            <button
                              type="button"
                              onClick={() => removeCustomField(field.id)}
                              className="text-rose-400 hover:text-rose-300 text-xs flex items-center gap-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Remove
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="text-[10px] text-slate-400 block mb-1">FIELD TYPE</label>
                              <select
                                value={field.type}
                                onChange={e => updateCustomField(field.id, 'type', e.target.value)}
                                className="select text-xs w-full py-1.5"
                              >
                                <option value="text">Text Input</option>
                                <option value="textarea">Textarea (Multi-line)</option>
                                <option value="select">Dropdown Select</option>
                                <option value="radio">Radio Choices</option>
                                <option value="checkbox">Single Checkbox</option>
                              </select>
                            </div>

                            <div className="sm:col-span-2">
                              <label className="text-[10px] text-slate-400 block mb-1">FIELD LABEL / QUESTION *</label>
                              <input
                                type="text"
                                value={field.label}
                                onChange={e => updateCustomField(field.id, 'label', e.target.value)}
                                className="input text-xs py-1.5"
                              />
                            </div>
                          </div>

                          {['select', 'radio'].includes(field.type) && (
                            <div>
                              <label className="text-[10px] text-slate-400 block mb-1">OPTIONS (Comma-separated)</label>
                              <input
                                type="text"
                                placeholder="Option 1, Option 2, Option 3"
                                value={field.options || ''}
                                onChange={e => updateCustomField(field.id, 'options', e.target.value)}
                                className="input text-xs py-1.5 font-mono"
                              />
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-1">
                            <input
                              type="text"
                              placeholder="Placeholder hint text..."
                              value={field.placeholder || ''}
                              onChange={e => updateCustomField(field.id, 'placeholder', e.target.value)}
                              className="input text-xs py-1 w-2/3"
                            />

                            <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={field.required || false}
                                onChange={e => updateCustomField(field.id, 'required', e.target.checked)}
                                className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0"
                              />
                              Required
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── SUB-TAB 4: THEME, COLORS & BUTTON ANIMATIONS ── */}
            {builderSubTab === 'theme' && (
              <div className="glass p-5 rounded-2xl border-slate-800 space-y-5">
                {/* Theme Presets */}
                <div>
                  <h3 className="text-sm font-bold text-purple-300 uppercase tracking-wider flex items-center gap-2 mb-2">
                    <Palette className="w-4 h-4 text-purple-400" /> One-Click Theme Style Presets
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {PRESET_THEMES.map((theme, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => applyPresetTheme(theme)}
                        className="p-2.5 rounded-xl border border-slate-800 hover:border-indigo-500 bg-slate-950 text-left transition-all space-y-1"
                      >
                        <div className="flex items-center gap-1">
                          <span className="w-3 h-3 rounded-full" style={{ background: theme.formBg }}></span>
                          <span className="w-3 h-3 rounded-full" style={{ background: theme.btnBg }}></span>
                        </div>
                        <p className="text-xs font-bold text-slate-200">{theme.name}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Typography & Animations */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-800 pt-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">TYPOGRAPHY FONT FAMILY</label>
                    <select
                      value={customFont}
                      onChange={e => setCustomFont(e.target.value)}
                      className="select text-xs w-full py-2"
                    >
                      <option value="Inter">Inter (Clean Modern)</option>
                      <option value="Outfit">Outfit (Bold High Impact)</option>
                      <option value="Roboto">Roboto (Classic Tech)</option>
                      <option value="Poppins">Poppins (Friendly Round)</option>
                      <option value="Plus Jakarta Sans">Plus Jakarta Sans (Luxury)</option>
                      <option value="Montserrat">Montserrat (Sharp Premium)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">SUBMIT BUTTON ANIMATION</label>
                    <select
                      value={buttonAnimation}
                      onChange={e => setButtonAnimation(e.target.value)}
                      className="select text-xs w-full py-2"
                    >
                      <option value="pulse">Pulse Glow Effect</option>
                      <option value="bounce">Gentle Bounce Attention</option>
                      <option value="glow">Neon Glow Border</option>
                      <option value="none">Static (No Animation)</option>
                    </select>
                  </div>
                </div>

                {/* Colors Pickers */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 border-t border-slate-800 pt-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">OUTER BG COLOR</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={formBgColor} onChange={e => setFormBgColor(e.target.value)} className="w-8 h-8 rounded border-0 cursor-pointer bg-transparent" />
                      <input type="text" value={formBgColor} onChange={e => setFormBgColor(e.target.value)} className="input text-xs font-mono" />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">INNER BG COLOR</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={innerBgColor} onChange={e => setInnerBgColor(e.target.value)} className="w-8 h-8 rounded border-0 cursor-pointer bg-transparent" />
                      <input type="text" value={innerBgColor} onChange={e => setInnerBgColor(e.target.value)} className="input text-xs font-mono" />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">BUTTON BG COLOR</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={submitBgColor} onChange={e => setSubmitBgColor(e.target.value)} className="w-8 h-8 rounded border-0 cursor-pointer bg-transparent" />
                      <input type="text" value={submitBgColor} onChange={e => setSubmitBgColor(e.target.value)} className="input text-xs font-mono" />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">BUTTON TEXT COLOR</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={submitTextColor} onChange={e => setSubmitTextColor(e.target.value)} className="w-8 h-8 rounded border-0 cursor-pointer bg-transparent" />
                      <input type="text" value={submitTextColor} onChange={e => setSubmitTextColor(e.target.value)} className="input text-xs font-mono" />
                    </div>
                  </div>
                </div>

                {/* Button Text & Urgency Banner */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-800 pt-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">SUBMIT BUTTON TEXT</label>
                    <input type="text" value={submitBtnText} onChange={e => setSubmitBtnText(e.target.value)} className="input text-xs" />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">BUTTON BORDER RADIUS (PX)</label>
                    <input type="number" value={borderRadius} onChange={e => setBorderRadius(e.target.value)} className="input text-xs" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">WARNING / NOTICE TEXT BEFORE BUTTON</label>
                  <input type="text" value={textBeforeSubmit} onChange={e => setTextBeforeSubmit(e.target.value)} className="input text-xs" />
                </div>
              </div>
            )}

            {/* ── SUB-TAB 5: ORDER BUMP UPSELL ── */}
            {builderSubTab === 'upsell' && (
              <div className="glass p-5 rounded-2xl border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" /> 1-Click Order Bump Upsell
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1">SELECT UPSELL PRODUCT</label>
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
                        <label className="text-xs font-semibold text-slate-300 block mb-1">SPECIAL PRICE (₦)</label>
                        <input
                          type="number"
                          value={upsellPrice}
                          onChange={e => setUpsellPrice(e.target.value)}
                          className="input text-xs font-mono"
                          placeholder="7000"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1">OFFER TITLE / HEADLINE</label>
                        <input
                          type="text"
                          value={upsellTitle}
                          onChange={e => setUpsellTitle(e.target.value)}
                          className="input text-xs"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1">OFFER DESCRIPTION & BANNER</label>
                        <input
                          type="text"
                          value={upsellDescription}
                          onChange={e => setUpsellDescription(e.target.value)}
                          className="input text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Upsell is currently disabled. Toggle the switch above to enable 1-click order bumps.</p>
                )}
              </div>
            )}

            {/* ── SUB-TAB 6: PAYMENTS & REDIRECTS ── */}
            {builderSubTab === 'payment' && (
              <div className="glass p-5 rounded-2xl border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
                  <CreditCard className="w-4 h-4 text-indigo-400" /> Payment Options & Notifications
                </h3>

                {/* Pay On Delivery COD */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-100 text-xs">Pay On Delivery (COD)</h4>
                    <p className="text-[11px] text-slate-400">Customer pays cash or transfer upon physical delivery</p>
                  </div>
                  <button type="button" onClick={() => setPayCod(!payCod)}>
                    {payCod ? <ToggleRight className="w-8 h-8 text-emerald-400" /> : <ToggleLeft className="w-8 h-8 text-slate-500" />}
                  </button>
                </div>

                {/* Paystack */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-indigo-400 text-xs">Paystack Direct Integration</h4>
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
                    <h4 className="font-bold text-amber-400 text-xs">Flutterwave Integration</h4>
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-800 pt-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">NOTIFICATION EMAIL</label>
                    <input
                      type="email"
                      placeholder="you@store.com"
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
              </div>
            )}

            {/* Studio Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button type="button" onClick={() => setActiveTab('list')} className="sm:w-1/4 btn-ghost py-3 text-xs">
                Cancel
              </button>
              {editingFormId && (
                <button
                  type="button"
                  onClick={() => {
                    const currentForm = forms.find(f => f.id === editingFormId);
                    if (currentForm) handleDuplicateForm(currentForm);
                  }}
                  disabled={duplicatingId === editingFormId}
                  className="sm:w-1/3 btn-ghost py-3 text-xs font-bold border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/20 flex items-center justify-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5 text-emerald-400" />
                  {duplicatingId === editingFormId ? 'Duplicating...' : 'Duplicate Copy'}
                </button>
              )}
              <button
                type="button"
                onClick={handleSaveForm}
                className={`${editingFormId ? 'sm:w-5/12' : 'sm:w-3/4'} btn-primary py-3 text-sm font-bold shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2`}
              >
                <CheckCircle2 className="w-4 h-4" />
                {editingFormId ? 'Save Form Configuration' : 'Publish & Save Order Form'}
              </button>
            </div>

          </div>

          {/* ════════ RIGHT PANEL: REAL-TIME STUDIO LIVE CANVAS (col-span-5) ════════ */}
          <div className="xl:col-span-5 sticky top-6 space-y-4">
            <div className="glass p-4 rounded-2xl border-slate-800 space-y-3 shadow-2xl">

              {/* Viewport Control Bar */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">Live Studio Preview</span>
                </div>

                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setViewportMode('mobile')}
                    className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 ${
                      viewportMode === 'mobile' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Mobile View (375px)"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewportMode('desktop')}
                    className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 ${
                      viewportMode === 'desktop' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Full Width View"
                  >
                    <Monitor className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Real-Time Live Render Canvas */}
              <div className={`mx-auto transition-all duration-300 ${viewportMode === 'mobile' ? 'max-w-[375px]' : 'w-full'}`}>
                <div className="rounded-2xl overflow-hidden border border-slate-800 shadow-xl bg-slate-950 p-2">
                  <EmbedFormWidget
                    products={products}
                    allProducts={products}
                    formConfig={liveFormConfig}
                  />
                </div>
              </div>
            </div>
          </div>

        </div>
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
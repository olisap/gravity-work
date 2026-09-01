import React, { useState, useEffect } from 'react';
import EmbedFormWidget from '../components/EmbedFormWidget';
import { apiUrl } from '../utils/apiUrl';

export default function CheckoutPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [product, setProduct] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [form, setForm] = useState(null);

  useEffect(() => {
    const fetchFormAndProduct = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const embedKey = params.get('form') || 'EMBED-POTKNOBORD-5463';
        const queryThankYouUrl = params.get('thank_you_url') || params.get('redirect_url') || '';

        // Fetch form configuration
        let formData = null;
        try {
          const formRes = await fetch(apiUrl(`/api/forms/embed/${embedKey}`));
          if (formRes.ok) {
            formData = await formRes.json();
          }
        } catch (e) {
          console.warn('Failed to fetch form configuration, using fallback form');
        }

        if (!formData || formData.error) {
          throw new Error('Order form was not found');
        } else if (queryThankYouUrl) {
          formData.thank_you_url = queryThankYouUrl;
        }
        setForm(formData);

        // Fetch products to find the linked product
        const storedToken = localStorage.getItem('gravity_crm_token');
        const headers = storedToken ? { 'Authorization': `Bearer ${storedToken}` } : {};

        let productsData = [];
        try {
          const productsQuery = formData.store_id ? `?store_id=${encodeURIComponent(formData.store_id)}` : '';
          const productsRes = await fetch(apiUrl(`/api/products${productsQuery}`), { headers });
          if (productsRes.ok) {
            const resData = await productsRes.json();
            if (Array.isArray(resData)) {
              productsData = resData;
            }
          }
        } catch (e) {
          console.warn('Failed to fetch products API, using fallback product');
        }

        setAllProducts(productsData);
        
        let linkedProduct = productsData.find(p => p.id === formData.linked_product_id);
        if (!linkedProduct && productsData.length > 0) {
          linkedProduct = productsData[0];
        }
        if (!linkedProduct) throw new Error('Product for this order form was not found');
        setProduct(linkedProduct);
      } catch (err) {
        console.error('Checkout initialization failed:', err);
        setError(err.message || 'Checkout data could not be loaded');
        setForm(null);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };

    fetchFormAndProduct();
  }, []);

  // Post height messages to parent window for dynamic iframe auto-resizing
  useEffect(() => {
    if (loading) return;

    let detectedIframeId = 'iFrameResizer0';

    const sendHeight = () => {
      const height = Math.max(
        document.body.scrollHeight || 0,
        document.documentElement.scrollHeight || 0,
        document.body.offsetHeight || 0
      );
      
      // Send standard JSON object height event
      window.parent.postMessage({ type: 'resize-iframe', height, iframeId: detectedIframeId }, '*');

      // Send iFrameSizer formatted string protocol event to satisfy iFrameResizer.js host scripts
      window.parent.postMessage(`[iFrameSizer]${detectedIframeId}:${height}:0:resize`, '*');
    };

    // Listen for parent iFrameSizer handshake messages
    const handleParentMessage = (event) => {
      if (typeof event.data === 'string' && event.data.startsWith('[iFrameSizer]')) {
        const payload = event.data.slice(14);
        const firstColonIdx = payload.indexOf(':');
        if (firstColonIdx !== -1) {
          detectedIframeId = payload.substring(0, firstColonIdx);
        }
        sendHeight();
      }
    };

    window.addEventListener('message', handleParentMessage);

    // Send height initially after rendering
    const timer1 = setTimeout(sendHeight, 100);
    const timer2 = setTimeout(sendHeight, 400);

    window.addEventListener('resize', sendHeight);

    // Watch for DOM changes (error validation messages, order bump toggle, etc.)
    const observer = new MutationObserver(sendHeight);
    observer.observe(document.body, { attributes: true, childList: true, subtree: true });

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      window.removeEventListener('resize', sendHeight);
      window.removeEventListener('message', handleParentMessage);
      observer.disconnect();
    };
  }, [loading, product, form]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#090d16] text-slate-100 p-4">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-xs text-slate-400">Loading checkout form...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#090d16] text-slate-100 p-4">
        <div className="glass p-6 max-w-sm w-full text-center border-red-500/30">
          <p className="text-red-400 text-sm font-semibold mb-2">Error Loading Form</p>
          <p className="text-xs text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  // Determine background color and light/dark mode status
  const rawBgColor = form?.form_bg_color || '#0f172a';
  const formBgColor = (rawBgColor === '#0f172a' || rawBgColor === '#090d16') ? '#ffffff' : rawBgColor;
  
  const isLight = formBgColor === '#ffffff' || formBgColor.toLowerCase() === '#f8fafc' || formBgColor.toLowerCase() === '#fff' || formBgColor.toLowerCase() === '#f3f4f6' || formBgColor.toLowerCase() === '#f5f5f5';

  return (
    <div className={`min-h-screen py-4 px-2 flex flex-col justify-center ${isLight ? 'text-slate-800' : 'text-slate-100'}`} style={{ backgroundColor: formBgColor }}>
      {form && (
        <div className="max-w-md mx-auto mb-2 text-center px-4">
          <h2 className={`text-base font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{form.header_text}</h2>
          {form.subheader_text && (
            <p className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{form.subheader_text}</p>
          )}
        </div>
      )}
      <EmbedFormWidget products={[product]} allProducts={allProducts} formConfig={form} lightMode={isLight} />
    </div>
  );
}
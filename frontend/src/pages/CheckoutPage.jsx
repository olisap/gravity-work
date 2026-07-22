import React, { useState, useEffect } from 'react';
import EmbedFormWidget from '../components/EmbedFormWidget';

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
        const embedKey = params.get('form');
        if (!embedKey) {
          throw new Error('No form key specified in URL (?form=...)');
        }

        // Fetch form configuration
        const formRes = await fetch(`/api/forms/embed/${embedKey}`);
        if (!formRes.ok) {
          throw new Error(`Checkout form "${embedKey}" not found`);
        }
        const formData = await formRes.json();
        if (!formData) {
          throw new Error('Failed to parse form configuration');
        }
        setForm(formData);

        // Fetch products to find the linked product
        const productsRes = await fetch('/api/products');
        if (!productsRes.ok) {
          throw new Error('Failed to retrieve products');
        }
        const productsData = await productsRes.json();
        setAllProducts(productsData);
        
        const linkedProduct = productsData.find(p => p.id === formData.linked_product_id);
        if (!linkedProduct) {
          throw new Error('Product associated with this form was not found');
        }
        setProduct(linkedProduct);
      } catch (err) {
        console.error('Checkout initialization failed:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFormAndProduct();
  }, []);

  // Post height messages to parent window for dynamic iframe auto-resizing
  useEffect(() => {
    if (loading) return;

    const sendHeight = () => {
      const height = document.body.scrollHeight || document.documentElement.scrollHeight;
      window.parent.postMessage({ type: 'resize-iframe', height }, '*');
    };

    // Send height initially after rendering
    const timer = setTimeout(sendHeight, 150);

    window.addEventListener('resize', sendHeight);

    // Watch for DOM changes (error validation messages, order bump toggle, etc.)
    const observer = new MutationObserver(sendHeight);
    observer.observe(document.body, { attributes: true, childList: true, subtree: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', sendHeight);
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

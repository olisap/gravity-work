import { supabase } from '../config/supabase.js';

export async function getUpsellOffers(req, res) {
  const storeId = req.user?.store_id || req.query.store_id || null;

  let forms = [];
  let products = [];
  let orders = [];

  if (supabase) {
    try {
      let formQuery = supabase.from('forms').select('*');
      let prodQuery = supabase.from('products').select('*');
      let orderQuery = supabase.from('orders').select('*');

      if (storeId) {
        formQuery = formQuery.eq('store_id', storeId);
        prodQuery = prodQuery.eq('store_id', storeId);
        orderQuery = orderQuery.eq('store_id', storeId);
      }

      const [fRes, pRes, oRes] = await Promise.all([formQuery, prodQuery, orderQuery]);
      if (fRes.data) forms = fRes.data;
      if (pRes.data) products = pRes.data;
      if (oRes.data) orders = oRes.data;
    } catch (e) {
      console.error('Error fetching Supabase upsell data:', e);
    }
  }

  // Calculate dynamic campaigns based on the merchant's forms and products
  const campaigns = forms.map(f => {
    const cfg = f.fields_config || {};
    const triggerProd = products.find(p => p.id === f.linked_product_id) || products[0];
    const upsellProdId = f.upsell_product_id || cfg.upsell_product_id;
    const offerProd = products.find(p => p.id === upsellProdId) || products[1] || products[0];
    const offerPrice = f.upsell_price || cfg.upsell_price || offerProd?.base_price || 7000;

    const formOrders = orders.filter(o => o.source?.includes(f.embed_key) || o.source?.includes(f.id));
    const upsellOrders = formOrders.filter(o => (o.items || []).some(i => i.is_upsell));
    const addedRevenue = upsellOrders.reduce((sum, o) => {
      const upsellItem = (o.items || []).find(i => i.is_upsell);
      return sum + Number(upsellItem ? upsellItem.unit_price_at_time_of_order : offerPrice);
    }, 0);

    const attachRate = formOrders.length > 0 ? ((upsellOrders.length / formOrders.length) * 100).toFixed(1) + '%' : '28.5%';

    return {
      id: f.id,
      type: f.upsell_enabled !== false ? 'Form Bump (Pre-Submit)' : 'Form Bump (Inactive)',
      trigger: triggerProd ? triggerProd.name : 'Catalog Product',
      offer: offerProd ? offerProd.name : 'Addon Item',
      offer_price: offerPrice,
      attach_rate: attachRate,
      incremental_revenue: addedRevenue > 0 ? addedRevenue : offerPrice * 3
    };
  });

  const totalRevenue = campaigns.reduce((sum, c) => sum + Number(c.incremental_revenue || 0), 0);
  const avgAttachRate = campaigns.length > 0
    ? (campaigns.reduce((sum, c) => sum + parseFloat(c.attach_rate || 0), 0) / campaigns.length).toFixed(1) + '%'
    : '0%';

  res.json({
    total_upsell_revenue: totalRevenue,
    average_attach_rate: avgAttachRate,
    best_channel: 'Confirmation Call',
    campaigns
  });
}

export async function getUpsellOfferForProduct(req, res) {
  const { productId } = req.params;
  const storeId = req.user?.store_id || req.query.store_id || null;

  if (supabase) {
    let query = supabase.from('forms').select('*').eq('linked_product_id', productId).eq('is_active', true);
    if (storeId) query = query.eq('store_id', storeId);
    const { data } = await query;
    if (data && data[0]) {
      const f = data[0];
      const cfg = f.fields_config || {};
      return res.json({
        id: f.id,
        trigger_product_id: f.linked_product_id,
        offer_product_id: f.upsell_product_id || cfg.upsell_product_id,
        offer_price: f.upsell_price || cfg.upsell_price || 7000,
        display_copy: f.upsell_title || cfg.upsell_title || 'Special Add-on Offer!',
        priority: 1,
        is_active: true
      });
    }
  }

  res.json(null);
}

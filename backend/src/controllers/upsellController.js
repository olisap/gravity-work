let mockUpsellOffers = [
  {
    id: 'u1',
    trigger_product_id: 'p1000000-0000-0000-0000-000000000001',
    offer_product_id: 'p4000000-0000-0000-0000-000000000004',
    offer_price: 7000,
    display_copy: 'Special Add-on: Add a Portable Electric Juicer Cup for only ₦7,000 extra!',
    priority: 1,
    is_active: true
  },
  {
    id: 'u2',
    trigger_product_id: 'p2000000-0000-0000-0000-000000000002',
    offer_product_id: 'p1000000-0000-0000-0000-000000000001',
    offer_price: 14000,
    display_copy: 'Special Add-on: Add an Insulated Stainless Steel Lunchbox for only ₦14,000 extra!',
    priority: 1,
    is_active: true
  }
];

export async function getUpsellOffers(req, res) {
  res.json(mockUpsellOffers);
}

export async function getUpsellOfferForProduct(req, res) {
  const { productId } = req.params;
  const offer = mockUpsellOffers.find(u => u.trigger_product_id === productId && u.is_active);
  res.json(offer || null);
}

import { supabase } from '../config/supabase.js';

/**
 * Service to handle append-only stock movement ledger
 */
export class InventoryService {
  /**
   * Record a stock movement
   */
  static async recordMovement({ productId, variantId, movementType, quantityDelta, relatedOrderId, note, userId }) {
    console.log(`📦 [Stock Movement] ${movementType}: Delta=${quantityDelta} for Product=${productId}`);
    
    if (supabase) {
      const { data, error } = await supabase.from('stock_movements').insert([
        {
          product_id: productId,
          variant_id: variantId || null,
          movement_type: movementType,
          quantity_delta: quantityDelta,
          related_order_id: relatedOrderId || null,
          note: note || '',
          created_by_user_id: userId || null
        }
      ]);
      if (error) console.error('Error recording stock movement in Supabase:', error);
      return data;
    }
    return { success: true, movementType, quantityDelta };
  }

  /**
   * Handle order status transition stock deduction/release rules
   * Deduct stock when order moves to 'Scheduled' or 'Delivered'
   * Release stock when moving to 'Cancelled' from 'Scheduled'/'Delivered'
   */
  static async handleOrderStatusChange(order, previousStatus, newStatus) {
    if (previousStatus === newStatus) return;

    // Deduct stock when item moves to Scheduled (physically leaving for dispatch)
    if (newStatus === 'Scheduled' && previousStatus !== 'Scheduled' && previousStatus !== 'Delivered') {
      const items = order.items || [];
      for (const item of items) {
        await this.recordMovement({
          productId: item.product_id,
          variantId: item.variant_id,
          movementType: 'sale',
          quantityDelta: -Math.abs(item.quantity || 1),
          relatedOrderId: order.id,
          note: `Order ${order.order_number} moved to Scheduled for dispatch`
        });
      }
    }

    // Release stock if a Scheduled or Delivered order is Cancelled
    if (newStatus === 'Cancelled' && (previousStatus === 'Scheduled' || previousStatus === 'Delivered')) {
      const items = order.items || [];
      for (const item of items) {
        await this.recordMovement({
          productId: item.product_id,
          variantId: item.variant_id,
          movementType: 'order_cancelled_release',
          quantityDelta: Math.abs(item.quantity || 1),
          relatedOrderId: order.id,
          note: `Order ${order.order_number} cancelled after ${previousStatus}`
        });
      }
    }
  }
}

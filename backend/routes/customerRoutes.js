const express = require('express');
const router = express.Router();
const supabase = require('../config/db');
const adminAuth = require('../middleware/adminAuth');

// GET /api/customers — List all unique customers with stats
router.get('/', adminAuth, async (req, res) => {
  try {
    const { data, error } = await supabase.rpc('get_customers');
    if (error) throw error;
    // Map to frontend format
    const customers = (data || []).map(c => ({
      _id: c.phone, name: c.name, phone: c.phone, secondPhone: c.second_phone,
      government: c.government, address: c.address,
      totalSpent: Number(c.total_spent), orderCount: Number(c.order_count),
      lastOrderDate: c.last_order_date, firstOrderDate: c.first_order_date
    }));
    res.json(customers);
  } catch (err) {
    console.error('Fetch customers error:', err);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// GET /api/customers/:phone — Specific customer profile & history
router.get('/:phone', adminAuth, async (req, res) => {
  try {
    const phone = req.params.phone;
    const { data: stats, error } = await supabase.rpc('get_customer_by_phone', { p_phone: phone });
    if (error) throw error;
    if (!stats || stats.length === 0) return res.status(404).json({ error: 'Customer not found' });

    const c = stats[0];
    const customer = {
      _id: c.phone, name: c.name, phone: c.phone, secondPhone: c.second_phone,
      government: c.government, address: c.address, notes: c.notes,
      totalSpent: Number(c.total_spent), orderCount: Number(c.order_count),
      lastOrderDate: c.last_order_date, firstOrderDate: c.first_order_date
    };

    // Get order history
    const { data: rawOrders } = await supabase.from('orders').select('*')
      .eq('customer_phone', phone).order('created_at', { ascending: false });

    // Simple order mapping (without full enrichment for performance)
    const orders = (rawOrders || []).map(o => ({
      _id: o.id, orderId: o.order_id, totalPrice: Number(o.total_price),
      status: o.status, paid: o.paid, paidAmount: Number(o.paid_amount),
      createdAt: o.created_at, paymentMethod: o.payment_method,
      customer: { name: o.customer_name, phone: o.customer_phone, government: o.customer_government }
    }));

    res.json({ customer, orders });
  } catch (err) {
    console.error('Fetch customer detail error:', err);
    res.status(500).json({ error: 'Failed to fetch customer details' });
  }
});

module.exports = router;

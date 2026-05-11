const express = require('express');
const router = express.Router();
const supabase = require('../config/db');
const adminAuth = require('../middleware/adminAuth');
const sendWebhook = require('../utils/webhook');
const { sendPushToAdmins } = require('../utils/push');

// Helper: recalculate totals from items + shipping + discount
function calcTotals(items, shippingFee, orderDiscount = 0) {
  let subtotal = 0;
  for (const item of items) {
    const unitPrice = Number(item.unitPrice) || Number(item.price) || Number(item.basePrice) || 0;
    const itemDiscount = Number(item.discount) || 0;
    const rowTotal = Math.max(0, (unitPrice * item.quantity) - itemDiscount);
    item.finalPrice = rowTotal;
    subtotal += rowTotal;
  }
  const totalPrice = Math.max(0, subtotal + (Number(shippingFee) || 0) - (Number(orderDiscount) || 0));
  return { subtotal, totalPrice };
}

// Helper: enrich order with items and camelCase mapping
async function enrichOrder(order) {
  if (!order) return null;
  const { data: items } = await supabase
    .from('order_items').select('*').eq('order_id', order.id).order('id');
  const enrichedItems = [];
  for (const item of (items || [])) {
    const { data: opts } = await supabase
      .from('order_item_options').select('*').eq('order_item_id', item.id);
    enrichedItems.push({
      productId: item.product_id, name: item.name, imageUrl: item.image_url,
      basePrice: Number(item.base_price), finalPrice: Number(item.final_price),
      quantity: item.quantity, discount: Number(item.discount),
      selectedOptions: (opts || []).map(o => ({ groupName: o.group_name, label: o.label, price: Number(o.price) }))
    });
  }
  return {
    _id: order.id, id: order.id, orderId: order.order_id,
    customer: {
      name: order.customer_name, phone: order.customer_phone,
      secondPhone: order.customer_second_phone, address: order.customer_address,
      government: order.customer_government, notes: order.customer_notes
    },
    items: enrichedItems, discount: Number(order.discount), totalPrice: Number(order.total_price),
    shippingFee: Number(order.shipping_fee), paymentMethod: order.payment_method,
    paid: order.paid, paidAmount: Number(order.paid_amount), archived: order.archived,
    status: order.status, createdAt: order.created_at, updatedAt: order.updated_at
  };
}

async function saveOrderItems(orderId, items) {
  await supabase.from('order_items').delete().eq('order_id', orderId);
  for (const item of items) {
    const { data: row } = await supabase.from('order_items').insert({
      order_id: orderId, product_id: item.productId || item.product_id || '',
      name: item.name, image_url: item.imageUrl || item.image_url || '',
      base_price: item.basePrice || item.base_price || 0,
      final_price: item.finalPrice || item.final_price || 0,
      quantity: item.quantity || 1, discount: item.discount || 0
    }).select().single();
    if (row && Array.isArray(item.selectedOptions)) {
      const optRows = item.selectedOptions.map(o => ({
        order_item_id: row.id, group_name: o.groupName || o.group_name,
        label: o.label, price: o.price || 0
      }));
      if (optRows.length > 0) await supabase.from('order_item_options').insert(optRows);
    }
  }
}

// ── Invoice HTML helper ─────────────────────────────────
async function generateInvoiceInnerHtml(order, settings) {
  const safe = (val) => (val === undefined || val === null) ? '' : String(val).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const num = (val) => Number(val) || 0;
  const brandName = settings.storeNameAr || settings.storeName || 'سندورا سكوب';
  const productsHtml = order.items.map((p) => {
    const unitPrice = Number(p.unitPrice) || Number(p.price) || Number(p.basePrice) || 0;
    const optionsText = (p.selectedOptions || []).map(o => o.label).join(' / ');
    return `<tr><td style="text-align:right;display:flex;align-items:center;gap:8px;">${p.imageUrl ? `<img src="${p.imageUrl}" style="width:40px;height:40px;object-fit:cover;border-radius:6px;margin-left:8px;">` : ''}<div><div style="font-weight:700;">${safe(p.name)}</div>${optionsText ? `<div style="font-size:10px;color:#666;">(${safe(optionsText)})</div>` : ''}</div></td><td>${safe(p.quantity)}</td><td>${num(unitPrice)}</td><td>${num(p.finalPrice)} ج</td></tr>`;
  }).join('');
  const notesArray = order.customer.notes ? order.customer.notes.split('-').filter(n => n.trim() !== '') : [];
  const notesHtml = notesArray.length ? notesArray.map(n => `<div style="margin-bottom:4px;">• ${safe(n.replace(/^-/, '').trim())}</div>`).join('') : `<div>لا توجد ملاحظات</div>`;
  const sub = order.items.reduce((s, i) => s + i.finalPrice, 0);
  const shipping = num(order.shippingFee);
  const total = num(order.totalPrice);
  const paid = num(order.paidAmount);
  const remaining = total - paid;
  const displayRemaining = remaining > 0 ? (remaining + 10) : 0;
  let phone = safe(order.customer.phone);
  if (order.customer.secondPhone) phone += ` - ${order.customer.secondPhone}`;
  let remtext = remaining === 0 ? 'مدفوع بالكامل' : 'المتبقي عند الاستلام (+10 ج رسوم)';
  return `<div class="invoice"><table class="customer-table"><tbody><tr><td class="label-column">الاسم</td><td class="value-column">${safe(order.customer.name)}</td></tr><tr><td class="label-column">الهاتف</td><td class="value-column" dir="ltr">${phone}</td></tr><tr><td class="label-column">المحافظة</td><td class="value-column">${safe(order.customer.government)}</td></tr><tr><td class="label-column">العنوان</td><td class="value-column">${safe(order.customer.address)}</td></tr></tbody></table><div class="order-section"><table class="items-table"><thead><tr><th>المنتج</th><th>عدد</th><th>سعر</th><th>إجمالي</th></tr></thead><tbody>${productsHtml}</tbody></table><div class="summary"><div class="row"><span>المبلغ الفرعي</span><span>${sub} ج</span></div><div class="row"><span>مصاريف الشحن (${safe(order.customer.government)})</span><span>${shipping} ج</span></div><div class="row grand"><span>الإجمالي</span><span>${total} ج</span></div></div><div class="paid-box"><div class="row green"><span>المدفوع</span><span>${paid} ج</span></div><div class="row red"><span>${remtext}</span><span>${displayRemaining} ج</span></div></div><div class="notes-section"><div class="notes-title">ملاحظات :</div><div style="line-height:1.6;font-weight:700;">${notesHtml}</div></div><div class="footer">♡ شكراً لشرائك من متجر ${brandName} ♡</div></div></div>`;
}

// Shared invoice CSS
const invoiceCSS = `@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;800&display=swap');*{font-family:'Tajawal',sans-serif!important;box-sizing:border-box;}.invoice{width:500px;margin:0 auto;direction:rtl;padding:10px 5px;}.customer-table{width:100%;border-collapse:collapse;border:1px solid #000;margin-bottom:7px;}.customer-table td{border:1px solid #000;font-size:10px;font-weight:600;text-align:center;padding:4px;}.label-column{width:25%;background:#fff;}.value-column{width:75%;}.order-section{border:1px solid #000;}.items-table{width:100%;border-collapse:collapse;}.items-table thead{background:#f5ede0;}.items-table th,.items-table td{padding:6px;font-weight:600;font-size:12px;text-align:center;border-bottom:1px solid #a6a5a5;}.items-table tbody tr:nth-child(even){background-color:#f9f6ef;}.items-table tbody tr:nth-child(odd){background-color:#ffffff;}.items-table td:first-child,.items-table th:first-child{text-align:right;}.summary{background:#f5ede0;padding:1px 6px;}.row{display:flex;justify-content:space-between;font-size:13px;margin:2px;}.grand{border-top:2px solid #4a2c0a;font-weight:700;margin-top:4px;padding-top:4px;}.paid-box{background:#e8f5ed;padding:1px 6px;}.green{color:#1a7a45;font-weight:700;}.red{color:#b84a20;font-weight:700;}.notes-section{padding:4px 6px;font-size:11px;background:#f5ede0;}.notes-title{font-weight:700;color:#b84a20;text-decoration:underline;padding-bottom:2px;}.footer{background:#4a2c0a;color:#fff;text-align:center;padding:7px;font-weight:700;font-size:13px;}`;

// Helper to get settings
async function getGlobalSettings() {
  const { data } = await supabase.from('settings').select('value').eq('key', 'autoecommerce_global_settings').maybeSingle();
  return data ? data.value : {};
}

// ── Public ──────────────────────────────────────────────

// POST /api/orders — create order
router.post('/', async (req, res) => {
  try {
    const { customer, items, paymentMethod, discount = 0, paidAmount = 0 } = req.body;
    if (!customer || !items || !Array.isArray(items) || items.length === 0)
      return res.status(400).json({ error: 'Customer info and at least one item are required' });
    if (!customer.name || !customer.phone || !customer.address || !customer.government)
      return res.status(400).json({ error: 'Customer name, phone, address, and government are required' });
    if (!paymentMethod)
      return res.status(400).json({ error: 'Valid payment method is required' });

    // Shipping fee
    let shippingFee = 0;
    const { data: shipRecord } = await supabase.from('shipping_fees').select('fee').eq('governorate', customer.government).maybeSingle();
    if (shipRecord) { shippingFee = shipRecord.fee; }
    else {
      const defaultFees = require('../config/shipping');
      shippingFee = defaultFees[customer.government] || 0;
    }

    const { totalPrice } = calcTotals(items, shippingFee, discount);

    // Generate order ID using sequence
    const { data: seqData } = await supabase.rpc('next_order_id');
    const generatedOrderId = seqData || `Order-${Date.now()}`;

    const { data: order, error } = await supabase.from('orders').insert({
      order_id: generatedOrderId,
      customer_name: customer.name, customer_phone: customer.phone,
      customer_second_phone: customer.secondPhone || '',
      customer_address: customer.address, customer_government: customer.government,
      customer_notes: customer.notes || '',
      discount, total_price: totalPrice, shipping_fee: shippingFee,
      payment_method: paymentMethod,
      paid_amount: Number(paidAmount) || 0,
      paid: (Number(paidAmount) || 0) >= totalPrice
    }).select().single();
    if (error) throw error;

    await saveOrderItems(order.id, items);

    const enriched = await enrichOrder(order);

    // Push notification
    const settings = await getGlobalSettings();
    const storeLogo = settings.storeLogo || '/admin/logo.png';
    sendPushToAdmins({
      title: 'طلب جديد! 📦',
      body: `طلب بقيمة ${enriched.totalPrice} ج.م من ${enriched.customer.name}`,
      icon: storeLogo,
      data: { url: `/admin/order-details.html?id=${enriched.orderId}` }
    });

    await sendWebhook('order.created', enriched);
    res.status(201).json(enriched);
  } catch (err) {
    console.error('Order creation error:', err);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// GET /api/orders/public/:orderId
router.get('/public/:orderId', async (req, res) => {
  try {
    const { data: order } = await supabase.from('orders').select('*').eq('order_id', req.params.orderId).maybeSingle();
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(await enrichOrder(order));
  } catch (err) { res.status(500).json({ error: 'Failed to fetch order' }); }
});

// ── Admin ───────────────────────────────────────────────

// GET /api/orders/bulk/download-pdf
router.get('/bulk/download-pdf', adminAuth, async (req, res) => {
  try {
    const { data: rawOrders } = await supabase.from('orders').select('*')
      .not('archived', 'eq', true).not('status', 'eq', 'cancelled').order('created_at', { ascending: false });
    const settings = await getGlobalSettings();
    let pagesHtml = '';
    for (const rawOrder of (rawOrders || [])) {
      const order = await enrichOrder(rawOrder);
      const innerHtml = await generateInvoiceInnerHtml(order, settings);
      pagesHtml += `<div class="page" style="page-break-after:always;"><div class="invoice-wrapper">${innerHtml}</div></div>`;
    }
    const fullHtml = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><style>${invoiceCSS}@page{size:A5;margin:4mm;}body{margin:0;padding:0;}.page{page-break-after:always;break-after:page;width:140mm;height:202mm;overflow:hidden;position:relative;display:flex;align-items:center;justify-content:center;}.page:last-child{page-break-after:auto;break-after:auto;}.invoice-wrapper{width:100%;transform-origin:center center;}</style><script>window.onload=function(){document.querySelectorAll('.page').forEach(function(page){var wrapper=page.querySelector('.invoice-wrapper');if(!wrapper)return;var scaleH=page.offsetHeight/wrapper.scrollHeight;var scaleW=page.offsetWidth/wrapper.scrollWidth;var scale=Math.min(Math.max(Math.min(scaleH,scaleW),0.55),2.0);wrapper.style.transform='scale('+scale+')';wrapper.style.width=(100/scale)+'%';});}</script></head><body>${pagesHtml}</body></html>`;
    const apiKey = process.env.PDFBOLT_API_KEY;
    if (!apiKey) throw new Error('PDFBOLT_API_KEY is missing');
    const response = await fetch('https://api.pdfbolt.com/v1/direct', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'API-KEY': apiKey },
      body: JSON.stringify({ html: Buffer.from(fullHtml).toString('base64'), format: 'A5', printBackground: true, preferCssPageSize: true })
    });
    if (!response.ok) throw new Error(`PDFBolt Error: ${await response.text()}`);
    const pdfBuffer = await response.arrayBuffer();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=all-invoices.pdf');
    res.send(Buffer.from(pdfBuffer));
  } catch (err) {
    console.error('Bulk PDF Error:', err);
    res.status(500).send('Failed to generate bulk PDF: ' + err.message);
  }
});

// GET /api/orders/:orderId/download-image
router.get('/:orderId/download-image', adminAuth, async (req, res) => {
  try {
    const { data: rawOrder } = await supabase.from('orders').select('*')
      .or(`order_id.eq.${req.params.orderId},id.eq.${req.params.orderId}`).maybeSingle();
    if (!rawOrder) return res.status(404).send('Order not found');
    const order = await enrichOrder(rawOrder);
    const settings = await getGlobalSettings();
    const innerHtml = await generateInvoiceInnerHtml(order, settings);
    const fullHtml = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><style>${invoiceCSS}body{margin:0;padding:0;background:#fff;}.invoice-container{width:500px;margin:0 auto;background:#fff;padding:10px;}</style></head><body><div class="invoice-container">${innerHtml}</div></body></html>`;
    const apiKey = process.env.SNAPRENDER_API_KEY;
    if (!apiKey) throw new Error('SNAPRENDER_API_KEY is missing');
    const response = await fetch('https://app.snap-render.com/v1/screenshot', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      body: JSON.stringify({ html: fullHtml, type: 'png', width: 500, fullPage: true, deviceScaleFactor: 2 })
    });
    if (!response.ok) throw new Error(`SnapRender Error: ${await response.text()}`);
    const imageBuffer = await response.arrayBuffer();
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.orderId}.png`);
    res.send(Buffer.from(imageBuffer));
  } catch (err) {
    console.error('Image Generation Error:', err);
    res.status(500).send('Failed to generate image invoice: ' + err.message);
  }
});

router.get('/:orderId/download-pdf', adminAuth, (req, res) => {
  res.redirect(`/api/orders/${req.params.orderId}/download-image`);
});

// GET /api/orders/:orderId/invoice — HTML preview
router.get('/:orderId/invoice', adminAuth, async (req, res) => {
  try {
    const { data: rawOrder } = await supabase.from('orders').select('*')
      .or(`order_id.eq.${req.params.orderId},id.eq.${req.params.orderId}`).maybeSingle();
    if (!rawOrder) return res.status(404).send('Order not found');
    const order = await enrichOrder(rawOrder);
    const settings = await getGlobalSettings();
    const innerHtml = await generateInvoiceInnerHtml(order, settings);
    const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><style>${invoiceCSS}@page{size:A5;margin:4mm;}body{margin:0;padding:0;}.page{width:140mm;height:202mm;overflow:hidden;position:relative;display:flex;align-items:center;justify-content:center;}.invoice-wrapper{width:100%;transform-origin:center center;}</style><script>window.onload=function(){var page=document.querySelector('.page');var wrapper=document.querySelector('.invoice-wrapper');if(!wrapper)return;var scaleH=page.offsetHeight/wrapper.scrollHeight;var scaleW=page.offsetWidth/wrapper.scrollWidth;var scale=Math.min(Math.max(Math.min(scaleH,scaleW),0.55),2.0);wrapper.style.transform='scale('+scale+')';wrapper.style.width=(100/scale)+'%';}</script></head><body><div class="page"><div class="invoice-wrapper">${innerHtml}</div></div></body></html>`;
    res.send(html);
  } catch (err) { res.status(500).send('Failed to generate invoice'); }
});

// GET /api/orders — list all
router.get('/', adminAuth, async (req, res) => {
  try {
    const { archived } = req.query;
    let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (archived === 'true') query = query.eq('archived', true);
    else query = query.not('archived', 'eq', true);
    const { data: orders, error } = await query;
    if (error) throw error;
    const enriched = await Promise.all((orders || []).map(o => enrichOrder(o)));
    res.json(enriched);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch orders' }); }
});

// POST /api/orders/archive/batch
router.post('/archive/batch', adminAuth, async (req, res) => {
  try {
    const { orderIds } = req.body;
    if (!Array.isArray(orderIds)) return res.status(400).json({ error: 'orderIds must be an array' });
    await supabase.from('orders').update({ archived: true }).in('order_id', orderIds);
    res.json({ message: 'Orders archived' });
  } catch (err) { res.status(500).json({ error: 'Failed to archive orders' }); }
});

// POST /api/orders/unarchive/batch
router.post('/unarchive/batch', adminAuth, async (req, res) => {
  try {
    const { orderIds } = req.body;
    if (!Array.isArray(orderIds)) return res.status(400).json({ error: 'orderIds must be an array' });
    await supabase.from('orders').update({ archived: false }).in('order_id', orderIds);
    res.json({ message: 'Orders unarchived' });
  } catch (err) { res.status(500).json({ error: 'Failed to unarchive orders' }); }
});

// POST /api/orders/cancel/batch
router.post('/cancel/batch', adminAuth, async (req, res) => {
  try {
    const { orderIds } = req.body;
    if (!Array.isArray(orderIds)) return res.status(400).json({ error: 'orderIds must be an array' });
    await supabase.from('orders').update({ status: 'cancelled' }).in('order_id', orderIds);
    res.json({ message: 'Orders cancelled' });
  } catch (err) { res.status(500).json({ error: 'Failed to cancel orders' }); }
});

// POST /api/orders/delete/batch
router.post('/delete/batch', adminAuth, async (req, res) => {
  try {
    const { orderIds } = req.body;
    if (!Array.isArray(orderIds)) return res.status(400).json({ error: 'orderIds must be an array' });
    await supabase.from('orders').delete().in('order_id', orderIds);
    res.json({ message: 'Orders deleted' });
  } catch (err) { res.status(500).json({ error: 'Failed to delete orders' }); }
});

// POST /api/orders/:orderId/cancel
router.post('/:orderId/cancel', adminAuth, async (req, res) => {
  try {
    const { data: order, error } = await supabase.from('orders')
      .update({ status: 'cancelled' }).eq('order_id', req.params.orderId).select().single();
    if (error || !order) return res.status(404).json({ error: 'Order not found' });
    res.json({ message: 'Order cancelled', order: await enrichOrder(order) });
  } catch (err) { res.status(500).json({ error: 'Failed to cancel order' }); }
});

// GET /api/orders/:orderId — single order
router.get('/:orderId', adminAuth, async (req, res) => {
  try {
    const { data: order } = await supabase.from('orders').select('*')
      .or(`order_id.eq.${req.params.orderId},id.eq.${req.params.orderId}`).maybeSingle();
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(await enrichOrder(order));
  } catch (err) { res.status(500).json({ error: 'Failed to fetch order' }); }
});

// PUT /api/orders/:orderId — update order
router.put('/:orderId', adminAuth, async (req, res) => {
  try {
    const updates = req.body;
    const { data: oldOrder } = await supabase.from('orders').select('*')
      .or(`order_id.eq.${req.params.orderId},id.eq.${req.params.orderId}`).maybeSingle();
    if (!oldOrder) return res.status(404).json({ error: 'Order not found' });

    const oldEnriched = await enrichOrder(oldOrder);
    const items = updates.items || oldEnriched.items;
    const shippingFee = updates.shippingFee !== undefined ? updates.shippingFee : oldEnriched.shippingFee;
    const discount = updates.discount !== undefined ? updates.discount : oldEnriched.discount;
    const { totalPrice } = calcTotals(items, shippingFee, discount);

    const dbUpdates = {};
    if (updates.customer) {
      if (updates.customer.name) dbUpdates.customer_name = updates.customer.name;
      if (updates.customer.phone) dbUpdates.customer_phone = updates.customer.phone;
      if (updates.customer.secondPhone !== undefined) dbUpdates.customer_second_phone = updates.customer.secondPhone;
      if (updates.customer.address) dbUpdates.customer_address = updates.customer.address;
      if (updates.customer.government) dbUpdates.customer_government = updates.customer.government;
      if (updates.customer.notes !== undefined) dbUpdates.customer_notes = updates.customer.notes;
    }
    if (updates.shippingFee !== undefined) dbUpdates.shipping_fee = shippingFee;
    if (updates.discount !== undefined) dbUpdates.discount = discount;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.paymentMethod !== undefined) dbUpdates.payment_method = updates.paymentMethod;
    if (updates.paidAmount !== undefined) dbUpdates.paid_amount = updates.paidAmount;
    if (updates.archived !== undefined) dbUpdates.archived = updates.archived;
    dbUpdates.total_price = totalPrice;
    dbUpdates.paid = (Number(updates.paidAmount || oldOrder.paid_amount) >= totalPrice);

    const { data: updatedOrder, error } = await supabase.from('orders')
      .update(dbUpdates).eq('id', oldOrder.id).select().single();
    if (error) throw error;

    if (updates.items) await saveOrderItems(oldOrder.id, updates.items);

    const enriched = await enrichOrder(updatedOrder);
    if (updates.forcePaymentWebhook || (!oldOrder.paid && updatedOrder.paid)) {
      await sendWebhook('order.paid', enriched);
    }
    res.json(enriched);
  } catch (err) {
    console.error('Order update error:', err);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// DELETE /api/orders/:orderId
router.delete('/:orderId', adminAuth, async (req, res) => {
  try {
    const { error } = await supabase.from('orders').delete()
      .or(`order_id.eq.${req.params.orderId},id.eq.${req.params.orderId}`);
    if (error) throw error;
    res.json({ message: 'Order deleted' });
  } catch (err) { res.status(500).json({ error: 'Failed to delete order' }); }
});

module.exports = router;

/**
 * Webhook utility — sends POST to registered webhook URLs.
 * Fire-and-forget: logs errors but never blocks the response.
 */
const supabase = require('../config/db');
const cityMap = require('./cityMap');

async function sendWebhook(event, data) {
  try {
    const { data: webhooks } = await supabase
      .from('webhooks').select('*').eq('active', true).contains('events', [event]);

    if (webhooks && webhooks.length > 0) {
      const subamount = data.totalPrice - data.shippingFee;
      const products = (data.items || []).map(item => ({
        "name": item.name, "count": item.quantity,
        "price": item.finalPrice / item.quantity,
        "value option": (item.selectedOptions || []).map(o => o.label).join(' / ') || ""
      }));
      const rawPayload = {
        "Order ID": data.orderId, "Name": data.customer.name,
        "Phone": data.customer.phone, "Second Phone": data.customer.secondPhone || "",
        "Address": data.customer.address, "Gov-ar": data.customer.government,
        "Gov-en": cityMap[data.customer.government] || data.customer.government,
        "notes": data.customer.notes || "", "subamount": subamount,
        "shipment-amount": data.shippingFee, "total amount": data.totalPrice,
        "paid amount": data.paidAmount || 0,
        "remaining amount": data.totalPrice - (data.paidAmount || 0),
        "products": products
      };
      const payload = JSON.stringify({ event, timestamp: new Date().toISOString(), data: rawPayload });
      const promises = webhooks.map(wh =>
        fetch(wh.url, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: payload, signal: AbortSignal.timeout(5000)
        }).catch(err => console.error(`Failed to send webhook to ${wh.url}:`, err.message))
      );
      await Promise.all(promises);
    }

    // ── WhatsApp Notification ──
    try {
      const { data: waConfigSetting } = await supabase
        .from('settings').select('value').eq('key', 'whatsapp_configs').maybeSingle();

      if (waConfigSetting && Array.isArray(waConfigSetting.value)) {
        const configs = waConfigSetting.value;
        for (const conf of configs) {
          const triggers = Array.isArray(conf.triggers) ? conf.triggers : (conf.trigger ? [conf.trigger] : []);
          const shouldSend = triggers.includes(event);
          if (shouldSend && conf.baseUrl && conf.instance && conf.apikey && conf.number) {
            let msg = '';
            if (event === 'order.cancelled') msg += `⚠️ تم إلغاء الطلب\n`;
            msg += `رقم الاوردر: ${data.orderId}\nاسم العميل: ${data.customer.name}\nرقم الهاتف: ${data.customer.phone}\nاجمالي المطلوب: ${data.totalPrice}`;
            if (event === 'order.paid') msg += `\nالمدفوع: ${data.paidAmount || 0}\nالمتبقي: ${data.totalPrice - (data.paidAmount || 0)}`;
            let cleanBaseUrl = conf.baseUrl.trim().replace(/\/+$/, '');
            if (!cleanBaseUrl.startsWith('http')) cleanBaseUrl = `https://${cleanBaseUrl}`;
            const waUrl = `${cleanBaseUrl}/message/sendText/${conf.instance}`;
            const cleanNumber = conf.number.trim().replace(/\D/g, '');
            try {
              await fetch(waUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'apikey': conf.apikey },
                body: JSON.stringify({ number: cleanNumber, text: msg, delay: 123, linkPreview: false, mentionsEveryOne: false })
              });
            } catch (err) { console.error(`[WhatsApp] Failed for ${conf.instance}:`, err.message); }
          }
        }
      }
    } catch (waErr) { console.error('[WhatsApp] System error:', waErr.message); }
  } catch (err) { console.error('Webhook system error:', err.message); }
}

module.exports = sendWebhook;

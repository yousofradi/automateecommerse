const webpush = require('web-push');
const supabase = require('../config/db');
const { publicKey, privateKey } = require('../config/notifications');

webpush.setVapidDetails('mailto:support@autoecommerce.com', publicKey, privateKey);

async function sendPushToAdmins(payloadData) {
  try {
    const { data: subscriptions } = await supabase.from('push_subscriptions').select('*');
    const payload = JSON.stringify(payloadData);
    await Promise.all(
      (subscriptions || []).map(sub =>
        webpush.sendNotification(sub.subscription, payload)
          .catch(err => {
            if (err.statusCode === 410 || err.statusCode === 404) {
              return supabase.from('push_subscriptions').delete().eq('id', sub.id);
            }
            console.error('Push error for sub:', sub.id, err.message);
          })
      )
    );
  } catch (err) { console.error('Global push notification error:', err); }
}

module.exports = { sendPushToAdmins };

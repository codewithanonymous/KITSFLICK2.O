const webpush = require('web-push');

const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@kitsflick.in';
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
} else {
    console.warn('[BE][PUSH] VAPID keys are missing. Push notifications are disabled.');
}

module.exports = webpush;

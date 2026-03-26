import { apiJson } from './api';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export async function askPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  return Notification.requestPermission();
}

export async function subscribeUser(publicKey) {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service workers are not supported in this browser');
  }

  const registration = await navigator.serviceWorker.ready;
  if (!registration.pushManager) {
    throw new Error('Push manager is not available in this browser');
  }

  const existingSubscription = await registration.pushManager.getSubscription();
  if (existingSubscription) {
    return existingSubscription;
  }

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });
}

export async function enablePushNotifications(token) {
  const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';
  if (!publicKey) {
    return { enabled: false, reason: 'missing-public-key' };
  }

  const permission = await askPermission();
  if (permission !== 'granted') {
    return { enabled: false, reason: permission || 'permission-denied' };
  }

  const subscription = await subscribeUser(publicKey);
  await apiJson('/api/push/subscribe', 'POST', { subscription }, token);
  return { enabled: true };
}

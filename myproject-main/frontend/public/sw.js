self.addEventListener('push', (event) => {
  const fallback = {
    title: 'KITSflick',
    body: 'You have a new notification.',
    url: '/#/feed',
  };

  let data = fallback;
  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...fallback, ...parsed };
    } catch (error) {
      data = fallback;
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/image.jpg',
      badge: '/image.jpg',
      data: { url: data.url || '/#/feed' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || '/#/feed';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes('/#') || client.url.endsWith('/')) {
          client.focus();
          client.navigate(targetUrl);
          return null;
        }
      }

      return clients.openWindow(targetUrl);
    }),
  );
});

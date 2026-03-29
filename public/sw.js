self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : { title: 'New Notification', body: 'You have a new update!' };
  
  const options = {
    body: data.body,
    icon: '/icon-192x192.png', // Placeholder icon
    badge: '/badge-72x72.png', // Placeholder badge
    data: data.url,
    vibrate: [100, 50, 100],
    actions: [
      { action: 'open', title: 'Open App' },
      { action: 'close', title: 'Close' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  if (event.action === 'open') {
    const urlToOpen = event.notification.data || '/';
    event.waitUntil(
      clients.openWindow(urlToOpen)
    );
  }
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  self.registration.showNotification(data.title || '✅ Bot respondió', {
    body: data.body || 'Revisa el panel',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg',
    badge: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg',
    vibrate: [200, 100, 200],
    tag: 'bot-reply'
  });
});

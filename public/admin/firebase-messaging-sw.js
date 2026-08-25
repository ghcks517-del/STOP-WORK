importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDdiva8BHpJp5bjBwvsHGulUf9U80Qd8Y0",
  authDomain: "fluid-chimera-dsx2c.firebaseapp.com",
  projectId: "fluid-chimera-dsx2c",
  storageBucket: "fluid-chimera-dsx2c.firebasestorage.app",
  messagingSenderId: "813110073630",
  appId: "1:813110073630:web:8b14461725a8692681910f"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || '알림';
  const notificationOptions = {
    body: payload.notification?.body,
    icon: 'https://www.gstatic.com/images/branding/product/1x/firebase_512dp.png',
    data: payload.data,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const targetUrl = event.notification.data?.click_action || '/admin';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window/tab open with the target URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        // If so, just focus it.
        if (client.url.includes('/admin') && 'focus' in client) {
          return client.focus().then(c => c.navigate(targetUrl));
        }
      }
      // If not, then open the target URL in a new window/tab.
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

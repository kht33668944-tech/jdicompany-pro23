self.addEventListener("push", function (event) {
  if (!event.data) return;
  let payload = { title: "알림", body: "", url: "" };
  try {
    payload = event.data.json();
  } catch {
    payload.body = event.data.text();
  }
  const options = {
    body: payload.body || payload.title,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: payload.url || "/" },
    tag: payload.tag || "default",
  };
  event.waitUntil(self.registration.showNotification(payload.title || "알림", options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      for (const client of clientList) {
        if (client.url && client.focus) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

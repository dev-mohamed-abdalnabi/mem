// Service Worker: تركيب "قابل للتثبيت" + كاش حقيقي بستايل
// Network First مع رجوع للكاش لو مفيش نت.
// - أونلاين: بيجيب كل حاجة من النت على طول (عشان أي تحديث يوصل فوراً)
//   وبيحفظ نسخة منها في الكاش أول أول.
// - أوفلاين: لما fetch للنت يفشل، بيرجع آخر نسخة محفوظة في الكاش (لو
//   الصفحة/الملف ده كان اتفتح قبل كده وهو أونلاين).
// - تنقل بين الصفحات (SPA) أوفلاين: لو مفيش نسخة مطابقة بالظبط، بنرجع
//   /index.html المحفوظة عشان الـ SPA تفتح وتكمل من الكاش المحلي.

const CACHE_NAME = "mem-shell-v3";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

// استقبال إشعار Push جاي من السيرفر (حتى لو المتصفح مقفول خالص، طول ما
// المتصفح شغال في الخلفية أو الجهاز شغال، الـ OS بيصحي الـ Service Worker
// ده تلقائياً عشان يعرض الإشعار)
self.addEventListener("push", (event) => {
  let data = { title: "إشعار جديد", body: "", url: "/" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (e) {
    if (event.data) data.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url || "/" },
      dir: "rtl",
      lang: "ar",
    })
  );
});

// لما المستخدم يدوس على الإشعار، نفتحله التطبيق (أو نركز على تاب مفتوح
// أصلاً بدل ما نفتح نسخة جديدة)
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of allClients) {
        if ("focus" in client) {
          client.focus();
          if ("navigate" in client) client.navigate(targetUrl);
          return;
        }
      }
      await self.clients.openWindow(targetUrl);
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // بس GET بيتخزن في الكاش - أي حاجة تانية (POST/PUT..) لازم تعدي على النت زي ما هي
  if (request.method !== "GET") return;

  event.respondWith(
    (async () => {
      try {
        const response = await fetch(request);
        // بنحفظ نسخة من أي رد ناجح (200) عشان تبقى متاحة أوفلاين بعد كده
        if (response && response.status === 200) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, response.clone());
        }
        return response;
      } catch (err) {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(request);
        if (cached) return cached;

        // تنقل صفحة (SPA navigation) أوفلاين من غير نسخة مطابقة بالظبط:
        // نرجّع شل التطبيق المحفوظ (index.html) بدل شاشة خطأ المتصفح
        if (request.mode === "navigate") {
          const shell = await cache.match("/index.html");
          if (shell) return shell;
        }

        throw err;
      }
    })()
  );
});

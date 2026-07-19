// Service Worker: تركيب "قابل للتثبيت" + كاش حقيقي بستايل
// Network First مع رجوع للكاش لو مفيش نت.
// - أونلاين: بيجيب كل حاجة من النت على طول (عشان أي تحديث يوصل فوراً)
//   وبيحفظ نسخة منها في الكاش أول أول.
// - أوفلاين: لما fetch للنت يفشل، بيرجع آخر نسخة محفوظة في الكاش (لو
//   الصفحة/الملف ده كان اتفتح قبل كده وهو أونلاين).
// - تنقل بين الصفحات (SPA) أوفلاين: لو مفيش نسخة مطابقة بالظبط، بنرجع
//   /index.html المحفوظة عشان الـ SPA تفتح وتكمل من الكاش المحلي.

const CACHE_NAME = "mem-shell-v2";

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

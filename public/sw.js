// Service Worker بسيط - غرضه الأساسي إنه يخلي التطبيق "قابل للتثبيت"
// (installable) على أندرويد/كروم، لأن المتصفح مايعرضش زرار "تثبيت التطبيق"
// غير لو فيه service worker مسجّل وبيتعامل مع حدث fetch.
// مش بنعمل caching معقد دلوقتي عشان مانضمنش نعرض نسخة قديمة من الموقع؛
// الأولوية إن أي تحديث جديد يوصل للمستخدم على طول.

const CACHE_NAME = "mem-shell-v1";

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

// شبكة أولاً (Network First) من غير أي كاش فعلي للمحتوى الديناميكي -
// بس الاستماع لـfetch لازم يكون موجود عشان معيار الـinstallability
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

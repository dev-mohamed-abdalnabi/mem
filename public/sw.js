// Service Worker: تركيب "قابل للتثبيت" + كاش حقيقي بستايل هجين:
// - الملفات الثابتة (JS/CSS/أيقونات/خطوط اللي بيبنيها Vite بأسماء فيها hash،
//   يعني أي تعديل في الكود بيولّد اسم ملف جديد تلقائي) بقت Cache First:
//   لو موجودة في الكاش، بترجع فوراً من غير ما تضرب النت خالص - أسرع وأوفر
//   في الداتا. مفيش خطر إنها تبقى قديمة لأن اسم الملف نفسه بيتغير لو المحتوى
//   اتغير (الملف القديم بس بيفضل في الكاش من غير ما حد يطلبه تاني).
// - أي حاجة تانية (صفحات HTML، طلبات API لـ Supabase، إلخ) لسه Network First
//   زي الأول بالظبط، عشان أي تحديث في البيانات يوصل فوراً وقت النت شغال،
//   ولو النت قطع بيرجع لآخر نسخة محفوظة.

const CACHE_NAME = "mem-shell-v4";

// باترن بسيط للملفات الثابتة القابلة لـ Cache First (بناءً على المسار أو الامتداد)
const STATIC_PATTERNS = [
  /\/assets\//,
  /\/icons\//,
  /\.(js|css|woff2?|ttf|eot|png|jpe?g|webp|svg|ico)$/,
];

function isStaticAsset(url) {
  return STATIC_PATTERNS.some((re) => re.test(url));
}

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

  // Cache First للملفات الثابتة: أسرع وأوفر في النت، وآمن لأن أسماء
  // الملفات دي فيها hash بيتغير تلقائي مع أي تحديث في الكود
  if (isStaticAsset(request.url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response && response.status === 200) cache.put(request, response.clone());
          return response;
        } catch (err) {
          throw err;
        }
      })()
    );
    return;
  }

  // Network First لكل حاجة تانية (صفحات SPA، طلبات API..)
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

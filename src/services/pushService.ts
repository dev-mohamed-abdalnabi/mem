import { supabase } from "../supabaseClient";

// نفس المفتاح العام (VAPID Public Key) بتاع الفانكشن send-push في Supabase -
// لازم يفضلوا متطابقين، لو غيرت المفاتيح لازم تغيرهم في المكانين مع بعض
const VAPID_PUBLIC_KEY = "BGHW3VBkyy2V32siThLcHaN5UyoUgD3Xtjxff5Ey7MNjCAURmg-zCPDcBlgF48dUtPd_BbdnaOvFYOia9cKQmUA";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export const pushService = {
  /**
   * بتفعّل الاشتراك بس لو الإذن ممنوح بالفعل من قبل (صامتة تماماً - مفيش
   * أي prompt). بتتنادى أول ما التطبيق يفتح، عشان نتأكد إن الاشتراك لسه
   * موجود في الداتابيز من غير ما نضايق مستخدم لسه ما وثقش في التطبيق
   * بطلب إذن الإشعارات فور ما يفتحه لأول مرة.
   */
  ensureSubscribedIfGranted: async (userId: string): Promise<void> => {
    try {
      if (userId === "guest-user-temp") return;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || typeof Notification === "undefined") return;
      if (Notification.permission !== "granted") return;
      await pushService.subscribe(userId);
    } catch (e) {
      console.warn("تعذر التأكد من اشتراك الإشعارات:", e);
    }
  },

  /**
   * بتطلب إذن الإشعارات فعلياً (لو لسه ما اتسألش قبل كده) وتفعّل الاشتراك.
   * لازم تتنادى بس بعد أول تفاعل حقيقي من المستخدم (لايك/كومنت/بوست) مش
   * فور ما يفتح التطبيق - المتصفحات بتدي فرصة واحدة بس لطلب الإذن ده،
   * ولو المستخدم رفض بسرعة قبل ما يثق في التطبيق (زي ما بيحصل غالباً مع
   * أي prompt بيظهر فوراً عند الفتح)، بيبقى صعب جداً تسترجعه تاني.
   * بتتحكم في نفسها عشان متتكررش أكتر من مرة لكل جهاز.
   */
  promptForPermissionOnce: async (userId: string): Promise<void> => {
    try {
      if (userId === "guest-user-temp") return;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || typeof Notification === "undefined") return;
      if (Notification.permission !== "default") return; // already answered (granted/denied)
      if (localStorage.getItem("push_prompt_shown") === "1") return;
      localStorage.setItem("push_prompt_shown", "1");
      await pushService.subscribe(userId);
    } catch (e) {
      console.warn("تعذر طلب إذن الإشعارات:", e);
    }
  },

  /**
   * بتحاول تفعّل إشعارات الـ Push للمستخدم الحالي (لو المتصفح بيدعمها ولسه
   * ما رفضش الإذن قبل كده). أي فشل فيها (المتصفح مش بيدعم، الإذن مرفوض...)
   * بيتم تجاهله بهدوء من غير ما يوقف باقي التطبيق.
   */
  subscribe: async (userId: string): Promise<void> => {
    try {
      if (userId === "guest-user-temp") return;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || typeof Notification === "undefined") return;
      if (Notification.permission === "denied") return;

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (Notification.permission === "default") {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;
      }
      if (Notification.permission !== "granted") return;

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;

      await supabase.from("push_subscriptions").upsert(
        {
          user_id: userId,
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
        },
        { onConflict: "endpoint" }
      );
    } catch (e) {
      console.warn("تعذر تفعيل إشعارات الدفع:", e);
    }
  },

  /** إلغاء تفعيل إشعارات الدفع (مثلاً عند تسجيل الخروج) */
  unsubscribe: async (): Promise<void> => {
    try {
      if (!("serviceWorker" in navigator)) return;
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) return;
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
    } catch (e) {
      console.warn("تعذر إلغاء تفعيل إشعارات الدفع:", e);
    }
  },
};

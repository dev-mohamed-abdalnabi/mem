/**
 * مشاركة رابط ميم - بتستخدم الـ Web Share API الأصلية (بتفتح شيت المشاركة
 * الحقيقي بتاع الموبايل: واتساب، تيليجرام، تويتر...) لو المتصفح بيدعمها،
 * وبترجع لنسخ الرابط للكليب بورد كـ fallback (زي ما كان الوضع قبل كده)
 * لو مش مدعومة أو المستخدم دوس "إلغاء" في شيت المشاركة.
 *
 * بترجع "shared" لو فتحنا شيت المشاركة الحقيقي، "copied" لو نسخنا للكليب
 * بورد، أو "cancelled" لو المستخدم قفل شيت المشاركة من غير ما يشارك -
 * عشان الواجهة تقدر تقرر تظهر رسالة "تم النسخ" أو متظهرش حاجة خالص.
 */
export type ShareResult = "shared" | "copied" | "cancelled";

export async function shareMemeLink(memeId: string, caption?: string | null): Promise<ShareResult> {
  const shareLink = `${window.location.origin}/?meme=${memeId}`;
  const shareTitle = "mem";
  const shareText = caption ? caption.slice(0, 120) : "شوف الميم ده على mem 😂";

  if (navigator.share) {
    try {
      await navigator.share({ title: shareTitle, text: shareText, url: shareLink });
      return "shared";
    } catch (err) {
      // المستخدم قفل شيت المشاركة (AbortError) - ده مش خطأ فعلي، بس منكملش لنسخ الرابط
      if (err instanceof Error && err.name === "AbortError") return "cancelled";
      // أي خطأ تاني (نادر) - نرجع لنسخ الرابط عادي
    }
  }

  await navigator.clipboard.writeText(shareLink);
  return "copied";
}

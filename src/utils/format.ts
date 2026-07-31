/**
 * دوال تنسيق مشتركة (أرقام ووقت) بالعربي.
 *
 * كانت formatCompactNumber متكررة بنفس التعريف بالظبط في 3 ملفات (Header,
 * RightSidebar, ProfilePage) - أي تعديل مستقبلي (زي تغيير حد الـ K أو M)
 * كان محتاج يتكرر 3 مرات وسهل ينسى مكان منهم فيختلفوا عن بعض. ومكنش
 * مستخدم خالص في لوحة الشرف (Leaderboard) فكانت نقاط أصحاب المراكز الأولى
 * بتتعرض كاملة (مثلاً 12450) بينما نفس الرقم في الهيدر كان بيتعرض 12.5K.
 */
export function formatCompactNumber(num: number | null | undefined): string {
  if (!num) return "0";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(num);
}

/**
 * وقت نسبي بالعربي المصري (دلوقتي / من 5 دقايق / من ساعتين / امبارح / تاريخ كامل).
 * كانت نفس الفكرة معمولة جوه Stories.tsx بس (relativeTimeAr) من غير ما تتشارك
 * مع باقي الأماكن اللي بتعرض تواريخ (كارت البوست، إشعارات الهيدر، مودال
 * التفاصيل) - فكانت هي المكان الوحيد اللي بيوري "من 5 دقايق" بدل تاريخ
 * كامل أو وقت بس من غير تاريخ.
 */
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return "الآن";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `من ${diffMin} ${diffMin === 1 ? "دقيقة" : "دقايق"}`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `من ${diffHour} ${diffHour === 1 ? "ساعة" : "ساعات"}`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 2) return "امبارح";
  if (diffDay < 7) return `من ${diffDay} أيام`;
  return date.toLocaleDateString("ar-EG", { day: "numeric", month: "short", year: "numeric" });
}

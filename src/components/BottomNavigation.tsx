import React from "react";
import { Home, Flame, PlusCircle, Clapperboard, User } from "lucide-react";
import { Profile } from "../types";

/**
 * واجهة الخصائص لمكون الشريط السفلي
 */
interface BottomNavigationProps {
  activeTab: string; // التبويب النشط
  onNavigate: (tab: string) => void; // وظيفة التنقل
  currentUser: Profile; // المستخدم الحالي
  isRealUser: boolean; // هل المستخدم مسجل دخول
  onShowAuthModal: () => void; // وظيفة إظهار مودال الدخول
}

// عناصر الشريط السفلي - تبويب "الحفظ" اتنقل جوه قائمة الإعدادات في الهيدر،
// ومكانه هنا بقى "الريلز"
const navItems = [
  { id: "feed", label: "الرئيسية", icon: Home },
  { id: "trending", label: "الترند", icon: Flame },
  { id: "create-post", label: "إنشاء", icon: PlusCircle },
  { id: "reels", label: "الريلز", icon: Clapperboard },
  { id: "profile", label: "الملف", icon: User },
];

/**
 * دايرة صورة البروفايل الصغيرة اللي بتتحط بدل أيقونة "الملف" العادية -
 * بالظبط زي ما واتساب بيعرض صورة حسابك الحقيقية في تاب "الملف الشخصي"
 * مش أيقونة شخص جينيريك. لو مفيش صورة بروفايل، بترجع لأيقونة User عادية.
 */
function ProfileAvatar({
  user,
  active,
  size,
}: {
  user: Profile;
  active: boolean;
  size: number;
}) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full overflow-hidden shrink-0 bg-gray-200 dark:bg-gray-700 transition-all duration-200 ${
        active
          ? "ring-2 ring-blue-500 dark:ring-blue-400"
          : "ring-1 ring-gray-300 dark:ring-white/15"
      }`}
      style={{ width: size, height: size }}
    >
      {user.avatar_url ? (
        <img
          src={user.avatar_url}
          alt={user.username || "الملف الشخصي"}
          className="w-full h-full object-cover"
        />
      ) : (
        <User className="w-full h-full p-[3px] text-gray-400" />
      )}
    </span>
  );
}

/**
 * مكون الشريط السفلي (BottomNavigation)
 * يظهر فقط في الشاشات الصغيرة (الموبايل)
 *
 * الشكل الافتراضي: بار عائم (floating pill) بستايل احترافي شبيه بشريط
 * التابات في واتساب/آيفون - مستدير بالكامل، خلفية شبه شفافة مع بلور،
 * عايم فوق المحتوى بمسافة من الجوانب والأسفل، والتاب النشط بياخد هايلايت
 * واضح (خلفية زرقاء فاتحة + سكيل بسيط للأيقونة).
 *
 * استثناء تبويب "الريلز": بما إن صفحة الريلز فيديو full-screen بيحسب
 * ارتفاعه بالظبط على أساس شريط سفلي عادي ثابت (bar-to-bar) مش عائم، فلما
 * تكون الريلز هي التاب النشط بنرجع للشكل "العادي" التقليدي (بار كامل
 * العرض، ملاصق للأسفل، بدون تعويم) عشان الفيديو يفضل مظبوط بدون ما البار
 * العائم يتقطع فوقه بشكل غريب.
 */
export default function BottomNavigation({
  activeTab,
  onNavigate,
  currentUser,
  isRealUser,
  onShowAuthModal,
}: BottomNavigationProps) {
  const handleNavClick = (tabId: string) => {
    if (tabId === "create-post" && !isRealUser) {
      onShowAuthModal();
      return;
    }
    onNavigate(tabId);
  };

  const isReelsActive = activeTab === "reels";

  // === وضع الريلز: نفس البار العادي القديم بالظبط (بار كامل العرض، ملاصق
  // للأسفل، ارتفاع 4rem ثابت) - عشان حساب ارتفاع فيديو الريلز اللي متبني
  // على الـ 4rem ده يفضل مظبوط بدون أي قطع أو مسافة زيادة ===
  if (isReelsActive) {
    return (
      <nav data-app-bottom-nav className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 lg:hidden">
        <div className="flex items-center justify-around h-16 max-w-full">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-all duration-200 ${
                  isActive
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
                title={item.label}
              >
                <Icon className={`w-6 h-6 ${isActive ? "scale-110" : ""}`} />
                <span className="text-[10px] font-bold">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    );
  }

  // === الوضع الافتراضي: البار العائم الاحترافي ===
  return (
    <nav
      data-app-bottom-nav
      className="fixed inset-x-3 z-40 lg:hidden"
      style={{ bottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
    >
      <div className="flex items-center justify-around gap-1 mx-auto max-w-md px-1.5 py-1.5 rounded-[1.75rem] bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-gray-200/70 dark:border-white/10 shadow-lg shadow-black/10 dark:shadow-black/50">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`relative flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 rounded-2xl transition-all duration-200 ${
                isActive
                  ? "bg-blue-500/10 dark:bg-blue-400/15 text-blue-600 dark:text-blue-400"
                  : "text-gray-500 dark:text-gray-400 active:bg-gray-100 dark:active:bg-white/5"
              }`}
              title={item.label}
            >
              {item.id === "profile" ? (
                <ProfileAvatar user={currentUser} active={isActive} size={22} />
              ) : (
                <Icon
                  className={`w-[22px] h-[22px] transition-transform duration-200 ${
                    isActive ? "scale-110" : ""
                  }`}
                  strokeWidth={isActive ? 2.4 : 2}
                />
              )}
              <span className="text-[10px] font-bold leading-none">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

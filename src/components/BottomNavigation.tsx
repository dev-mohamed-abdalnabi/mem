import React from "react";
import { Home, Flame, Plus, Clapperboard, User } from "lucide-react";
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
  isUserLoading?: boolean; // لسه بنستنى هوية المستخدم الحقيقية من السيرفر (أول تحميل)
}

// عناصر الشريط السفلي - تبويب "الحفظ" اتنقل جوه قائمة الإعدادات في الهيدر
const navItems = [
  { id: "feed", label: "الرئيسية", icon: Home },
  { id: "trending", label: "الترند", icon: Flame },
  { id: "create-post", label: "إنشاء", icon: Plus },
  { id: "reels", label: "الريلز", icon: Clapperboard },
  { id: "profile", label: "الملف", icon: User },
];

// الارتفاع الكلي للبار - رقم صريح ثابت، وكل زرار بياخد h-full منه
const BAR_HEIGHT = 60; // px

/**
 * دايرة صورة البروفايل الصغيرة اللي بتتحط بدل أيقونة "الملف" العادية -
 * نفس المنطق بالظبط اللي بيستخدمه البار العلوي (Header.tsx) لصورة
 * البروفايل: لو فيه مستخدم حقيقي وعنده صورة، تتعرض الصورة، وإلا أيقونة
 * شخص افتراضية.
 */
function ProfileAvatar({
  user,
  isRealUser,
  active,
  size,
  onDark,
}: {
  user: Profile;
  isRealUser: boolean;
  active: boolean;
  size: number;
  onDark?: boolean;
}) {
  const showImage = isRealUser && !!user.avatar_url;

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full overflow-hidden shrink-0 ${
        onDark ? "bg-white/15" : "bg-gray-200 dark:bg-gray-700"
      } ${active ? "ring-2 ring-blue-600 dark:ring-blue-400" : ""}`}
      style={{ width: size, height: size }}
    >
      {showImage ? (
        <img
          loading="lazy"
          decoding="async"
          src={user.avatar_url as string}
          alt={user.username || "الملف الشخصي"}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />
      ) : (
        <User className={`w-full h-full p-[3px] ${onDark ? "text-white/60" : "text-gray-400"}`} />
      )}
    </span>
  );
}

/**
 * مكون الشريط السفلي (BottomNavigation)
 * يظهر فقط في الشاشات الصغيرة (الموبايل)
 *
 * بار عادي ملتصق بأسفل الشاشة (زي يوتيوب) بس بتنفيذ أدق وأكثر احترافية:
 * - كل الأيقونات بنفس الحجم والمحاذاة بالظبط (h-full ثابت لكل زرار)
 * - التاب النشط بياخد "حبة" (pill) خلفية لونها فاتح حوالين الأيقونة بس
 *   (مش الزرار كله) - نفس أسلوب Material 3 / يوتيوب الحديث - بانتقال
 *   ناعم بدل خط بسيط
 * - زرار "إنشاء" نفس تصميم أيقونات باقي الأزرار بالظبط (نفس سمك الخط
 *   ونفس منطق اللون active/inactive)، وحواليه دايرة بنفس تصميم زرار
 *   البحث في الهيدر العلوي بالظبط (rounded-full + border + خلفية
 *   رمادية فاتحة جدًا) بدل الدايرة الزرقاء المعبأة
 * - ظل خفيف لأعلى + خط علوي رفيع بيدوا إحساس ارتفاع (elevation) حقيقي
 *   بدل خط تقسيم مسطح
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

  return (
    <nav
      data-app-bottom-nav
      className={`fixed inset-x-0 bottom-0 z-40 lg:hidden border-t transition-colors duration-200 ${
        isReelsActive
          ? "bg-neutral-900 border-white/10"
          : "bg-white dark:bg-gray-900 border-gray-200 dark:border-white/10"
      }`}
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
        boxShadow: isReelsActive
          ? "0 -2px 12px rgba(0,0,0,0.35)"
          : "0 -2px 12px rgba(15,23,42,0.06)",
      }}
    >
      <div
        className="mx-auto flex w-full max-w-2xl items-stretch justify-between px-1"
        style={{ height: BAR_HEIGHT }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const isCreate = item.id === "create-post";

          const inactiveText = isReelsActive ? "text-white/55" : "text-gray-400 dark:text-gray-500";
          const activeColorText = isReelsActive ? "text-blue-300" : "text-blue-600 dark:text-blue-400";
          const activePillBg = isReelsActive ? "bg-white/10" : "bg-blue-50 dark:bg-blue-400/10";

          // زرار "إنشاء": نفس تصميم أيقونات باقي الأزرار بالظبط (نفس
          // سمك الخط ونفس منطق اللون active/inactive)، وحواليها دايرة
          // بنفس تصميم زرار البحث في الهيدر العلوي (Header.tsx) بالظبط:
          // rounded-full + border + خلفية رمادية فاتحة جدًا - مش دايرة
          // زرقاء معبأة زي قبل كده
          if (isCreate) {
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className="flex-1 h-full flex flex-col items-center justify-center gap-1"
                title={item.label}
              >
                <span
                  className={`flex items-center justify-center rounded-full border w-9 h-9 transition-colors duration-200 active:scale-95 ${
                    isReelsActive
                      ? "bg-white/10 border-white/15"
                      : "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <Plus
                    className={`w-[22px] h-[22px] ${isActive ? activeColorText : inactiveText}`}
                    strokeWidth={isActive ? 2.4 : 2}
                  />
                </span>
                <span
                  className={`text-[10px] leading-none transition-colors duration-200 ${
                    isActive ? `font-bold ${activeColorText}` : `font-medium ${inactiveText}`
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className="flex-1 h-full flex flex-col items-center justify-center gap-1"
              title={item.label}
            >
              <span
                className={`flex items-center justify-center rounded-2xl transition-colors duration-200 w-11 h-7 ${
                  isActive ? activePillBg : ""
                }`}
              >
                {item.id === "profile" ? (
                  <ProfileAvatar
                    user={currentUser}
                    isRealUser={isRealUser}
                    active={isActive}
                    size={22}
                    onDark={isReelsActive}
                  />
                ) : (
                  <Icon
                    className={`w-[22px] h-[22px] ${isActive ? activeColorText : inactiveText}`}
                    strokeWidth={isActive ? 2.4 : 2}
                  />
                )}
              </span>
              <span
                className={`text-[10px] leading-none transition-colors duration-200 ${
                  isActive ? `font-bold ${activeColorText}` : `font-medium ${inactiveText}`
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

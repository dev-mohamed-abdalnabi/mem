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

// الارتفاع الكلي للبار - رقم صريح ثابت بيتحسب منه كل حاجة تانية
// (حجم زرار الإنشاء البارز، مسافة البروز فوق الخط...)
const BAR_HEIGHT = 58; // px

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
      } ${active ? "ring-2 ring-blue-500 dark:ring-blue-400" : ""}`}
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
 * بار عادي ملتصق بأسفل الشاشة بالكامل (زي يوتيوب بالظبط) - مش عايم
 * ومفيش استدارة كبيرة، بس خط علوي رفيع (border-top) يفصله عن المحتوى.
 * أيقونة فوق تسمية تحت، والتاب النشط بياخد لون مميز + خط صغير فوق
 * الأيقونة كمؤشر. اللمسة المميزة الوحيدة: زرار "إنشاء" في النص بارز
 * شوية فوق خط البار (زي تيك توك/انستجرام) عشان يوضح إنه فعل إيجابي
 * مختلف عن باقي التابات اللي هي مجرد تنقل. الارتفاع ثابت رقميًا
 * (BAR_HEIGHT) وكل زرار بياخد h-full، فمفيش أي احتمال لاختلاف الأطوال.
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
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div
        className="mx-auto flex w-full max-w-2xl items-stretch justify-between"
        style={{ height: BAR_HEIGHT }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const isCreate = item.id === "create-post";

          const inactiveText = isReelsActive ? "text-white/60" : "text-gray-500 dark:text-gray-400";
          const activeColorText = isReelsActive ? "text-blue-300" : "text-blue-600 dark:text-blue-400";

          // زرار "إنشاء" شكله مختلف تمامًا: دايرة بارزة بلون واحد ثابت
          // مش بتتأثر بحالة active/reels، عشان تفضل واضحة وواقفة لوحدها
          if (isCreate) {
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className="relative flex flex-1 flex-col items-center justify-end pb-1.5"
                title={item.label}
              >
                <span
                  className="absolute flex items-center justify-center rounded-full bg-blue-600 text-white shadow-md shadow-blue-600/30 active:scale-95 transition-transform duration-150"
                  style={{ width: 40, height: 40, top: -14 }}
                >
                  <Plus className="w-6 h-6" strokeWidth={2.4} />
                </span>
                <span
                  className={`text-[10px] font-bold leading-none mt-6 ${inactiveText}`}
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
              className="relative flex-1 h-full flex flex-col items-center justify-center gap-1"
              title={item.label}
            >
              {/* مؤشر صغير فوق الأيقونة يبان بس لما التاب يكون نشط */}
              <span
                className={`absolute top-0 h-[3px] w-6 rounded-b-full transition-colors duration-200 ${
                  isActive ? "bg-blue-600 dark:bg-blue-400" : "bg-transparent"
                }`}
              />

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
              <span
                className={`text-[10px] font-bold leading-none ${
                  isActive ? activeColorText : inactiveText
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

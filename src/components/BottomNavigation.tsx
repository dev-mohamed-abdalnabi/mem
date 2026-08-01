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
  isUserLoading?: boolean; // لسه بنستنى هوية المستخدم الحقيقية من السيرفر (أول تحميل)
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
 * نفس المنطق بالظبط اللي بيستخدمه البار العلوي (Header.tsx) لصورة
 * البروفايل: لو فيه مستخدم حقيقي وعنده صورة، تتعرض الصورة، وإلا أيقونة
 * شخص افتراضية - من غير أي حالة تحميل/شبح مخصصة كانت بتعلق أحياناً.
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
 * بار عائم (floating pill) بستايل احترافي شبيه بشريط التابات في
 * واتساب/آيفون - مستدير بالكامل، عايم فوق المحتوى بمسافة من الجوانب
 * والأسفل، والتاب النشط بياخد هايلايت واضح، وباقي الأيقونات من غير أي
 * صندوق حواليها. نفس البار العائم بيفضل شغال حتى في تبويب "الريلز" -
 * بس بستايل زجاجي غامق (glass dark) عشان يفضل واضح فوق أي فيديو مهما
 * كان لونه، بدل ما يترجع لشكل تاني مختلف فجأة لما تدخل الريلز.
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
      className="fixed inset-x-3 z-40 lg:hidden"
      style={{ bottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
    >
      <div
        className={`flex items-center justify-between gap-1 mx-auto w-full max-w-[23rem] px-2 py-1.5 rounded-full overflow-hidden backdrop-blur-xl border shadow-lg transition-colors duration-200 ${
          isReelsActive
            ? "bg-black/45 border-white/15 shadow-black/40"
            : "bg-white/90 dark:bg-gray-900/90 border-gray-200/70 dark:border-white/10 shadow-black/10 dark:shadow-black/50"
        }`}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          const inactiveText = isReelsActive
            ? "text-white/65"
            : "text-gray-500 dark:text-gray-400";
          const activeText = isReelsActive
            ? "bg-blue-400/25 text-blue-300"
            : "bg-blue-500/10 dark:bg-blue-400/15 text-blue-600 dark:text-blue-400";

          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 transition-all duration-200 ${
                isActive ? `py-1.5 rounded-full ${activeText}` : inactiveText
              }`}
              title={item.label}
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

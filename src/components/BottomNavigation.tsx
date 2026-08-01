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
 * ولحد ما الصورة تحمّل فعلياً، بتبان شبح (سكيليتون) بدل الفلاش المفاجئ.
 */
function ProfileAvatar({
  user,
  active,
  size,
  onDark,
}: {
  user: Profile;
  active: boolean;
  size: number;
  onDark?: boolean;
}) {
  const [loaded, setLoaded] = React.useState(false);

  return (
    <span
      className={`relative inline-flex items-center justify-center rounded-full overflow-hidden shrink-0 ${
        onDark ? "bg-white/15" : "bg-gray-200 dark:bg-gray-700"
      } ${active ? "ring-2 ring-blue-500 dark:ring-blue-400" : ""}`}
      style={{ width: size, height: size }}
    >
      {user.avatar_url ? (
        <>
          {!loaded && (
            <span
              className={`absolute inset-0 rounded-full animate-pulse ${
                onDark ? "bg-white/20" : "bg-gray-300 dark:bg-gray-600"
              }`}
            />
          )}
          <img
            src={user.avatar_url}
            alt={user.username || "الملف الشخصي"}
            onLoad={() => setLoaded(true)}
            className={`w-full h-full object-cover transition-opacity duration-200 ${
              loaded ? "opacity-100" : "opacity-0"
            }`}
          />
        </>
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
        className={`flex items-center justify-between gap-1 mx-auto w-full max-w-[23rem] px-2.5 py-2 rounded-full backdrop-blur-xl border shadow-lg transition-colors duration-200 ${
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
                isActive ? `py-1.5 rounded-2xl ${activeText}` : inactiveText
              }`}
              title={item.label}
            >
              {item.id === "profile" ? (
                <ProfileAvatar
                  user={currentUser}
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

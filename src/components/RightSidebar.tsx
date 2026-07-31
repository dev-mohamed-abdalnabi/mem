import React, { useMemo } from "react";
import { Home, Flame, Bookmark, User, LogIn, Sparkles, Clapperboard, MessageCircle, UserPlus } from "lucide-react";
import { Profile } from "../types";
import { formatCompactNumber } from "../utils/format";

/**
 * واجهة الخصائص لمكون القائمة الجانبية اليمنى
 */
interface RightSidebarProps {
  isRealUser: boolean; // هل المستخدم مسجل دخول فعلياً
  currentUser?: Profile; // المستخدم الحالي (عشان نستبعده من الاقتراحات ونعرف مين هو)
  profiles: Profile[]; // قائمة البروفايلات المتاحة (مصدر اقتراحات المتابعة)
  followingIds?: string[]; // معرفات اللي المستخدم بيتابعهم بالفعل
  onFollowToggle?: (followerId: string, followingId: string) => void; // وظيفة متابعة/إلغاء متابعة
  onShowAuthModal: () => void; // وظيفة إظهار مودال تسجيل الدخول
  setSelectedProfileId: (id: string | null) => void; // وظيفة تحديد بروفايل مستخدم
  setActiveTab: (tab: string, options?: { profileId?: string }) => void; // وظيفة تغيير التبويب النشط
  activeTab?: string; // التبويب النشط حالياً
}

/**
 * مكون القائمة الجانبية (RightSidebar)
 * يظهر في الشاشات الكبيرة ويحتوي على روابط التنقل السريع وبطاقة تسجيل الدخول
 */
export default function RightSidebar({
  isRealUser,
  currentUser,
  profiles,
  followingIds = [],
  onFollowToggle,
  onShowAuthModal,
  setSelectedProfileId,
  setActiveTab,
  activeTab = "feed",
}: RightSidebarProps) {
  /**
   * اقتراحات متابعة - بنختار 3 بروفايلات عشوائية من اللي المستخدم لسه
   * مش متابعهم (ومش هو نفسه)، من نفس قائمة البروفايلات المحملة أصلاً في
   * التطبيق. عايزين نفس 3 الأشخاص يفضلوا ظاهرين طول ما المستخدم في نفس
   * الصفحة (مش يتغيروا مع كل render)، فبنعتمد على useMemo مربوط بطول
   * قائمة المتابعين + البروفايلات بس، مش بكل render.
   */
  const suggestedProfiles = useMemo(() => {
    const pool = profiles.filter(
      (p) => p.id !== currentUser?.id && !followingIds.includes(p.id)
    );
    // ترتيب عشوائي ثابت المصدر بترتيب البروفايلات نفسها (مش Math.random في
    // كل render) - بنستخدم شافل بسيط بناءً على معرف المستخدم كـ seed خفيف
    const shuffled = [...pool].sort((a, b) => a.id.localeCompare(b.id));
    return shuffled.slice(0, 3);
  }, [profiles, followingIds, currentUser?.id]);

  // قائمة عناصر التنقل الرئيسية
  const navItems = [
    { id: "feed", label: "الرئيسية", icon: Home },
    { id: "trending", label: "الترند", icon: Flame },
    { id: "reels", label: "الريلز", icon: Clapperboard },
    { id: "messages", label: "الرسايل", icon: MessageCircle },
    { id: "saves", label: "الحفظ", icon: Bookmark },
    { id: "profile", label: "الملف الشخصي", icon: User },
  ];

  return (
    <div className="w-72 shrink-0 hidden lg:flex flex-col gap-6 order-3 pb-8 sticky top-24 h-fit" dir="rtl">
      
      {/* بطاقة تسجيل الدخول للمستخدمين غير المسجلين */}
      {!isRealUser && (
        <div className="relative overflow-hidden bg-white dark:bg-[#16181c] rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-gray-100 dark:border-gray-800/80 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
          {/* لمسة جمالية: إضاءة خلفية خفيفة */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-xl">
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <h4 className="font-extrabold text-gray-900 dark:text-white text-base">انضم لمجتمعنا</h4>
            </div>
            
            <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-5 leading-relaxed">
              سجل حسابك دلوقتي عشان تقدر تتفاعل، تحفظ الميمز، وتشارك في الترند!
            </p>
            
            <button
              onClick={onShowAuthModal}
              className="group flex items-center justify-center gap-2 w-full bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 font-bold py-3 rounded-2xl text-sm transition-all active:scale-[0.98]"
            >
              <span>تسجيل الدخول</span>
              <LogIn className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1" />
            </button>
          </div>
        </div>
      )}

      {/* قائمة التنقل الرئيسية */}
      <div className="bg-white dark:bg-[#16181c] rounded-3xl p-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-gray-100 dark:border-gray-800/80">
        <nav className="flex flex-col gap-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`group relative flex items-center gap-3 w-full p-3.5 rounded-2xl transition-all duration-300 text-right overflow-hidden ${
                  isActive 
                    ? "text-blue-600 dark:text-blue-400 font-bold" 
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium"
                }`}
              >
                {/* خلفية العنصر النشط */}
                {isActive && (
                  <div className="absolute inset-0 bg-blue-50/80 dark:bg-blue-500/10 rounded-2xl transition-all" />
                )}

                {/* خلفية عند تمرير الماوس */}
                {!isActive && (
                  <div className="absolute inset-0 bg-gray-50 dark:bg-gray-800/40 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300" />
                )}

                <div className="relative z-10 flex items-center gap-3.5">
                  <div className={`flex items-center justify-center p-1.5 rounded-xl transition-all duration-300 ${
                    isActive 
                      ? "bg-white dark:bg-transparent shadow-sm dark:shadow-none" 
                      : "group-hover:bg-white dark:group-hover:bg-gray-700/50"
                  }`}>
                    <Icon className={`w-5 h-5 transition-transform duration-300 ${
                      isActive ? "scale-110" : "group-hover:scale-110"
                    }`} />
                  </div>
                  <span className="text-[15px] tracking-wide">{item.label}</span>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* ودجت "ناس ممكن تعرفهم" - اقتراحات متابعة بسيطة عشان تساعد على
          اكتشاف حسابات جديدة، مش بس اللي المستخدم بيتابعهم أصلاً */}
      {isRealUser && suggestedProfiles.length > 0 && (
        <div className="bg-white dark:bg-[#16181c] rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-gray-100 dark:border-gray-800/80">
          <h4 className="font-extrabold text-gray-900 dark:text-white text-sm mb-4">اقترحنا لك</h4>
          <div className="flex flex-col gap-3">
            {suggestedProfiles.map((p) => (
              <div key={p.id} className="flex items-center gap-3">
                <button
                  onClick={() => setActiveTab("user-profile", { profileId: p.id })}
                  className="flex items-center gap-3 flex-1 min-w-0 text-right"
                >
                  {p.avatar_url ? (
                    <img loading="lazy" decoding="async" src={p.avatar_url} alt={p.username} className="w-10 h-10 rounded-full object-cover bg-gray-100 dark:bg-gray-700 shrink-0" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-sm font-black text-gray-500 shrink-0">
                      {p.username?.[0]?.toUpperCase() || "M"}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{p.username}</p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500">{formatCompactNumber(p.followers_count)} متابع</p>
                  </div>
                </button>
                {onFollowToggle && currentUser && (
                  <button
                    onClick={() => onFollowToggle(currentUser.id, p.id)}
                    className="shrink-0 w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center transition-colors"
                    title="متابعة"
                  >
                    <UserPlus className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

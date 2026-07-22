import React, { useState, useEffect, useRef } from "react";
import { Search, Bell, Trophy, User, Flame, LogOut, PlusCircle, Settings, LogIn, Sun, Moon, Bookmark, MessageCircle } from "lucide-react";
import { Profile, Notification } from "../types";

// تنسيق الأرقام الكبيرة بشكل شيك (1.2K / 3.4M) بدل ما تتكتب كاملة وتاخد مساحة زيادة في الهيدر
function formatCompactNumber(num: number): string {
  if (!num) return "0";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(num);
}

/**
 * واجهة الخصائص لمكون الهيدر
 */
interface HeaderProps {
  currentUser: Profile; // المستخدم الحالي
  notifications: Notification[]; // قائمة الإشعارات
  onNavigate: (tab: string, options?: { profileId?: string }) => void; // وظيفة التنقل
  onSearch: (query: string) => void; // وظيفة البحث
  activeTab: string; // التبويب النشط
  onUserSwitch: (profile: Profile) => void; // وظيفة تبديل المستخدم
  availableProfiles: Profile[]; // البروفايلات المتاحة
  onMarkNotificationsRead: () => void; // وضع علامة مقروء على الإشعارات
  onNotificationClick?: (notif: Notification) => void; // وظيفة الانتقال لمكان الإشعار (البوست أو البروفايل)
  onShowAuthModal: () => void; // إظهار مودال الدخول
  onSignOutReal: () => void; // تسجيل الخروج
  isRealUser: boolean; // هل المستخدم حقيقي
  unreadMessagesCount?: number; // عدد الرسايل الغير مقروءة (بادج زرار الرسايل)
}

/**
 * مكون الهيدر العلوي (Header)
 * يحتوي على اللوجو، شريط البحث، الإشعارات، وقائمة المستخدم
 */
export default function Header({
  currentUser,
  notifications,
  onNavigate,
  onSearch,
  activeTab,
  onUserSwitch,
  availableProfiles,
  onMarkNotificationsRead,
  onNotificationClick,
  onShowAuthModal,
  onSignOutReal,
  isRealUser,
  unreadMessagesCount = 0
}: HeaderProps) {
  // --- حالات المكون الداخلية ---
  const [searchQuery, setSearchQuery] = useState(""); // نص البحث الحالي
  const [showUserDropdown, setShowUserDropdown] = useState(false); // إظهار قائمة المستخدم
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false); // إظهار قائمة الإشعارات
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false); // تأكيد تسجيل الخروج

  const dropdownContainerRef = useRef<HTMLDivElement>(null);

  // حالة الوضع الداكن (Dark Mode)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') || 
             (!document.documentElement.classList.contains('light') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  /**
   * تبديل الثيم بين الفاتح والداكن
   */
  const toggleTheme = (mode: 'light' | 'dark') => {
    const isDark = mode === 'dark';
    setIsDarkMode(isDark);
    localStorage.setItem('theme', mode);
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  /**
   * التعامل مع تغيير نص البحث
   */
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    onSearch(val);
  };

  /**
   * إغلاق القوائم المنسدلة
   */
  const closeUserDropdown = () => {
    setShowUserDropdown(false);
    setShowLogoutConfirm(false);
  };

  // إغلاق القوائم عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownContainerRef.current && !dropdownContainerRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
        setShowNotificationsDropdown(false);
        setShowLogoutConfirm(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // تنسيقات مشتركة للأزرار
  const unifiedBtnClass = "h-10 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors cursor-pointer text-gray-700 dark:text-gray-200 font-bold";
  const unifiedIconClass = `${unifiedBtnClass} w-10`;

  return (
    <header className="sticky top-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 transition-all">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        
        {/* اللوجو والنقاط */}
        <div className="flex items-center gap-3">
          <div
            onClick={() => onNavigate("feed")}
            className="flex items-center gap-2 cursor-pointer select-none group"
          >
            <img loading="lazy" decoding="async" 
              src="/logo.png" 
              alt="mem logo" 
              className="w-10 h-10 rounded-full object-cover group-hover:scale-105 transition-transform shadow-sm"
            />
            <div className="hidden sm:block">
              <h1 className="font-extrabold text-xl text-gray-900 dark:text-white tracking-tight leading-none">
                mem
              </h1>
            </div>
          </div>

          {/* عرض نقاط المستخدم */}
          <div 
            onClick={() => onNavigate("leaderboard")}
            className="h-10 px-4 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center gap-1.5 text-sm font-bold cursor-pointer select-none transition-colors text-gray-800 dark:text-gray-200"
            title="لوحة الشرف"
          >
            <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
            <span>{formatCompactNumber(currentUser.total_points)}</span>
          </div>
        </div>

        {/* شريط البحث المركزي */}
        <div className="flex-1 max-md relative hidden md:block">
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="ابحث عن ميمز, هاشتاج, أو نكتة..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full h-10 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 focus:bg-white dark:focus:bg-gray-900 border-2 border-transparent focus:border-gray-300 dark:focus:border-gray-600 rounded-full py-2 pr-10 pl-4 text-sm text-gray-900 dark:text-white outline-none transition-all placeholder:text-gray-500 dark:placeholder:text-gray-400"
          />
        </div>

        {/* الإجراءات والقوائم المنسدلة */}
        <div ref={dropdownContainerRef} className="flex items-center gap-2">
          
          {/* زر نشر ميم جديد */}
          <button
            onClick={() => onNavigate("create-post")}
            className={`h-10 px-4 rounded-full flex items-center gap-2 font-bold text-sm transition-colors cursor-pointer ${
              activeTab === "create-post" 
                ? "bg-blue-600 text-white hover:bg-blue-700" 
                : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
            title="انشر ميم جديد"
          >
            <PlusCircle className="w-5 h-5" />
            <span className="hidden sm:inline">انشر ميم</span>
          </button>

          {/* قائمة الإشعارات */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotificationsDropdown(!showNotificationsDropdown);
                closeUserDropdown();
              }}
              className={`relative ${unifiedIconClass} ${showNotificationsDropdown ? "!bg-gray-300 dark:!bg-gray-600" : ""}`}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -left-1 bg-red-500 text-white font-extrabold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* محتوى قائمة الإشعارات */}
            {showNotificationsDropdown && (
              <div className="absolute top-full mt-2 w-[320px] max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl py-2 text-right z-50 shadow-2xl -left-12 sm:left-0 origin-top-left">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm">الإشعارات الحية</h3>
                  {unreadCount > 0 && (
                    <button onClick={onMarkNotificationsRead} className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline">
                      تحديد الكل كمقروء
                    </button>
                  )}
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-gray-400 dark:text-gray-500 text-sm font-medium">
                      لا توجد إشعارات حتى الآن 🔕
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => {
                          onNotificationClick?.(notif);
                          setShowNotificationsDropdown(false);
                        }}
                        className={`px-4 py-3 border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 flex items-start gap-3 cursor-pointer transition-colors ${
                          !notif.is_read ? "bg-blue-50/50 dark:bg-blue-900/20" : ""
                        }`}
                      >
                        {/* صورة صاحب الإشعار - دوس عليها توديك لحسابه مباشرة */}
                        {notif.actor?.avatar_url ? (
                          <img loading="lazy" decoding="async"
                            src={notif.actor.avatar_url}
                            alt="avatar"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (notif.actor?.id) {
                                onNavigate("user-profile", { profileId: notif.actor.id });
                                setShowNotificationsDropdown(false);
                              }
                            }}
                            className="w-8 h-8 rounded-full object-cover bg-gray-100 dark:bg-gray-800 cursor-pointer hover:opacity-80 transition-opacity"
                          />
                        ) : (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              if (notif.actor?.id) {
                                onNavigate("user-profile", { profileId: notif.actor.id });
                                setShowNotificationsDropdown(false);
                              }
                            }}
                            className={`w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 text-xs font-black ${notif.actor?.id ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}`}
                          >
                            {notif.actor?.username?.[0]?.toUpperCase() || "M"}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-800 dark:text-gray-300 leading-relaxed">
                            <span className="font-bold text-gray-900 dark:text-white ml-1">
                              {notif.actor?.username || "سيستم"}
                            </span>
                            {notif.type === "like" && "أعجب بالميم الخاص بك ❤️"}
                            {notif.type === "comment" && "علق على منشورك 💬"}
                            {notif.type === "follow" && "بدأ بمتابعتك 👤"}
                          </p>
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 block mt-1.5 font-mono">
                            {new Date(notif.created_at).toLocaleTimeString("ar-EG", { hour: 'numeric', minute: '2-digit' })}
                          </span>
                        </div>
                        {!notif.is_read && <div className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400 mt-2 flex-shrink-0"></div>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* قائمة المستخدم الحالي */}
          <div className="relative">
            <button
              onClick={() => {
                setShowUserDropdown(!showUserDropdown);
                setShowNotificationsDropdown(false);
                setShowLogoutConfirm(false);
              }}
              className={`h-10 pl-1 pr-3 flex items-center gap-2 rounded-full transition-colors cursor-pointer ${
                showUserDropdown 
                  ? "bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white" 
                  : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"
              }`}
            >
              <div className="hidden lg:block text-right">
                <p className="text-xs font-bold leading-tight">
                  {isRealUser ? currentUser.username : "زائر"}
                </p>
              </div>
              {isRealUser && currentUser.avatar_url ? (
                <img loading="lazy" decoding="async"
                  src={currentUser.avatar_url}
                  alt={currentUser.username}
                  className="w-8 h-8 rounded-full object-cover bg-white dark:bg-gray-700"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-300 flex items-center justify-center text-xs font-black">
                  <User className="w-4 h-4" />
                </div>
              )}
            </button>

            {/* محتوى قائمة الملف الشخصي */}
            {showUserDropdown && (
              <div className="absolute top-full mt-2 w-64 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl py-2 text-right z-50 shadow-2xl -left-2 sm:left-0 origin-top-left">
                {isRealUser ? (
                  <>
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/80 rounded-t-2xl">
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">حسابك الحالي</p>
                      <p className="font-extrabold text-gray-900 dark:text-white text-sm mt-0.5">{currentUser.username}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[11px] bg-blue-50 text-blue-700 border border-blue-100 dark:bg-gray-800 dark:text-blue-400 dark:border-gray-600 px-3 py-1 rounded-full font-extrabold shadow-sm">
                          Level: {currentUser.meme_level}
                        </span>
                      </div>
                    </div>

                    <div className="py-2">
                      {/* تبديل الثيم */}
                      <div className="px-3 pb-2 mb-1 border-b border-gray-100 dark:border-gray-800">
                        <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-xl flex items-center">
                          <button 
                            onClick={(e) => { e.stopPropagation(); toggleTheme('light'); }}
                            className={`flex-1 flex justify-center items-center gap-2 py-1.5 rounded-lg text-xs font-bold transition-all ${!isDarkMode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-white'}`}
                          >
                            <Sun className="w-4 h-4" /> فاتح
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); toggleTheme('dark'); }}
                            className={`flex-1 flex justify-center items-center gap-2 py-1.5 rounded-lg text-xs font-bold transition-all ${isDarkMode ? 'bg-gray-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                          >
                            <Moon className="w-4 h-4" /> داكن
                          </button>
                        </div>
                      </div>

                      <button onClick={() => { onNavigate("saves"); closeUserDropdown(); }} className="w-full text-right px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm text-gray-700 dark:text-gray-200 font-bold flex items-center justify-between transition-colors">
                        <span>المحفوظات</span>
                        <Bookmark className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                      </button>

                      {/* زرار الدخول لنظام الرسايل - جمب زرار المحفوظات بالظبط */}
                      <button onClick={() => { onNavigate("messages"); closeUserDropdown(); }} className="w-full text-right px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm text-gray-700 dark:text-gray-200 font-bold flex items-center justify-between transition-colors">
                        <span className="flex items-center gap-2">
                          الرسايل
                          {unreadMessagesCount > 0 && (
                            <span className="bg-red-500 text-white text-[9px] font-black min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center">
                              {unreadMessagesCount > 9 ? "9+" : unreadMessagesCount}
                            </span>
                          )}
                        </span>
                        <MessageCircle className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                      </button>

                      <button onClick={() => { onNavigate("profile"); closeUserDropdown(); }} className="w-full text-right px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm text-gray-700 dark:text-gray-200 font-bold flex items-center justify-between transition-colors">
                        <span>المرجع والإعدادات</span>
                        <Settings className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                      </button>

                      {/* تسجيل الخروج */}
                      <div className="border-t border-gray-100 dark:border-gray-800 mt-2 pt-2">
                        {!showLogoutConfirm ? (
                          <button onClick={() => setShowLogoutConfirm(true)} className="w-full text-right px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm text-red-600 dark:text-red-400 font-bold flex items-center justify-between transition-colors">
                            <span>تسجيل الخروج</span>
                            <LogOut className="w-4 h-4" />
                          </button>
                        ) : (
                          <div className="px-4 py-2 bg-red-50 dark:bg-red-900/10 mx-2 rounded-xl">
                            <p className="text-[10px] text-red-600 dark:text-red-400 font-bold text-center mb-2">متأكد إنك طالع؟</p>
                            <div className="flex gap-2">
                              <button onClick={onSignOutReal} className="flex-1 bg-red-600 text-white py-1 rounded-lg text-[10px] font-black hover:bg-red-700">نعم</button>
                              <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-1 rounded-lg text-[10px] font-black">إلغاء</button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="p-4 text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-bold mb-4">سجل دخول عشان ترفع ميمز وتجمع نقاط! 🚀</p>
                    <button onClick={() => { onShowAuthModal(); closeUserDropdown(); }} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20">
                      <LogIn className="w-4 h-4" />
                      سجل دخولك الآن
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

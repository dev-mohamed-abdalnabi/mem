import React, { useState, useEffect, useRef } from "react";
import { Search, Bell, Trophy, User, Flame, LogOut, PlusCircle, Settings, LogIn, Sun, Moon } from "lucide-react";
import { Profile, Notification } from "../types";

interface HeaderProps {
  currentUser: Profile;
  notifications: Notification[];
  onNavigate: (tab: string) => void;
  onSearch: (query: string) => void;
  activeTab: string;
  onUserSwitch: (profile: Profile) => void;
  availableProfiles: Profile[];
  onMarkNotificationsRead: () => void;
  onShowAuthModal: () => void;
  onSignOutReal: () => void;
  isRealUser: boolean;
}

export default function Header({
  currentUser,
  notifications,
  onNavigate,
  onSearch,
  activeTab,
  onUserSwitch,
  availableProfiles,
  onMarkNotificationsRead,
  onShowAuthModal,
  onSignOutReal,
  isRealUser
}: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // مرجع (Ref) لاكتشاف الضغط خارج القوائم
  const dropdownContainerRef = useRef<HTMLDivElement>(null);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') || 
             (!document.documentElement.classList.contains('light') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  const toggleTheme = (mode: 'light' | 'dark') => {
    const isDark = mode === 'dark';
    setIsDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    onSearch(val);
  };

  const closeUserDropdown = () => {
    setShowUserDropdown(false);
    setShowLogoutConfirm(false);
  };

  // تأثير (Effect) لإغلاق القوائم عند الضغط في أي مكان خارجها
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

  const unifiedBtnClass = "h-10 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors cursor-pointer text-gray-700 dark:text-gray-200 font-bold";
  const unifiedIconClass = `${unifiedBtnClass} w-10`;

  return (
    <header className="sticky top-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 transition-all">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        
        {/* Logo and Points */}
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div
            onClick={() => onNavigate("feed")}
            className="flex items-center gap-2 cursor-pointer select-none group"
          >
            <div className="w-10 h-10 rounded-full bg-black dark:bg-white flex items-center justify-center text-white dark:text-black font-black text-2xl group-hover:scale-105 transition-transform">
              @
            </div>
            <div className="hidden sm:block">
              <h1 className="font-extrabold text-xl text-black dark:text-white tracking-tight leading-none">
                mem
              </h1>
            </div>
          </div>

          {/* Points Pill */}
          <div 
            onClick={() => onNavigate("leaderboard")}
            className="h-10 px-4 rounded-full bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 flex items-center gap-1.5 text-sm font-bold cursor-pointer select-none transition-colors text-gray-800 dark:text-gray-200"
            title="لوحة الشرف"
          >
            <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
            <span>{currentUser.total_points}</span>
          </div>
        </div>

        {/* Central Search Bar */}
        <div className="flex-1 max-w-md relative hidden md:block">
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="ابحث عن ميمز, هاشتاج, أو نكتة..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full h-10 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 focus:bg-white dark:focus:bg-slate-900 border-2 border-transparent focus:border-gray-300 dark:focus:border-slate-600 rounded-full py-2 pr-10 pl-4 text-sm text-gray-900 dark:text-white outline-none transition-all placeholder:text-gray-500 dark:placeholder:text-gray-400"
          />
        </div>

        {/* Right Actions & Utilities (مربوطة بالـ Ref لإغلاق القوائم عند الخروج) */}
        <div ref={dropdownContainerRef} className="flex items-center gap-2">
          
          {/* Post Button */}
          <button
            onClick={() => onNavigate("create-post")}
            className={`h-10 px-4 rounded-full flex items-center gap-2 font-bold text-sm transition-colors cursor-pointer ${
              activeTab === "create-post" 
                ? "bg-black dark:bg-white text-white dark:text-black hover:bg-gray-900 dark:hover:bg-gray-200" 
                : "bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-700"
            }`}
            title="انشر ميم جديد"
          >
            <PlusCircle className="w-5 h-5" />
            <span className="hidden sm:inline">انشر ميم</span>
          </button>

          {/* Notifications Trigger */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotificationsDropdown(!showNotificationsDropdown);
                closeUserDropdown();
              }}
              className={`relative ${unifiedIconClass} ${showNotificationsDropdown ? "!bg-gray-300 dark:!bg-slate-600" : ""}`}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -left-1 bg-red-500 text-white font-extrabold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-800">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Popover */}
            {showNotificationsDropdown && (
              <div className="absolute top-full mt-2 w-[320px] max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl py-2 text-right z-50 shadow-2xl -left-12 sm:left-0 origin-top-left">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
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
                          if (notif.meme_id) onNavigate("feed");
                          setShowNotificationsDropdown(false);
                        }}
                        className={`px-4 py-3 border-b border-gray-50 dark:border-slate-800/50 hover:bg-gray-50 dark:hover:bg-slate-800/50 flex items-start gap-3 cursor-pointer transition-colors ${
                          !notif.is_read ? "bg-blue-50/50 dark:bg-blue-900/20" : ""
                        }`}
                      >
                        {notif.actor?.avatar_url ? (
                          <img src={notif.actor.avatar_url} alt="avatar" className="w-8 h-8 rounded-full object-cover bg-gray-100 dark:bg-slate-800" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-600 dark:text-gray-300 text-xs font-black">
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

          {/* Current User Trigger */}
          <div className="relative">
            <button
              onClick={() => {
                setShowUserDropdown(!showUserDropdown);
                setShowNotificationsDropdown(false);
                setShowLogoutConfirm(false);
              }}
              className={`h-10 pl-1 pr-3 flex items-center gap-2 rounded-full transition-colors cursor-pointer ${
                showUserDropdown 
                  ? "bg-gray-300 dark:bg-slate-600 text-gray-900 dark:text-white" 
                  : "bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-200"
              }`}
            >
              <div className="hidden lg:block text-right">
                <p className="text-xs font-bold leading-tight">
                  {isRealUser ? currentUser.username : "زائر"}
                </p>
              </div>
              {isRealUser && currentUser.avatar_url ? (
                <img
                  src={currentUser.avatar_url}
                  alt={currentUser.username}
                  className="w-8 h-8 rounded-full object-cover bg-white dark:bg-slate-700"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-700 text-gray-500 dark:text-gray-300 flex items-center justify-center text-xs font-black">
                  <User className="w-4 h-4" />
                </div>
              )}
            </button>

            {/* Profile Dropdown */}
            {showUserDropdown && (
              <div className="absolute top-full mt-2 w-64 max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl py-2 text-right z-50 shadow-2xl -left-2 sm:left-0 origin-top-left">
                {isRealUser ? (
                  <>
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/80 rounded-t-2xl">
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">حسابك الحالي</p>
                      <p className="font-extrabold text-gray-900 dark:text-white text-sm mt-0.5">{currentUser.username}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {/* تم إصلاح تباين الألوان هنا ليكون واضح جداً في كلا الوضعين */}
                        <span className="text-[11px] bg-blue-50 text-blue-700 border border-blue-100 dark:bg-slate-800 dark:text-blue-400 dark:border-slate-600 px-3 py-1 rounded-full font-extrabold shadow-sm">
                          Level: {currentUser.meme_level}
                        </span>
                      </div>
                    </div>

                    <div className="py-2">
                      {/* Theme Toggle */}
                      <div className="px-3 pb-2 mb-1 border-b border-gray-100 dark:border-slate-800">
                        <div className="bg-gray-100 dark:bg-slate-800 p-1 rounded-xl flex items-center">
                          <button 
                            onClick={(e) => { e.stopPropagation(); toggleTheme('light'); }}
                            className={`flex-1 flex justify-center items-center gap-2 py-1.5 rounded-lg text-xs font-bold transition-all ${!isDarkMode ? 'bg-white dark:bg-slate-600 text-black dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'}`}
                          >
                            <Sun className="w-4 h-4" /> فاتح
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); toggleTheme('dark'); }}
                            className={`flex-1 flex justify-center items-center gap-2 py-1.5 rounded-lg text-xs font-bold transition-all ${isDarkMode ? 'bg-slate-700 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'}`}
                          >
                            <Moon className="w-4 h-4" /> داكن
                          </button>
                        </div>
                      </div>

                      <button onClick={() => { onNavigate("profile"); closeUserDropdown(); }} className="w-full text-right px-4 py-2 hover:bg-gray-50 dark:hover:bg-slate-800 text-sm text-gray-700 dark:text-gray-200 font-bold flex items-center justify-between transition-colors">
                        <span>المرجع والإعدادات</span>
                        <Settings className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                      </button>

                      <button onClick={() => { onNavigate("leaderboard"); closeUserDropdown(); }} className="w-full text-right px-4 py-2 hover:bg-gray-50 dark:hover:bg-slate-800 text-sm text-gray-700 dark:text-gray-200 font-bold flex items-center justify-between transition-colors">
                        <span>المتصدرين</span>
                        <Trophy className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                      </button>
                    </div>

                    <div className="border-t border-gray-100 dark:border-slate-800 mt-1">
                      {showLogoutConfirm ? (
                        <div className="px-4 py-3 bg-gray-50 dark:bg-slate-800/80 rounded-b-2xl">
                          <p className="text-xs text-gray-800 dark:text-gray-200 font-bold mb-2 text-center">هل أنت متأكد من الخروج؟</p>
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => { onSignOutReal(); closeUserDropdown(); }} className="px-3 py-1.5 bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 text-xs font-bold rounded-lg transition-colors flex-1">
                              نعم، خروج
                            </button>
                            <button onClick={() => setShowLogoutConfirm(false)} className="px-3 py-1.5 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-800 dark:text-gray-200 text-xs font-bold rounded-lg transition-colors flex-1">
                              إلغاء
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={(e) => { e.stopPropagation(); setShowLogoutConfirm(true); }} className="w-full px-4 py-3 text-right text-sm text-red-600 dark:text-red-400 font-bold flex items-center gap-2 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer rounded-b-2xl">
                          <LogOut className="w-4 h-4" />
                          <span>تسجيل الخروج</span>
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="px-4 py-4 border-b border-gray-100 dark:border-slate-800 text-center bg-gray-50/50 dark:bg-slate-800/80 rounded-t-2xl">
                      <div className="w-12 h-12 bg-gray-200 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-2">
                        <User className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                      </div>
                      <p className="font-bold text-gray-900 dark:text-white text-sm">أهلاً بك يا زائر!</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">سجل دخولك لتتمكن من النشر والتفاعل.</p>
                    </div>
                    
                    {/* Theme Toggle for Visitor */}
                    <div className="py-2 px-3">
                      <div className="bg-gray-100 dark:bg-slate-800 p-1 rounded-xl flex items-center">
                        <button 
                          onClick={(e) => { e.stopPropagation(); toggleTheme('light'); }}
                          className={`flex-1 flex justify-center items-center gap-2 py-1.5 rounded-lg text-xs font-bold transition-all ${!isDarkMode ? 'bg-white dark:bg-slate-600 text-black dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'}`}
                        >
                          <Sun className="w-4 h-4" /> فاتح
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); toggleTheme('dark'); }}
                          className={`flex-1 flex justify-center items-center gap-2 py-1.5 rounded-lg text-xs font-bold transition-all ${isDarkMode ? 'bg-slate-700 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'}`}
                        >
                          <Moon className="w-4 h-4" /> داكن
                        </button>
                      </div>
                    </div>

                    <div className="p-3 border-t border-gray-100 dark:border-slate-800 mt-1">
                      <button onClick={() => { onShowAuthModal(); closeUserDropdown(); }} className="w-full py-2.5 bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-black text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all">
                        <LogIn className="w-4 h-4" />
                        <span>دخول / إنشاء حساب</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
                      }

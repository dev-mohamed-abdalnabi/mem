import React, { useState } from "react";
import { Search, Bell, Trophy, BookOpen, User, Flame, LogOut, CheckCircle2, Sun, Moon, PlusCircle, Settings, LogIn } from "lucide-react";
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
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false); // حالة لتأكيد تسجيل الخروج بدون نوافذ المتصفح

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') || 
             (!document.documentElement.classList.contains('light') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) {
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

  // إغلاق القوائم وتصفير حالة التأكيد
  const closeUserDropdown = () => {
    setShowUserDropdown(false);
    setShowLogoutConfirm(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 transition-all shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo and Branding (RTL Friendly) */}
        <div className="flex items-center gap-3">
          <div
            onClick={() => onNavigate("feed")}
            className="flex items-center gap-2 cursor-pointer select-none group"
            id="brand_logo_main"
          >
            <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white font-black text-2xl shadow-md group-hover:scale-105 transition-all">
              @
            </div>
            <div className="hidden sm:block">
              <h1 className="font-extrabold text-xl text-black tracking-tight leading-none">
                mem
              </h1>
            </div>
          </div>

          {/* Points Status */}
          <div 
            onClick={() => onNavigate("leaderboard")}
            className="bg-gray-50 text-black hover:bg-gray-100 px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-bold cursor-pointer select-none transition-all mr-2 shadow-sm"
            title="لوحة الشرف"
          >
            <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
            <span>{currentUser.total_points}</span>
          </div>
        </div>

        {/* Central Search Bar */}
        <div className="flex-1 max-w-md relative hidden md:block">
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="ابحث عن ميمز, هاشتاج, أو نكتة..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 rounded-full py-2 pr-10 pl-4 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400"
          />
        </div>

        {/* Right Actions & Utilities */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Theme Toggle (تم تحسين الشكل) */}
          <button
            onClick={toggleTheme}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-sm border ${
              isDarkMode 
                ? "bg-gray-800 border-gray-700 hover:bg-gray-700" 
                : "bg-amber-50 border-amber-100 hover:bg-amber-100"
            }`}
            title={isDarkMode ? "الوضع الفاتح" : "الوضع الليلي"}
          >
            {isDarkMode ? (
              <Sun className="w-5 h-5 text-amber-400" />
            ) : (
              <Moon className="w-5 h-5 text-indigo-600" />
            )}
          </button>

          {/* Post Button (تم تحويله لزر واضح وأنيق) */}
          <button
            onClick={() => onNavigate("create-post")}
            className={`flex items-center gap-1.5 h-10 px-3 sm:px-4 rounded-full font-bold text-sm transition-all cursor-pointer ${
              activeTab === "create-post" 
                ? "bg-blue-800 text-white shadow-inner scale-95" 
                : "bg-blue-600 text-white hover:bg-blue-700 hover:-translate-y-0.5 shadow-md hover:shadow-lg"
            }`}
            title="انشر ميم جديد"
          >
            <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">انشر ميم</span>
          </button>

          {/* Notifications Trigger */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotificationsDropdown(!showNotificationsDropdown);
                closeUserDropdown();
              }}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer relative ${
                showNotificationsDropdown
                  ? "bg-gray-100 text-black shadow-inner"
                  : "bg-gray-50 text-gray-500 hover:text-black hover:bg-gray-100 border border-gray-200"
              }`}
            >
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -left-1 bg-red-500 text-white font-extrabold text-[10px] w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Popover */}
            {showNotificationsDropdown && (
              <div className="absolute left-0 mt-2 w-80 bg-white border border-gray-200 rounded-2xl py-2 text-right z-50 shadow-xl">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 rounded-t-2xl">
                  <h3 className="font-bold text-gray-800 text-sm">الإشعارات الحية</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={onMarkNotificationsRead}
                      className="text-xs text-blue-600 font-bold hover:text-blue-800 hover:underline"
                    >
                      تحديد الكل كمقروء
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-gray-400 text-xs font-medium">
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
                        className={`px-4 py-3 border-b border-gray-50 hover:bg-blue-50/50 flex items-start gap-3 cursor-pointer transition-colors ${
                          !notif.is_read ? "bg-blue-50/30" : ""
                        }`}
                      >
                        {notif.actor?.avatar_url ? (
                          <img
                            src={notif.actor.avatar_url}
                            alt="avatar"
                            className="w-8 h-8 rounded-full border border-gray-200 object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-black">
                            {notif.actor?.username?.[0]?.toUpperCase() || "M"}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-800 leading-relaxed">
                            <span className="font-bold text-gray-900 ml-1">
                              {notif.actor?.username || "سيستم ميمزبوك"}
                            </span>
                            {notif.type === "like" && "أعجب بالميم الخاص بك ❤️"}
                            {notif.type === "comment" && "كتب كمنتًا عليك 💬:"}
                            {notif.type === "follow" && "بدأ بمتابعة حسابك 👤"}
                            {notif.type === "achievement" && `🏆 ${notif.content}`}
                          </p>
                          {notif.content && notif.type === "comment" && (
                            <p className="text-xs text-gray-600 font-medium mt-1 bg-white border border-gray-100 rounded p-2 truncate shadow-sm">
                              "{notif.content}"
                            </p>
                          )}
                          <span className="text-[10px] text-gray-400 block mt-1.5 font-mono">
                            {new Date(notif.created_at).toLocaleTimeString("ar-EG", {
                              hour: 'numeric', minute: '2-digit'
                            })}
                          </span>
                        </div>
                        {!notif.is_read && (
                          <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                        )}
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
              className="flex items-center gap-2 px-1.5 py-1.5 rounded-full hover:bg-gray-50 border border-gray-200 hover:border-gray-300 transition-all cursor-pointer shadow-sm"
            >
              {isRealUser && currentUser.avatar_url ? (
                <img
                  src={currentUser.avatar_url}
                  alt={currentUser.username}
                  className="w-8 h-8 rounded-full object-cover border border-gray-100"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-xs font-black">
                  {isRealUser ? currentUser.username[0].toUpperCase() : <User className="w-4 h-4" />}
                </div>
              )}
              <div className="hidden lg:block text-right pr-1 pl-2">
                <p className="text-xs font-bold text-gray-800 leading-tight">
                  {isRealUser ? currentUser.username : "زائر"}
                </p>
                {isRealUser && (
                  <p className="text-[9px] text-orange-500 font-bold">
                    {currentUser.meme_level}
                  </p>
                )}
              </div>
            </button>

            {/* Profile Dropdown */}
            {showUserDropdown && (
              <div className="absolute left-0 mt-2 w-64 bg-white border border-gray-200 rounded-2xl py-2 text-right z-50 shadow-xl">
                {isRealUser ? (
                  <>
                    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 rounded-t-2xl">
                      <p className="text-xs text-gray-500 font-medium">حسابك الحالي</p>
                      <p className="font-extrabold text-gray-900 text-sm mt-0.5">{currentUser.username}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                          Level: {currentUser.meme_level}
                        </span>
                        <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                          <Flame className="w-3 h-3" /> {currentUser.total_points}
                        </span>
                      </div>
                    </div>

                    {/* Navigations */}
                    <div className="py-1">
                      <button
                        onClick={() => {
                          onNavigate("profile");
                          closeUserDropdown();
                        }}
                        className="w-full text-right px-4 py-2.5 hover:bg-gray-50 text-xs text-gray-700 font-bold flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <span>الإعدادات والملف الشخصي</span>
                        <Settings className="w-4 h-4 text-gray-400" />
                      </button>

                      <button
                        onClick={() => {
                          onNavigate("leaderboard");
                          closeUserDropdown();
                        }}
                        className="w-full text-right px-4 py-2.5 hover:bg-gray-50 text-xs text-gray-700 font-bold flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <span>المتصدرين والـ Meme Lords</span>
                        <Trophy className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>

                    {/* Custom Inline Logout Confirmation */}
                    <div className="border-t border-gray-100 mt-1">
                      {showLogoutConfirm ? (
                        <div className="px-4 py-3 bg-red-50 rounded-b-2xl">
                          <p className="text-xs text-red-800 font-bold mb-2 text-center">هل أنت متأكد من الخروج؟</p>
                          <div className="flex items-center justify-center gap-2">
                            <button 
                              onClick={() => {
                                onSignOutReal();
                                closeUserDropdown();
                              }}
                              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors flex-1"
                            >
                              نعم، خروج
                            </button>
                            <button 
                              onClick={() => setShowLogoutConfirm(false)}
                              className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-lg transition-colors flex-1"
                            >
                              إلغاء
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowLogoutConfirm(true);
                          }}
                          className="w-full px-4 py-3 text-right text-xs text-red-600 font-bold flex items-center gap-2 hover:bg-red-50 transition-colors cursor-pointer rounded-b-2xl"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>تسجيل الخروج</span>
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  /* User is NOT logged in */
                  <>
                    <div className="px-4 py-4 border-b border-gray-100 text-center bg-gray-50/50 rounded-t-2xl">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-2">
                        <User className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="font-bold text-gray-900 text-sm">أهلاً بك يا زائر!</p>
                      <p className="text-xs text-gray-500 mt-1">سجل دخولك عشان تتفاعل وتنشر ميمز براحتك.</p>
                    </div>

                    <div className="p-3">
                      <button
                        onClick={() => {
                          onShowAuthModal();
                          closeUserDropdown();
                        }}
                        className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm"
                      >
                        <LogIn className="w-4 h-4" />
                        <span>تسجيل الدخول / إنشاء حساب</span>
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

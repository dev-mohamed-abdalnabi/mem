import React, { useState } from "react";
import { Search, Bell, Trophy, BookOpen, User, Flame, LogOut, CheckCircle2, Sun, Moon } from "lucide-react";
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

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-700 transition-all">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo and Branding (RTL Friendly) */}
        <div className="flex items-center gap-3">
          <div
            onClick={() => onNavigate("feed")}
            className="flex items-center gap-2 cursor-pointer select-none group"
            id="brand_logo_main"
          >
            <div className="w-10 h-10 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center text-white font-black text-2xl shadow-md group-hover:scale-105 transition-all">
              @
            </div>
            <div className="hidden sm:block">
              <h1 className="font-extrabold text-xl text-slate-900 dark:text-white tracking-tight leading-none">
                MEM
              </h1>
            </div>
          </div>

          {/* Points Status */}
          <div 
            onClick={() => onNavigate("leaderboard")}
            className="bg-gray-50 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-gray-100 dark:hover:bg-slate-700 px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-bold cursor-pointer select-none transition-all mr-2"
          >
            <Flame className="w-4 h-4 text-orange-500" />
            <span>{currentUser.total_points}</span>
          </div>
        </div>

        {/* Central Search Bar */}
        <div className="flex-1 max-w-md relative hidden md:block">
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="ابحث عن ميمز، هاشتاج، أو نكتة..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-500 dark:focus:border-blue-400 rounded-xl py-2 pr-10 pl-4 text-sm text-gray-900 dark:text-white outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-slate-500"
          />
        </div>

        {/* Right Actions & Utilities */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
            title={isDarkMode ? "الوضع الفاتح" : "الوضع الليلي"}
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* Account Toggle/Status */}
          <button
            onClick={isRealUser ? onSignOutReal : onShowAuthModal}
            className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1 shrink-0 ${
              isRealUser 
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700"
                : "bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-800"
            }`}
          >
            <span>{isRealUser ? "خروج" : "دخول"}</span>
          </button>



          {/* Notifications Trigger */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotificationsDropdown(!showNotificationsDropdown);
                setShowUserDropdown(false);
                if (!showNotificationsDropdown) {
                  onMarkNotificationsRead();
                }
              }}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer relative ${
                showNotificationsDropdown
                  ? "bg-gray-100 dark:bg-slate-800 text-slate-900 dark:text-white"
                  : "text-gray-400 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800"
              }`}
            >
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -left-1 bg-red-500 text-white font-extrabold text-[9px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 animate-bounce">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Popover */}
            {showNotificationsDropdown && (
              <div className="absolute left-0 mt-2 w-80 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl shadow-xl py-2 text-right z-50">
                <div className="px-4 py-2 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
                  <h3 className="font-bold text-gray-800 dark:text-white text-sm">الإشعارات الحية</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={onMarkNotificationsRead}
                      className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                    >
                      تحديد الكل كمقروء
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-gray-400 dark:text-slate-500 text-xs">
                      لا توجد إشعارات حتى الآن
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => {
                          if (notif.meme_id) onNavigate("feed");
                          setShowNotificationsDropdown(false);
                        }}
                        className={`px-4 py-3 border-b border-gray-50 dark:border-slate-700 hover:bg-blue-50/50 dark:hover:bg-slate-700/50 flex items-start gap-3 cursor-pointer transition-colors ${
                          !notif.is_read ? "bg-blue-50/20 dark:bg-blue-900/20" : ""
                        }`}
                      >
                        {notif.actor?.avatar_url ? (
                          <img
                            src={notif.actor.avatar_url}
                            alt="avatar"
                            className="w-8 h-8 rounded-full border border-gray-200 dark:border-slate-600 object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400 text-xs font-black">
                            M
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-800 dark:text-slate-200">
                            <span className="font-bold text-gray-900 dark:text-white ml-1">
                              {notif.actor?.username || "سيستم ميمزبوك"}
                            </span>
                            {notif.type === "like" && "أعجب بالميم الخاص بك"}
                            {notif.type === "comment" && "كتب كمنتًا عليك:"}
                            {notif.type === "follow" && "بدأ بمتابعة حسابك ونشاطك"}
                            {notif.type === "achievement" && notif.content}
                          </p>
                          {notif.content && notif.type === "comment" && (
                            <p className="text-xs text-gray-500 dark:text-slate-400 font-mono mt-1 bg-gray-50 dark:bg-slate-700 border border-gray-100 dark:border-slate-600 rounded p-1.5 truncate">
                              "{notif.content}"
                            </p>
                          )}
                          <span className="text-[10px] text-gray-400 dark:text-slate-500 block mt-1">
                            {new Date(notif.created_at).toLocaleTimeString("ar-EG", {
                              hour: 'numeric', minute: '2-digit'
                            })}
                          </span>
                        </div>
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
              }}
              className="flex items-center gap-2 px-1.5 py-1.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 border border-transparent hover:border-gray-100 dark:hover:border-slate-700 transition-all cursor-pointer"
            >
              {currentUser.avatar_url ? (
                <img
                  src={currentUser.avatar_url}
                  alt={currentUser.username}
                  className="w-8 h-8 rounded-full object-cover border border-gray-100 dark:border-slate-700"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-slate-400 flex items-center justify-center text-xs font-black">
                  {currentUser.username[0]}
                </div>
              )}
              <div className="hidden lg:block text-right">
                <p className="text-xs font-bold text-gray-800 dark:text-white leading-tight">
                  {currentUser.username}
                </p>
                <p className="text-[9px] text-orange-500 dark:text-orange-400 font-bold">
                  {currentUser.meme_level}
                </p>
              </div>
            </button>

            {/* Profile Dropdown & User switcher */}
            {showUserDropdown && (
              <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl shadow-xl py-2 text-right z-50">
                <div className="px-4 py-2 border-b border-gray-100 dark:border-slate-700">
                  <p className="text-xs text-gray-400 dark:text-slate-500">حسابك الحالي</p>
                  <p className="font-bold text-gray-900 dark:text-white text-sm">{currentUser.username}</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-mono mt-1">Level: {currentUser.meme_level}</p>
                </div>

                {/* Live Member Directory list */}
                {availableProfiles && availableProfiles.length > 0 && (
                  <div className="px-4 py-2 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-700/50">
                    <p className="text-[10px] text-gray-400 dark:text-slate-500 font-bold mb-1.5">الحسابات النشطة بالمنصة:</p>
                    <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
                      {availableProfiles.slice(0, 4).map((prof) => (
                        <div
                          key={prof.id}
                          className={`flex items-center gap-2 p-1.5 rounded-lg text-right text-xs ${
                            prof.id === currentUser.id ? "bg-blue-50/80 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 font-semibold" : "text-gray-600 dark:text-slate-400"
                          }`}
                        >
                          {prof.avatar_url && (
                            <img
                              src={prof.avatar_url}
                              alt=""
                              className="w-5 h-5 rounded-md object-cover border border-gray-200 dark:border-slate-600"
                              referrerPolicy="no-referrer"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-bold truncate leading-none">{prof.username}</p>
                            <p className="text-[8px] text-gray-400 dark:text-slate-500 leading-normal font-mono truncate">{prof.total_points} XP • {prof.meme_level.split(" ")[0]}</p>
                          </div>
                          {prof.id === currentUser.id && (
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Navigations directly */}
                <button
                  onClick={() => {
                    onNavigate("profile");
                    setShowUserDropdown(false);
                  }}
                  className="w-full text-right px-4 py-2 hover:bg-gray-50 dark:hover:bg-slate-700 text-xs text-gray-700 dark:text-slate-300 font-bold flex items-center justify-between cursor-pointer transition-colors"
                >
                  <span>الملف الشخصي والمكافآت</span>
                  <User className="w-4 h-4 text-gray-400 dark:text-slate-500" />
                </button>

                <button
                  onClick={() => {
                    onNavigate("leaderboard");
                    setShowUserDropdown(false);
                  }}
                  className="w-full text-right px-4 py-2 hover:bg-gray-50 dark:hover:bg-slate-700 text-xs text-gray-700 dark:text-slate-300 font-bold flex items-center justify-between cursor-pointer transition-colors"
                >
                  <span>المتصدرين والـ Meme Lords</span>
                  <Trophy className="w-4 h-4 text-gray-400 dark:text-slate-500" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

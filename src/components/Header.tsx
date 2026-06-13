import React, { useState } from "react";
import { Search, Bell, Trophy, BookOpen, User, Flame, LogOut, CheckCircle2 } from "lucide-react";
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
}

export default function Header({
  currentUser,
  notifications,
  onNavigate,
  onSearch,
  activeTab,
  onUserSwitch,
  availableProfiles,
  onMarkNotificationsRead
}: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    onSearch(val);
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm transition-all">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo and Branding (RTL Friendly) */}
        <div className="flex items-center gap-3">
          <div
            onClick={() => onNavigate("feed")}
            className="flex items-center gap-2 cursor-pointer select-none group"
            id="brand_logo_main"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xl shadow-md group-hover:scale-105 transition-all">
              M
            </div>
            <div className="hidden sm:block">
              <h1 className="font-extrabold text-lg text-gray-900 tracking-tight leading-none">
                ميمز بوك
              </h1>
              <p className="text-[10px] text-blue-500 font-bold tracking-widest mt-0.5">
                MEMESBOOK
              </p>
            </div>
          </div>

          {/* Points Status */}
          <div 
            onClick={() => onNavigate("leaderboard")}
            className="bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-semibold cursor-pointer select-none transition-all mr-2"
          >
            <Flame className="w-4 h-4 text-orange-500 fill-orange-500 animate-pulse" />
            <span>{currentUser.total_points} نقطة</span>
            <span className="hidden md:inline text-xs text-blue-500 bg-white/80 px-2 py-0.5 rounded-full border border-blue-200">
              {currentUser.meme_level.split(" ")[0]}
            </span>
          </div>
        </div>

        {/* Central Search Bar */}
        <div className="flex-1 max-w-md relative hidden md:block">
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="ابحث عن ميمز، هاشتاج، أو نكتة..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 rounded-xl py-2 pr-10 pl-4 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400"
          />
        </div>

        {/* Right Actions & Utilities */}
        <div className="flex items-center gap-2">
          {/* Create Meme Button */}
          <button
            onClick={() => onNavigate("creator")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer shadow-sm transition-all ${
              activeTab === "creator"
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:opacity-95"
                : "bg-blue-50 text-blue-600 hover:bg-blue-100"
            }`}
            id="create_meme_header_btn"
          >
            <BookOpen className="w-4 h-4" />
            <span className="font-bold">استوديو الميمز</span>
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
              className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all cursor-pointer relative ${
                showNotificationsDropdown
                  ? "bg-blue-50 border-blue-200 text-blue-600"
                  : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -left-1.5 bg-red-500 text-white font-extrabold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white animate-bounce">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Popover */}
            {showNotificationsDropdown && (
              <div className="absolute left-0 mt-2 w-80 bg-white border border-gray-100 rounded-2xl shadow-xl py-2 text-right z-50">
                <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-bold text-gray-800 text-sm">الإشعارات الحية</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={onMarkNotificationsRead}
                      className="text-xs text-blue-600 font-semibold hover:underline"
                    >
                      تحديد الكل كمقروء
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-gray-400 text-xs">
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
                        className={`px-4 py-3 border-b border-gray-50 hover:bg-blue-50/50 flex items-start gap-3 cursor-pointer transition-colors ${
                          !notif.is_read ? "bg-blue-50/20" : ""
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
                            M
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-800">
                            <span className="font-bold text-gray-900 ml-1">
                              {notif.actor?.username || "سيستم ميمزبوك"}
                            </span>
                            {notif.type === "like" && "أعجب بالميم الخاص بك"}
                            {notif.type === "comment" && "كتب كمنتًا عليك:"}
                            {notif.type === "follow" && "بدأ بمتابعة حسابك ونشاطك"}
                            {notif.type === "achievement" && notif.content}
                          </p>
                          {notif.content && notif.type === "comment" && (
                            <p className="text-xs text-gray-500 font-mono mt-1 bg-gray-50 border border-gray-100 rounded p-1.5 truncate">
                              "{notif.content}"
                            </p>
                          )}
                          <span className="text-[10px] text-gray-400 block mt-1">
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
              className="flex items-center gap-2 px-1.5 py-1.5 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-all cursor-pointer"
            >
              {currentUser.avatar_url ? (
                <img
                  src={currentUser.avatar_url}
                  alt={currentUser.username}
                  className="w-8 h-8 rounded-xl object-cover border border-gray-200 ring-2 ring-blue-50"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xs font-black">
                  U
                </div>
              )}
              <div className="hidden lg:block text-right">
                <p className="text-xs font-bold text-gray-800 leading-tight">
                  {currentUser.username}
                </p>
                <p className="text-[9px] text-orange-500 font-bold">
                  {currentUser.meme_level}
                </p>
              </div>
            </button>

            {/* Profile Dropdown & User switcher */}
            {showUserDropdown && (
              <div className="absolute left-0 mt-2 w-64 bg-white border border-gray-100 rounded-2xl shadow-xl py-2 text-right z-50">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-xs text-gray-400">حسابك الحالي</p>
                  <p className="font-bold text-gray-900 text-sm">{currentUser.username}</p>
                  <p className="text-xs text-blue-600 font-mono mt-1">Level: {currentUser.meme_level}</p>
                </div>

                {/* Switcher */}
                <div className="px-4 py-2 border-b border-gray-100 bg-gray-50/50">
                  <p className="text-[10px] text-gray-400 font-bold mb-1.5">بدّل المستخدمين (للتجريب والتست):</p>
                  <div className="flex flex-col gap-1">
                    {availableProfiles.map((prof) => (
                      <button
                        key={prof.id}
                        onClick={() => {
                          onUserSwitch(prof);
                          setShowUserDropdown(false);
                        }}
                        className={`flex items-center gap-2 p-1 rounded-xl text-right transition-colors w-full cursor-pointer ${
                          prof.id === currentUser.id ? "bg-blue-50 text-blue-700" : "hover:bg-white border border-transparent hover:border-gray-200"
                        }`}
                      >
                        {prof.avatar_url && (
                          <img
                            src={prof.avatar_url}
                            alt=""
                            className="w-6 h-6 rounded-lg object-cover border border-gray-200"
                            referrerPolicy="no-referrer"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate leading-tight">{prof.username}</p>
                          <p className="text-[8px] text-gray-400 leading-none truncate">{prof.meme_level}</p>
                        </div>
                        {prof.id === currentUser.id && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 ml-1" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Navigations directly */}
                <button
                  onClick={() => {
                    onNavigate("profile");
                    setShowUserDropdown(false);
                  }}
                  className="w-full text-right px-4 py-2 hover:bg-gray-50 text-xs text-gray-700 font-bold flex items-center justify-between cursor-pointer"
                >
                  <span>الملف الشخصي والمكافآت</span>
                  <User className="w-4 h-4 text-gray-400" />
                </button>

                <button
                  onClick={() => {
                    onNavigate("leaderboard");
                    setShowUserDropdown(false);
                  }}
                  className="w-full text-right px-4 py-2 hover:bg-gray-50 text-xs text-gray-700 font-bold flex items-center justify-between cursor-pointer"
                >
                  <span>المتصدرين والـ Meme Lords</span>
                  <Trophy className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

import React from "react";
import { Home, Flame, Cpu, Trophy, Bookmark, ShieldCheck, Heart, Sparkles, MessageCircle } from "lucide-react";
import { Profile } from "../types";

interface SidebarProps {
  currentUser: Profile;
  activeTab: string;
  onNavigate: (tab: string) => void;
  savedCount: number;
}

export default function Sidebar({ currentUser, activeTab, onNavigate, savedCount }: SidebarProps) {
  const isStaff = currentUser.role === "admin" || currentUser.role === "moderator";

  const menuItems = [
    { id: "feed", name: "الرئيسية الفكاهية", icon: Home, badge: null, desc: "أحدث الكوميكس والميمز" },
    { id: "trending", name: "التريند الشائع", icon: Flame, badge: "ساخن", desc: "أقوى الميمز في الـ 24 ساعة الماضية" },

    { id: "leaderboard", name: "لوحة الشرف", icon: Trophy, badge: "الشرف", desc: "أعظم صناع الكوميديا العربية" },
    { id: "saves", name: "الميمز المحفوظة", icon: Bookmark, badge: savedCount > 0 ? savedCount.toString() : null, desc: "الميمز المحفوظة لوقت لاحق" },
  ];

  return (
    <aside className="w-64 shrink-0 hidden md:block">
      <div className="sticky top-20 flex flex-col gap-6">
        {/* Profile overview card Threads Style */}
        <div 
          onClick={() => onNavigate("profile")}
          className="bg-white dark:bg-[#16181c] border border-gray-200 dark:border-gray-800/80 rounded-2xl p-5 cursor-pointer transition-all text-right group shadow-sm dark:shadow-none hover:shadow-md"
        >
          <div className="flex flex-col items-center gap-3">
            {currentUser.avatar_url ? (
              <img loading="lazy" decoding="async"
                src={currentUser.avatar_url}
                alt=""
                className="w-20 h-20 rounded-full object-cover border border-gray-100 dark:border-gray-800 group-hover:scale-105 transition-all"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 font-extrabold flex items-center justify-center text-2xl">
                {currentUser.username[0]}
              </div>
            )}
            <div className="text-center">
              <h4 className="font-black text-lg text-gray-900 dark:text-white flex items-center justify-center gap-1.5">
                <span>{currentUser.username}</span>
                {isStaff && <ShieldCheck className="w-4 h-4 text-black dark:text-white shrink-0" />}
              </h4>
              <p className="text-xs text-blue-600 dark:text-blue-400 font-bold mt-1">
                عرض الإعدادات
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-6 text-center">
            <div>
              <p className="text-sm font-black text-gray-900 dark:text-white">{currentUser.followers_count}</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold">متابع</p>
            </div>
            <div className="w-px h-4 bg-gray-100 dark:bg-gray-800" />
            <div>
              <p className="text-sm font-black text-gray-900 dark:text-white">{currentUser.total_points}</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold">نقطة</p>
            </div>
          </div>
        </div>

        {/* Sidebar Menu Item Lists */}
        <div className="bg-white dark:bg-[#16181c] border border-gray-200 dark:border-gray-800/80 rounded-2xl p-2 flex flex-col gap-1 text-right shadow-sm dark:shadow-none">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isSelected = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center justify-between px-4 py-4 rounded-xl transition-all cursor-pointer group text-right ${
                  isSelected
                    ? "bg-blue-50 dark:bg-blue-500/10 text-black dark:text-white border-l-4 border-blue-600"
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-black dark:hover:text-white"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="transition-transform group-hover:scale-110">
                    <Icon className={`w-6 h-6 ${isSelected ? "text-black dark:text-white" : "text-gray-400 dark:text-gray-500 group-hover:text-black dark:group-hover:text-white"}`} />
                  </div>
                  <div>
                    <p className={`text-sm font-bold leading-none ${isSelected ? "text-black dark:text-white" : ""}`}>
                      {item.name}
                    </p>
                  </div>
                </div>

                {item.badge && (
                  <span
                    className={`text-[8px] font-black px-2 py-0.5 rounded-full ${
                      isSelected
                        ? "bg-white dark:bg-gray-900 text-blue-700 dark:text-blue-400"
                        : "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 font-mono"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* لوحة تحكم المشرف بقت مخفية تماماً من الموقع - مفيش زرار أو رابط
              ظاهر ليها في أي مكان، والوصول ليها بس عن طريق رابط سري
              (/11193) لحساب عنده صلاحية admin/moderator فعلاً. */}
        </div>

        {/* Humorous Egypt Status/Credits line */}
        <div className="px-4 text-center">
          <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-normal">
            صُنع بحب في مصر
          </p>
          <p className="text-[9px] text-gray-300 dark:text-gray-600 mt-1">
            جميع الحقوق محفوظة للمنصة ٢٠٢٦ ©
          </p>
        </div>
      </div>
    </aside>
  );
}

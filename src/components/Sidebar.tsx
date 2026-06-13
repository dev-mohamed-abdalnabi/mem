import React from "react";
import { Home, Flame, Cpu, Trophy, Bookmark, AlertTriangle, ShieldCheck, Heart, Sparkles, MessageCircle } from "lucide-react";
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
          className="bg-white border border-gray-200 rounded-2xl p-5 cursor-pointer transition-all text-right group shadow-sm hover:shadow-md"
        >
          <div className="flex flex-col items-center gap-3">
            {currentUser.avatar_url ? (
              <img
                src={currentUser.avatar_url}
                alt=""
                className="w-20 h-20 rounded-full object-cover border border-gray-100 group-hover:scale-105 transition-all"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gray-100 text-gray-400 font-extrabold flex items-center justify-center text-2xl">
                {currentUser.username[0]}
              </div>
            )}
            <div className="text-center">
              <h4 className="font-black text-lg text-gray-900 flex items-center justify-center gap-1.5">
                <span>{currentUser.username}</span>
                {isStaff && <ShieldCheck className="w-4 h-4 text-black shrink-0" />}
              </h4>
              <p className="text-xs text-blue-600 font-bold mt-1">
                عرض الإعدادات
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-6 text-center">
            <div>
              <p className="text-sm font-black text-gray-900">{currentUser.followers_count}</p>
              <p className="text-[10px] text-gray-400 font-bold">متابع</p>
            </div>
            <div className="w-px h-4 bg-gray-100" />
            <div>
              <p className="text-sm font-black text-gray-900">{currentUser.total_points}</p>
              <p className="text-[10px] text-gray-400 font-bold">نقطة</p>
            </div>
          </div>
        </div>

        {/* Sidebar Menu Item Lists */}
        <div className="bg-white border border-gray-200 rounded-2xl p-2 flex flex-col gap-1 text-right shadow-sm">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isSelected = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center justify-between px-4 py-4 rounded-xl transition-all cursor-pointer group text-right ${
                  isSelected
                    ? "bg-blue-50 text-black border-l-4 border-blue-600"
                    : "text-gray-500 hover:bg-gray-50 hover:text-black"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="transition-transform group-hover:scale-110">
                    <Icon className={`w-6 h-6 ${isSelected ? "text-black" : "text-gray-400 group-hover:text-black"}`} />
                  </div>
                  <div>
                    <p className={`text-sm font-bold leading-none ${isSelected ? "text-black" : ""}`}>
                      {item.name}
                    </p>
                  </div>
                </div>

                {item.badge && (
                  <span
                    className={`text-[8px] font-black px-2 py-0.5 rounded-full ${
                      isSelected
                        ? "bg-white text-blue-700"
                        : "bg-red-50 text-red-600 font-mono"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Admin Emergency Reports Check */}
          {isStaff && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="px-3 text-[10px] text-red-400 font-black mb-1">صلاحيات الإشراف</p>
              <button
                onClick={() => onNavigate("moderation")}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl transition-all cursor-pointer text-right ${
                  activeTab === "moderation"
                    ? "bg-red-600 text-white"
                    : "text-red-700 hover:bg-red-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg ${activeTab === 'moderation' ? 'bg-white/10 text-white' : 'bg-red-50 text-red-600'}`}>
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold leading-none">مراجعة البلاغات</p>
                    <p className={`text-[9px] mt-1 ${activeTab === 'moderation' ? 'not-italic text-red-100' : 'text-red-400'}`}>
                      الميمز المبلغ عنها من المستخدمين
                    </p>
                  </div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Humorous Egypt Status/Credits line */}
        <div className="px-4 text-center">
          <p className="text-[10px] text-gray-400 leading-normal">
            صُنع بحب في مصر
          </p>
          <p className="text-[9px] text-gray-300 mt-1">
            جميع الحقوق محفوظة للمنصة ٢٠٢٦ ©
          </p>
        </div>
      </div>
    </aside>
  );
}

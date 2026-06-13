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
    { id: "creator", name: "صانع الميمز الفوري", icon: Cpu, badge: "جديد", desc: "اصنع ميم خاص بك بضغطة زر" },
    { id: "leaderboard", name: "لوحة الشرف", icon: Trophy, badge: "الشرف", desc: "أعظم صناع الكوميديا العربية" },
    { id: "saves", name: "الميمز المحفوظة", icon: Bookmark, badge: savedCount > 0 ? savedCount.toString() : null, desc: "الميمز المحفوظة لوقت لاحق" },
  ];

  return (
    <aside className="w-64 shrink-0 hidden md:block">
      <div className="sticky top-20 flex flex-col gap-6">
        {/* Profile overview card customized */}
        <div 
          onClick={() => onNavigate("profile")}
          className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md cursor-pointer transition-all text-right group"
        >
          <div className="flex items-center gap-3">
            {currentUser.avatar_url ? (
              <img
                src={currentUser.avatar_url}
                alt=""
                className="w-12 h-12 rounded-xl object-cover border-2 border-blue-500 group-hover:scale-105 transition-all"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 font-extrabold flex items-center justify-center">
                M
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h4 className="font-extrabold text-sm text-gray-900 truncate flex items-center gap-1.5">
                <span>{currentUser.username}</span>
                {isStaff && <ShieldCheck className="w-4 h-4 text-green-500 shrink-0" />}
              </h4>
              <p className="text-[10px] text-orange-600 font-bold leading-none mt-1">
                {currentUser.meme_level}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between text-center gap-2">
            <div className="flex-1">
              <p className="text-[11px] text-gray-400 font-bold">النقاط</p>
              <p className="text-sm font-black text-gray-900 font-mono">{currentUser.total_points}</p>
            </div>
            <div className="w-px h-6 bg-gray-100 shrink-0" />
            <div className="flex-1">
              <p className="text-[11px] text-gray-400 font-bold">المتابِعون</p>
              <p className="text-sm font-black text-gray-900 font-mono">{currentUser.followers_count}</p>
            </div>
            <div className="w-px h-6 bg-gray-100 shrink-0" />
            <div className="flex-1">
              <p className="text-[11px] text-gray-400 font-bold">تابعهم</p>
              <p className="text-sm font-black text-gray-900 font-mono">{currentUser.following_count}</p>
            </div>
          </div>
        </div>

        {/* Sidebar Menu Item Lists */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-2 flex flex-col gap-1 text-right">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isSelected = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl transition-all cursor-pointer group text-right ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-1.5 rounded-lg transition-transform group-hover:scale-110 ${
                      isSelected ? "bg-white/10 text-white" : "bg-gray-50 text-gray-500 group-hover:bg-blue-50 group-hover:text-blue-600"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className={`text-xs font-bold leading-none ${isSelected ? "text-white" : "text-gray-800"}`}>
                      {item.name}
                    </p>
                    <p className={`text-[9px] mt-1 hidden lg:block ${isSelected ? "text-blue-100" : "text-gray-400"}`}>
                      {item.desc}
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
                    ? "bg-red-600 text-white shadow-sm"
                    : "text-red-700 hover:bg-red-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg ${activeTab === 'moderation' ? 'bg-white/10 text-white' : 'bg-red-50 text-red-600'}`}>
                    <AlertTriangle className="w-4 h-4 animate-bounce" />
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

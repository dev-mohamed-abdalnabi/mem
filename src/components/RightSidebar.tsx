import React from "react";
import { Home, Flame, Bookmark, User, LogIn } from "lucide-react";
import { Profile } from "../types";

interface RightSidebarProps {
  isRealUser: boolean;
  profiles: Profile[];
  onShowAuthModal: () => void;
  setSelectedProfileId: (id: string) => void;
  setActiveTab: (tab: string) => void;
  activeTab?: string;
}

export default function RightSidebar({
  isRealUser,
  onShowAuthModal,
  setActiveTab,
  activeTab = "feed",
}: RightSidebarProps) {

  const navItems = [
    { id: "feed", label: "الرئيسية", icon: Home },
    { id: "trending", label: "الترند", icon: Flame },
    { id: "saves", label: "الحفظ", icon: Bookmark },
    { id: "profile", label: "الملف الشخصي", icon: User },
  ];

  return (
    <div className="w-64 shrink-0 hidden lg:flex flex-col gap-8 order-3 pt-4 pb-8 px-2">
      
      {/* قائمة الأقسام الرئيسية - تصميم انسيابي بدون أي حواف حادة */}
      <nav className="flex flex-col gap-1 w-full">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`group flex items-center gap-4 w-full px-5 py-3.5 rounded-full transition-all duration-200 text-right ${
                isActive 
                  ? "bg-gray-200/70 dark:bg-zinc-800/80 text-black dark:text-white font-bold" 
                  : "text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-900/60 hover:text-black dark:hover:text-white font-medium"
              }`}
            >
              <Icon 
                className={`w-5 h-5 transition-transform duration-200 group-hover:scale-105 ${
                  isActive ? "text-blue-600 dark:text-blue-400" : ""
                }`} 
                strokeWidth={isActive ? 2.5 : 2} 
              />
              <span className="text-[16px]">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* كرت تسجيل الدخول - متناسق 100% مع الأبيض والأسود */}
      {!isRealUser && (
        <div className="border border-gray-200/80 dark:border-zinc-800/80 rounded-3xl p-5 text-right bg-gray-50/50 dark:bg-zinc-900/30 backdrop-blur-sm mx-1">
          <h4 className="font-bold text-gray-900 dark:text-zinc-100 mb-1 text-[15px]">
            سجل معانا
          </h4>
          <p className="text-[13px] text-gray-500 dark:text-zinc-400 mb-4 leading-relaxed">
            عشان تقدر تتفاعل وتحفظ الميمز والبوستات في حسابك.
          </p>
          <button
            onClick={onShowAuthModal}
            className="w-full flex items-center justify-center gap-2 bg-black hover:bg-gray-900 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-black font-semibold py-2.5 rounded-full text-sm transition-all duration-200 active:scale-[0.97] shadow-sm"
          >
            <LogIn className="w-4 h-4" />
            <span>تسجيل الدخول</span>
          </button>
        </div>
      )}

    </div>
  );
}

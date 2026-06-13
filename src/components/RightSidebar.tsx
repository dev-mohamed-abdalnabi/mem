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
    <div className="w-64 shrink-0 hidden lg:flex flex-col gap-6 order-3 pt-4 pb-8 bg-transparent">
      
      {/* قائمة الأقسام الرئيسية - ناعمة وبدون كتل سوداء */}
      <nav className="flex flex-col gap-1 w-full bg-transparent">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`group flex items-center gap-4 w-full px-5 py-3 rounded-full transition-all duration-200 text-right ${
                isActive 
                  ? "bg-blue-50 dark:bg-blue-955/30 text-blue-600 dark:text-blue-400 font-bold" 
                  : "text-gray-700 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-900/60 hover:text-black dark:hover:text-white font-medium"
              }`}
            >
              <Icon 
                className={`w-5 h-5 transition-transform duration-150 group-hover:scale-105 ${
                  isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-zinc-500"
                }`} 
                strokeWidth={isActive ? 2.5 : 2} 
              />
              <span className="text-[15px]">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* كرت تسجيل الدخول - أنيق، شفاف، وزرار أزرق مستحيل يختفي كلامه */}
      {!isRealUser && (
        <div className="border border-gray-200/70 dark:border-zinc-800/80 rounded-2xl p-5 text-right bg-transparent mx-1">
          <h4 className="font-bold text-gray-900 dark:text-zinc-100 mb-1 text-[15px]">
            سجل معانا
          </h4>
          <p className="text-[13px] text-gray-500 dark:text-zinc-400 mb-4 leading-relaxed">
            عشان تقدر تتفاعل وتحفظ الميمز والبوستات في حسابك.
          </p>
          <button
            onClick={onShowAuthModal}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-full text-sm transition-all duration-200 active:scale-[0.98] shadow-sm shadow-blue-500/10"
          >
            <LogIn className="w-4 h-4 text-white" />
            <span className="text-white">تسجيل الدخول</span>
          </button>
        </div>
      )}

    </div>
  );
}

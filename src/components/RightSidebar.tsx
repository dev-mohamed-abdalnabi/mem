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
    <div className="w-72 shrink-0 hidden lg:flex flex-col gap-6 order-3 pt-2 pb-8">
      
      {/* القائمة الجانبية - بدون إطار خارجي لتصميم أكثر عصرية */}
      <nav className="flex flex-col w-full relative">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`group flex items-center gap-4 w-full px-4 py-3.5 transition-colors duration-200 text-right relative overflow-hidden rounded-xl ${
                isActive 
                  ? "text-blue-600 dark:text-blue-500" 
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-gray-800/50"
              }`}
            >
              {/* مؤشر القسم النشط - خط جانبي */}
              {isActive && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-blue-600 dark:bg-blue-500 rounded-l-full" />
              )}

              <div className="relative flex items-center justify-center">
                <Icon 
                  className={`w-6 h-6 transition-transform duration-200 ${
                    isActive 
                      ? "text-blue-600 dark:text-blue-500" 
                      : "text-gray-500 dark:text-gray-400 group-hover:scale-110"
                  }`} 
                  strokeWidth={isActive ? 2.5 : 2} 
                />
              </div>
              <span className={`text-[16px] tracking-wide ${isActive ? "font-bold" : "font-medium"}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* منطقة تسجيل الدخول - تصميم ناعم ومدمج */}
      {!isRealUser && (
        <div className="mx-4 mt-2 relative bg-gradient-to-b from-gray-50 to-gray-100/50 dark:from-gray-800/40 dark:to-gray-900/20 rounded-2xl p-5 text-right border-t border-white dark:border-gray-700/50 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
          <div className="relative z-10">
            <h4 className="font-extrabold text-gray-900 dark:text-white mb-1.5 text-[15px]">سجل معانا</h4>
            <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-5 leading-relaxed">
              عشان تقدر تتفاعل وتحفظ البوستات في حسابك.
            </p>
            <button
              onClick={onShowAuthModal}
              className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 font-semibold py-2.5 rounded-full text-sm transition-all duration-200 active:scale-[0.97] hover:shadow-md"
            >
              <LogIn className="w-4 h-4" />
              <span>تسجيل الدخول</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

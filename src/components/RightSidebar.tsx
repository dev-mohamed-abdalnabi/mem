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
      
      {/* القائمة الجانبية - بدون أي حواف أو إطارات تماماً لتبدو مدمجة ونظيفة */}
      <nav className="flex flex-col w-full gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`group flex items-center gap-4 w-full px-4 py-3 rounded-xl transition-all duration-200 text-right ${
                isActive 
                  ? "bg-gray-200/50 dark:bg-zinc-900/80 text-blue-600 dark:text-blue-400 font-bold" 
                  : "text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-900/40 hover:text-gray-900 dark:hover:text-zinc-200 font-medium"
              }`}
            >
              <Icon 
                className={`w-5 h-5 transition-transform duration-200 group-hover:scale-105 ${
                  isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-zinc-500"
                }`} 
                strokeWidth={isActive ? 2.5 : 2} 
              />
              <span className="text-[15px]">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* كارت تسجيل الدخول - تصميم ناعم ومنبثق من الخلفية بشكل طبيعي */}
      {!isRealUser && (
        <div className="mx-2 bg-gray-100/70 dark:bg-zinc-900/50 rounded-2xl p-5 text-right flex flex-col gap-4">
          <div>
            <h4 className="font-bold text-gray-900 dark:text-zinc-100 text-[15px] mb-1">
              سجل معانا
            </h4>
            <p className="text-[13px] text-gray-500 dark:text-zinc-400 leading-relaxed">
              علشان تقدر تتفاعل، وتعمل لايك، وتحفظ الميمز في حسابك.
            </p>
          </div>
          
          <button
            onClick={onShowAuthModal}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold py-2.5 rounded-xl text-sm transition-all duration-200 active:scale-[0.98]"
          >
            <LogIn className="w-4 h-4" />
            <span>تسجيل الدخول</span>
          </button>
        </div>
      )}

    </div>
  );
}

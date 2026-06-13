import React from "react";
import { Home, Flame, Bookmark, User, LogIn, Sparkles } from "lucide-react";
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
    <div className="w-72 shrink-0 hidden lg:flex flex-col gap-6 order-3 pb-8 px-2">
      
      {/* قائمة الأقسام - ستايل مودرن بدون بوكس مقفول */}
      <nav className="flex flex-col gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`group flex items-center gap-4 w-full px-4 py-3.5 rounded-2xl transition-all duration-300 text-right relative overflow-hidden ${
                isActive 
                  ? "bg-blue-50/50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold" 
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60 font-medium hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              {/* المؤشر الجانبي للقسم النشط */}
              {isActive && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-blue-600 dark:bg-blue-500 rounded-l-full" />
              )}
              
              <Icon 
                className={`w-6 h-6 transition-all duration-300 ${
                  isActive 
                    ? "scale-110 drop-shadow-sm" 
                    : "group-hover:scale-110 group-hover:-rotate-3"
                }`} 
              />
              <span className="text-[15px] tracking-wide">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="w-full h-px bg-gray-200/60 dark:bg-gray-800/60 my-2 rounded-full"></div>

      {/* كرت الدخول للزوار - ستايل بريميوم */}
      {!isRealUser && (
        <div className="relative overflow-hidden bg-white/60 dark:bg-gray-900/50 backdrop-blur-md rounded-3xl p-6 text-right group transition-all duration-300 hover:bg-white dark:hover:bg-gray-900">
          {/* لمسة تصميمية (خط علوي ملون) */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-500 opacity-80" />
          
          <div className="relative z-10">
            <h4 className="font-black text-gray-900 dark:text-white mb-2 text-base flex items-center gap-2">
              سجل معانا <Sparkles className="w-4 h-4 text-yellow-500" />
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-5 leading-relaxed font-medium">
              عشان تقدر تتفاعل، تحفظ الميمز، وتاخد مساحتك في قاعة المشاهير.
            </p>
            <button
              onClick={onShowAuthModal}
              className="w-full bg-gray-900 hover:bg-blue-600 dark:bg-gray-100 dark:hover:bg-blue-500 text-white dark:text-gray-900 dark:hover:text-white font-bold py-3 rounded-xl text-sm transition-all duration-300 transform active:scale-95 flex items-center justify-center gap-2 shadow-sm"
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

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
    // ضفت dir="rtl" عشان نضمن إن الاتجاهات تكون مظبوطة دايماً
    <div className="w-72 shrink-0 hidden lg:flex flex-col gap-6 order-3 pb-8 sticky top-24 h-fit" dir="rtl">
      
      {/* كرت تسجيل الدخول (شكل مودرن وجذاب) */}
      {!isRealUser && (
        <div className="relative overflow-hidden bg-white dark:bg-[#16181c] rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-gray-100 dark:border-gray-800/80 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
          {/* إضاءة خفيفة في الخلفية تدي لمسة شياكة */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-xl">
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <h4 className="font-extrabold text-gray-900 dark:text-white text-base">انضم لمجتمعنا</h4>
            </div>
            
            <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-5 leading-relaxed">
              سجل حسابك دلوقتي عشان تقدر تتفاعل، تحفظ الميمز، وتشارك في الترند!
            </p>
            
            <button
              onClick={onShowAuthModal}
              className="group flex items-center justify-center gap-2 w-full bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 font-bold py-3 rounded-2xl text-sm transition-all active:scale-[0.98]"
            >
              <span>تسجيل الدخول</span>
              <LogIn className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1" />
            </button>
          </div>
        </div>
      )}

      {/* قائمة الأقسام الرئيسية (Minimal & Clean) */}
      <div className="bg-white dark:bg-[#16181c] rounded-3xl p-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-gray-100 dark:border-gray-800/80">
        <nav className="flex flex-col gap-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`group relative flex items-center gap-3 w-full p-3.5 rounded-2xl transition-all duration-300 text-right overflow-hidden ${
                  isActive 
                    ? "text-blue-600 dark:text-blue-400 font-bold" 
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium"
                }`}
              >
                {/* خلفية الزرار وهو Active */}
                {isActive && (
                  <div className="absolute inset-0 bg-blue-50/80 dark:bg-blue-500/10 rounded-2xl transition-all" />
                )}

                {/* خلفية الزرار لما الماوس ييجي عليه (Hover) */}
                {!isActive && (
                  <div className="absolute inset-0 bg-gray-50 dark:bg-gray-800/40 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300" />
                )}

                <div className="relative z-10 flex items-center gap-3.5">
                  <div className={`flex items-center justify-center p-1.5 rounded-xl transition-all duration-300 ${
                    isActive 
                      ? "bg-white dark:bg-transparent shadow-sm dark:shadow-none" 
                      : "group-hover:bg-white dark:group-hover:bg-gray-700/50"
                  }`}>
                    <Icon className={`w-5 h-5 transition-transform duration-300 ${
                      isActive ? "scale-110" : "group-hover:scale-110"
                    }`} />
                  </div>
                  <span className="text-[15px] tracking-wide">{item.label}</span>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

    </div>
  );
}

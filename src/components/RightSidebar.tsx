import React from "react";
// أضفنا أيقونة Sparkles عشان ندي طابع الـ AI
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
    <div className="w-72 shrink-0 hidden lg:flex flex-col gap-5 order-3 pb-8">
      
      {/* كرت الدخول - ستايل AI حديث ومضيء */}
      {!isRealUser && (
        <div className="relative overflow-hidden bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(99,102,241,0.1)] text-right group transition-all duration-300 hover:border-indigo-300 dark:hover:border-indigo-500/50">
          
          {/* تأثير الإضاءة الخلفية (Glow) */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-indigo-500/20 to-purple-600/20 blur-2xl rounded-full z-0 group-hover:from-indigo-500/30 group-hover:to-purple-600/30 transition-all duration-500"></div>

          <div className="relative z-10">
            <h4 className="font-bold text-gray-900 dark:text-white mb-2 text-sm flex items-center justify-end gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
              سجل معانا
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-5 leading-relaxed">
              عشان تقدر تتفاعل وتحفظ الميمز في حسابك وتعيش التجربة كاملة.
            </p>
            <button
              onClick={onShowAuthModal}
              className="w-full relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-2.5 rounded-xl text-sm transition-all duration-300 shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] border border-indigo-400/20"
            >
              تسجيل الدخول
            </button>
          </div>
        </div>
      )}

      {/* قائمة الأقسام - ستايل زجاجي (Glassmorphism) */}
      <div className="bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border border-gray-200/80 dark:border-gray-800/80 rounded-2xl p-3 shadow-sm">
        <nav className="flex flex-col gap-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`group flex items-center gap-3 w-full p-3 rounded-xl transition-all duration-300 text-right relative overflow-hidden ${
                  isActive 
                    ? "bg-gradient-to-r from-indigo-50/50 to-blue-50/50 dark:from-indigo-500/10 dark:to-blue-500/10 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-100 dark:border-indigo-500/20 shadow-sm" 
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-200 font-medium border border-transparent"
                }`}
              >
                {/* شريط جانبي مضيء يظهر للقسم النشط فقط */}
                {isActive && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-l-full shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
                )}
                
                <Icon className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${isActive ? "text-indigo-600 dark:text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]" : ""}`} />
                <span className="text-sm tracking-wide">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

    </div>
  );
}

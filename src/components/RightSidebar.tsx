import React from "react";
import { Home, Flame, Bookmark, User, LogIn } from "lucide-react";
import { Profile } from "../types";

interface RightSidebarProps {
  isRealUser: boolean;
  profiles: Profile[]; // سايبها عشان لو المكون الأب بيبعتها ميعملش إيرور
  onShowAuthModal: () => void;
  setSelectedProfileId: (id: string) => void;
  setActiveTab: (tab: string) => void;
  activeTab?: string; // ضفت دي اختياري عشان نعرف إحنا في أي صفحة ونميزها بلون مختلف
}

export default function RightSidebar({
  isRealUser,
  onShowAuthModal,
  setActiveTab,
  activeTab = "feed", // الافتراضي هو الرئيسية
}: RightSidebarProps) {

  // دي الأقسام بتاعتنا
  const navItems = [
    { id: "feed", label: "الرئيسية", icon: Home },
    { id: "trending", label: "الترند", icon: Flame },
    { id: "saves", label: "الحفظ", icon: Bookmark },
    { id: "profile", label: "الملف الشخصي", icon: User },
  ];

  return (
    <div className="w-72 shrink-0 hidden lg:flex flex-col gap-4 order-3 pb-8">
      
      {/* كرت الدخول للزوار (بسيط ومش مزعج) */}
      {!isRealUser && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm text-right">
          <h4 className="font-bold text-gray-900 dark:text-white mb-1.5 text-sm">سجل معانا</h4>
          <p className="text-xs text-gray-500 mb-4">عشان تقدر تتفاعل وتحفظ الميمز في حسابك.</p>
          <button
            onClick={onShowAuthModal}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors"
          >
            تسجيل الدخول
          </button>
        </div>
      )}

      {/* قائمة الأقسام الرئيسية */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-3 shadow-sm">
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all text-right ${
                  isActive 
                    ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-bold" 
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white font-medium"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-blue-600 dark:text-blue-500" : ""}`} />
                <span className="text-sm">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

    </div>
  );
}

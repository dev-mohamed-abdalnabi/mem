import React from "react";
import { Trophy, HelpCircle, LogIn } from "lucide-react";
import { Profile } from "../types";

interface RightSidebarProps {
  isRealUser: boolean;
  profiles: Profile[];
  onShowAuthModal: () => void;
  setSelectedProfileId: (id: string) => void;
  setActiveTab: (tab: string) => void;
}

export default function RightSidebar({
  isRealUser,
  profiles,
  onShowAuthModal,
  setSelectedProfileId,
  setActiveTab,
}: RightSidebarProps) {
  return (
    <div className="w-72 shrink-0 hidden lg:flex flex-col gap-5 order-3">
      {/* كرت الانضمام للمنصة */}
      {!isRealUser && (
        <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-950 border border-gray-200/80 dark:border-gray-800/80 rounded-2xl p-5 shadow-sm text-center flex flex-col items-center backdrop-blur-sm transition-all hover:border-blue-500/30">
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/50 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 mb-3 rotate-3 hover:rotate-0 transition-transform">
            <LogIn className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-gray-900 dark:text-white text-base mb-1">انضم لمجتمع ميمزبوك</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 font-medium leading-relaxed">
            سجل حسابك لتتمكن من الإعجاب، التعليق، ومشاركة أقوى الإيفيهات مع صُنّاع الميمز!
          </p>
          <button
            onClick={onShowAuthModal}
            className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold py-2.5 rounded-xl text-sm transition-all shadow-sm shadow-blue-500/10"
          >
            دخول / إنشاء حساب
          </button>
        </div>
      )}

      {/* كرت أعلى المتفاعلين - حماية كاملة من الأسامي الطويلة */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200/60 dark:border-gray-800/60 rounded-2xl p-5 shadow-sm">
        <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4 border-b border-gray-100 dark:border-gray-800 pb-3">
          <Trophy className="w-4 h-4 text-yellow-500 animate-pulse" />
          <span>أعلى المتفاعلين الحراقين</span>
        </h4>

        <div className="flex flex-col gap-3.5">
          {profiles.slice(0, 4).map((prof, index) => (
            <div
              key={prof.id}
              onClick={() => {
                setSelectedProfileId(prof.id);
                setActiveTab("user-profile");
              }}
              className="flex items-center justify-between gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/40 p-2 -mx-2 rounded-xl transition-all group"
            >
              {/* جزء البيانات: مرونة كاملة للأسماء الطويلة */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className={`w-5 font-black text-xs text-center shrink-0 ${
                  index === 0 ? 'text-yellow-500 text-sm' : index === 1 ? 'text-gray-400' : index === 2 ? 'text-amber-600' : 'text-gray-400 dark:text-gray-600'
                }`}>
                  #{index + 1}
                </div>
                {prof.avatar_url ? (
                  <img src={prof.avatar_url} alt="" className="w-9 h-9 rounded-full shrink-0 object-cover border border-gray-100 dark:border-gray-700 shadow-sm" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-9 h-9 rounded-full shrink-0 bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold text-sm">{prof.username[0]}</div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 transition-colors">{prof.username}</p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium truncate mt-0.5">{prof.meme_level}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => setActiveTab("leaderboard")}
          className="w-full text-center text-xs text-blue-600 dark:text-blue-400 font-bold hover:text-blue-700 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 transition-colors block"
        >
          عرض قائمة الوزراء الكاملة ←
        </button>
      </div>

      {/* كرت قوانين المجتمع */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200/60 dark:border-gray-800/60 rounded-2xl p-5 shadow-sm">
        <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-3 pb-2 border-b border-gray-100 dark:border-gray-800">
          <HelpCircle className="w-4 h-4 text-gray-400" />
          <span>دستور الميمزبوك</span>
        </h4>
        <ul className="text-xs text-gray-600 dark:text-gray-400 flex flex-col gap-2.5 font-medium leading-relaxed">
          <li className="flex items-start gap-2">
            <span className="text-blue-500 font-bold shrink-0">•</span>
            <span>الميمز الكرينج أو المسروقة تذهب للأرشيف فوراً.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 font-bold shrink-0">•</span>
            <span>كلنا إخوات.. ممنوع التجاوزات أو الإسقاطات الشخصية.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 font-bold shrink-0">•</span>
            <span>ارفع الكوميك بجودة واضحة عشان روقان التجربة.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

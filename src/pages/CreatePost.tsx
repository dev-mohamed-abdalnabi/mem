import React from 'react';
import { LogIn, Trophy, HelpCircle } from 'lucide-react';
import { Profile } from '../types';

interface RightSidebarProps {
  isRealUser: boolean;
  profiles: Profile[];
  onAuthClick: () => void;
  onProfileClick: (id: string) => void;
  onViewLeaderboard: () => void;
}

export default function RightSidebar({ isRealUser, profiles, onAuthClick, onProfileClick, onViewLeaderboard }: RightSidebarProps) {
  return (
    <div className="w-72 shrink-0 hidden lg:flex flex-col gap-5 order-3">
      
      {/* بطاقة تسجيل الدخول (للزوار) */}
      {!isRealUser && (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center transition-all hover:shadow-md">
          <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
            <LogIn className="w-7 h-7" />
          </div>
          <h4 className="font-extrabold text-gray-900 dark:text-white text-lg mb-2">انضم لمجتمع ميمزبوك</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 leading-relaxed">
            سجل حسابك لتتمكن من الإعجاب، التعليق، والمنافسة في قائمة الأوائل!
          </p>
          <button
            onClick={onAuthClick}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-sm transition-all active:scale-95"
          >
            دخول / إنشاء حساب
          </button>
        </div>
      )}

      {/* بطاقة أعلى المتفاعلين (تم حل مشكلة الأسماء الطويلة) */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
        <h4 className="font-extrabold text-base text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <span>أعلى المتفاعلين</span>
        </h4>
        
        <div className="flex flex-col gap-3">
          {profiles.slice(0, 4).map((prof, index) => (
            <div 
              key={prof.id} 
              className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 p-2 rounded-xl transition-colors"
              onClick={() => onProfileClick(prof.id)}
            >
              <div className={`w-6 text-center text-sm font-black ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : index === 2 ? 'text-amber-600' : 'text-gray-300 dark:text-gray-600'}`}>
                {index + 1}
              </div>
              
              <img 
                src={prof.avatar_url || "https://api.dicebear.com/7.x/bottts/svg?seed=fallback"} 
                className="w-10 h-10 rounded-full object-cover border border-gray-100 dark:border-gray-700 shrink-0" 
                alt={prof.username}
              />
              
              {/* السر هنا: flex-1 و min-w-0 مع truncate تمنع خروج النص */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{prof.username}</p>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold truncate">{prof.meme_level}</p>
              </div>
            </div>
          ))}
        </div>
        
        <button
          onClick={onViewLeaderboard}
          className="w-full text-center text-sm text-gray-500 dark:text-gray-400 font-bold hover:text-blue-600 dark:hover:text-blue-400 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 transition-colors"
        >
          عرض القائمة الكاملة
        </button>
      </div>

      {/* بطاقة القوانين النظيفة */}
      <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
        <h4 className="font-extrabold text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-3">
          <HelpCircle className="w-4 h-4" /> قوانين المجتمع
        </h4>
        <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-2 font-medium">
          <li>• الميمز الكرينج والمكررة تُحذف.</li>
          <li>• الاحترام واجب، ممنوع التجاوز.</li>
          <li>• استخدم صور بجودة واضحة.</li>
        </ul>
      </div>

    </div>
  );
          }

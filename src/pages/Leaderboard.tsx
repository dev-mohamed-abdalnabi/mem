import React from 'react';
import { Trophy, CheckCircle2, PlusCircle, Medal } from 'lucide-react';
import { Profile } from '../types';

interface LeaderboardProps {
  profiles: Profile[];
  currentUser: Profile;
  followingIds: string[];
  onFollowToggle: (followerId: string, followingId: string) => void;
  onNavigate: (tab: string) => void;
}

export default function Leaderboard({ profiles, currentUser, followingIds, onFollowToggle, onNavigate }: LeaderboardProps) {
  // ترتيب الميمرز بناءً على التفاعل الأعلى ونقاط الـ XP
  const sortedProfiles = [...profiles].sort((a, b) => b.total_points - a.total_points);

  return (
    // تم توحيد العرض لـ max-w-2xl عشان يطابق باقي الصفحات في وضع الكمبيوتر
    <div className="w-full max-w-2xl mx-auto px-4 md:px-0 animate-fade-in pb-24 md:pb-8">
      
      {/* البانر العلوي بحواف دائرية ناعمة ومتناسقة */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl md:rounded-3xl p-6 md:p-8 text-white shadow-md mb-6 flex items-center justify-between">
        <div className="text-right">
          <h1 className="text-2xl md:text-3xl font-black flex items-center gap-3 mb-2">
            <Trophy className="w-8 h-8 text-yellow-300" />
            قاعة المشاهير
          </h1>
          <p className="text-blue-100 font-medium text-sm">أكثر صناع الميمز تفاعلاً ونقاطاً في المنصة 🚀</p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {sortedProfiles.map((profile, index) => {
          const isFollowing = followingIds.includes(profile.id);
          const isMe = profile.id === currentUser.id;

          return (
            // تعديل الحواف هنا لـ rounded-2xl وتظبيط البوردر عشان يماثل البوستات
            <div 
              key={profile.id} 
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-sm flex items-center gap-4 hover:shadow-md transition-all duration-200"
            >
              
              {/* الترتيب والميداليات */}
              <div className="w-8 shrink-0 text-center font-black text-xl">
                {index === 0 ? <Medal className="w-8 h-8 text-yellow-500 mx-auto" /> : 
                 index === 1 ? <Medal className="w-7 h-7 text-gray-400 mx-auto" /> : 
                 index === 2 ? <Medal className="w-6 h-6 text-amber-600 mx-auto" /> : 
                 <span className="text-gray-400 dark:text-gray-500">{index + 1}</span>}
              </div>

              {/* الصورة الشخصية */}
              <img src={profile.avatar_url} className="w-12 h-12 rounded-full object-cover shrink-0 border border-gray-100 dark:border-gray-800" alt="avatar" />

              {/* الاسم والنقاط */}
              <div className="flex-1 min-w-0 text-right">
                <h3 className="font-bold text-gray-900 dark:text-white text-base truncate">{profile.username}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{profile.total_points} XP • {profile.meme_level}</p>
              </div>

              {/* زر المتابعة السريع */}
              {!isMe && currentUser.id !== "guest-user-temp" && (
                <button
                  onClick={() => onFollowToggle(currentUser.id, profile.id)}
                  className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                    isFollowing 
                      ? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200" 
                      : "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400"
                  }`}
                >
                  {isFollowing ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> 
                      <span className="hidden sm:inline">يتابع</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-4 h-4" /> 
                      <span className="hidden sm:inline">متابعة</span>
                    </>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

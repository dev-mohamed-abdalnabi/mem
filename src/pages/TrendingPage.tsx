import React from "react";
import { Flame } from "lucide-react";
import { Meme, Profile } from "../types";
import MemeCard from "../components/MemeCard";

interface TrendingPageProps {
  memes: Meme[];
  currentUser: Profile;
  followingIds: string[];
  handleLikeToggle: (id: string) => Promise<void>;
  handleSaveToggle: (id: string) => Promise<void>;
  handleFollowToggle: (folId: string, fowId: string) => Promise<void>;
  setSelectedTag: (tag: string | null) => void;
  handleReportSubmit: (id: string, reason: string) => void;
  handleShareCompleted: (id: string) => Promise<void>;
  handleDeleteMeme: (id: string) => Promise<void>;
  setSelectedProfileId: (id: string | null) => void;
  setActiveTab: (tab: string) => void;
  setLightboxImage: (url: string | null) => void;
}

export default function TrendingPage({
  memes,
  currentUser,
  followingIds,
  handleLikeToggle,
  handleSaveToggle,
  handleFollowToggle,
  setSelectedTag,
  handleReportSubmit,
  handleShareCompleted,
  handleDeleteMeme,
  setSelectedProfileId,
  setActiveTab,
  setLightboxImage,
}: TrendingPageProps) {
  
  // ترتيب الميمز بناءً على التفاعل الأعلى (اللايكات والكومنتات)
  const sortedTrending = [...memes].sort((a, b) => 
    (b.likes_count * 10 + b.comments_count * 15) - (a.likes_count * 10 + a.comments_count * 15)
  );

  return (
    // تم إضافة max-w-2xl mx-auto لتظبيط العرض على الكمبيوتر وتوحيد المسافات
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto animate-fade-in pb-20 md:pb-8 px-4 md:px-0">  
      
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl md:rounded-3xl p-5 shadow-sm text-right">  
        <h2 className="font-bold text-xl flex items-center gap-2 text-gray-900 dark:text-white">
          الأعلى تفاعلاً وإشعالاً للساحة <Flame className="w-5 h-5 text-red-500 animate-bounce" />
        </h2>  
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">البوستات المولعة الساحة اليومين دول 🔥</p>  
      </div>  

      {sortedTrending.map((m) => (  
        // تم إضافة كلاسات الحواف الدائرية والظل لإلغاء الحواف الحادة
        <div 
          key={m.id} 
          className="post-wrapper w-full bg-white dark:bg-gray-900 rounded-2xl md:rounded-3xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-800"
        >  
          <MemeCard 
            meme={m} 
            currentUser={currentUser} 
            onLikeToggle={handleLikeToggle} 
            onSaveToggle={handleSaveToggle} 
            onFollowToggle={handleFollowToggle} 
            onTagClick={setSelectedTag} 
            onDeleteComment={() => {}} 
            onReportSubmit={handleReportSubmit} 
            onShareCompleted={handleShareCompleted} 
            onDeleteMeme={handleDeleteMeme} 
            onUserProfileClick={(uid) => { setSelectedProfileId(uid); setActiveTab("user-profile"); }} 
            isFollowingCreator={followingIds.includes(m.user_id)} 
            onImageClick={setLightboxImage} 
          />  
        </div>  
      ))}  
    </div>
  );
}

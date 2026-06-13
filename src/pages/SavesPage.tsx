import React from "react";
import { Bookmark } from "lucide-react";
import { Meme, Profile } from "../types";
import MemeCard from "../components/MemeCard";

interface SavesPageProps {
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

export default function SavesPage({
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
}: SavesPageProps) {
  const savedMemes = memes.filter(m => m.saved_by_me);

  return (
    <div className="flex flex-col gap-4 w-full px-4 md:px-0 animate-fade-in">  
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm text-right">  
        <h2 className="font-bold text-xl flex items-center gap-2 text-gray-900 dark:text-white">
          <Bookmark className="w-5 h-5 text-blue-500 fill-blue-500" />
          <span>المنشورات المحفوظة عندك</span>
        </h2>  
      </div>  
      {savedMemes.length === 0 ? (  
        <div className="text-center py-12 text-gray-400 font-bold bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
          لم تقم بحفظ أي منشورات بعد يا غالي. 👀
        </div>  
      ) : (
        savedMemes.map((m) => (  
          <div key={m.id} className="post-wrapper w-full">  
            <MemeCard 
              meme={m} currentUser={currentUser} onLikeToggle={handleLikeToggle} onSaveToggle={handleSaveToggle} onFollowToggle={handleFollowToggle} onTagClick={setSelectedTag} 
              onDeleteComment={() => {}} onReportSubmit={handleReportSubmit} onShareCompleted={handleShareCompleted} onDeleteMeme={handleDeleteMeme} 
              onUserProfileClick={(uid) => { setSelectedProfileId(uid); setActiveTab("user-profile"); }} isFollowingCreator={followingIds.includes(m.user_id)} onImageClick={setLightboxImage} 
            />  
          </div>  
        ))
      )}  
    </div>
  );
}

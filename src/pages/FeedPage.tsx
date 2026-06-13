import React from "react";
import { Clock } from "lucide-react";
import { Meme, Profile } from "../types";
import MemeCard from "../components/MemeCard";

interface FeedPageProps {
  isRealUser: boolean;
  loading: boolean;
  filteredMemes: Meme[];
  currentUser: Profile;
  followingIds: string[];
  setMemes: React.Dispatch<React.SetStateAction<Meme[]>>;
  setShowAuthModal: (show: boolean) => void;
  setAuthTab: (tab: "signin" | "signup") => void;
  setSearchQuery: (query: string) => void;
  setSelectedTag: (tag: string | null) => void;
  handleLikeToggle: (id: string) => Promise<void>;
  handleSaveToggle: (id: string) => Promise<void>;
  handleFollowToggle: (folId: string, fowId: string) => Promise<void>;
  handleReportSubmit: (id: string, reason: string) => void;
  handleShareCompleted: (id: string) => Promise<void>;
  handleDeleteMeme: (id: string) => Promise<void>;
  setSelectedProfileId: (id: string | null) => void;
  setActiveTab: (tab: string) => void;
  setLightboxImage: (url: string | null) => void;
}

export default function FeedPage({
  isRealUser,
  loading,
  filteredMemes,
  currentUser,
  followingIds,
  setMemes,
  setShowAuthModal,
  setAuthTab,
  setSearchQuery,
  setSelectedTag,
  handleLikeToggle,
  handleSaveToggle,
  handleFollowToggle,
  handleReportSubmit,
  handleShareCompleted,
  handleDeleteMeme,
  setSelectedProfileId,
  setActiveTab,
  setLightboxImage,
}: FeedPageProps) {
  return (
    // تم إضافة max-w-2xl و mx-auto لتظبيط وضع الكمبيوتر عشان البوستات متكونش عريضة بزيادة
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto pb-24 md:pb-8 px-4 md:px-0">
      
      {!isRealUser && (
        <div className="lg:hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-4">
          <div className="text-right">
            <h4 className="font-bold text-sm text-gray-900 dark:text-white">أهلاً بك كزائر 👋</h4>
            <p className="text-xs text-gray-500">سجل لدعم وحفظ الميمز الموتة من الضحك.</p>
          </div>
          <button
            onClick={() => { setShowAuthModal(true); setAuthTab("signin"); }}
            className="bg-blue-600 hover:bg-blue-700 transition-colors text-white font-bold py-2 px-4 rounded-xl text-xs whitespace-nowrap"
          >
            تسجيل الدخول
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400 font-medium">جاري جلب آخر الكوميكسات من السيرفر...</div>
      ) : filteredMemes.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-12 text-center flex flex-col items-center gap-3">
          <Clock className="w-10 h-10 text-gray-300 dark:text-gray-600" />
          <p className="font-bold text-gray-500 dark:text-gray-400">ملقناش أي بوستات كدا أو كدا تطابق تدويرك</p>
          <button onClick={() => { setSearchQuery(""); setSelectedTag(null); }} className="mt-2 text-blue-600 dark:text-blue-400 text-sm font-bold hover:underline">
            إعادة تصفير الفلاتر
          </button>
        </div>
      ) : (
        filteredMemes.map((meme) => (
          // تم إضافة كلاسات الحواف الدائرية والظل البسيط هنا 
          <div 
            key={meme.id} 
            className="post-wrapper w-full bg-white dark:bg-gray-900 rounded-2xl md:rounded-3xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-800"
          >
            <MemeCard
              meme={meme}
              currentUser={currentUser}
              onLikeToggle={handleLikeToggle}
              onSaveToggle={handleSaveToggle}
              onFollowToggle={handleFollowToggle}
              onTagClick={(tag) => setSelectedTag(tag)}
              onDeleteComment={() => setMemes(prev => prev.map(m => m.id === meme.id ? { ...m, comments_count: Math.max(0, m.comments_count - 1) } : m))}
              onReportSubmit={handleReportSubmit}
              onShareCompleted={handleShareCompleted}
              onDeleteMeme={handleDeleteMeme}
              onUserProfileClick={(uid) => { setSelectedProfileId(uid); setActiveTab("user-profile"); }}
              isFollowingCreator={followingIds.includes(meme.user_id)}
              onImageClick={(url: string) => setLightboxImage(url)}
            />
          </div>
        ))
      )}
    </div>
  );
}

import React from "react";
import { Clock, Flame, Zap, TrendingUp } from "lucide-react";
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
    <div className="max-w-3xl mx-auto w-full pb-24 md:pb-8 flex flex-col gap-6">
      
      {/* 1. شريط الأقسام (بدل البطاقات الجانبية) */}
      <div className="flex items-center gap-2 px-2 md:px-0">
        <button onClick={() => setSelectedTag(null)} className="flex items-center gap-2 bg-white dark:bg-[#111827] px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm text-sm font-black text-gray-700 dark:text-gray-200 hover:border-blue-500 transition-colors">
          <Flame className="w-4 h-4 text-orange-500" /> الكل
        </button>
        <button className="flex items-center gap-2 bg-white dark:bg-[#111827] px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm text-sm font-black text-gray-700 dark:text-gray-200 hover:border-blue-500 transition-colors">
          <Zap className="w-4 h-4 text-yellow-500" /> تريند
        </button>
        <button className="flex items-center gap-2 bg-white dark:bg-[#111827] px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm text-sm font-black text-gray-700 dark:text-gray-200 hover:border-blue-500 transition-colors">
          <TrendingUp className="w-4 h-4 text-emerald-500" /> الأحدث
        </button>
      </div>

      {!isRealUser && (
        <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm mx-2 md:mx-0 flex items-center justify-between gap-4">
          <div className="text-right">
            <h4 className="font-black text-sm text-gray-900 dark:text-white">أهلاً بك في مجرة الضحك 👋</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">سجل لدعم وصناعة الميمز الموتة من الضحك.</p>
          </div>
          <button
            onClick={() => { setShowAuthModal(true); setAuthTab("signin"); }}
            className="bg-[#1877F2] hover:bg-[#166FE5] transition-all text-white font-black py-2.5 px-6 rounded-xl text-sm shadow-lg shadow-blue-500/20 active:scale-95"
          >
            دخول المجرة
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400 font-black">جاري جلب آخر الإيفيهات...</div>
      ) : filteredMemes.length === 0 ? (
        <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-2xl p-12 text-center flex flex-col items-center gap-3 mx-2 md:mx-0 shadow-sm">
          <Clock className="w-10 h-10 text-gray-300 dark:text-gray-600" />
          <p className="font-bold text-gray-500 dark:text-gray-400">ملقناش أي بوستات تطابق تدويرك</p>
          <button onClick={() => { setSearchQuery(""); setSelectedTag(null); }} className="mt-2 text-blue-600 dark:text-blue-400 text-sm font-black hover:underline">
            إعادة تصفير الفلاتر
          </button>
        </div>
      ) : (
        filteredMemes.map((meme) => (
          /* 2. تصميم البوستات بحواف ناعمة زي البروفايل بالضبط */
          <div key={meme.id} className="w-full bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800/60 rounded-2xl shadow-sm overflow-hidden p-1">
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

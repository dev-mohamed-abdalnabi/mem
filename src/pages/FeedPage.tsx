import React, { useEffect, useRef } from "react";
import { Clock, Loader2 } from "lucide-react";
import { Meme, Profile } from "../types";
import MemeCard from "../components/MemeCard";
import Stories from "../components/Stories";
import { FeedLoadingSkeleton } from "../components/LoadingSkeletons";

/**
 * واجهة الخصائص لصفحة الفيد (FeedPage)
 */
interface FeedPageProps {
  isRealUser: boolean;
  authChecked: boolean;
  loading: boolean;
  loadingMore: boolean; // حالة تحميل المزيد
  hasMore: boolean; // هل توجد صفحات أخرى
  loadMore: () => void; // وظيفة تحميل الصفحة التالية
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
  setLightboxImage: (url: string | null, meme?: Meme | null) => void;
  onOpenComments?: (meme: Meme) => void;
  highlightedMemeId?: string | null; // بوست جاي من لينك مشاركة، بنوصله له وننده عليه بالضوء
  onHighlightConsumed?: () => void; // بتتنادى بعد ما التظليل يخلص عشان الحالة تتصفر
  // بتتنادى لما عارض الحالات (Stories) يتفتح أو يتقفل، عشان App.tsx يقدر
  // يتحكم في زرار الرجوع في الموبايل صح (يقفل عارض الحالة بدل ما يقفز
  // لتبويب/صفحة تانية غلط)
  onStoryViewerChange?: (isOpen: boolean, closeFn: (() => void) | null) => void;
}

/**
 * مكون صفحة الفيد (FeedPage)
 * يعرض المنشورات ويدعم التحميل التدريجي (Infinite Scroll)
 */
export default function FeedPage({
  isRealUser,
  authChecked,
  loading,
  loadingMore,
  hasMore,
  loadMore,
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
  onOpenComments,
  highlightedMemeId,
  onHighlightConsumed,
  onStoryViewerChange,
}: FeedPageProps) {
  
  const loaderRef = useRef<HTMLDivElement>(null);

  /**
   * لو فيه بوست جاي من لينك مشاركة، بنوصله له بالسكرول وننده عليه بالضوء
   * لفترة قصيرة بدل ما نفتحله مودال التعليقات على طول.
   */
  useEffect(() => {
    if (!highlightedMemeId) return;
    const el = document.getElementById(`meme-${highlightedMemeId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    const t = setTimeout(() => onHighlightConsumed?.(), 2500);
    return () => clearTimeout(t);
  }, [highlightedMemeId, filteredMemes.length]);

  /**
   * إعداد Intersection Observer لمراقبة نهاية الصفحة وتحميل المزيد
   */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          loadMore();
        }
      },
      { threshold: 1.0 }
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => {
      if (loaderRef.current) {
        observer.unobserve(loaderRef.current);
      }
    };
  }, [hasMore, loadingMore, loading, loadMore]);

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto pb-20 lg:pb-8 px-4 md:px-0">
      
      {/* قصص المستخدمين (Stories) */}
      {authChecked && isRealUser && (
        <Stories
          currentUser={currentUser}
          onStoryViewerChange={onStoryViewerChange}
          onUserProfileClick={(uid) => { setSelectedProfileId(uid); setActiveTab("user-profile"); }}
        />
      )}

      {/* لسه بنتأكد من حالة الدخول - تأثير شبح (skeleton) بدل ما نفترض إنه
          زائر ونوريه بانر/زرار تسجيل دخول يختفي فجأة أول ما بياناته توصل */}
      {!authChecked && (
        <div className="lg:hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-sm flex items-center gap-4 animate-pulse">
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-32 bg-gray-200 dark:bg-gray-700 rounded-full" />
            <div className="h-3 w-44 bg-gray-100 dark:bg-gray-800 rounded-full" />
          </div>
          <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        </div>
      )}

      {/* رسالة ترحيب للزوار (للجوال فقط) */}
      {authChecked && !isRealUser && (
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
      
      {/* عرض حالة التحميل الأولية */}
      {loading ? (
        <FeedLoadingSkeleton />
      ) : filteredMemes.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-12 text-center flex flex-col items-center gap-3">
          <Clock className="w-10 h-10 text-gray-300 dark:text-gray-600" />
          <p className="font-bold text-gray-500 dark:text-gray-400">ملقناش أي بوستات كدا أو كدا تطابق تدويرك</p>
          <button onClick={() => { setSearchQuery(""); setSelectedTag(null); }} className="mt-2 text-blue-600 dark:text-blue-400 text-sm font-bold hover:underline">
            إعادة تصفير الفلاتر
          </button>
        </div>
      ) : (
        <>
          {/* عرض قائمة الميمز */}
          {filteredMemes.map((meme) => (
            <div 
              key={meme.id} 
              id={`meme-${meme.id}`}
              className={`post-wrapper w-full bg-white dark:bg-gray-900 rounded-2xl md:rounded-3xl overflow-hidden shadow-sm border transition-all hover:shadow-md ${
                highlightedMemeId === meme.id
                  ? "border-blue-500 ring-2 ring-blue-500/60"
                  : "border-gray-200 dark:border-gray-800"
              }`}
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
                onImageClick={(url: string, meme: Meme) => setLightboxImage(url, meme)}
                onOpenComments={onOpenComments}
              />
            </div>
          ))}

          {/* مؤشر تحميل المزيد في نهاية الصفحة */}
          <div 
            ref={loaderRef} 
            className="w-full py-8 flex justify-center items-center"
          >
            {loadingMore ? (
              <div className="flex items-center gap-2 text-blue-600 font-bold text-sm">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>جاري تحميل المزيد من الضحك...</span>
              </div>
            ) : hasMore ? (
              <div className="h-4" /> // مساحة فارغة لتفعيل الـ Observer
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-sm font-bold">خلصنا كل الميمز اللي عندنا حالياً! 🏁</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

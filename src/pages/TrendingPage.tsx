import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Meme, Profile } from "../types";
import MemeCard from "../components/MemeCard";
import { dataService } from "../services/dataService";
import { FeedLoadingSkeleton } from "../components/LoadingSkeletons";

interface TrendingPageProps {
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

/**
 * صفحة الترند - كانت قديماً بتاخد نفس الـ 10-20 بوست المحملين في الفيد الرئيسي
 * وتعيد ترتيبهم محلياً بفورمولا بسيطة من غير أي اعتبار لعمر البوست (يعني بوست قديم
 * جداً بلايكات كتير كان ممكن يفضل "ترند" للأبد). دلوقتي بنجيب من trending_memes،
 * وهي materialized view حقيقية في Supabase بتتحدث تلقائياً كل 15 دقيقة (cron job)
 * وبتحسب hot_score فعلي بيدي وزن أعلى للبوستات الحديثة (زي Reddit Hot / انستجرام Trending).
 */
export default function TrendingPage({
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
  const [trendingMemes, setTrendingMemes] = useState<Meme[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    dataService.getTrendingMemes(30)
      .then(memes => { if (!cancelled) setTrendingMemes(memes); })
      .catch(err => console.error("Error loading trending:", err))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto animate-fade-in pb-20 lg:pb-8 px-4 md:px-0">  

      {loading ? (
        <FeedLoadingSkeleton />
      ) : trendingMemes.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-12 text-center flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-gray-300" />
          <p className="font-bold text-gray-500 dark:text-gray-400">مفيش بوستات ترند دلوقتي، جرب تاني بعد شوية</p>
        </div>
      ) : (
        trendingMemes.map((m) => (
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
        ))
      )}
    </div>
  );
}

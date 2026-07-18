import React, { useEffect, useRef, useState } from "react";
import { Heart, MessageCircle, Bookmark, Share2, Loader2 } from "lucide-react";
import { Meme, Profile } from "../types";
import { dataService } from "../services/dataService";

interface ReelsPageProps {
  currentUser: Profile;
  isRealUser: boolean;
  handleLikeToggle: (id: string) => Promise<void>;
  handleSaveToggle: (id: string) => Promise<void>;
  handleShareCompleted: (id: string) => Promise<void>;
  onOpenComments?: (meme: Meme) => void;
  setShowAuthModal: (show: boolean) => void;
  onUserProfileClick: (userId: string) => void;
}

/**
 * صفحة الريلز: فيد فيديوهات رأسي (سكرول من فوق لتحت، كل فيديو ياخد الشاشة كلها)
 * بدل تبويب "الحفظ" اللي اتنقل جوه قائمة الإعدادات. بتشغل الفيديو اللي في المنتصف
 * تلقائياً وتوقف الباقي (زي التيك توك/الريلز).
 */
export default function ReelsPage({
  currentUser,
  isRealUser,
  handleLikeToggle,
  handleSaveToggle,
  handleShareCompleted,
  onOpenComments,
  setShowAuthModal,
  onUserProfileClick,
}: ReelsPageProps) {
  const [reels, setReels] = useState<Meme[]>([]);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  useEffect(() => {
    dataService.getVideoMemes(0, 20)
      .then(setReels)
      .catch(err => console.error("Error loading reels:", err))
      .finally(() => setLoading(false));
  }, []);

  // تشغيل الفيديو الظاهر في المنتصف بس وإيقاف الباقي
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;
          if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        });
      },
      { root: container, threshold: [0, 0.6, 1] }
    );

    Object.values(videoRefs.current).forEach((v) => v && observer.observe(v));
    return () => observer.disconnect();
  }, [reels]);

  const requireAuth = (action: () => void) => {
    if (!isRealUser) {
      setShowAuthModal(true);
      return;
    }
    action();
  };

  if (loading) {
    return (
      <div className="w-full h-[calc(100vh-8rem)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gray-300 animate-spin" />
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="w-full h-[calc(100vh-8rem)] flex flex-col items-center justify-center gap-2 text-center px-6">
        <p className="font-bold text-gray-500 dark:text-gray-400">مفيش فيديوهات ريلز دلوقتي</p>
        <p className="text-xs text-gray-400 dark:text-gray-600">أول فيديو ينشر هنا هيظهر في الريلز تلقائي</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)] overflow-y-scroll snap-y snap-mandatory rounded-2xl bg-black no-scrollbar"
    >
      {reels.map((meme) => (
        <div key={meme.id} className="relative w-full h-full snap-start snap-always flex items-center justify-center bg-black">
          <video
            ref={(el) => { videoRefs.current[meme.id] = el; }}
            src={meme.video_url || ""}
            loop
            muted
            playsInline
            className="w-full h-full object-contain"
            onClick={(e) => {
              const v = e.currentTarget;
              v.paused ? v.play() : v.pause();
            }}
          />

          {/* معلومات صاحب المنشور والنص */}
          <div className="absolute bottom-4 right-4 left-20 text-white">
            <button
              onClick={() => onUserProfileClick(meme.user_id)}
              className="flex items-center gap-2 mb-2"
            >
              <img src={meme.profiles?.avatar_url || ""} className="w-9 h-9 rounded-full border-2 border-white object-cover" alt="" />
              <span className="font-bold text-sm">{meme.profiles?.username || "مستخدم"}</span>
            </button>
            {meme.caption && (
              <p className="text-sm leading-relaxed line-clamp-2">{meme.caption}</p>
            )}
          </div>

          {/* أزرار التفاعل الجانبية */}
          <div className="absolute bottom-4 left-3 flex flex-col items-center gap-5 text-white">
            <button
              onClick={() => requireAuth(() => handleLikeToggle(meme.id))}
              className="flex flex-col items-center gap-1"
            >
              <Heart className={`w-7 h-7 ${meme.liked_by_me ? "fill-red-500 text-red-500" : ""}`} />
              <span className="text-xs font-bold">{meme.likes_count}</span>
            </button>
            <button
              onClick={() => onOpenComments?.(meme)}
              className="flex flex-col items-center gap-1"
            >
              <MessageCircle className="w-7 h-7" />
              <span className="text-xs font-bold">{meme.comments_count}</span>
            </button>
            <button
              onClick={() => requireAuth(() => handleSaveToggle(meme.id))}
              className="flex flex-col items-center gap-1"
            >
              <Bookmark className={`w-7 h-7 ${meme.saved_by_me ? "fill-white" : ""}`} />
            </button>
            <button
              onClick={() => requireAuth(() => handleShareCompleted(meme.id))}
              className="flex flex-col items-center gap-1"
            >
              <Share2 className="w-7 h-7" />
              <span className="text-xs font-bold">{meme.shares_count}</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

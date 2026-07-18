import React, { useEffect, useRef, useState } from "react";
import { Heart, MessageCircle, Bookmark, Share2, Loader2, Volume2, VolumeX } from "lucide-react";
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
 *
 * ملحوظة مهمة عن الحاوية: بدل ما نحسب الارتفاع بـ "100vh - كذا" (اللي كان بيغلط
 * لأنه ما كانش مطابق للارتفاع الحقيقي للهيدر + الشريط السفلي، فكان بيخلي جزء من
 * أسفل الفيديو "بياكل" ومش ظاهر) دلوقتي بنثبت الحاوية بـ top/bottom مباشرة على
 * ارتفاع الهيدر (4rem) والشريط السفلي (4rem)، وده بيتأقلم صح مع اختفاء/ظهور شريط
 * عنوان المتصفح في الموبايل بشكل تلقائي بخلاف حسابات الـ vh.
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
  const [isMuted, setIsMuted] = useState(false);
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
            // بنحاول نشغل بالصوت الأول؛ لو المتصفح رفض (سياسة autoplay) بنكتم تلقائياً
            // كحل بديل بس بنسيب زرار الصوت شغال عشان المستخدم يفعله بنفسه بضغطة واحدة
            video.muted = isMuted;
            video.play().catch(() => {
              video.muted = true;
              setIsMuted(true);
              video.play().catch(() => {});
            });
          } else {
            video.pause();
          }
        });
      },
      { root: container, threshold: [0, 0.6, 1] }
    );

    Object.values(videoRefs.current).forEach((v) => v && observer.observe(v));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reels]);

  // تطبيق حالة الكتم على كل الفيديوهات مرة واحدة (زرار صوت واحد للكل زي التيك توك)
  useEffect(() => {
    Object.values(videoRefs.current).forEach((v) => { if (v) v.muted = isMuted; });
  }, [isMuted]);

  const requireAuth = (action: () => void) => {
    if (!isRealUser) {
      setShowAuthModal(true);
      return;
    }
    action();
  };

  /**
   * باگ كانت الأزرار (لايك/حفظ/مشاركة) "مش شغالة" فعلياً: كانت العملية بتتسجل
   * صح في الداتابيز، بس ReelsPage عندها state محلية خاصة بيها (reels) منفصلة
   * تماماً عن state الميمز في App.tsx، والدوال الممررة من فوق (handleLikeToggle
   * إلخ) كانت بتحدث state بتاع App.tsx بس، مش الـ reels المحلية هنا. فالنتيجة إن
   * الضغطة كانت بتتسجل من غير ما يظهر أي تغيير بصري للمستخدم (القلب مش بيتلون،
   * العداد مش بيتغير)، فكانت بتحس إنها "مش شغالة". دلوقتي بنحدّث الـ state
   * المحلية فوراً (تحديث متفائل) وبعدين بننده الدالة الحقيقية.
   */
  const handleLike = (meme: Meme) => {
    requireAuth(() => {
      setReels(prev => prev.map(m => m.id === meme.id
        ? { ...m, liked_by_me: !m.liked_by_me, likes_count: m.likes_count + (m.liked_by_me ? -1 : 1) }
        : m
      ));
      handleLikeToggle(meme.id).catch(() => {
        // ارجاع الحالة زي ما كانت لو العملية فشلت فعلياً في السيرفر
        setReels(prev => prev.map(m => m.id === meme.id
          ? { ...m, liked_by_me: meme.liked_by_me, likes_count: meme.likes_count }
          : m
        ));
      });
    });
  };

  const handleSave = (meme: Meme) => {
    requireAuth(() => {
      setReels(prev => prev.map(m => m.id === meme.id ? { ...m, saved_by_me: !m.saved_by_me } : m));
      handleSaveToggle(meme.id).catch(() => {
        setReels(prev => prev.map(m => m.id === meme.id ? { ...m, saved_by_me: meme.saved_by_me } : m));
      });
    });
  };

  const handleShare = (meme: Meme) => {
    requireAuth(async () => {
      // تحديث متفائل فوري للعداد، وبعدين استدعاء الدالة الحقيقية اللي بتسجل
      // المشاركة وتحدث state بتاع App.tsx (من غير ما نستدعي recordShare مرتين)
      setReels(prev => prev.map(m => m.id === meme.id ? { ...m, shares_count: m.shares_count + 1 } : m));
      try {
        await handleShareCompleted(meme.id);
      } catch (e) {
        console.error("Error sharing reel:", e);
        setReels(prev => prev.map(m => m.id === meme.id ? { ...m, shares_count: meme.shares_count } : m));
      }
    });
  };

  if (loading) {
    return (
      <div className="fixed top-16 bottom-16 md:static md:h-[75vh] inset-x-0 md:inset-auto flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gray-300 animate-spin" />
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="fixed top-16 bottom-16 md:static md:h-[75vh] inset-x-0 md:inset-auto flex flex-col items-center justify-center gap-2 text-center px-6">
        <p className="font-bold text-gray-500 dark:text-gray-400">مفيش فيديوهات ريلز دلوقتي</p>
        <p className="text-xs text-gray-400 dark:text-gray-600">أول فيديو ينشر هنا هيظهر في الريلز تلقائي</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="fixed top-16 bottom-16 md:bottom-4 inset-x-0 md:static md:h-[80vh] md:rounded-2xl overflow-y-scroll snap-y snap-mandatory bg-black no-scrollbar z-30"
    >
      {reels.map((meme) => (
        <div key={meme.id} className="relative w-full h-full snap-start snap-always flex items-center justify-center bg-black">
          <video
            ref={(el) => { videoRefs.current[meme.id] = el; }}
            src={meme.video_url || ""}
            loop
            playsInline
            muted={isMuted}
            className="w-full h-full object-contain"
            onClick={(e) => {
              const v = e.currentTarget;
              v.paused ? v.play() : v.pause();
            }}
          />

          {/* زرار كتم/تشغيل الصوت زي التيك توك والريلز */}
          <button
            onClick={(e) => { e.stopPropagation(); setIsMuted(prev => !prev); }}
            className="absolute top-3 left-3 z-10 bg-black/40 text-white p-2 rounded-full"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* معلومات صاحب المنشور والنص */}
          <div className="absolute bottom-6 right-4 left-20 text-white z-10">
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
          <div className="absolute bottom-6 left-3 flex flex-col items-center gap-5 text-white z-10">
            <button
              onClick={() => handleLike(meme)}
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
              onClick={() => handleSave(meme)}
              className="flex flex-col items-center gap-1"
            >
              <Bookmark className={`w-7 h-7 ${meme.saved_by_me ? "fill-white" : ""}`} />
            </button>
            <button
              onClick={() => handleShare(meme)}
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

import React, { useEffect, useRef, useState } from "react";
import { Heart, MessageCircle, Bookmark, Share2, Loader2, Volume2, VolumeX, FastForward, Rewind } from "lucide-react";
import { Meme, Profile } from "../types";
import { dataService } from "../services/dataService";

// نفس البوستر الافتراضي المستخدم في CustomVideoPlayer (الفيد) - SVG بكسل
// أسود صغير، بنحطه كـ poster لأي فيديو لسه مبدأش يحمّل عشان نمنع المتصفح
// إنه يرسم شكله الافتراضي (أيقونة تشغيل جوه بيضاوي رمادي) في الريلز.
const FALLBACK_POSTER =
  "data:image/svg+xml;base64," +
  btoa('<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><rect width="4" height="4" fill="#000000"/></svg>');

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

// إعدادات اللمس: كام مللي ثانية بين ضغطتين عشان تتحسب "دبل تاب"، وقد إيه
// الزمن اللي لازم تستناه عشان الضغطة تتحول لـ "ضغط مطول" (2x)، وكام ثانية
// نتقدم/نرجع بيها في كل دبل تاب.
const DOUBLE_TAP_MS = 280;
const LONG_PRESS_MS = 350;
const SEEK_SECONDS = 10;
// لو الإصبع اتحرك أكتر من كذا بكسل، بنعتبرها سحب (سكرول) مش ضغطة -
// عشان مايحصلش تشغيل/إيقاف أو 2x غلط وانت بس بتسكرول بين الريلز
const DRAG_CANCEL_PX = 10;

type GestureFeedback = { id: string; type: "back" | "forward" | "speed" } | null;

interface TapState {
  startX: number;
  startY: number;
  isDragging: boolean;
  isLongPress: boolean;
  lastTapTime: number;
  lastTapSide: "left" | "right" | null;
  longPressTimer: ReturnType<typeof setTimeout> | null;
  singleTapTimer: ReturnType<typeof setTimeout> | null;
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
 *
 * إصلاح باگ "الفيديوهات بتقف تشتغل لما تنزل تحت": كان الكود القديم بيشغل
 * ويوقف كل فيديو لوحده على حسب الـ entry بتاعه من غير ما ياخد بالباله باقي
 * الفيديوهات، فكانت بتحصل حالتين سيئتين: (1) فيديوهين "شبه ظاهرين" في نفس
 * اللحظة (وقت السكرول) يتشغلوا مع بعض، فـ play() لواحد بيبوظ play() التاني
 * (AbortError) والكود ما كانش بيعيد المحاولة تاني، فالفيديو يفضل واقف لحد
 * ما تعمل ريفريش. (2) الـ threshold كان [0, 0.6, 1] بس، يعني الـ observer
 * ميرجعش نتيجة تانية إلا لو النسبة عدّت نقطة 0.6 فعلياً - في السكرول السريع
 * ده مش بيحصل بالظبط دايماً. الحل: بنتابع نسبة ظهور كل الفيديوهات في نفس
 * الوقت، وبعد كل تحديث بنحدد "الفيديو الأكتر ظهوراً" ده بس اللي يشتغل ونوقف
 * الباقي، وبنعيد المحاولة تلقائياً كل مرة تتغير نسبة الظهور (بدل ما نعتمد
 * على استدعاء واحد بس ممكن يفشل).
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
  // بنمنع التحديث المتفائل لعداد المشاركات لو المستخدم دوس زرار المشاركة
  // كذا مرة ورا بعض بسرعة لنفس الريل (نفس مدة التهدئة الموجودة في App.tsx)
  const lastShareAtRef = useRef<Map<string, number>>(new Map());
  const SHARE_COOLDOWN_MS = 10000;

  // الفيديو النشط دلوقتي (اللي بيشتغل فعلياً) - بيتحدد من الـ IntersectionObserver
  const [activeId, setActiveId] = useState<string | null>(null);
  const prevActiveIdRef = useRef<string | null>(null);

  // --- تسجيل watch-time للريلز (أقوى إشارة تستخدمها خوارزمية الريلز -
  // completion rate / rewatch rate، راجع RANKING_ALGORITHMS.md). بنتابع
  // أطول نقطة وصلها المستخدم فعلياً في كل ريل (مش آخر currentTime بس،
  // عشان لو رجع لورا يفضل الرقم الحقيقي الأعلى محفوظ)، ولو الفيديو اتلف
  // (loop، بما إن كل فيديو معمول عليه loop) بنعتبرها rewatch وبنبعت
  // القراءة دي فوراً بدل ما نستناها لحد ما يعدي المستخدم للريل اللي بعده.
  const watchStatsRef = useRef<Map<string, { maxWatched: number; duration: number; rewatch: boolean; lastTime: number }>>(new Map());

  const flushWatchStats = (memeId: string | null) => {
    if (!memeId || !isRealUser) return;
    const stats = watchStatsRef.current.get(memeId);
    if (!stats || stats.duration <= 0 || stats.maxWatched <= 0) return;
    dataService.logReelWatch(memeId, stats.maxWatched, stats.duration, stats.rewatch).catch(() => {});
    // بعد التسجيل بنصفّر أطول نقطة وصلها (مش الـ rewatch flag) عشان لو
    // فضل نفس الفيديو ظاهر أكتر، القراءة الجاية تحسب من جديد بدل ما تتراكم
    // فوق قراءة اتبعتت خلاص.
    watchStatsRef.current.set(memeId, { ...stats, maxWatched: 0 });
  };

  const handleWatchProgress = (meme: Meme) => (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const v = e.currentTarget;
    if (!v.duration || !isFinite(v.duration)) return;
    const prev = watchStatsRef.current.get(meme.id) || { maxWatched: 0, duration: v.duration, rewatch: false, lastTime: 0 };
    // قفزة كبيرة لورا (من قرب النهاية لقرب البداية) = الفيديو لف من الأول
    // (loop=true على كل فيديو). ده أقوى إشارة إيجابية ممكنة (rewatch)،
    // فبنسجلها فوراً كقراءة كاملة بدل ما نستناها.
    const looped = prev.lastTime > v.duration * 0.8 && v.currentTime < v.duration * 0.15;
    if (looped) {
      flushWatchStats(meme.id);
      watchStatsRef.current.set(meme.id, { maxWatched: v.currentTime, duration: v.duration, rewatch: true, lastTime: v.currentTime });
    } else {
      watchStatsRef.current.set(meme.id, {
        maxWatched: Math.max(prev.maxWatched, v.currentTime),
        duration: v.duration,
        rewatch: prev.rewatch,
        lastTime: v.currentTime,
      });
    }
  };
  // نسبة تقدم الفيديو النشط (0-100) عشان شريط التقدم القابل للسحب
  const [progress, setProgress] = useState(0);
  const isSeekingRef = useRef(false);
  // تنبيه بصري مؤقت (رجوع/تقديم 10 ثواني أو 2x) فوق الريل الحالي
  const [gestureFeedback, setGestureFeedback] = useState<GestureFeedback>(null);
  const gestureHideTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const tapStatesRef = useRef<Map<string, TapState>>(new Map());

  const getTapState = (id: string): TapState => {
    let state = tapStatesRef.current.get(id);
    if (!state) {
      state = {
        startX: 0, startY: 0, isDragging: false, isLongPress: false,
        lastTapTime: 0, lastTapSide: null, longPressTimer: null, singleTapTimer: null,
      };
      tapStatesRef.current.set(id, state);
    }
    return state;
  };

  useEffect(() => {
    dataService.getVideoMemes(0, 20)
      .then(setReels)
      .catch(err => console.error("Error loading reels:", err))
      .finally(() => setLoading(false));
  }, []);

  // تشغيل الفيديو الأكتر ظهوراً في الحاوية بس، وإيقاف الباقي - بيتعاد حسابه
  // مع كل تغيير في نسب الظهور (مش استدعاء واحد بيتنسى)، فلو play() فشل مرة
  // بيتحاول تاني أول ما يتغير أي حاجة (بدل ما يفضل الفيديو واقف للأبد)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ratios = new Map<Element, number>();
    const elToId = new Map<Element, string>();
    Object.entries(videoRefs.current).forEach(([id, el]) => { if (el) elToId.set(el, id); });

    const applyActiveVideo = () => {
      let bestEl: Element | null = null;
      let bestRatio = 0;
      ratios.forEach((ratio, el) => {
        if (ratio > bestRatio) { bestRatio = ratio; bestEl = el; }
      });

      const bestId = bestEl ? elToId.get(bestEl) || null : null;
      if (bestRatio > 0.5 && bestId) setActiveId(bestId);

      Object.entries(videoRefs.current).forEach(([id, v]) => {
        if (!v) return;
        if (v === bestEl && bestRatio > 0.5) {
          if (v.paused) {
            v.muted = isMuted;
            v.play().catch((err) => {
              if (err?.name === "NotAllowedError") {
                v.muted = true;
                setIsMuted(true);
                v.play().catch(() => {});
              }
              // أي خطأ تاني (زي AbortError بسبب تعارض تشغيل/إيقاف سريع وقت
              // السكرول) بنتجاهله بأمان - applyActiveVideo هتتنده تاني أول ما
              // نسبة الظهور تتغير تاني فهتحاول تشغله من جديد
            });
          }
        } else if (!v.paused) {
          v.pause();
        }
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => { ratios.set(entry.target, entry.intersectionRatio); });
        applyActiveVideo();
      },
      { root: container, threshold: [0, 0.25, 0.5, 0.6, 0.75, 0.9, 1] }
    );

    Object.values(videoRefs.current).forEach((v) => v && observer.observe(v));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reels]);

  // تطبيق حالة الكتم على كل الفيديوهات مرة واحدة (زرار صوت واحد للكل زي التيك توك)
  useEffect(() => {
    Object.values(videoRefs.current).forEach((v) => { if (v) v.muted = isMuted; });
  }, [isMuted]);

  // أول ما الريل النشط يتغير (المستخدم سكرول لريل تاني)، بنبعت watch-time
  // الريل اللي كان شغال قبل كده فوراً - ده اللحظة الطبيعية اللي فيها المستخدم
  // "خلّص" مع الفيديو ده (سواء كمّله أو عمله fast-skip)، بدل ما نستنى unmount.
  useEffect(() => {
    if (prevActiveIdRef.current && prevActiveIdRef.current !== activeId) {
      flushWatchStats(prevActiveIdRef.current);
    }
    prevActiveIdRef.current = activeId;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  // وعند مغادرة الصفحة كلها، بنبعت آخر قراءة للريل اللي كان شغال وقتها
  useEffect(() => {
    return () => { flushWatchStats(prevActiveIdRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requireAuth = (action: () => void) => {
    if (!isRealUser) {
      setShowAuthModal(true);
      return;
    }
    action();
  };

  const showGestureFeedback = (fb: GestureFeedback, autoHide: boolean) => {
    if (gestureHideTimerRef.current) clearTimeout(gestureHideTimerRef.current);
    setGestureFeedback(fb);
    if (autoHide && fb) {
      gestureHideTimerRef.current = setTimeout(() => {
        setGestureFeedback((cur) => (cur?.id === fb.id ? null : cur));
      }, 550);
    }
  };

  // بداية اللمس على الفيديو: بنسجل مكان البداية وبنبدأ عداد الضغط المطول
  const handleVideoPointerDown = (meme: Meme) => (e: React.PointerEvent<HTMLVideoElement>) => {
    const video = videoRefs.current[meme.id];
    if (!video) return;
    const state = getTapState(meme.id);
    state.startX = e.clientX;
    state.startY = e.clientY;
    state.isDragging = false;
    state.isLongPress = false;

    if (state.longPressTimer) clearTimeout(state.longPressTimer);
    state.longPressTimer = setTimeout(() => {
      if (state.isDragging) return;
      state.isLongPress = true;
      video.playbackRate = 2;
      showGestureFeedback({ id: meme.id, type: "speed" }, false);
    }, LONG_PRESS_MS);
  };

  // لو الإصبع اتحرك مسافة محسوسة، ده سكرول مش ضغطة - نلغي كل حاجة
  const handleVideoPointerMove = (meme: Meme) => (e: React.PointerEvent<HTMLVideoElement>) => {
    const video = videoRefs.current[meme.id];
    const state = tapStatesRef.current.get(meme.id);
    if (!video || !state || state.isDragging) return;
    const dx = Math.abs(e.clientX - state.startX);
    const dy = Math.abs(e.clientY - state.startY);
    if (dx > DRAG_CANCEL_PX || dy > DRAG_CANCEL_PX) {
      state.isDragging = true;
      if (state.longPressTimer) clearTimeout(state.longPressTimer);
      if (state.isLongPress) {
        video.playbackRate = 1;
        state.isLongPress = false;
        showGestureFeedback(null, false);
      }
    }
  };

  // نهاية اللمس: نحدد كانت إيه (سحب/ضغط مطول/دبل تاب/تاب عادي) وننفذ اللي يناسبها
  const handleVideoPointerUp = (meme: Meme) => (e: React.PointerEvent<HTMLVideoElement>) => {
    const video = videoRefs.current[meme.id];
    const state = tapStatesRef.current.get(meme.id);
    if (!video || !state) return;
    if (state.longPressTimer) clearTimeout(state.longPressTimer);

    if (state.isDragging) return; // كان سكرول، تجاهل تماماً

    if (state.isLongPress) {
      video.playbackRate = 1;
      state.isLongPress = false;
      showGestureFeedback(null, false);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const side: "left" | "right" = (e.clientX - rect.left) < rect.width / 2 ? "left" : "right";
    const now = Date.now();
    const isDoubleTap = now - state.lastTapTime < DOUBLE_TAP_MS && state.lastTapSide === side;

    if (isDoubleTap) {
      if (state.singleTapTimer) clearTimeout(state.singleTapTimer);
      state.lastTapTime = 0;
      state.lastTapSide = null;
      const dur = video.duration || 0;
      const delta = side === "right" ? SEEK_SECONDS : -SEEK_SECONDS;
      video.currentTime = Math.min(Math.max(0, video.currentTime + delta), dur || video.currentTime + delta);
      if (dur) setProgress((video.currentTime / dur) * 100);
      showGestureFeedback({ id: meme.id, type: side === "right" ? "forward" : "back" }, true);
    } else {
      state.lastTapTime = now;
      state.lastTapSide = side;
      state.singleTapTimer = setTimeout(() => {
        video.paused ? video.play().catch(() => {}) : video.pause();
      }, DOUBLE_TAP_MS);
    }
  };

  // شريط التقدم: تحديث النسبة أثناء اللعب، إلا لو المستخدم بيسحب دلوقتي
  const handleTimeUpdate = (meme: Meme) => (e: React.SyntheticEvent<HTMLVideoElement>) => {
    if (meme.id !== activeId || isSeekingRef.current) return;
    const v = e.currentTarget;
    if (v.duration) setProgress((v.currentTime / v.duration) * 100);
  };

  const seekFromPointer = (meme: Meme, e: React.PointerEvent<HTMLDivElement>) => {
    const video = videoRefs.current[meme.id];
    if (!video || !video.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    setProgress(percent * 100);
    video.currentTime = percent * video.duration;
  };

  const handleBarPointerDown = (meme: Meme) => (e: React.PointerEvent<HTMLDivElement>) => {
    isSeekingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    seekFromPointer(meme, e);
  };
  const handleBarPointerMove = (meme: Meme) => (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isSeekingRef.current) return;
    seekFromPointer(meme, e);
  };
  const handleBarPointerUp = () => { isSeekingRef.current = false; };

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
      const now = Date.now();
      const lastSharedAt = lastShareAtRef.current.get(meme.id) || 0;
      if (now - lastSharedAt < SHARE_COOLDOWN_MS) return; // نفس فترة التهدئة في App.tsx، مش هتتحسب مشاركة جديدة أصلاً
      lastShareAtRef.current.set(meme.id, now);

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
      {reels.map((meme, index) => {
        // استراتيجية تحميل ذكية زي تيك توك: الفيديو الشغال دلوقتي واللي بعده
        // مباشرة بيتحمّلوا كاملين مقدماً (auto) عشان يشتغلوا فوراً أول ما توصلهم
        // بالسكرول من غير أي تأخير، والفيديو اللي فات بيفضل خفيف (metadata بس)،
        // والباقي البعيد مش بيتحمّل خالص لحد ما يقرب - كده مش بنستهلك نت/رام
        // في فيديوهات المستخدم لسه بعيد عنها
        const activeIndex = reels.findIndex(r => r.id === activeId);
        const distance = activeIndex === -1 ? index : index - activeIndex;
        const preload: "auto" | "metadata" | "none" =
          distance === 0 || distance === 1 ? "auto" : distance === -1 ? "metadata" : "none";

        return (
        <div key={meme.id} className="relative w-full h-full snap-start snap-always flex items-center justify-center bg-black">
          <video
            ref={(el) => { videoRefs.current[meme.id] = el; }}
            src={meme.video_url || ""}
            poster={FALLBACK_POSTER}
            preload={preload}
            loop
            playsInline
            muted={isMuted}
            className="w-full h-full object-contain"
            onTimeUpdate={(e) => { handleTimeUpdate(meme)(e); handleWatchProgress(meme)(e); }}
            onPointerDown={handleVideoPointerDown(meme)}
            onPointerMove={handleVideoPointerMove(meme)}
            onPointerUp={handleVideoPointerUp(meme)}
            onPointerCancel={handleVideoPointerUp(meme)}
          />

          {/* تنبيه بصري: تقديم/ترجيع 10 ثواني أو سرعة 2x */}
          {gestureFeedback?.id === meme.id && (
            <div
              className={`absolute inset-y-0 z-20 flex items-center pointer-events-none ${
                gestureFeedback.type === "back" ? "left-6" : gestureFeedback.type === "forward" ? "right-6" : "inset-x-0 justify-center"
              }`}
            >
              {gestureFeedback.type === "speed" ? (
                <span className="bg-black/60 text-white font-bold text-base px-4 py-2 rounded-full">2x</span>
              ) : (
                <span className="bg-black/60 text-white p-3 rounded-full flex flex-col items-center gap-1">
                  {gestureFeedback.type === "forward" ? <FastForward className="w-6 h-6" /> : <Rewind className="w-6 h-6" />}
                  <span className="text-[10px] font-bold">10 ثواني</span>
                </span>
              )}
            </div>
          )}

          {/* زرار كتم/تشغيل الصوت زي التيك توك والريلز */}
          <button
            onClick={(e) => { e.stopPropagation(); setIsMuted(prev => !prev); }}
            className="absolute top-3 left-3 z-10 bg-black/40 text-white p-2 rounded-full"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* معلومات صاحب المنشور والنص */}
          <div className="absolute bottom-10 right-4 left-20 text-white z-10">
            <button
              onClick={() => onUserProfileClick(meme.user_id)}
              className="flex items-center gap-2 mb-2"
            >
              <img loading="lazy" decoding="async" src={meme.profiles?.avatar_url || ""} className="w-9 h-9 rounded-full border-2 border-white object-cover" alt="" />
              <span className="font-bold text-sm">{meme.profiles?.username || "مستخدم"}</span>
            </button>
            {meme.caption && (
              <p className="text-sm leading-relaxed line-clamp-2">{meme.caption}</p>
            )}
          </div>

          {/* أزرار التفاعل الجانبية */}
          <div className="absolute bottom-10 left-3 flex flex-col items-center gap-5 text-white z-10">
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

          {/* شريط تقدم قابل للسحب - بيتقدم/يترجع بيه، زي تيك توك */}
          <div
            className="absolute bottom-0 inset-x-0 z-20 pt-3 pb-1.5 px-3 touch-none"
            onPointerDown={handleBarPointerDown(meme)}
            onPointerMove={handleBarPointerMove(meme)}
            onPointerUp={handleBarPointerUp}
            onPointerCancel={handleBarPointerUp}
          >
            <div className="h-1 bg-white/25 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full"
                style={{ width: `${meme.id === activeId ? progress : 0}%` }}
              />
            </div>
          </div>
        </div>
        );
      })}
    </div>
  );
}

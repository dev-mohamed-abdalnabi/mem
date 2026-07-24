import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import { dataService } from "../services/dataService";

// بنتتبع آخر فيديو شغال في كل الصفحة (مش بس جوه الكومبوننت ده) عشان لو
// المستخدم شغّل فيديو تاني (سواء بالسكرول أو أي حتة تانية)، الفيديو القديم
// يتوقف تلقائي - قبل كده كل CustomVideoPlayer كان عنده حالة تشغيل منفصلة
// عن باقي الفيديوهات، فيقدر أكتر من فيديو يشتغلوا مع بعض في نفس الوقت.
let currentlyPlayingVideo: HTMLVideoElement | null = null;

// المدة اللي شريط التقدم/الكونترولز بتفضل ظاهرة بيها قبل ما تختفي لوحدها
const CONTROLS_AUTO_HIDE_MS = 2500;

// بوستر افتراضي بسيط (SVG صغير) بنستخدمه لما محدش بعت poster فعلي، عشان
// المتصفح ميرسمش شكله الافتراضي (أيقونة تشغيل جوه بيضاوي رمادي) قبل ما
// الفيديو يوصل - وده اللي كان بيبان زي "قالب المتصفح الافتراضي".
const FALLBACK_POSTER =
  "data:image/svg+xml;base64," +
  btoa('<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><rect width="4" height="4" fill="#0b0b0f"/></svg>');

interface CustomVideoPlayerProps {
  src: string;
  poster?: string;
  autoPlay?: boolean;
  className?: string;
  // اختياري: id البوست/الميم بتاع الفيديو ده - لو اتبعت، بيتسجل watch-time
  memeId?: string;
  // نسبة العرض للارتفاع الحقيقية للفيديو لو متوفرة (meme.width / meme.height)
  // - بنستخدمها عشان نحجز المساحة الصح من أول رندر، فمنعتمدش بس على
  // max-height اللي كانت بتخلي الفيديو يتقص/يتاكل نصه على الشاشات الكبيرة
  // لحد ما الـmetadata توصل وتحدد الحجم الحقيقي.
  aspectRatio?: number;
  // لو المكون ده جوه فيد بيسكرول (feed)، بنأجل تحميل الفيديو الفعلي (src)
  // لحد ما يقرب من الشاشة عشان منحملش عشرات الفيديوهات مرة واحدة - وده اللي
  // كان بيخلي أي فيديو واحد ياخد وقت طويل يحمّل.
  lazy?: boolean;
}

export default function CustomVideoPlayer({
  src,
  poster,
  autoPlay = true,
  className = "",
  memeId,
  aspectRatio,
  lazy = true,
}: CustomVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [computedAspect, setComputedAspect] = useState<number | undefined>(aspectRatio);
  const [shouldLoad, setShouldLoad] = useState(!lazy);
  // بنحاول نشغّل بالصوت على طول (زي صفحة الريلز بالظبط) - ومنبدأش مكتوم
  // كقيمة افتراضية. لو المتصفح رفض الأوتوبلاي بالصوت (سياسة متصفحات
  // الموبايل بالذات بترفض غالباً من غير تفاعل قبلها من المستخدم)، ساعتها
  // بس بنكتم تلقائياً كحل بديل عشان الفيديو على الأقل يشتغل، والمستخدم
  // يقدر يفعّل الصوت بضغطة واحدة على زرار الكتم.
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  // شريط التقدم/الوقت مش هيفضل ظاهر على طول عشان مياكلش من مساحة عرض
  // الفيديو - بيظهر لمدة قصيرة بس (أول ما الفيديو يبدأ، أو لما تدوس عليه)
  // وبعدين يختفي لوحده تلقائياً.
  const [showControls, setShowControls] = useState(true);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  // بنستخدمها عشان نمنع onTimeUpdate إنه يكتب فوق موضع السحب وإحنا لسه
  // ماسكين شريط التقدم (نفس الفكرة المستخدمة في صفحة الريلز)
  const isSeekingRef = useRef(false);

  const scheduleHideControls = () => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, CONTROLS_AUTO_HIDE_MS);
  };

  const revealControls = () => {
    setShowControls(true);
    scheduleHideControls();
  };

  // --- تسجيل watch-time (راجع RANKING_ALGORITHMS.md) ---
  // نفس منطق ReelsPage: بنتابع أطول نقطة وصلها المستخدم فعلياً، وبنعتبر
  // لفة الفيديو من الأول (loop) rewatch وبنبعت القراءة فوراً. بنبعت آخر
  // قراءة كمان لما الفيديو يتوقف أو الكومبوننت يتفكك (المستخدم سكرول بعيد
  // عن البوست ده مثلاً).
  const watchStatsRef = useRef({ maxWatched: 0, duration: 0, rewatch: false, lastTime: 0 });
  const flushWatch = () => {
    const s = watchStatsRef.current;
    if (!memeId || s.duration <= 0 || s.maxWatched <= 0) return;
    dataService.logReelWatch(memeId, s.maxWatched, s.duration, s.rewatch).catch(() => {});
    watchStatsRef.current = { ...s, maxWatched: 0 };
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !memeId) return;

    const onTimeUpdate = () => {
      if (!video.duration || !isFinite(video.duration)) return;
      const prev = watchStatsRef.current;
      const looped = prev.lastTime > video.duration * 0.8 && video.currentTime < video.duration * 0.15;
      if (looped) {
        flushWatch();
        watchStatsRef.current = { maxWatched: video.currentTime, duration: video.duration, rewatch: true, lastTime: video.currentTime };
      } else {
        watchStatsRef.current = {
          maxWatched: Math.max(prev.maxWatched, video.currentTime),
          duration: video.duration,
          rewatch: prev.rewatch,
          lastTime: video.currentTime,
        };
      }
    };
    video.addEventListener("timeupdate", onTimeUpdate);
    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      flushWatch();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memeId, src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => {
      setIsPlaying(true);
      revealControls();
      // أي فيديو تاني كان شغال (في بوست تاني) لازم يتوقف دلوقتي
      if (currentlyPlayingVideo && currentlyPlayingVideo !== video) {
        currentlyPlayingVideo.pause();
      }
      currentlyPlayingVideo = video;
    };
    const handlePause = () => {
      setIsPlaying(false);
      // لو الفيديو واقف بنسيب الكونترولز ظاهرة (مفيش داعي تختفي وهو مش شغال)
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      setShowControls(true);
      if (currentlyPlayingVideo === video) {
        currentlyPlayingVideo = null;
      }
      flushWatch();
    };
    const handleTimeUpdate = () => { if (!isSeekingRef.current) setCurrentTime(video.currentTime); };
    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      // لو مفيش aspectRatio جاهزة متبعتة من برة (meme.width/height)، بنحسبها
      // من أبعاد الفيديو الحقيقية نفسها - ده اللي بيمنع "أكل" نص الفيديو
      // على الشاشات الكبيرة، لأن الحاوية بقت بتحجز المساحة الصح من الأول.
      if (!aspectRatio && video.videoWidth && video.videoHeight) {
        setComputedAspect(video.videoWidth / video.videoHeight);
      }
    };
    // أول فريم فعلي وصل (مش بس الـmetadata) - هنا بس بنشيل السكيلتون، عشان
    // ميختفيش السكيلتون ويسيب فراغ أسود لحد ما فيه صورة فعلية تتعرض.
    const handleLoadedData = () => setIsLoading(false);
    const handleLoadStart = () => setIsLoading(true);

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("loadeddata", handleLoadedData);
    video.addEventListener("loadstart", handleLoadStart);

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("loadeddata", handleLoadedData);
      video.removeEventListener("loadstart", handleLoadStart);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      if (currentlyPlayingVideo === video) {
        currentlyPlayingVideo = null;
      }
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      // ده المكان الوحيد اللي بينده فيه على video.play() فعلياً. بنكتم
      // ونعيد المحاولة بس لو الرفض فعلاً بسبب سياسة الأوتوبلاي
      // (NotAllowedError) - مش أي رفض تاني. المشكلة كانت إن أي فيديو تاني
      // في الفيد يشتغل بيوقف الفيديو الحالي (عن طريق currentlyPlayingVideo)،
      // وده بيرفض الـ promise بتاع play() بنوع خطأ مختلف (AbortError) مش
      // له علاقة بسياسة المتصفح خالص - وكان الكود بيتعامل مع أي رفض على إنه
      // "المتصفح رفض الصوت" ويكتم الفيديو غلط. أول فيديو أو اتنين في الفيد
      // بيتصادموا مع بعض كده غالباً لأنهم بيدخلوا نص الشاشة في نفس الوقت
      // تقريباً وقت أول تحميل للصفحة.
      video.play().catch((err) => {
        if (err?.name === "NotAllowedError") {
          video.muted = true;
          setIsMuted(true);
          video.play().catch(e2 => console.error("Play error:", e2));
        } else {
          console.error("Play error:", err);
        }
      });
    } else {
      video.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    if (videoRef.current) {
      // لازم نضبط خاصية muted نفسها مش بس الصوت، لأن سياسة الأوتوبلاي في
      // المتصفحات بتشترط muted=true فعلياً عشان تسمح بالتشغيل التلقائي.
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // تحميل كسول (lazy): مبنحطش src على الـ<video> إلا لما الحاوية تقرب من
  // الشاشة (rootMargin بيخلي التحميل يبدأ شوية قبل ما يبان فعلياً، عشان
  // ميحسّش المستخدم بأي تأخير وقت الوصول للفيديو). ده اللي بيمنع الموقع من
  // إنه يحمّل عشرات فيديوهات الفيد كلها مرة واحدة عند فتح الصفحة.
  //
  // فرق مهم عن قبل: ده بقى مراقب مستمر (مش بيقفل نفسه أول ما يشتغل مرة).
  // قبل كده أي فيديو يقرب من الشاشة مرة، بيفضل src متحط عليه ومحمّل
  // (preload="auto") للأبد حتى لو المستخدم سكرول بعيد عنه خالص - وده كان
  // بيخلي عشرات الفيديوهات القديمة تفضل بتاخد من نفس اتصالات النت
  // المحدودة في الخلفية، فأي فيديو جديد قدام المستخدم ياخد وقت طويل عشان
  // بيتزاحم معاهم. دلوقتي لو الفيديو بعد عن الشاشة كتير (وملوش تشغيل)،
  // بنشيل الـsrc عنه تاني عشان يسيب الاتصال لغيره، ولو المستخدم رجعله
  // تاني بيتحمّل من جديد وقتها بس.
  useEffect(() => {
    if (!lazy) return;
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const isNear = entries[0].isIntersecting;
        // منسبش فيديو شغال فعلاً يتقفل حتى لو حصل نطاق غريب - فيديو شغال
        // بالتعريف قريب جداً من الشاشة أصلاً (نص شاشة على الأقل)
        if (!isNear && isPlaying) return;
        setShouldLoad(isNear);
      },
      { rootMargin: "600px 0px" }
    );
    observer.observe(container);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lazy, isPlaying]);

  // زي فيسبوك/إنستجرام بالظبط: الفيديو بيشتغل لوحده أول ما يدخل نص
  // الشاشة، ويقف تلقائي لو خرج برة - من غير ما المستخدم يحتاج يدوس زرار
  // تشغيل يدوي.
  useEffect(() => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video || !autoPlay || !shouldLoad) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        // بنكتفي بتحديث الـ state بس هنا. اللي بيشغل/يوقف الفيديو فعلياً
        // (video.play()/pause()) هو الـ effect التاني اللي بيتابع isPlaying -
        // ده عشان يبقى في مصدر واحد بس بيتحكم في الفيديو فعلياً، فمايحصلش
        // تصادم بين الـ observer والـ effect زي ما كان بيحصل قبل كده.
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          setIsPlaying(true);
        } else {
          setIsPlaying(false);
        }
      },
      { threshold: [0, 0.5, 1] }
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, [autoPlay, shouldLoad]);

  const formatTime = (time: number) => {
    if (!isFinite(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className={`relative bg-black rounded-lg overflow-hidden w-full ${className}`}
      // بنحجز المساحة الصح من أول رندر بناءً على النسبة الحقيقية (لو
      // معروفة) بدل ما نسيب الحاوية تعتمد بس على max-height، وده اللي كان
      // بيخلي الفيديو "ياكل" جزء منه على الشاشات الكبيرة قبل ما الـmetadata
      // توصل. لو النسبة لسه مش معروفة، بنفترض شكل عمودي معقول (4:5) كبداية.
      style={{ aspectRatio: computedAspect || 4 / 5 }}
      onTouchStart={revealControls}
      onMouseMove={revealControls}
    >
      {/* Video Element - مبنحطش src إلا لما الحاوية تقرب فعلياً من الشاشة
          (شوف الـ IntersectionObserver فوق) عشان منحملش كل فيديوهات الفيد
          مرة واحدة. مبيتشالش الـ<video> نفسه من الشجرة عشان نفضل نقدر
          نراقب دخوله/خروجه من الشاشة. */}
      <video
        ref={videoRef}
        src={shouldLoad ? src : undefined}
        poster={poster || FALLBACK_POSTER}
        preload={shouldLoad ? "auto" : "none"}
        className="w-full h-full object-contain"
        onClick={() => {
          setIsPlaying(!isPlaying);
          revealControls();
        }}
        playsInline
        muted={isMuted}
        loop
      />

      {/* سكيلتون التحميل - بيفضل ظاهر لحد ما أول فريم فعلي من الفيديو يوصل،
          بنفس ستايل باقي السكيلتونز في الموقع (shimmer) بدل ما نسيب شكل
          المتصفح الافتراضي (بيضاوي رمادي) يبان أثناء التحميل. */}
      {(isLoading || !shouldLoad) && (
        <div className="absolute inset-0 bg-gray-800 dark:bg-gray-900 overflow-hidden">
          <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-gray-700/40 via-gray-800/10 to-gray-700/40" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 border-[3px] border-white/15 border-t-white/70 rounded-full animate-spin" />
          </div>
        </div>
      )}

      {/* Play Button Overlay */}
      {!isPlaying && !isLoading && shouldLoad && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/40 transition-colors cursor-pointer"
          onClick={() => {
            setIsPlaying(true);
            revealControls();
          }}
        >
          <div className="w-16 h-16 bg-white/80 rounded-full flex items-center justify-center hover:bg-white transition-colors">
            <Play className="w-8 h-8 text-black fill-black ml-1" />
          </div>
        </div>
      )}

      {/* الكونترولز (شريط التقدم + الوقت + الكتم) - بتظهر لمدة ثانيتين وبعدين
          تختفي لوحدها تلقائياً عشان متغطيش على الفيديو باستمرار */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 sm:p-3 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Progress Bar - بيدعم السحب (مش دوسة واحدة بس) عشان يبقى دقيق، وبنفس
            لون شريط تقدم الحالات بالظبط (أبيض صريح inline، مش كلاس bg-white -
            عندنا قاعدة CSS عامة بتحول أي bg-white للون الكارت في الوضع الداكن) */}
        <div
          className="mb-2 -my-2 py-2 touch-none cursor-pointer"
          onPointerDown={(e) => {
            e.stopPropagation();
            isSeekingRef.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            const rect = e.currentTarget.getBoundingClientRect();
            const percent = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
            setCurrentTime(percent * duration);
            if (videoRef.current) videoRef.current.currentTime = percent * duration;
            revealControls();
          }}
          onPointerMove={(e) => {
            if (!isSeekingRef.current) return;
            e.stopPropagation();
            const rect = e.currentTarget.getBoundingClientRect();
            const percent = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
            setCurrentTime(percent * duration);
            if (videoRef.current) videoRef.current.currentTime = percent * duration;
          }}
          onPointerUp={(e) => { e.stopPropagation(); isSeekingRef.current = false; }}
          onPointerCancel={(e) => { e.stopPropagation(); isSeekingRef.current = false; }}
        >
          <div className="h-[3px] rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.35)" }}>
            <div className="h-full rounded-full" style={{ width: `${progressPercent}%`, backgroundColor: "#ffffff" }} />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsPlaying(!isPlaying);
            }}
            className="text-white p-1 flex-shrink-0"
            title={isPlaying ? "إيقاف مؤقت" : "تشغيل"}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
          </button>

          <span className="text-white text-xs flex-shrink-0">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMuted(prev => !prev);
            }}
            className="text-white p-1 flex-shrink-0 mr-auto"
            title={isMuted ? "تفعيل الصوت" : "كتم الصوت"}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

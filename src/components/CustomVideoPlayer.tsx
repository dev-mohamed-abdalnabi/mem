import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";

// بنتتبع آخر فيديو شغال في كل الصفحة (مش بس جوه الكومبوننت ده) عشان لو
// المستخدم شغّل فيديو تاني (سواء بالسكرول أو أي حتة تانية)، الفيديو القديم
// يتوقف تلقائي - قبل كده كل CustomVideoPlayer كان عنده حالة تشغيل منفصلة
// عن باقي الفيديوهات، فيقدر أكتر من فيديو يشتغلوا مع بعض في نفس الوقت.
let currentlyPlayingVideo: HTMLVideoElement | null = null;

// المدة اللي شريط التقدم/الكونترولز بتفضل ظاهرة بيها قبل ما تختفي لوحدها
const CONTROLS_AUTO_HIDE_MS = 2500;

interface CustomVideoPlayerProps {
  src: string;
  poster?: string;
  autoPlay?: boolean;
  className?: string;
}

export default function CustomVideoPlayer({
  src,
  poster,
  autoPlay = true,
  className = ""
}: CustomVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
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
    };
    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoading(false);
    };
    const handleLoadStart = () => setIsLoading(true);

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("loadstart", handleLoadStart);

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
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
      // ده المكان الوحيد اللي بينده فيه على video.play() فعلياً. لو المتصفح
      // رفض التشغيل بالصوت (سياسة الأوتوبلاي)، بنكتم ونحاول تاني.
      video.play().catch(() => {
        video.muted = true;
        setIsMuted(true);
        video.play().catch(err => console.error("Play error:", err));
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

  // زي فيسبوك/إنستجرام بالظبط: الفيديو بيشتغل لوحده أول ما يدخل نص
  // الشاشة، ويقف تلقائي لو خرج برة - من غير ما المستخدم يحتاج يدوس زرار
  // تشغيل يدوي.
  useEffect(() => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video || !autoPlay) return;

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
  }, [autoPlay]);

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
      onTouchStart={revealControls}
      onMouseMove={revealControls}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="w-full h-full object-contain"
        onClick={() => {
          setIsPlaying(!isPlaying);
          revealControls();
        }}
        playsInline
        muted={isMuted}
        loop
      />

      {/* Loading Spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Play Button Overlay */}
      {!isPlaying && !isLoading && (
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
        {/* Progress Bar */}
        <div
          className="mb-2 h-1 bg-white/20 rounded-full overflow-hidden cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            const rect = e.currentTarget.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            if (videoRef.current) {
              videoRef.current.currentTime = percent * duration;
            }
            revealControls();
          }}
        >
          <div className="h-full bg-red-500" style={{ width: `${progressPercent}%` }} />
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

import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";

// بنتتبع آخر فيديو شغال في كل الصفحة (مش بس جوه الكومبوننت ده) عشان لو
// المستخدم شغّل فيديو تاني (سواء بالسكرول أو أي حتة تانية)، الفيديو القديم
// يتوقف تلقائي - قبل كده كل CustomVideoPlayer كان عنده حالة تشغيل منفصلة
// عن باقي الفيديوهات، فيقدر أكتر من فيديو يشتغلوا مع بعض في نفس الوقت.
let currentlyPlayingVideo: HTMLVideoElement | null = null;

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
  const [volume, setVolume] = useState(1);
  // الفيديو في الفيد كان محتاج ضغطة تشغيل يدوية أول ما يظهر، وده مش سلوك
  // طبيعي (فيسبوك/إنستجرام بيشغلوا الفيديو أوتوماتيك أول ما يدخل الشاشة).
  // المتصفحات بترفض الأوتوبلاي بالصوت، فبنبدأ مكتوم زي كل منصات الفيديو
  // القصير، والمستخدم يقدر يفعّل الصوت بضغطة واحدة على زرار الكتم.
  const [isMuted, setIsMuted] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [buffered, setBuffered] = useState(0);
  
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();
  const hideTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => {
      setIsPlaying(true);
      // أي فيديو تاني كان شغال (في بوست تاني) لازم يتوقف دلوقتي
      if (currentlyPlayingVideo && currentlyPlayingVideo !== video) {
        currentlyPlayingVideo.pause();
      }
      currentlyPlayingVideo = video;
    };
    const handlePause = () => {
      setIsPlaying(false);
      if (currentlyPlayingVideo === video) {
        currentlyPlayingVideo = null;
      }
    };
    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoading(false);
    };
    const handleProgress = () => {
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1));
      }
    };
    const handleLoadStart = () => setIsLoading(true);

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("progress", handleProgress);
    video.addEventListener("loadstart", handleLoadStart);

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("progress", handleProgress);
      video.removeEventListener("loadstart", handleLoadStart);
      if (currentlyPlayingVideo === video) {
        currentlyPlayingVideo = null;
      }
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    if (isPlaying) {
      video.play().catch(err => console.error("Play error:", err));
    } else {
      video.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    if (videoRef.current) {
      // لازم نضبط خاصية muted نفسها مش بس الصوت = 0، لأن سياسة الأوتوبلاي في
      // المتصفحات بتشترط muted=true فعلياً عشان تسمح بالتشغيل التلقائي.
      videoRef.current.muted = isMuted;
      videoRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // زي فيسبوك/إنستجرام بالظبط: الفيديو بيشتغل لوحده (مكتوم) أول ما يدخل
  // نص الشاشة، ويقف تلقائي لو خرج برة - من غير ما المستخدم يحتاج يدوس
  // زرار تشغيل يدوي. بنحاول نشغّل بالصوت الأساسي لو autoPlay=false
  // (يعني المستخدم مش عايز كتم افتراضي)، ولو المتصفح رفض (سياسة الأوتوبلاي)
  // بنكتم تلقائياً كحل بديل - بالظبط زي صفحة الريلز.
  useEffect(() => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video || !autoPlay) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          if (video.paused) {
            video.play().catch(() => {
              video.muted = true;
              setIsMuted(true);
              video.play().catch(() => {});
            });
          }
        } else if (!video.paused) {
          video.pause();
        }
      },
      { threshold: [0, 0.5, 1] }
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, [autoPlay]);

  const handleInteraction = () => {
    setShowControls(true);
    
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    
    if (isPlaying) {
      hideTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 4000);
    }
  };

  const formatTime = (time: number) => {
    if (!isFinite(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = duration ? (buffered / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className={`relative bg-black rounded-lg overflow-hidden group w-full ${className}`}
      onTouchStart={handleInteraction}
      onMouseMove={handleInteraction}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="w-full h-full object-contain"
        onClick={() => setIsPlaying(!isPlaying)}
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
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/40 transition-colors cursor-pointer"
          onClick={() => setIsPlaying(true)}
        >
          <div className="w-16 h-16 bg-white/80 rounded-full flex items-center justify-center hover:bg-white transition-colors">
            <Play className="w-8 h-8 text-black fill-black ml-1" />
          </div>
        </div>
      )}

      {/* Controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3 sm:p-4 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Progress Bar */}
        <div className="mb-3 flex items-center gap-2">
          <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden cursor-pointer group/progress"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const percent = (e.clientX - rect.left) / rect.width;
              if (videoRef.current) {
                videoRef.current.currentTime = percent * duration;
              }
            }}
            onTouchEnd={(e) => {
              const touch = e.changedTouches[0];
              const rect = e.currentTarget.getBoundingClientRect();
              const percent = (touch.clientX - rect.left) / rect.width;
              if (videoRef.current) {
                videoRef.current.currentTime = Math.max(0, Math.min(duration, percent * duration));
              }
            }}
          >
            {/* Buffered Progress */}
            <div
              className="h-full bg-white/40"
              style={{ width: `${bufferedPercent}%` }}
            />
            {/* Current Progress */}
            <div
              className="h-full bg-red-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1">
            {/* Play/Pause */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="text-white hover:text-red-500 transition-colors p-1 flex-shrink-0"
              title={isPlaying ? "إيقاف مؤقت" : "تشغيل"}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current" />
              )}
            </button>

            {/* Volume Control */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="text-white hover:text-red-500 transition-colors p-1 flex-shrink-0"
                title={isMuted ? "تفعيل الصوت" : "كتم الصوت"}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setVolume(val);
                  if (val > 0) setIsMuted(false);
                }}
                className="w-12 h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-red-500 hidden sm:block"
                title="مستوى الصوت"
              />
            </div>

            {/* Time Display */}
            <div className="text-white text-xs sm:text-sm ml-auto flex-shrink-0">
              <span>{formatTime(currentTime)}</span>
              <span className="text-white/50"> / </span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

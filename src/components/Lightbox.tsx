import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, Download, Heart, MessageCircle, Share2, Bookmark, Link as LinkIcon } from "lucide-react";
import { Meme } from "../types";

interface LightboxProps {
  mediaUrl: string | null;
  mediaType?: 'image' | 'video';
  // البوست اللي بتاعه الصورة/الفيديو ده (لو موجود، زي صور المنشورات) - من
  // غيره أزرار الإعجاب/الحفظ/التعليق/المشاركة معندهاش أي حاجة تشتغل عليها
  // (زي حالة فتح صورة بروفايل مثلاً، مالهاش بوست مرتبط بيها).
  meme?: Meme | null;
  onClose: () => void;
  onLikeToggle?: (memeId: string) => void;
  onSaveToggle?: (memeId: string) => void;
  onShareCompleted?: (memeId: string) => void;
  onOpenComments?: (meme: Meme) => void;
}

// أقصى تكبير مسموح بيه بالقرصة (pinch-to-zoom)
const MAX_ZOOM = 4;
// أقل مسافة سحب لتحت (بالبكسل) عشان تتحسب "سحب" مش لمسة عادية
const DRAG_THRESHOLD_PX = 10;
// لو السحب عدى المسافة دي، بيتقفل العارض حتى لو كان بطيء
const CLOSE_DRAG_DISTANCE_PX = 130;
// لو سرعة السحب (بكسل/مللي ثانية) عدت الرقم ده وقت رفع الإصبع، بيتقفل
// العارض حتى لو مسافة السحب نفسها كانت لسه قصيرة - ده اللي بيدّي إحساس
// "السحب السريع بيقفل" زي فيسبوك بالظبط
const CLOSE_DRAG_VELOCITY = 0.55;

function getTouchDistance(touches: React.TouchList | TouchList): number {
  const a = touches[0];
  const b = touches[1];
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

export default function Lightbox({ mediaUrl, mediaType = 'image', meme, onClose, onLikeToggle, onSaveToggle, onShareCompleted, onOpenComments }: LightboxProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // حالة محلية للتفاعلات (إعجاب/حفظ) - بتتحدث فوراً لما المستخدم يدوس
  // (optimistic update) عشان الزرار محسش إنه متأخر، وبتتزامن مع بيانات
  // البوست الحقيقية أول ما اللايت بوكس يتفتح أو تتغير الصورة المعروضة.
  const [liked, setLiked] = useState(!!meme?.liked_by_me);
  const [likesCount, setLikesCount] = useState(meme?.likes_count ?? 0);
  const [saved, setSaved] = useState(!!meme?.saved_by_me);

  useEffect(() => {
    setLiked(!!meme?.liked_by_me);
    setLikesCount(meme?.likes_count ?? 0);
    setSaved(!!meme?.saved_by_me);
  }, [meme?.id, meme?.liked_by_me, meme?.likes_count, meme?.saved_by_me]);

  // --- تكبير بالقرصة (Pinch to zoom) وسحب لما تكون الصورة مكبرة ---
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const pinchRef = useRef<{ startDist: number; startScale: number } | null>(null);
  const panRef = useRef<{ startX: number; startY: number; startTX: number; startTY: number } | null>(null);

  // --- سحب لتحت لقفل العارض (زي فيسبوك) - بس لما الصورة مش مكبرة ---
  const [dragY, setDragY] = useState(0);
  const dragRef = useRef<{ startX: number; startY: number; startTime: number; dragging: boolean } | null>(null);
  const [isGesturing, setIsGesturing] = useState(false);

  const resetZoom = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    resetZoom();
    setDragY(0);
  }, [mediaUrl, resetZoom]);

  useEffect(() => {
    if (!mediaUrl) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    // Prevent scrolling when lightbox is open
    document.body.style.overflow = 'hidden';

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [onClose, mediaUrl]);

  if (!mediaUrl) return null;

  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      // خاصية download بتتجاهل تماماً لو الرابط من دومين مختلف (زي روابط
      // تخزين Supabase) - المتصفح بيتعامل معاها كأنها رابط عادي وبيفتحها
      // في تاب بدل ما ينزلها. الحل إننا نجيب الملف فعلياً كـ blob ونعمل
      // رابط تنزيل محلي منه (نفس الدومين)، وساعتها خاصية download بتشتغل صح.
      const response = await fetch(mediaUrl);
      if (!response.ok) throw new Error("Failed to fetch media");
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const extension = mediaType === 'video' ? 'mp4' : (blob.type.split('/')[1] || 'jpg');

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `media-${Date.now()}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Download error:", err);
      // لو الفتش فشل لأي سبب (مثلاً مشكلة CORS)، على الأقل نفتح الملف في
      // تاب جديد عشان المستخدم يقدر يحفظه يدوي بدل ما محصلش حاجة خالص
      window.open(mediaUrl, "_blank");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleLikeClick = () => {
    if (!meme) return;
    // تحديث فوري للواجهة (نفس فكرة باقي التطبيق) بدل ما نستنى رد السيرفر
    setLiked(v => !v);
    setLikesCount(c => Math.max(0, c + (liked ? -1 : 1)));
    onLikeToggle?.(meme.id);
  };

  const handleSaveClick = () => {
    if (!meme) return;
    setSaved(v => !v);
    onSaveToggle?.(meme.id);
  };

  const handleCommentClick = () => {
    if (!meme || !onOpenComments) return;
    onOpenComments(meme);
  };

  const handleShareClick = () => {
    if (!meme) return;
    onShareCompleted?.(meme.id);
    const shareLink = `${window.location.origin}/?meme=${meme.id}`;
    navigator.clipboard.writeText(shareLink).then(() => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 3000);
    }).catch(() => { /* تجاهل صامت لو الحافظة مش متاحة */ });
  };

  // --- معالجات اللمس: تكبير بإصبعين، سحب للتنقل جوه الصورة المكبرة، سحب لتحت للقفل ---
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      pinchRef.current = { startDist: getTouchDistance(e.touches), startScale: scale };
      dragRef.current = null;
      setIsGesturing(true);
    } else if (e.touches.length === 1) {
      if (scale > 1.01) {
        panRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, startTX: translate.x, startTY: translate.y };
      } else {
        dragRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, startTime: Date.now(), dragging: false };
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      const dist = getTouchDistance(e.touches);
      const nextScale = Math.min(MAX_ZOOM, Math.max(1, pinchRef.current.startScale * (dist / pinchRef.current.startDist)));
      setScale(nextScale);
      return;
    }
    if (e.touches.length === 1 && panRef.current) {
      const dx = e.touches[0].clientX - panRef.current.startX;
      const dy = e.touches[0].clientY - panRef.current.startY;
      setTranslate({ x: panRef.current.startTX + dx, y: panRef.current.startTY + dy });
      return;
    }
    if (e.touches.length === 1 && dragRef.current) {
      const deltaX = e.touches[0].clientX - dragRef.current.startX;
      const deltaY = e.touches[0].clientY - dragRef.current.startY;
      if (!dragRef.current.dragging && deltaY > DRAG_THRESHOLD_PX && deltaY > Math.abs(deltaX)) {
        dragRef.current.dragging = true;
        setIsGesturing(true);
      }
      if (dragRef.current.dragging) {
        setDragY(Math.max(0, deltaY));
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length >= 2) return;

    if (pinchRef.current && e.touches.length < 2) {
      pinchRef.current = null;
      if (scale < 1.02) resetZoom();
    }

    if (panRef.current && e.touches.length === 0) {
      panRef.current = null;
    }

    if (dragRef.current && e.touches.length === 0) {
      const state = dragRef.current;
      if (state.dragging) {
        const elapsed = Math.max(1, Date.now() - state.startTime);
        const velocity = dragY / elapsed;
        if (dragY > CLOSE_DRAG_DISTANCE_PX || velocity > CLOSE_DRAG_VELOCITY) {
          onClose();
          return;
        }
        setDragY(0);
      }
      dragRef.current = null;
    }
    setIsGesturing(false);
  };

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center p-0 select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      style={{
        opacity: dragY ? Math.max(1 - dragY / 400, 0.3) : 1,
        transition: dragRef.current?.dragging ? "none" : "opacity 0.2s ease-out",
      }}
    >
      {/* Top Header - Facebook Style */}
      <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
        <button
          className="text-white p-2 rounded-full hover:bg-white/10 transition-all active:scale-95"
          onClick={onClose}
          aria-label="إغلاق"
        >
          <X className="w-7 h-7" />
        </button>
        
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="text-white p-2 rounded-full hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50"
          title="تحميل"
        >
          {isDownloading ? (
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Download className="w-6 h-6" />
          )}
        </button>
      </div>

      {/* Media Container - بيدعم التكبير بإصبعين والسحب لتحت للقفل زي فيسبوك */}
      <div
        className="w-full h-full flex items-center justify-center overflow-hidden touch-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {mediaType === 'video' ? (
          <video
            src={mediaUrl}
            className="max-w-full max-h-full object-contain shadow-2xl"
            controls
            autoPlay
            playsInline
            onLoadStart={() => setIsLoading(true)}
            onCanPlay={() => setIsLoading(false)}
            onError={() => {
              console.error("Failed to load video:", mediaUrl);
              onClose();
            }}
          />
        ) : (
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
              </div>
            )}
            <img
              src={mediaUrl}
              alt="صورة بحجم كامل"
              className="max-w-full max-h-full object-contain animate-fade-in"
              style={{
                transform: `translate(${translate.x}px, ${translate.y + dragY}px) scale(${scale})`,
                transition: isGesturing ? "none" : "transform 0.2s ease-out",
              }}
              onLoad={() => setIsLoading(false)}
              onDoubleClick={() => (scale > 1 ? resetZoom() : setScale(2))}
              onError={() => {
                console.error("Failed to load image:", mediaUrl);
                onClose();
              }}
              draggable={false}
            />
          </div>
        )}
      </div>

      {/* رسالة نسخ رابط المشاركة */}
      {shareCopied && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-white text-gray-900 text-xs font-bold px-4 py-2 rounded-full flex items-center gap-1.5 shadow-lg animate-fade-in">
          <LinkIcon className="w-3.5 h-3.5" />
          تم نسخ الرابط
        </div>
      )}

      {/* Bottom Action Bar - Facebook Style - بتشتغل بس لو الصورة دي فعلاً بتاعة بوست */}
      {meme && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-6">
          <div className="flex items-center justify-around max-w-lg mx-auto">
            {/* Like Button */}
            <button
              onClick={handleLikeClick}
              className="flex flex-col items-center gap-1 group"
            >
              <div className={`p-2 rounded-full transition-all active:scale-90 ${
                liked ? 'text-red-500' : 'text-white'
              }`}>
                <Heart className={`w-7 h-7 ${liked ? 'fill-red-500' : ''}`} />
              </div>
              <span className={`text-xs ${liked ? 'text-red-500' : 'text-white'}`}>{likesCount > 0 ? likesCount : 'إعجاب'}</span>
            </button>

            {/* Comment Button */}
            <button
              className="flex flex-col items-center gap-1 text-white group"
              onClick={handleCommentClick}
            >
              <div className="p-2 rounded-full transition-all active:scale-90">
                <MessageCircle className="w-7 h-7" />
              </div>
              <span className="text-xs">تعليق</span>
            </button>

            {/* Share Button */}
            <button
              onClick={handleShareClick}
              className="flex flex-col items-center gap-1 text-white group"
            >
              <div className="p-2 rounded-full transition-all active:scale-90">
                <Share2 className="w-7 h-7" />
              </div>
              <span className="text-xs">مشاركة</span>
            </button>

            {/* Save Button */}
            <button
              onClick={handleSaveClick}
              className="flex flex-col items-center gap-1 group"
            >
              <div className={`p-2 rounded-full transition-all active:scale-90 ${saved ? 'text-orange-500' : 'text-white'}`}>
                <Bookmark className={`w-7 h-7 ${saved ? 'fill-orange-500' : ''}`} />
              </div>
              <span className={`text-xs ${saved ? 'text-orange-500' : 'text-white'}`}>حفظ</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { X, Download, Heart, MessageCircle, Share2 } from "lucide-react";

interface LightboxProps {
  mediaUrl: string | null;
  mediaType?: 'image' | 'video';
  onClose: () => void;
}

export default function Lightbox({ mediaUrl, mediaType = 'image', onClose }: LightboxProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
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
  }, [onClose]);

  if (!mediaUrl) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = mediaUrl;
    link.download = `media-${Date.now()}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'مشاركة',
        text: 'شارك هذا المحتوى',
        url: mediaUrl
      }).catch(err => console.log('Share error:', err));
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center p-0"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
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
          className="text-white p-2 rounded-full hover:bg-white/10 transition-all active:scale-95"
          title="تحميل"
        >
          <Download className="w-6 h-6" />
        </button>
      </div>

      {/* Media Container - Pinch to zoom handled by browser default on mobile images if configured, 
          but for professional feel we keep it contained. */}
      <div className="w-full h-full flex items-center justify-center overflow-hidden touch-none">
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
          <div className="relative w-full h-full flex items-center justify-center overflow-auto">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
              </div>
            )}
            <img
              src={mediaUrl}
              alt="صورة بحجم كامل"
              className="max-w-full max-h-full object-contain animate-fade-in"
              onLoad={() => setIsLoading(false)}
              onError={() => {
                console.error("Failed to load image:", mediaUrl);
                onClose();
              }}
            />
          </div>
        )}
      </div>

      {/* Bottom Action Bar - Facebook Style */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-6">
        <div className="flex items-center justify-around max-w-lg mx-auto">
          {/* Like Button */}
          <button
            onClick={() => setIsLiked(!isLiked)}
            className="flex flex-col items-center gap-1 group"
          >
            <div className={`p-2 rounded-full transition-all active:scale-90 ${
              isLiked ? 'text-blue-500' : 'text-white'
            }`}>
              <Heart className={`w-7 h-7 ${isLiked ? 'fill-current' : ''}`} />
            </div>
            <span className={`text-xs ${isLiked ? 'text-blue-500' : 'text-white'}`}>إعجاب</span>
          </button>

          {/* Comment Button */}
          <button
            className="flex flex-col items-center gap-1 text-white group"
            onClick={() => {
                // Future: Open full screen comments
            }}
          >
            <div className="p-2 rounded-full transition-all active:scale-90">
              <MessageCircle className="w-7 h-7" />
            </div>
            <span className="text-xs">تعليق</span>
          </button>

          {/* Share Button */}
          <button
            onClick={handleShare}
            className="flex flex-col items-center gap-1 text-white group"
          >
            <div className="p-2 rounded-full transition-all active:scale-90">
              <Share2 className="w-7 h-7" />
            </div>
            <span className="text-xs">مشاركة</span>
          </button>
        </div>
      </div>
    </div>
  );
}

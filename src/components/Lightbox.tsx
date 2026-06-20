import React from "react";
import { X, ZoomIn, ZoomOut, Download, Heart, MessageCircle, Share2 } from "lucide-react";

interface LightboxProps {
  mediaUrl: string | null;
  mediaType?: 'image' | 'video';
  onClose: () => void;
}

export default function Lightbox({ mediaUrl, mediaType = 'image', onClose }: LightboxProps) {
  const [scale, setScale] = React.useState(1);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isLiked, setIsLiked] = React.useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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
      className="fixed inset-0 z-[9999] bg-black/98 flex items-center justify-center backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
    >
      {/* Close Button - Top Left */}
      <button
        className="absolute top-4 left-4 text-white bg-white/10 hover:bg-white/20 p-3 rounded-full transition-all z-50 hover:scale-110 active:scale-95"
        onClick={onClose}
        aria-label="إغلاق"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Media Container */}
      <div className="max-w-5xl max-h-[90vh] w-full flex items-center justify-center overflow-auto">
        {mediaType === 'video' ? (
          <video
            src={mediaUrl}
            className="max-w-full max-h-[90vh] rounded-xl shadow-2xl"
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
          <>
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
              </div>
            )}
            <img
              src={mediaUrl}
              alt="صورة بحجم كامل"
              className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl animate-fade-in transition-transform duration-200"
              style={{ transform: `scale(${scale})` }}
              onLoad={() => setIsLoading(false)}
              onError={() => {
                console.error("Failed to load image:", mediaUrl);
                onClose();
              }}
            />
          </>
        )}
      </div>

      {/* Bottom Action Bar - Instagram Style */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3 max-w-5xl mx-auto">
          {/* Left Actions */}
          <div className="flex items-center gap-3">
            {/* Like Button */}
            <button
              onClick={() => setIsLiked(!isLiked)}
              className={`p-2 rounded-full transition-all hover:scale-110 active:scale-95 ${
                isLiked 
                  ? 'bg-red-500/30 text-red-400' 
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
              title="إعجاب"
            >
              <Heart className={`w-6 h-6 ${isLiked ? 'fill-current' : ''}`} />
            </button>

            {/* Comment Button */}
            <button
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-110 active:scale-95"
              title="تعليق"
            >
              <MessageCircle className="w-6 h-6" />
            </button>

            {/* Share Button */}
            <button
              onClick={handleShare}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-110 active:scale-95"
              title="مشاركة"
            >
              <Share2 className="w-6 h-6" />
            </button>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {/* Zoom Controls - Images Only */}
            {mediaType === 'image' && (
              <>
                <button
                  onClick={() => setScale(prev => Math.max(prev - 0.2, 0.5))}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-110 active:scale-95"
                  title="تصغير"
                >
                  <ZoomOut className="w-5 h-5" />
                </button>
                <span className="text-white text-sm font-bold min-w-[50px] text-center">
                  {Math.round(scale * 100)}%
                </span>
                <button
                  onClick={() => setScale(prev => Math.min(prev + 0.2, 3))}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-110 active:scale-95"
                  title="تكبير"
                >
                  <ZoomIn className="w-5 h-5" />
                </button>
                <div className="w-px h-6 bg-white/20" />
              </>
            )}

            {/* Download Button */}
            <button
              onClick={handleDownload}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-110 active:scale-95"
              title="تحميل"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

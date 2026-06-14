import React from "react";
import { X, ZoomIn, ZoomOut, Download } from "lucide-react";

interface LightboxProps {
  mediaUrl: string | null;
  mediaType?: 'image' | 'video';
  onClose: () => void;
}

export default function Lightbox({ mediaUrl, mediaType = 'image', onClose }: LightboxProps) {
  const [scale, setScale] = React.useState(1);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
      if (e.key === "+" || e.key === "=") {
        setScale(prev => Math.min(prev + 0.2, 3));
      }
      if (e.key === "-" || e.key === "_") {
        setScale(prev => Math.max(prev - 0.2, 0.5));
      }
      if (e.key === "0") {
        setScale(1);
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

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
    >
      {/* Close Button */}
      <button
        className="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 p-3 rounded-full transition-all z-50 hover:scale-110 active:scale-95"
        onClick={onClose}
        title="إغلاق (Esc)"
        aria-label="إغلاق"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Controls - Facebook Style */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/70 px-4 py-3 rounded-full backdrop-blur-md z-50 border border-white/20">
        {mediaType === 'image' && (
          <>
            <button
              onClick={() => setScale(prev => Math.max(prev - 0.2, 0.5))}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors hover:scale-110 active:scale-95"
              title="تصغير (-)"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <span className="text-white text-sm px-3 py-2 min-w-[60px] text-center font-bold">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale(prev => Math.min(prev + 0.2, 3))}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors hover:scale-110 active:scale-95"
              title="تكبير (+)"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <div className="w-px bg-white/20" />
          </>
        )}
        <button
          onClick={handleDownload}
          className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors hover:scale-110 active:scale-95"
          title="تحميل"
        >
          <Download className="w-5 h-5" />
        </button>
      </div>

      {/* Media Container */}
      <div className="max-w-5xl max-h-[90vh] w-full flex items-center justify-center overflow-auto">
        {mediaType === 'video' ? (
          <video
            src={mediaUrl}
            className="max-w-full max-h-[90vh] rounded-xl shadow-2xl"
            controls
            autoPlay
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

      {/* Info Text - Facebook Style */}
      <div className="absolute top-4 left-4 text-white/70 text-sm font-medium bg-black/40 px-3 py-2 rounded-lg backdrop-blur-sm border border-white/20">
        <p>اضغط Esc للإغلاق</p>
        {mediaType === 'image' && <p className="text-xs text-white/60 mt-1">استخدم + و - لتكبير/تصغير أو 0 للإعادة</p>}
      </div>
    </div>
  );
}

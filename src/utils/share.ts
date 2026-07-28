export type ShareResult = "shared" | "copied" | "cancelled";

interface ShareableMeme {
  id: string;
  caption?: string | null;
  image_url: string | null;
  video_url?: string | null;
}

declare global {
  interface Window {
    AndroidBridge?: {
      shareImage?: (imageUrl: string, text: string) => void;
    };
  }
}

async function fetchAsFile(url: string, filename: string, mime: string): Promise<File | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new File([blob], filename, { type: blob.type || mime });
  } catch {
    return null;
  }
}

function captureVideoFrame(videoUrl: string): Promise<File | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = videoUrl;

    const finish = (file: File | null) => {
      clearTimeout(timeout);
      video.src = "";
      video.remove();
      resolve(file);
    };

    const timeout = setTimeout(() => finish(null), 6000);

    video.addEventListener("loadeddata", () => {
      video.currentTime = Math.min(0.15, (video.duration || 1) / 4);
    });

    video.addEventListener("seeked", () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 720;
        canvas.height = video.videoHeight || 1280;
        const ctx = canvas.getContext("2d");
        if (!ctx) return finish(null);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (!blob) return finish(null);
          finish(new File([blob], "mem-cover.jpg", { type: "image/jpeg" }));
        }, "image/jpeg", 0.85);
      } catch {
        finish(null);
      }
    });

    video.addEventListener("error", () => finish(null));
  });
}

async function getShareableFile(meme: ShareableMeme): Promise<File | null> {
  if (meme.image_url) {
    return fetchAsFile(meme.image_url, "mem.jpg", "image/jpeg");
  }
  if (meme.video_url) {
    return captureVideoFrame(meme.video_url);
  }
  return null;
}

export async function shareMemeLink(meme: ShareableMeme): Promise<ShareResult> {
  const shareLink = `${window.location.origin}/?meme=${meme.id}`;
  const shareTitle = "mem";
  const shareText = meme.caption ? meme.caption.slice(0, 120) : "شوف الميم ده على mem 😂";

  // لو التطبيق شغال جوه غلاف الأندرويد بتاعنا واللي بيوفر جسر مشاركة أصلي
  // (addJavascriptInterface)، بنستخدمه هو - أضمن وبيفتح شيت مشاركة
  // الأندرويد الحقيقي دايماً، حتى لو الـ WebView مش داعم Web Share API
  if (window.AndroidBridge?.shareImage) {
    try {
      window.AndroidBridge.shareImage(meme.image_url || meme.video_url || shareLink, `${shareText}\n${shareLink}`);
      return "shared";
    } catch {
      /* نكمل على المسار التاني لو فشل */
    }
  }

  if (navigator.share) {
    const file = await getShareableFile(meme);

    if (file && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ title: shareTitle, text: `${shareText}\n${shareLink}`, files: [file] });
        return "shared";
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return "cancelled";
        /* فشل مشاركة الملف - نكمل على مشاركة الرابط بس تحت */
      }
    }

    try {
      await navigator.share({ title: shareTitle, text: shareText, url: shareLink });
      return "shared";
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return "cancelled";
    }
  }

  await navigator.clipboard.writeText(shareLink);
  return "copied";
}

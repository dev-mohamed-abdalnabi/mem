import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { dataService } from "../services/dataService";
import { socialService } from "../services/socialService";
import { Meme } from "../types";

export type UploadKind = "post" | "story";
export type UploadStatus = "uploading" | "processing" | "done" | "error";

export interface UploadItem {
  id: string;
  kind: UploadKind;
  progress: number; // 0-100
  status: UploadStatus;
  thumbnail: string; // data/object URL للمعاينة
  label: string; // "بوست جديد" / "حالة جديدة"
  error?: string;
}

interface StartPostUploadArgs {
  userId: string;
  caption: string;
  tags: string[];
  files: { file: File; preview: string; type: "image" | "video" }[];
  onDone?: (meme: Meme) => void;
}

interface StartStoryUploadArgs {
  userId: string;
  file: File;
  type: "image" | "video";
  preview: string;
  onDone?: () => void;
}

interface StartTextStoryUploadArgs {
  userId: string;
  blob: Blob;
  preview: string;
  onDone?: () => void;
}

interface UploadManagerValue {
  uploads: UploadItem[];
  startPostUpload: (args: StartPostUploadArgs) => void;
  startStoryUpload: (args: StartStoryUploadArgs) => void;
  startTextStoryUpload: (args: StartTextStoryUploadArgs) => void;
  dismissUpload: (id: string) => void;
}

const UploadManagerContext = createContext<UploadManagerValue | null>(null);

export function useUploadManager() {
  const ctx = useContext(UploadManagerContext);
  if (!ctx) throw new Error("useUploadManager لازم يتنادى جوه UploadManagerProvider");
  return ctx;
}

let uidCounter = 0;
const nextId = () => `upload-${Date.now()}-${uidCounter++}`;

export function UploadManagerProvider({ children }: { children: React.ReactNode }) {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  // بنستخدم ref موازي عشان نقدر نحدث عنصر واحد بالتقدم كتير (كل onprogress
  // tick) من غير ما نعمل race condition مع الـ state القديم جوه closures.
  const uploadsRef = useRef<Record<string, UploadItem>>({});

  const patch = useCallback((id: string, patchObj: Partial<UploadItem>) => {
    uploadsRef.current[id] = { ...uploadsRef.current[id], ...patchObj } as UploadItem;
    const list: UploadItem[] = Object.values(uploadsRef.current);
    setUploads(list.sort((a, b) => (a.id > b.id ? 1 : -1)));
  }, []);

  const dismissUpload = useCallback((id: string) => {
    delete uploadsRef.current[id];
    setUploads(Object.values(uploadsRef.current));
  }, []);

  const autoCleanup = useCallback((id: string, delayMs = 2500) => {
    setTimeout(() => dismissUpload(id), delayMs);
  }, [dismissUpload]);

  const startPostUpload = useCallback(({ userId, caption, tags, files, onDone }: StartPostUploadArgs) => {
    const id = nextId();
    uploadsRef.current[id] = {
      id,
      kind: "post",
      progress: 0,
      status: "uploading",
      thumbnail: files[0]?.preview || "",
      label: "جاري نشر البوست...",
    };
    setUploads(Object.values(uploadsRef.current));

    (async () => {
      try {
        const total = files.length || 1;
        const perFileProgress = new Array(total).fill(0);
        const updateOverall = () => {
          const overall = Math.round(perFileProgress.reduce((a, b) => a + b, 0) / total);
          patch(id, { progress: overall });
        };

        let imageUrl: string | null = null;
        let videoUrl: string | null = null;
        let images: string[] = [];
        let postType: "image" | "video" | "text" | "multi-image" = "text";

        if (files.length > 0) {
          const uploadedUrls = await Promise.all(
            files.map((m, idx) =>
              dataService.uploadMemeFile(m.file, "memes", (pct) => {
                perFileProgress[idx] = pct;
                updateOverall();
              })
            )
          );

          if (files.length === 1) {
            if (files[0].type === "video") {
              videoUrl = uploadedUrls[0];
              postType = "video";
            } else {
              imageUrl = uploadedUrls[0];
              postType = "image";
            }
          } else {
            images = uploadedUrls;
            postType = "multi-image";
          }
        }

        patch(id, { status: "processing", label: "جاري إنشاء المنشور..." });

        const createdMeme = await socialService.createPost({
          user_id: userId,
          caption,
          image_url: imageUrl,
          video_url: videoUrl,
          images,
          post_type: postType,
          tags,
          status: "pending",
        });

        patch(id, { status: "done", label: "تم نشر البوست ✓", progress: 100 });
        onDone?.(createdMeme);
        autoCleanup(id);
      } catch (e: any) {
        patch(id, { status: "error", error: e?.message || "فشل النشر، حاول تاني.", label: "فشل النشر" });
        autoCleanup(id, 5000);
      }
    })();
  }, [patch, autoCleanup]);

  const startStoryUpload = useCallback(({ userId, file, type, preview, onDone }: StartStoryUploadArgs) => {
    const id = nextId();
    uploadsRef.current[id] = {
      id,
      kind: "story",
      progress: 0,
      status: "uploading",
      thumbnail: preview,
      label: "جاري رفع الحالة...",
    };
    setUploads(Object.values(uploadsRef.current));

    (async () => {
      try {
        const url = await dataService.uploadMemeFile(file, "memes", (pct) => patch(id, { progress: pct }));
        patch(id, { status: "processing", label: "جاري نشر الحالة..." });
        await socialService.createStory(userId, url, type);
        patch(id, { status: "done", label: "تم نشر الحالة ✓", progress: 100 });
        onDone?.();
        autoCleanup(id);
      } catch (e: any) {
        patch(id, { status: "error", error: e?.message || "فشل رفع الحالة.", label: "فشل رفع الحالة" });
        autoCleanup(id, 5000);
      }
    })();
  }, [patch, autoCleanup]);

  const startTextStoryUpload = useCallback(({ userId, blob, preview, onDone }: StartTextStoryUploadArgs) => {
    const id = nextId();
    uploadsRef.current[id] = {
      id,
      kind: "story",
      progress: 0,
      status: "uploading",
      thumbnail: preview,
      label: "جاري رفع الحالة...",
    };
    setUploads(Object.values(uploadsRef.current));

    (async () => {
      try {
        const file = new File([blob], "text-story.png", { type: "image/png" });
        const url = await dataService.uploadMemeFile(file, "memes", (pct) => patch(id, { progress: pct }));
        patch(id, { status: "processing", label: "جاري نشر الحالة..." });
        await socialService.createStory(userId, url, "image");
        patch(id, { status: "done", label: "تم نشر الحالة ✓", progress: 100 });
        onDone?.();
        autoCleanup(id);
      } catch (e: any) {
        patch(id, { status: "error", error: e?.message || "فشل رفع الحالة.", label: "فشل رفع الحالة" });
        autoCleanup(id, 5000);
      }
    })();
  }, [patch, autoCleanup]);

  return (
    <UploadManagerContext.Provider value={{ uploads, startPostUpload, startStoryUpload, startTextStoryUpload, dismissUpload }}>
      {children}
    </UploadManagerContext.Provider>
  );
}

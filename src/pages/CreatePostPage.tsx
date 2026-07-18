import React, { useState } from "react";
import { Camera, Clock, X, Video } from "lucide-react";
import { Profile } from "../types";
import { dataService } from "../services/dataService";
import { socialService } from "../services/socialService";

interface CreatePostPageProps {
  currentUser: Profile;
  setActiveTab: (tab: string) => void;
  onPostCreated?: (meme: any) => void;
}

export default function CreatePostPage({ currentUser, setActiveTab, onPostCreated }: CreatePostPageProps) {
  const [newPostCaption, setNewPostCaption] = useState("");
  const [mediaFiles, setMediaFiles] = useState<{file: File, preview: string, type: 'image' | 'video'}[]>([]);
  const [newPostTags, setNewPostTags] = useState("");
  const [loading, setLoading] = useState(false);
  const [postError, setPostError] = useState("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles = Array.from(files) as File[];
    // بنحسب الميديا الموجودة فعلاً + اللي هتتضاف في نفس الدفعة دي، عشان
    // نمنع فيديوهين مع بعض أو فيديو مع صورة (البوست بيدعم بس: فيديو واحد
    // لوحده، أو صورة واحدة، أو أكتر من صورة مع بعض)
    const existingHasVideo = mediaFiles.some(m => m.type === 'video');
    const existingHasImage = mediaFiles.some(m => m.type === 'image');
    let batchHasVideo = existingHasVideo;
    let batchHasImage = existingHasImage;

    for (const file of newFiles) {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      
      if (!isImage && !isVideo) continue;

      if (isVideo && (batchHasVideo || batchHasImage)) {
        setPostError("الفيديو لازم يتنشر لوحده، مينفعش تضيفه مع فيديو أو صورة تانية.");
        continue;
      }
      if (isImage && batchHasVideo) {
        setPostError("مينفعش تضيف صور مع فيديو في نفس البوست.");
        continue;
      }

      // Video duration check (approximate via metadata) - بيتحقق قبل ما يضيف الملف فعلياً
      if (isVideo) {
        const durationOk = await new Promise<boolean>((resolve) => {
          const video = document.createElement('video');
          video.preload = 'metadata';
          video.onloadedmetadata = () => {
            window.URL.revokeObjectURL(video.src);
            resolve(video.duration <= 135); // 2 mins 15 seconds allowance
          };
          video.onerror = () => resolve(false);
          video.src = URL.createObjectURL(file);
        });

        if (!durationOk) {
          setPostError("الفيديو طويل جداً يا بطل، خليه أقل من دقيقتين.");
          continue; // متضافش الملف ده للقائمة
        }
      }

      if (isVideo) batchHasVideo = true;
      if (isImage) batchHasImage = true;

      const reader = new FileReader();
      reader.onload = (event) => {
        setMediaFiles(prev => [...prev, {
          file,
          preview: event.target?.result as string,
          type: isVideo ? 'video' : 'image'
        }]);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleQuickPostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostCaption.trim() && mediaFiles.length === 0) {
      setPostError("أضف نص أو ميديا على الأقل يا بطل!");
      return;
    }

    setLoading(true);
    setPostError("");

    try {
      let imageUrl = null;
      let videoUrl = null;
      let images: string[] = [];
      let postType: 'image' | 'video' | 'text' | 'multi-image' = 'text';

      if (mediaFiles.length > 0) {
        const uploadPromises = mediaFiles.map(m => dataService.uploadMemeFile(m.file));
        const uploadedUrls = await Promise.all(uploadPromises);

        if (mediaFiles.length === 1) {
          if (mediaFiles[0].type === 'video') {
            videoUrl = uploadedUrls[0];
            postType = 'video';
          } else {
            imageUrl = uploadedUrls[0];
            postType = 'image';
          }
        } else {
          images = uploadedUrls;
          postType = 'multi-image';
        }
      }

      const tagsArray = newPostTags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      const createdMeme = await socialService.createPost({
        user_id: currentUser.id,
        caption: newPostCaption,
        image_url: imageUrl,
        video_url: videoUrl,
        images: images,
        post_type: postType,
        tags: tagsArray,
        status: "pending" // Changed to pending for moderation
      });

      // XP update should be handled server-side via Supabase Triggers for security
      // Removed client-side update to prevent points manipulation

      setNewPostCaption("");
      setMediaFiles([]);
      setNewPostTags("");
      // كانت المشكلة إن الفيد ميتحدثش غير برفرش يدوي للصفحة كلها.
      // دلوقتي بنبعت المنشور الجديد فوراً لأعلى الـ App عشان يظهر في الفيد على طول.
      onPostCreated?.(createdMeme);
      setActiveTab("feed");
    } catch (err: any) {
      setPostError(err.message || "فشل النشر، حاول تاني.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto animate-fade-in pb-8">
      {/* هيدر - إلغاء / عنوان / نشر */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 dark:border-gray-900 sticky top-0 bg-white/90 dark:bg-[#0f1115]/90 backdrop-blur-sm z-10">
        <button type="button" onClick={() => setActiveTab("feed")} className="text-gray-500 dark:text-gray-400 text-sm font-bold px-2 py-1 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">إلغاء</button>
        <h2 className="text-[15px] font-bold text-gray-900 dark:text-white">منشور جديد</h2>
        <button
          type="submit"
          form="create-post-form"
          disabled={(newPostCaption.trim() === "" && mediaFiles.length === 0) || loading}
          className="bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white px-5 py-1.5 rounded-full text-xs font-bold disabled:opacity-40 transition-colors min-w-[64px] text-center shadow-sm shadow-blue-500/20"
        >
          {loading ? <Clock className="w-3.5 h-3.5 animate-spin mx-auto" /> : "نشر"}
        </button>
      </div>

      <form id="create-post-form" onSubmit={handleQuickPostSubmit} className="px-4 pt-5">
        {/* كارت المنشور */}
        <div className="bg-white dark:bg-[#16181c] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4">
          {/* صف: أفاتار + اسم المستخدم + عمود النص */}
          <div className="flex items-start gap-3">
            <img src={currentUser.avatar_url || ""} className="w-11 h-11 rounded-full object-cover shrink-0 ring-2 ring-gray-100 dark:ring-gray-800" alt="avatar" />
            <div className="flex-1 min-w-0">
              <span className="font-bold text-sm text-gray-900 dark:text-white">{currentUser.username}</span>

              <textarea
                placeholder="بماذا تفكر يا غالي؟"
                value={newPostCaption}
                onChange={(e) => setNewPostCaption(e.target.value)}
                className="w-full bg-transparent border-none focus:ring-0 p-0 mt-1.5 text-[15px] leading-relaxed text-gray-800 dark:text-gray-100 resize-none min-h-[90px] outline-none text-right placeholder-gray-400 dark:placeholder-gray-600"
                autoFocus
              />

            {mediaFiles.length > 0 && (
              <div className="mt-2 rounded-2xl overflow-hidden bg-gray-50 dark:bg-gray-900">
                {/* Threads-style Preview */}
                {mediaFiles.length === 1 ? (
                  <div className="relative aspect-square">
                    {mediaFiles[0].type === 'video' ? (
                      <video src={mediaFiles[0].preview} className="w-full h-full object-cover" />
                    ) : (
                      <img src={mediaFiles[0].preview} className="w-full h-full object-cover" alt="Preview" />
                    )}
                    <button type="button" onClick={() => removeMedia(0)} className="absolute top-2 right-2 bg-black/70 text-white rounded-full p-1.5 hover:bg-black/90 transition-colors"><X className="w-4 h-4" /></button>
                  </div>
                ) : mediaFiles.length === 2 ? (
                  <div className="grid grid-cols-2 gap-0.5 aspect-square">
                    {mediaFiles.map((media, idx) => (
                      <div key={idx} className="relative bg-gray-800 overflow-hidden group">
                        {media.type === 'video' ? (
                          <video src={media.preview} className="w-full h-full object-cover" />
                        ) : (
                          <img src={media.preview} className="w-full h-full object-cover" alt={`Preview ${idx + 1}`} />
                        )}
                        <button type="button" onClick={() => removeMedia(idx)} className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-1 hover:bg-black/90 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                ) : mediaFiles.length === 3 ? (
                  <div className="grid gap-0.5 aspect-square" style={{ gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' }}>
                    <div className="col-span-1 row-span-2 relative bg-gray-800 overflow-hidden group">
                      {mediaFiles[0].type === 'video' ? (
                        <video src={mediaFiles[0].preview} className="w-full h-full object-cover" />
                      ) : (
                        <img src={mediaFiles[0].preview} className="w-full h-full object-cover" alt="Preview 1" />
                      )}
                      <button type="button" onClick={() => removeMedia(0)} className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-1 hover:bg-black/90 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                    </div>
                    {mediaFiles.slice(1, 3).map((media, idx) => (
                      <div key={idx + 1} className="relative bg-gray-800 overflow-hidden group">
                        {media.type === 'video' ? (
                          <video src={media.preview} className="w-full h-full object-cover" />
                        ) : (
                          <img src={media.preview} className="w-full h-full object-cover" alt={`Preview ${idx + 2}`} />
                        )}
                        <button type="button" onClick={() => removeMedia(idx + 1)} className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-1 hover:bg-black/90 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                ) : mediaFiles.length === 4 ? (
                  <div className="grid grid-cols-2 gap-0.5 aspect-square">
                    {mediaFiles.map((media, idx) => (
                      <div key={idx} className="relative bg-gray-800 overflow-hidden group">
                        {media.type === 'video' ? (
                          <video src={media.preview} className="w-full h-full object-cover" />
                        ) : (
                          <img src={media.preview} className="w-full h-full object-cover" alt={`Preview ${idx + 1}`} />
                        )}
                        <button type="button" onClick={() => removeMedia(idx)} className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-1 hover:bg-black/90 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* 5+ images */
                  <div className="grid grid-cols-2 gap-0.5 aspect-square">
                    {mediaFiles.slice(0, 4).map((media, idx) => (
                      <div key={idx} className="relative bg-gray-800 overflow-hidden group">
                        {media.type === 'video' ? (
                          <video src={media.preview} className="w-full h-full object-cover" />
                        ) : (
                          <img src={media.preview} className="w-full h-full object-cover" alt={`Preview ${idx + 1}`} />
                        )}
                        {idx === 3 && mediaFiles.length > 4 && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <span className="text-white text-2xl font-black">+{mediaFiles.length - 4}</span>
                          </div>
                        )}
                        <button type="button" onClick={() => removeMedia(idx)} className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-1 hover:bg-black/90 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

              {/* أزرار إضافة الميديا - شكل واضح بستايل الكاردز في باقي الأبليكيشن */}
              <div className="flex items-center gap-2 mt-4">
                <label className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-950/70 text-[#1d9bf0] px-3.5 py-2 rounded-full cursor-pointer transition-colors text-xs font-bold">
                  <Camera className="w-4 h-4" />
                  صورة
                  <input type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden"/>
                </label>
                <label className="flex items-center gap-2 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-950/70 text-purple-600 dark:text-purple-400 px-3.5 py-2 rounded-full cursor-pointer transition-colors text-xs font-bold">
                  <Video className="w-4 h-4" />
                  فيديو
                  <input type="file" accept="video/*" onChange={handleFileChange} className="hidden"/>
                </label>
              </div>

              {/* هاشتاج */}
              <div className="flex items-center gap-2 border-t border-gray-100 dark:border-gray-800 mt-4 pt-3.5">
                <span className="text-gray-400 dark:text-gray-500 text-sm font-bold shrink-0">#</span>
                <input
                  type="text"
                  placeholder="أضف هاشتاج (اختياري)، افصل بينهم بفاصلة"
                  value={newPostTags}
                  onChange={(e) => setNewPostTags(e.target.value)}
                  className="w-full bg-transparent border-none text-xs text-right outline-none text-gray-600 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-600"
                />
              </div>
            </div>
          </div>

          {postError && <p className="text-red-500 text-xs mt-3.5 text-center font-bold bg-red-50 dark:bg-red-950/30 p-2.5 rounded-xl">{postError}</p>}
        </div>
      </form>
    </div>
  );
}

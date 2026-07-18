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
    
    for (const file of newFiles) {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      
      if (!isImage && !isVideo) continue;

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
    <div className="w-full max-w-xl mx-auto animate-fade-in">
      {/* هيدر بسيط بستايل ثريدز - إلغاء / عنوان / نشر */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-900">
        <button type="button" onClick={() => setActiveTab("feed")} className="text-gray-500 dark:text-gray-400 text-sm font-bold">إلغاء</button>
        <h2 className="text-sm font-bold text-gray-900 dark:text-white">منشور جديد</h2>
        <button
          type="submit"
          form="create-post-form"
          disabled={(newPostCaption.trim() === "" && mediaFiles.length === 0) || loading}
          className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-1.5 rounded-full text-xs font-bold disabled:opacity-40 transition-opacity min-w-[56px] text-center"
        >
          {loading ? <Clock className="w-3 h-3 animate-spin mx-auto" /> : "نشر"}
        </button>
      </div>

      <form id="create-post-form" onSubmit={handleQuickPostSubmit} className="px-4 py-4">
        {/* صف: أفاتار + اسم المستخدم + عمود النص - بستايل ثريدز المسطح من غير كارت */}
        <div className="flex items-start gap-3">
          <img src={currentUser.avatar_url || ""} className="w-9 h-9 rounded-full object-cover shrink-0" alt="avatar" />
          <div className="flex-1 min-w-0">
            <span className="font-bold text-sm text-gray-900 dark:text-white">{currentUser.username}</span>

            <textarea
              placeholder="بماذا تفكر يا غالي؟"
              value={newPostCaption}
              onChange={(e) => setNewPostCaption(e.target.value)}
              className="w-full bg-transparent border-none focus:ring-0 p-0 mt-1 text-sm text-gray-800 dark:text-gray-100 resize-none min-h-[70px] outline-none text-right placeholder-gray-400 dark:placeholder-gray-600"
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

            {/* أيقونات إضافة الميديا - شكل بسيط بدون بوردر زي ثريدز */}
            <div className="flex items-center gap-4 mt-3">
              <label className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white cursor-pointer transition-colors" title="إضافة صور">
                <Camera className="w-5 h-5" />
                <input type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden"/>
              </label>
              <label className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white cursor-pointer transition-colors" title="إضافة فيديو">
                <Video className="w-5 h-5" />
                <input type="file" accept="video/*" onChange={handleFileChange} className="hidden"/>
              </label>
            </div>

            {/* هاشتاج بسيط تحت زي ثريدز */}
            <input
              type="text"
              placeholder="أضف هاشتاج (اختياري)"
              value={newPostTags}
              onChange={(e) => setNewPostTags(e.target.value)}
              className="w-full bg-transparent border-t border-gray-100 dark:border-gray-900 mt-3 pt-3 text-xs text-right outline-none text-gray-500 dark:text-gray-400 placeholder-gray-400 dark:placeholder-gray-600"
            />
          </div>
        </div>

        {postError && <p className="text-red-500 text-xs mt-3 text-center font-bold bg-red-50 dark:bg-red-950/30 p-2.5 rounded-xl">{postError}</p>}
      </form>
    </div>
  );
}

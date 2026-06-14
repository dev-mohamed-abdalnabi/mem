import React, { useState } from "react";
import { Camera, Clock, X, Video, Film } from "lucide-react";
import { Profile } from "../types";
import { dataService } from "../services/dataService";
import { socialService } from "../services/socialService";

interface CreatePostPageProps {
  currentUser: Profile;
  setActiveTab: (tab: string) => void;
}

export default function CreatePostPage({ currentUser, setActiveTab }: CreatePostPageProps) {
  const [newPostCaption, setNewPostCaption] = useState("");
  const [mediaFiles, setMediaFiles] = useState<{file: File, preview: string, type: 'image' | 'video'}[]>([]);
  const [newPostTags, setNewPostTags] = useState("");
  const [loading, setLoading] = useState(false);
  const [postError, setPostError] = useState("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles = Array.from(files);
    
    for (const file of newFiles) {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      
      if (!isImage && !isVideo) continue;

      // Video duration check (approximate via metadata)
      if (isVideo) {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          window.URL.revokeObjectURL(video.src);
          if (video.duration > 135) { // 2 mins 15 seconds allowance
            setPostError("الفيديو طويل جداً يا بطل، خليه أقل من دقيقتين.");
            return;
          }
        };
        video.src = URL.createObjectURL(file);
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

      await socialService.createPost({
        user_id: currentUser.id,
        caption: newPostCaption,
        image_url: imageUrl,
        video_url: videoUrl,
        images: images,
        post_type: postType,
        tags: tagsArray,
        status: "approved"
      });

      const XP_PER_POST = 50;
      await dataService.updateProfile({
        total_points: (currentUser.total_points || 0) + XP_PER_POST
      });

      setNewPostCaption("");
      setMediaFiles([]);
      setNewPostTags("");
      setActiveTab("feed");
    } catch (err: any) {
      setPostError(err.message || "فشل النشر، حاول تاني.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 md:px-0 animate-fade-in py-6">
      <form onSubmit={handleQuickPostSubmit} className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm text-right flex flex-col gap-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
          <button type="button" onClick={() => setActiveTab("feed")} className="text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors text-sm font-bold">إلغاء</button>
          <h2 className="text-base font-bold text-gray-900 dark:text-white">إنشاء منشور جديد</h2>
          <button type="submit" disabled={(newPostCaption.trim() === "" && mediaFiles.length === 0) || loading} className="bg-blue-600 text-white px-4 py-1.5 rounded-xl text-xs font-bold disabled:opacity-50 hover:bg-blue-700 transition-colors flex items-center gap-1.5 min-w-[70px] justify-center">
            {loading ? <Clock className="w-3 h-3 animate-spin" /> : <><span>نشر</span> 🔥</>}
          </button>
        </div>
        
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 mb-2 justify-end">
            <span className="font-bold text-sm text-gray-900 dark:text-white">{currentUser.username}</span>
            <img src={currentUser.avatar_url || ""} className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-gray-800" alt="avatar" />
          </div>
          
          <textarea
            placeholder="بماذا تفكر يا غالي؟"
            value={newPostCaption}
            onChange={(e) => setNewPostCaption(e.target.value)}
            className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm text-gray-800 dark:text-gray-100 resize-none min-h-[100px] outline-none text-right"
            autoFocus
          />

          {mediaFiles.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              {mediaFiles.map((media, idx) => (
                <div key={idx} className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 aspect-square bg-gray-50 dark:bg-gray-900">
                  {media.type === 'video' ? (
                    <video src={media.preview} className="w-full h-full object-cover" />
                  ) : (
                    <img src={media.preview} className="w-full h-full object-cover" alt="Preview" />
                  )}
                  <button type="button" onClick={() => removeMedia(idx)} className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-1 hover:bg-black/90"><X className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3 mt-4 border-t border-gray-50 dark:border-gray-900 pt-4">
            <input
              type="text"
              placeholder="أضف هاشتاج..."
              value={newPostTags}
              onChange={(e) => setNewPostTags(e.target.value)}
              className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs text-right outline-none"
            />
            <div className="flex gap-2">
              <label className="p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:bg-gray-100 text-blue-500 rounded-xl cursor-pointer transition-colors" title="إضافة صور">
                <Camera className="w-4 h-4" />
                <input type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden"/>
              </label>
              <label className="p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:bg-gray-100 text-purple-500 rounded-xl cursor-pointer transition-colors" title="إضافة فيديو">
                <Video className="w-4 h-4" />
                <input type="file" accept="video/*" onChange={handleFileChange} className="hidden"/>
              </label>
            </div>
          </div>
        </div>
        
        {postError && <p className="text-red-500 text-xs mt-1 text-center font-bold bg-red-50 dark:bg-red-950/30 p-2.5 rounded-xl border border-red-100 dark:border-red-900/50">{postError}</p>}
      </form>
    </div>
  );
}

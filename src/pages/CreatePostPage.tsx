import React from "react";
import { Camera, X, Clock } from "lucide-react";
import { Profile } from "../types";

interface CreatePostPageProps {
  currentUser: Profile;
  loading: boolean;
  newPostCaption: string;
  setNewPostCaption: (val: string) => void;
  newPostImage: string;
  setNewPostImage: (val: string) => void;
  newPostTags: string;
  setNewPostTags: (val: string) => void;
  postError: string;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleQuickPostSubmit: (e: React.FormEvent) => Promise<void>;
  setActiveTab: (tab: string) => void;
}

export default function CreatePostPage({
  currentUser,
  loading,
  newPostCaption,
  setNewPostCaption,
  newPostImage,
  setNewPostImage,
  newPostTags,
  setNewPostTags,
  postError,
  handleFileChange,
  handleQuickPostSubmit,
  setActiveTab,
}: CreatePostPageProps) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm text-right flex flex-col gap-4 animate-fade-in mb-8 mx-4 md:mx-auto max-w-xl w-full">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
        <button onClick={() => setActiveTab("feed")} className="text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors text-sm font-bold">إلغاء</button>
        <h2 className="text-base font-bold text-gray-900 dark:text-white">إنشاء منشور ميمز جديد</h2>
        <div className="w-8"></div>
      </div>

      <form onSubmit={handleQuickPostSubmit} className="flex flex-col gap-2 pt-2">  
        <div className="flex gap-3">  
          <div className="shrink-0">  
            <img src={currentUser.avatar_url || "https://api.dicebear.com/7.x/bottts/svg?seed=guest"} className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-800" alt="avatar" referrerPolicy="no-referrer" />  
          </div>  
          <div className="flex-1 flex flex-col min-w-0">  
            <span className="font-bold text-sm text-gray-900 dark:text-white mb-1">{currentUser.username}</span>  
            <textarea  
              placeholder="بماذا تفكر يا غالي؟ أطلق الإيفيه..."  
              value={newPostCaption} onChange={(e) => setNewPostCaption(e.target.value)}  
              className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm text-gray-800 dark:text-gray-100 window-focus:outline-none resize-none min-h-[80px] placeholder-gray-400 outline-none"  
              autoFocus  
            />  

            {newPostImage && (  
              <div className="relative mt-2 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 w-max max-w-full">  
                <img src={newPostImage} className="max-h-64 w-auto object-contain" alt="Preview" />  
                <button type="button" onClick={() => setNewPostImage("")} className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/80 transition-colors">  
                  <X className="w-4 h-4" />  
                </button>  
              </div>  
            )}  

            <div className="flex items-center gap-3 mt-4 text-gray-400 border-t border-gray-50 dark:border-gray-800/50 pt-3">  
              <label className="p-2 -m-2 hover:bg-gray-100 dark:hover:bg-gray-800 text-blue-500 rounded-full cursor-pointer transition-colors" title="إرفاق صورة">  
                <Camera className="w-5 h-5" />  
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden"/>  
              </label>  
              <input   
                type="text" placeholder="أضف هاشتاج #ميمز..." value={newPostTags} onChange={(e) => setNewPostTags(e.target.value)}   
                className="flex-1 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-white outline-none"   
              />  
            </div>  
          </div>  
        </div>  

        <div className="flex justify-end mt-4">  
          <button type="submit" disabled={(!newPostCaption.trim() && !newPostImage) || loading} className="bg-blue-600 text-white px-6 py-2 rounded-xl text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors flex items-center justify-center min-w-[100px]">  
            {loading ? <Clock className="w-4 h-4 animate-spin" /> : "نشر الميم الآن 🔥"}  
          </button>  
        </div>  
      </form>  
      {postError && <p className="text-red-500 text-sm mt-2 text-center font-bold bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">{postError}</p>}  
    </div>
  );
}

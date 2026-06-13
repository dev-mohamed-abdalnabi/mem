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
    <div className="w-full max-w-xl mx-auto px-4 md:px-0 animate-fade-in">
      {/* تم نقل الـ form لتشمل الكارت كله عشان زرار النشر اللي فوق يشتغل تلقائي عند الضغط */}
      <form onSubmit={handleQuickPostSubmit} className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm text-right flex flex-col gap-4">
        
        {/* هيدر الصفحة العلوي: الإلغاء على اليمين، العنوان في النص، والنشر على اليسار بدون أي لخبطة */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
          <button 
            type="button" 
            onClick={() => setActiveTab("feed")} 
            className="text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors text-sm font-bold"
          >
            إلغاء
          </button>
          
          <h2 className="text-base font-bold text-gray-900 dark:text-white">إنشاء منشور ميمز جديد</h2>
          
          {/* زرار النشر في مكانه الطبيعي والصحيح علوياً */}
          <button 
            type="submit" 
            disabled={(!newPostCaption.trim() && !newPostImage) || loading} 
            className="bg-blue-600 text-white px-4 py-1.5 rounded-xl text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors flex items-center gap-1.5 min-w-[70px] justify-center"
          >
            {loading ? <Clock className="w-3 h-3 animate-spin" /> : <><span>نشر</span> 🔥</>}
          </button>
        </div>

        {/* محتوى المنشور والبيانات */}
        <div className="flex gap-4 pt-2">  
          {/* بيانات كرت كاتب الميم */}
          <div className="flex-1 flex flex-col min-w-0">  
            <div className="flex items-center gap-2 mb-2 justify-end">
              <span className="font-bold text-sm text-gray-900 dark:text-white">{currentUser.username}</span>  
              <img 
                src={currentUser.avatar_url || "https://api.dicebear.com/7.x/bottts/svg?seed=guest"} 
                className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-gray-800" 
                alt="avatar" 
                referrerPolicy="no-referrer" 
              />  
            </div>

            {/* صندوق الكتابة الذكي */}
            <textarea  
              placeholder="بماذا تفكر يا غالي؟ أطلق الإيفيه..."  
              value={newPostCaption} 
              onChange={(e) => setNewPostCaption(e.target.value)}  
              className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm text-gray-800 dark:text-gray-100 window-focus:outline-none resize-none min-h-[100px] placeholder-gray-400 outline-none text-right"  
              autoFocus  
            />  

            {/* معاينة الصورة قبل رفعها وسهولة حذفها */}
            {newPostImage && (  
              <div className="relative mt-3 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 w-max max-w-full mx-auto">  
                <img src={newPostImage} className="max-h-60 w-auto object-contain" alt="Preview" />  
                <button 
                  type="button" 
                  onClick={() => setNewPostImage("")} 
                  className="absolute top-2 right-2 bg-black/70 text-white rounded-full p-1.5 hover:bg-black/90 transition-colors"
                >  
                  <X className="w-4 h-4" />  
                </button>  
              </div>  
            )}  

            {/* أدوات إرفاق الميديا والهاشتاجات المتناسقة */}
            <div className="flex items-center gap-3 mt-4 border-t border-gray-50 dark:border-gray-900 pt-4">  
              <input   
                type="text" 
                placeholder="أضف هاشتاج #ميمز..." 
                value={newPostTags} 
                onChange={(e) => setNewPostTags(e.target.value)}   
                className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-white outline-none text-right"   
              />  
              
              <label 
                className="p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 text-blue-500 rounded-xl cursor-pointer transition-colors shrink-0" 
                title="إرفاق صورة الميم"
              >  
                <Camera className="w-4 h-4" />  
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden"/>  
              </label>  
            </div>  
          </div>  
        </div>  

        {/* عرض الأخطاء إن وجدت بشكل منسق */}
        {postError && (
          <p className="text-red-500 text-xs mt-1 text-center font-bold bg-red-50 dark:bg-red-950/30 p-2.5 rounded-xl border border-red-100 dark:border-red-900/50">
            {postError}
          </p>
        )}
      </form>  
    </div>
  );
}

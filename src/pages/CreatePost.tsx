import React, { useState } from 'react';
import { Camera, X, Clock, ImagePlus } from 'lucide-react';
import { Profile } from '../types';

interface CreatePostProps {
  currentUser: Profile;
  loading: boolean;
  postError: string;
  onCancel: () => void;
  onSubmit: (caption: string, image: string, tags: string, file: File | null) => Promise<void>;
}

export default function CreatePost({ currentUser, loading, postError, onCancel, onSubmit }: CreatePostProps) {
  const [caption, setCaption] = useState("");
  const [tags, setTags] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 8 * 1024 * 1024) {
        setLocalError("حجم الصورة كبير جداً! الحد الأقصى 8 ميجابايت.");
        return;
      }
      setLocalError("");
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (event) => setImagePreview(event.target?.result as string);
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!caption.trim() && !imagePreview) {
      setLocalError("يجب إضافة صورة أو كتابة نص على الأقل!");
      return;
    }
    onSubmit(caption, imagePreview, tags, file);
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800 mb-4">
        <button onClick={onCancel} className="text-gray-500 hover:text-red-500 font-bold transition-colors">إلغاء</button>
        <h2 className="text-lg font-black text-gray-900 dark:text-white">إنشاء ميم جديد 🚀</h2>
        <div className="w-8"></div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex gap-3">
          <img src={currentUser.avatar_url} className="w-12 h-12 rounded-full object-cover shrink-0 border border-gray-200 dark:border-gray-800" alt="avatar" />
          <div className="flex-1">
            <textarea
              placeholder="اكتب إيفيه أو تعليق يضحك..."
              value={caption} onChange={(e) => setCaption(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none min-h-[120px] transition-all"
              autoFocus
            />
          </div>
        </div>

        {/* عرض الصورة المرفوعة */}
        {imagePreview ? (
          <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 flex justify-center max-h-[400px]">
            <img src={imagePreview} className="max-h-[400px] w-auto object-contain" alt="Preview" />
            <button type="button" onClick={() => { setImagePreview(""); setFile(null); }} className="absolute top-3 right-3 bg-red-500/80 hover:bg-red-600 text-white rounded-full p-2 backdrop-blur-sm transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <label className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:border-blue-500 transition-all group">
            <ImagePlus className="w-10 h-10 text-gray-400 group-hover:text-blue-500 mb-2 transition-colors" />
            <span className="text-sm font-bold text-gray-500 group-hover:text-blue-600">اضغط لرفع صورة الميم</span>
            <input type="file" accept="image/*" onChange={handleFileChange} className="hidden"/>
          </label>
        )}

        <div className="flex items-center gap-3">
          <input 
            type="text" placeholder="الهاشتاجات (مثال: #ضحك #ميمز)" 
            value={tags} onChange={(e) => setTags(e.target.value)} 
            className="flex-1 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
          />
        </div>

        {(localError || postError) && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm font-bold text-center border border-red-100 dark:border-red-800/30">
            {localError || postError}
          </div>
        )}

        <button 
          type="submit" 
          disabled={loading || (!caption.trim() && !imagePreview)} 
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3.5 rounded-xl text-base disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-2"
        >
          {loading ? <><Clock className="w-5 h-5 animate-spin" /> جاري الرفع...</> : "انشر الميم 🔥"}
        </button>
      </form>
    </div>
  );
                }

import React, { useState } from 'react';
import { Camera, X, Clock, ImagePlus } from 'lucide-react';
import { Profile } from '../types';

interface Props {
  currentUser: Profile; loading: boolean; postError: string;
  onCancel: () => void;
  onSubmit: (caption: string, imagePreview: string, tags: string, file: File | null) => Promise<void>;
}

export default function CreatePost({ currentUser, loading, postError, onCancel, onSubmit }: Props) {
  const [caption, setCaption] = useState("");
  const [tags, setTags] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (event) => setImagePreview(event.target?.result as string);
      reader.readAsDataURL(selectedFile);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm max-w-2xl mx-auto">
      <div className="flex items-center justify-between pb-4 border-b mb-4">
        <button onClick={onCancel} className="text-gray-500 font-bold">إلغاء</button>
        <h2 className="text-lg font-black">إنشاء ميم جديد 🚀</h2>
        <div className="w-8"></div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); onSubmit(caption, imagePreview, tags, file); }} className="flex flex-col gap-4">
        <textarea placeholder="اكتب إيفيه يضحك..." value={caption} onChange={(e) => setCaption(e.target.value)} className="w-full bg-gray-50 border rounded-xl p-4 text-base focus:ring-2 outline-none resize-none min-h-[100px]" autoFocus />

        {imagePreview ? (
          <div className="relative rounded-xl overflow-hidden border bg-gray-50 flex justify-center">
            <img src={imagePreview} className="max-h-[300px] w-auto" alt="Preview" />
            <button type="button" onClick={() => { setImagePreview(""); setFile(null); }} className="absolute top-3 right-3 bg-red-500 text-white rounded-full p-2"><X className="w-5 h-5" /></button>
          </div>
        ) : (
          <label className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50">
            <ImagePlus className="w-10 h-10 text-gray-400 mb-2" />
            <span className="text-sm font-bold text-gray-500">اضغط لرفع صورة الميم</span>
            <input type="file" accept="image/*" onChange={handleFileChange} className="hidden"/>
          </label>
        )}

        <input type="text" placeholder="الهاشتاجات (#ضحك #ميمز)" value={tags} onChange={(e) => setTags(e.target.value)} className="w-full bg-gray-50 border rounded-xl px-4 py-3 text-sm focus:ring-2 outline-none" />
        
        {postError && <div className="text-red-500 text-sm font-bold text-center">{postError}</div>}

        <button type="submit" disabled={loading || (!caption && !imagePreview)} className="w-full bg-blue-600 text-white font-black py-3 rounded-xl">
          {loading ? "جاري الرفع..." : "انشر الميم 🔥"}
        </button>
      </form>
    </div>
  );
}

import React, { useState } from "react";
import { Heart, MessageCircle, Bookmark, Share2, MoreVertical, Trash2, ShieldAlert } from "lucide-react";
import { Meme, Profile } from "../types";

interface MemeCardProps {
  meme: Meme;
  currentUser: Profile;
  isFollowingCreator: boolean;
  onLikeToggle: (id: string) => Promise<void>;
  onSaveToggle: (id: string) => Promise<void>;
  onFollowToggle: (followerId: string, followingId: string) => Promise<void>;
  onTagClick: (tag: string | null) => void;
  onDeleteMeme: (id: string) => Promise<void>;
  onUserProfileClick: (id: string) => void;
  onImageClick: (url: string) => void;
  onReportSubmit: (id: string, reason: string) => void;
  onShareCompleted: (id: string) => Promise<void>;
}

export default function MemeCard({
  meme,
  currentUser,
  isFollowingCreator,
  onLikeToggle,
  onSaveToggle,
  onFollowToggle,
  onTagClick,
  onDeleteMeme,
  onUserProfileClick,
  onImageClick,
  onReportSubmit,
}: MemeCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm text-right flex flex-col overflow-hidden mb-5">
      
      {/* 1️⃣ هيدر البوست: اسم المستخدم، الصورة، وزرار المتابعة النضيف */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800/60">
        
        {/* القائمة الجانبية (حذف أو إبلاغ) */}
        <div className="relative">
          <button onClick={() => setShowMenu(!showMenu)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-full">
            <MoreVertical className="w-5 h-5" />
          </button>
          
          {showMenu && (
            <div className="absolute left-0 mt-1 w-40 bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-xl shadow-xl z-30 py-1 text-right">
              {currentUser.id === meme.user_id ? (
                <button 
                  onClick={() => { onDeleteMeme(meme.id); setShowMenu(false); }}
                  className="w-full px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-2 justify-end"
                >
                  <span>حذف المنشور</span>
                  <Trash2 className="w-4 h-4" />
                </button>
              ) : (
                <button 
                  onClick={() => { onReportSubmit(meme.id, "محتوى غير لائق"); setShowMenu(false); }}
                  className="w-full px-4 py-2 text-xs font-bold text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 flex items-center gap-2 justify-end"
                >
                  <span>إبلاغ</span>
                  <ShieldAlert className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* بيانات العضو اللي منزل البوست */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onUserProfileClick(meme.user_id)}>
          <div className="text-right">
            <div className="flex items-center gap-2 justify-end">
              {currentUser.id !== meme.user_id && !isFollowingCreator && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onFollowToggle(currentUser.id, meme.user_id); }}
                  className="text-[11px] text-blue-600 dark:text-blue-400 font-bold hover:underline"
                >
                  • متابعة
                </button>
              )}
              <span className="font-black text-sm text-gray-900 dark:text-white hover:underline">
                {meme.profiles?.username || "عضو ميمز"}
              </span>
            </div>
            <span className="text-[10px] text-gray-400 block font-medium mt-0.5">منذ فترة</span>
          </div>
          
          <img 
            src={meme.profiles?.avatar_url || "https://api.dicebear.com/7.x/bottts/svg?seed=fallback"} 
            className="w-10 h-10 rounded-full object-cover border border-gray-100 dark:border-gray-800"
            alt=""
          />
        </div>
      </div>

      {/* 2️⃣ نص الكابشن (الإيفيه) واخد راحته تماماً وواسع */}
      {meme.caption && (
        <div className="px-4 pt-3 pb-2 text-sm text-gray-800 dark:text-gray-100 leading-relaxed text-right font-medium">
          {meme.caption}
        </div>
      )}

      {/* 3️⃣ الهاشتاجات تظهر بشكل منسق تحت النص مباشرة */}
      {meme.tags && meme.tags.length > 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-1.5 justify-start" dir="rtl">
          {meme.tags.map((tag, idx) => (
            <span 
              key={idx} 
              onClick={() => onTagClick(tag)}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* 4️⃣ صورة الميم الكبيرة الأصلية بدون أي ضغط خارجي أو بياض ملوش لزمة */}
      {meme.image_url && (
        <div className="w-full bg-gray-50 dark:bg-black/20 border-y border-gray-50 dark:border-gray-800/40 overflow-hidden flex items-center justify-center cursor-zoom-in">
          <img 
            src={meme.image_url} 
            alt="Meme" 
            onClick={() => onImageClick(meme.image_url)}
            className="w-full h-auto max-h-[500px] object-contain"
            loading="lazy"
          />
        </div>
      )}

      {/* 5️⃣ أزرار التفاعل (اللايك، الكومنت، الحفظ) بالاستايل الكلاسيكي الرايق */}
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900/40 border-t border-gray-50 dark:border-gray-800/40 text-gray-500 dark:text-gray-400">
        
        {/* زرار الحفظ على اليمين */}
        <button 
          onClick={() => onSaveToggle(meme.id)}
          className={`flex items-center gap-1.5 hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${meme.saved_by_me ? 'text-blue-600 dark:text-blue-400' : ''}`}
        >
          <Bookmark className={`w-5 h-5 ${meme.saved_by_me ? 'fill-current' : ''}`} />
        </button>

        {/* الكومنتات واللايكات على اليسار */}
        <div className="flex items-center gap-5">
          <button className="flex items-center gap-1.5 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
            <span className="text-xs font-bold">{meme.comments_count || 0}</span>
            <MessageCircle className="w-5 h-5" />
          </button>

          <button 
            onClick={() => onLikeToggle(meme.id)}
            className={`flex items-center gap-1.5 transition-colors ${meme.liked_by_me ? 'text-red-500 dark:text-red-400' : 'hover:text-red-500'}`}
          >
            <span className="text-xs font-bold">{meme.likes_count || 0}</span>
            <Heart className={`w-5 h-5 ${meme.liked_by_me ? 'fill-current' : ''}`} />
          </button>
        </div>

      </div>

    </div>
  );
}

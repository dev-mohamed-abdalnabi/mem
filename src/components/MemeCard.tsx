import React, { useState, useEffect } from "react";
import { 
  Heart, MessageCircle, Share2, Bookmark, 
  Trash2, AlertOctagon, Check, Frown, ShieldAlert, PlusCircle, ChevronRight, ChevronLeft
} from "lucide-react";
import PostDetailModal from "./PostDetailModal";
import { Meme, Comment, Profile } from "../types";
import { dataService } from "../services/dataService";
import CustomVideoPlayer from "./CustomVideoPlayer";

/**
 * واجهة الخصائص لمكون بطاقة الميم (MemeCard)
 */
interface MemeCardProps {
  key?: string | number;
  meme: Meme; // بيانات الميم
  currentUser: Profile; // المستخدم الحالي
  onLikeToggle: (memeId: string) => void; // وظيفة الإعجاب
  onSaveToggle: (memeId: string) => void; // وظيفة الحفظ
  onFollowToggle: (followerId: string, followingId: string) => void; // وظيفة المتابعة
  onTagClick: (tag: string) => void; // وظيفة النقر على الهاشتاج
  onDeleteComment: (commentId: string) => void; // وظيفة حذف تعليق
  onReportSubmit: (memeId: string, reason: string) => void; // وظيفة الإبلاغ
  onShareCompleted: (memeId: string) => void; // وظيفة اكتمال المشاركة
  onDeleteMeme: (memeId: string) => void; // وظيفة حذف الميم
  onUserProfileClick: (userId: string) => void; // وظيفة الانتقال لبروفايل المستخدم
  isFollowingCreator: boolean; // هل يتابع المستخدم صاحب الميم
  onImageClick?: (url: string) => void; // وظيفة تكبير الصورة
  onOpenComments?: (meme: Meme) => void; // وظيفة فتح التعليقات في صفحة كاملة
}

/**
 * مكون بطاقة الميم (MemeCard)
 * يعرض المنشور مع تفاعلاته وتعليقاته
 */
export default function MemeCard({
  meme,
  currentUser,
  onLikeToggle,
  onSaveToggle,
  onFollowToggle,
  onTagClick,
  onDeleteComment,
  onReportSubmit,
  onShareCompleted,
  onDeleteMeme,
  onUserProfileClick,
  isFollowingCreator,
  onImageClick
}: MemeCardProps) {
  // --- حالات المكون (States) ---
  const [showComments, setShowComments] = useState(false); // إظهار التعليقات
  const [commentsList, setCommentsList] = useState<Comment[]>([]); // قائمة التعليقات
  const [newCommentText, setNewCommentText] = useState(""); // نص التعليق الجديد
  const [loadingComments, setLoadingComments] = useState(false); // حالة تحميل التعليقات
  const [commentError, setCommentError] = useState(""); // خطأ في التعليق
  const [showReportModal, setShowReportModal] = useState(false); // إظهار مودال الإبلاغ
  const [shareSuccess, setShareSuccess] = useState(false); // نجاح المشاركة
  const [currentImageIndex, setCurrentImageIndex] = useState(0); // مؤشر الصورة الحالية في المنشورات المتعددة

  // تحميل التعليقات عند فتح قسم التعليقات
  useEffect(() => {
    if (showComments) {
      loadComments();
    }
  }, [showComments, meme.id]);

  /**
   * جلب التعليقات من الخدمة
   */
  const loadComments = async () => {
    setLoadingComments(true);
    try {
      const list = await dataService.getComments(meme.id);
      setCommentsList(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleLike = () => onLikeToggle(meme.id);
  const handleSave = () => onSaveToggle(meme.id);
  const handleOpenComments = () => {
    if (onOpenComments) {
      onOpenComments(meme);
    } else {
      setShowComments(!showComments);
    }
  };

  /**
   * إرسال تعليق جديد
   */
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    try {
      setCommentError("");
      const added = await dataService.addComment(meme.id, currentUser.id, newCommentText.trim());
      setCommentsList((prev) => [...prev, added]);
      setNewCommentText("");
    } catch (err: any) {
      setCommentError(err.message || "حدث خطأ في إضافة الكومنت.");
      setTimeout(() => setCommentError(""), 5000);
    }
  };

  /**
   * نسخ رابط المنشور للمشاركة
   */
  const handleShareClick = () => {
    onShareCompleted(meme.id);
    const shareLink = `${window.location.origin}/?meme=${meme.id}`;
    navigator.clipboard.writeText(shareLink).then(() => {
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 4000);
    });
  };

  /**
   * تحليل النص لاستخراج الهاشتاجات وجعلها قابلة للنقر
   */
  const parseCaption = (caption: string | null) => {
    if (!caption) return "";
    return caption.split(" ").map((word, i) => {
      if (word.startsWith("#")) {
        const cleanTag = word.replace("#", "");
        return (
          <span key={i} onClick={() => onTagClick(cleanTag)} className="text-blue-600 hover:underline cursor-pointer text-xs font-bold ml-1">
            {word}
          </span>
        );
      }
      return word + " ";
    });
  };

  // معلومات منشئ المحتوى
  const creator = meme.profiles || { id: meme.user_id, username: "ميمر_مجهول", avatar_url: null, meme_level: "مبتدئ" };

  return (
    <article className="bg-white border-b border-gray-200 text-right flex flex-col mb-0 transition-all shadow-sm hover:shadow-md">
      <div className="flex gap-3 p-4">
        {/* الجزء الأيمن: الأفاتار وزر المتابعة */}
        <div className="flex flex-col items-center gap-2 shrink-0">
          <div className="relative">
            <div className="cursor-pointer hover:opacity-80" onClick={() => onUserProfileClick(creator.id)}>
              <img src={creator.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${creator.username}`} alt="" className="w-10 h-10 rounded-full object-cover border border-gray-100" />
            </div>
            {!isFollowingCreator && currentUser.id !== creator.id && (
              <button onClick={() => onFollowToggle(currentUser.id, creator.id)} className="absolute -bottom-1 -left-1 bg-black text-white rounded-full w-4 h-4 flex items-center justify-center border-2 border-white"><PlusCircle className="w-3 h-3" /></button>
            )}
          </div>
          <div className="w-0.5 grow bg-gray-100 rounded-full"></div>
        </div>

        {/* الجزء الأيسر: المحتوى والتفاعلات */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-gray-900 hover:underline cursor-pointer" onClick={() => onUserProfileClick(creator.id)}>{creator.username}</span>
              <span className="text-gray-400 text-xs">{new Date(meme.created_at).toLocaleDateString("ar-EG")}</span>
            </div>
            <div className="flex items-center gap-2">
              {(currentUser.id === creator.id || currentUser.role === "admin") && (
                <button onClick={() => onDeleteMeme(meme.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
              )}
              <button onClick={() => setShowReportModal(true)} className="text-gray-400 hover:text-gray-600"><AlertOctagon className="w-4 h-4" /></button>
            </div>
          </div>

          {/* نص المنشور */}
          {meme.caption && <div className="text-sm text-gray-800 leading-relaxed mb-3">{parseCaption(meme.caption)}</div>}

          {/* عرض الميديا (صورة، فيديو، أو مجموعة صور) */}
          <div className="rounded-xl border border-gray-200 overflow-hidden mb-3 bg-gray-50 relative group">
            {meme.post_type === 'video' && meme.video_url ? (
              <CustomVideoPlayer src={meme.video_url} className="w-full max-h-[500px]" />
            ) : meme.post_type === 'multi-image' && meme.images && meme.images.length > 0 ? (
              <div className="relative bg-gray-900">
                {/* تخطيط الصور المتعددة */}
                {meme.images.length === 2 ? (
                  <div className="grid grid-cols-2 gap-0.5 aspect-square">
                    {meme.images.map((img, idx) => (
                      <div key={idx} className="relative overflow-hidden bg-gray-800 cursor-pointer group/img" onClick={() => onImageClick?.(img)}>
                        <img src={img} className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300" alt={`صورة ${idx + 1}`} />
                      </div>
                    ))}
                  </div>
                ) : meme.images.length === 3 ? (
                  <div className="grid gap-0.5 aspect-square" style={{ gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' }}>
                    <div className="col-span-1 row-span-2 relative overflow-hidden bg-gray-800 cursor-pointer group/img" onClick={() => onImageClick?.(meme.images![0])}>
                      <img src={meme.images[0]} className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300" alt="صورة 1" />
                    </div>
                    <div className="relative overflow-hidden bg-gray-800 cursor-pointer group/img" onClick={() => onImageClick?.(meme.images![1])}>
                      <img src={meme.images[1]} className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300" alt="صورة 2" />
                    </div>
                    <div className="relative overflow-hidden bg-gray-800 cursor-pointer group/img" onClick={() => onImageClick?.(meme.images![2])}>
                      <img src={meme.images[2]} className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300" alt="صورة 3" />
                    </div>
                  </div>
                ) : meme.images.length === 4 ? (
                  <div className="grid grid-cols-2 gap-0.5 aspect-square">
                    {meme.images.map((img, idx) => (
                      <div key={idx} className="relative overflow-hidden bg-gray-800 cursor-pointer group/img" onClick={() => onImageClick?.(img)}>
                        <img src={img} className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300" alt={`صورة ${idx + 1}`} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-0.5 aspect-square">
                    {meme.images.slice(0, 4).map((img, idx) => (
                      <div key={idx} className="relative overflow-hidden bg-gray-800 cursor-pointer group/img" onClick={() => onImageClick?.(img)}>
                        <img src={img} className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300" alt={`صورة ${idx + 1}`} />
                        {idx === 3 && meme.images!.length > 4 && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <span className="text-white text-2xl font-black">+{meme.images!.length - 4}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : meme.image_url ? (
              <img src={meme.image_url} className="w-full max-h-[500px] object-contain" onClick={() => onImageClick?.(meme.image_url!)} />
            ) : null}
          </div>

          {/* أزرار التفاعل */}
          <div className="flex items-center gap-4 py-1">
            <button onClick={handleLike} className={`flex items-center gap-1 ${meme.liked_by_me ? "text-red-500" : "text-gray-800"}`}><Heart className={`w-5 h-5 ${meme.liked_by_me ? "fill-red-500" : ""}`} /></button>
            <button onClick={handleOpenComments} className="flex items-center gap-1 text-gray-800"><MessageCircle className="w-5 h-5" /></button>
            <button onClick={handleShareClick} className="flex items-center gap-1 text-gray-800"><Share2 className="w-5 h-5" /></button>
            <button onClick={handleSave} className={`flex items-center gap-1 ${meme.saved_by_me ? "text-orange-500" : "text-gray-800"}`}><Bookmark className={`w-5 h-5 ${meme.saved_by_me ? "fill-orange-500" : ""}`} /></button>
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-400 font-medium">
            <span>{meme.likes_count} إعجاب</span>
            <span>•</span>
            <button onClick={handleOpenComments} className="hover:underline">{meme.comments_count} ردود</button>
          </div>
        </div>
      </div>

      {/* رسائل النجاح والخطأ */}
      {shareSuccess && <div className="bg-green-50 border-y border-green-100 px-4 py-2 text-xs text-green-700 font-extrabold">تم نسخ الرابط بنجاح! 🚀</div>}
      {commentError && <div className="bg-red-50 border-y border-red-100 px-4 py-2.5 text-xs text-red-700 font-bold">{commentError}</div>}

      {/* قسم التعليقات */}
      {showComments && (
        <div className="bg-gray-50/50 p-4 border-t border-gray-100 flex flex-col gap-3">
          {commentsList.map((c) => (
            <div key={c.id} className="flex items-start gap-2 text-right">
              <img src={c.profiles?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${c.profiles?.username}`} className="w-8 h-8 rounded-lg object-cover" />
              <div className="flex-1 bg-gray-100 p-2.5 rounded-2xl">
                <div className="font-extrabold text-xs text-gray-900">{c.profiles?.username}</div>
                <div className="text-xs text-gray-700 mt-1">{c.content}</div>
              </div>
            </div>
          ))}
          <form onSubmit={handlePostComment} className="flex gap-2 mt-2">
            <input type="text" value={newCommentText} onChange={(e) => setNewCommentText(e.target.value)} placeholder="اكتب ردك..." className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none" />
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold">إرسال</button>
          </form>
        </div>
      )}
    </article>
  );
}

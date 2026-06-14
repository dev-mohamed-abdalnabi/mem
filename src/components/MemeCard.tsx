import React, { useState, useEffect } from "react";
import { 
  Heart, MessageCircle, Share2, Bookmark, 
  Trash2, AlertOctagon, Check, Frown, ShieldAlert, PlusCircle, ChevronRight, ChevronLeft
} from "lucide-react";
import { Meme, Comment, Profile } from "../types";
import { dataService } from "../services/dataService";

interface MemeCardProps {
  key?: string | number;
  meme: Meme;
  currentUser: Profile;
  onLikeToggle: (memeId: string) => void;
  onSaveToggle: (memeId: string) => void;
  onFollowToggle: (followerId: string, followingId: string) => void;
  onTagClick: (tag: string) => void;
  onDeleteComment: (commentId: string) => void;
  onReportSubmit: (memeId: string, reason: string) => void;
  onShareCompleted: (memeId: string) => void;
  onDeleteMeme: (memeId: string) => void;
  onUserProfileClick: (userId: string) => void;
  isFollowingCreator: boolean;
  onImageClick?: (url: string) => void;
}

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
  const [showComments, setShowComments] = useState(false);
  const [commentsList, setCommentsList] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentError, setCommentError] = useState("");
  const [showReportModal, setShowReportModal] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (showComments) {
      loadComments();
    }
  }, [showComments, meme.id]);

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

  const handleShareClick = () => {
    onShareCompleted(meme.id);
    const shareLink = `${window.location.origin}/?meme=${meme.id}`;
    navigator.clipboard.writeText(shareLink).then(() => {
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 4000);
    });
  };

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

  const creator = meme.profiles || { id: meme.user_id, username: "ميمر_مجهول", avatar_url: null, meme_level: "مبتدئ" };

  return (
    <article className="bg-white border-b border-gray-200 text-right flex flex-col mb-0 transition-all shadow-sm hover:shadow-md">
      <div className="flex gap-3 p-4">
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

          {meme.caption && <div className="text-sm text-gray-800 leading-relaxed mb-3">{parseCaption(meme.caption)}</div>}

          {/* Media Display */}
          <div className="rounded-xl border border-gray-200 overflow-hidden mb-3 bg-gray-50 relative group">
            {meme.post_type === 'video' && meme.video_url ? (
              <video src={meme.video_url} controls className="w-full max-h-[500px]" />
            ) : meme.post_type === 'multi-image' && meme.images && meme.images.length > 0 ? (
              <div className="relative">
                <img src={meme.images[currentImageIndex]} className="w-full max-h-[500px] object-contain" onClick={() => onImageClick?.(meme.images![currentImageIndex])} />
                {meme.images.length > 1 && (
                  <>
                    <button onClick={() => setCurrentImageIndex(prev => Math.max(0, prev - 1))} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><ChevronLeft /></button>
                    <button onClick={() => setCurrentImageIndex(prev => Math.min(meme.images!.length - 1, prev + 1))} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><ChevronRight /></button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                      {meme.images.map((_, i) => (
                        <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === currentImageIndex ? 'bg-blue-500' : 'bg-gray-300'}`} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : meme.image_url ? (
              <img src={meme.image_url} className="w-full max-h-[500px] object-contain" onClick={() => onImageClick?.(meme.image_url!)} />
            ) : null}
          </div>

          <div className="flex items-center gap-4 py-1">
            <button onClick={handleLike} className={`flex items-center gap-1 ${meme.liked_by_me ? "text-red-500" : "text-gray-800"}`}><Heart className={`w-5 h-5 ${meme.liked_by_me ? "fill-red-500" : ""}`} /></button>
            <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-1 text-gray-800"><MessageCircle className="w-5 h-5" /></button>
            <button onClick={handleShareClick} className="flex items-center gap-1 text-gray-800"><Share2 className="w-5 h-5" /></button>
            <button onClick={handleSave} className={`flex items-center gap-1 ${meme.saved_by_me ? "text-orange-500" : "text-gray-800"}`}><Bookmark className={`w-5 h-5 ${meme.saved_by_me ? "fill-orange-500" : ""}`} /></button>
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-400 font-medium">
            <span>{meme.likes_count} إعجاب</span>
            <span>•</span>
            <button onClick={() => setShowComments(!showComments)} className="hover:underline">{meme.comments_count} ردود</button>
          </div>
        </div>
      </div>

      {shareSuccess && <div className="bg-green-50 border-y border-green-100 px-4 py-2 text-xs text-green-700 font-extrabold">تم نسخ الرابط بنجاح! 🚀</div>}
      {commentError && <div className="bg-red-50 border-y border-red-100 px-4 py-2.5 text-xs text-red-700 font-bold">{commentError}</div>}

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

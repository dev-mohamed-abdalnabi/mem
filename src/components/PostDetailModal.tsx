import React, { useState, useEffect } from "react";
import { X, Heart, MessageCircle, Share2, Bookmark, Send, Loader2 } from "lucide-react";
import DOMPurify from "dompurify";
import { Meme, Comment, Profile } from "../types";
import { dataService } from "../services/dataService";
import CustomVideoPlayer from "./CustomVideoPlayer";

interface PostDetailModalProps {
  meme: Meme;
  currentUser: Profile;
  onClose: () => void;
  onLikeToggle: (id: string) => void;
  onSaveToggle: (id: string) => void;
  onShare: (id: string) => void;
  onUserProfileClick: (id: string) => void;
}

export default function PostDetailModal({
  meme,
  currentUser,
  onClose,
  onLikeToggle,
  onSaveToggle,
  onShare,
  onUserProfileClick
}: PostDetailModalProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadComments();
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [meme.id]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const list = await dataService.getComments(meme.id);
      setComments(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    try {
      const added = await dataService.addComment(meme.id, currentUser.id, newComment.trim());
      setComments(prev => [...prev, added]);
      setNewComment("");
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const creator = meme.profiles || { id: meme.user_id, username: "ميمر_مجهول", avatar_url: null };

  return (
    <div className="fixed inset-0 z-[10000] bg-white flex flex-col md:flex-row animate-slide-up" dir="rtl">
      {/* Header for Mobile */}
      <div className="md:hidden flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
        <button onClick={onClose} className="p-1"><X className="w-6 h-6" /></button>
        <span className="font-bold">التعليقات</span>
        <div className="w-6" />
      </div>

      {/* Media Section */}
      <div className="flex-1 bg-black flex items-center justify-center overflow-hidden">
        {meme.post_type === 'video' && meme.video_url ? (
          <CustomVideoPlayer src={meme.video_url} className="max-h-full" />
        ) : (
          <img 
            src={meme.image_url || (meme.images && meme.images[0]) || ""} 
            className="max-w-full max-h-full object-contain"
            alt="post"
          />
        )}
      </div>

      {/* Comments Section */}
      <div className="w-full md:w-[400px] flex flex-col bg-white border-r">
        {/* Creator Info - Desktop only header */}
        <div className="hidden md:flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <img 
              src={creator.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${creator.username}`} 
              className="w-10 h-10 rounded-full object-cover" 
              onClick={() => onUserProfileClick(creator.id)}
            />
            <span className="font-bold hover:underline cursor-pointer" onClick={() => onUserProfileClick(creator.id)}>
              {creator.username}
            </span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Post Caption (Optional) */}
        {meme.caption && (
          <div className="p-4 border-b bg-gray-50/50">
            <div className="flex gap-3">
              <img 
                src={creator.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${creator.username}`} 
                className="w-8 h-8 rounded-full shrink-0" 
              />
              <p className="text-sm leading-relaxed">{DOMPurify.sanitize(meme.caption)}</p>
            </div>
          </div>
        )}

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-xs">جاري تحميل الردود...</span>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p className="text-sm">مفيش تعليقات لسه، كن أول من يضحك!</p>
            </div>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex gap-3">
                <img 
                  src={c.profiles?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${c.profiles?.username}`} 
                  className="w-8 h-8 rounded-full object-cover shrink-0" 
                />
                <div className="flex-1">
                  <div className="bg-gray-100 p-3 rounded-2xl rounded-tr-none">
                    <div className="font-bold text-xs mb-1">{c.profiles?.username}</div>
                    <div className="text-sm text-gray-800">{DOMPurify.sanitize(c.content)}</div>
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1 mr-2">
                    {new Date(c.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Actions & Input */}
        <div className="border-t p-4 bg-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button onClick={() => onLikeToggle(meme.id)} className={meme.liked_by_me ? "text-red-500" : "text-gray-700"}>
                <Heart className={`w-6 h-6 ${meme.liked_by_me ? "fill-current" : ""}`} />
              </button>
              <button className="text-gray-700"><MessageCircle className="w-6 h-6" /></button>
              <button onClick={() => onShare(meme.id)} className="text-gray-700"><Share2 className="w-6 h-6" /></button>
            </div>
            <button onClick={() => onSaveToggle(meme.id)} className={meme.saved_by_me ? "text-orange-500" : "text-gray-700"}>
              <Bookmark className={`w-6 h-6 ${meme.saved_by_me ? "fill-current" : ""}`} />
            </button>
          </div>
          <div className="text-xs font-bold mb-4">{meme.likes_count} إعجاب</div>

          <form onSubmit={handleAddComment} className="flex gap-2">
            <input 
              type="text" 
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="اكتب تعليقك هنا..." 
              className="flex-1 bg-gray-100 border-none rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button 
              type="submit" 
              disabled={!newComment.trim() || submitting}
              className="bg-blue-600 text-white p-2 rounded-full disabled:opacity-50 transition-all active:scale-90"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

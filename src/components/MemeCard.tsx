import React, { useState, useEffect } from "react";
import { 
  Heart, MessageCircle, Share2, Bookmark, 
  Send, Trash2, AlertOctagon, UserPlus, Eye, 
  Sparkles, Check, Frown, ShieldAlert, PlusCircle
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
  
  // Comment rate limit error / state
  const [commentError, setCommentError] = useState("");
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [saveAnimating, setSaveAnimating] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportedMessage, setReportedMessage] = useState("");
  const [shareSuccess, setShareSuccess] = useState(false);

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

  const handleLike = () => {
    setLikeAnimating(true);
    onLikeToggle(meme.id);
    setTimeout(() => setLikeAnimating(false), 500);
  };

  const handleSave = () => {
    setSaveAnimating(true);
    onSaveToggle(meme.id);
    setTimeout(() => setSaveAnimating(false), 500);
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    try {
      setCommentError("");
      const added = await dataService.addComment(meme.id, currentUser.id, newCommentText.trim());
      setCommentsList((prev) => [...prev, added]);
      setNewCommentText("");
      // Refresh likes/points inside parent
      onLikeToggle(""); // minor refresh hook or trigger
    } catch (err: any) {
      // Catch Egypt Anti-Spam warning!
      setCommentError(err.message || "حدث خطأ في إضافة الكومنت.");
      setTimeout(() => setCommentError(""), 5000);
    }
  };

  const handleShareClick = () => {
    // Increment sharing counter via API
    onShareCompleted(meme.id);
    
    // Copy real link to the clipboard
    const shareLink = `${window.location.origin}/?meme=${meme.id}`;
    navigator.clipboard.writeText(shareLink).then(() => {
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 4000);
    }).catch(() => {
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 4000);
    });
  };

  const handleReport = (reason: string) => {
    onReportSubmit(meme.id, reason);
    setReportedMessage("تم الإبلاغ بنجاح للوزارة! سيقوم فريق الإشراف ببلع وتصفية الكرينج 🚨");
    setTimeout(() => {
      setShowReportModal(false);
      setReportedMessage("");
    }, 4000);
  };

  const parseCaption = (caption: string | null) => {
    if (!caption) return "";
    const words = caption.split(" ");
    return words.map((word, i) => {
      if (word.startsWith("#")) {
        const cleanTag = word.replace("#", "");
        return (
          <span
            key={i}
            onClick={() => onTagClick(cleanTag)}
            className="text-blue-600 hover:underline hover:text-blue-700 cursor-pointer text-xs font-bold font-mono ml-1"
          >
            {word}
          </span>
        );
      }
      return word + " ";
    });
  };

  const creator = meme.profiles || {
    id: meme.user_id,
    username: "ميمر_مجهول",
    avatar_url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde",
    meme_level: "مبتدئ سكرولر"
  };

  const formatViews = (views: number) => {
    if (views >= 1000) return `${(views / 1000).toFixed(1)}k مشاهدة`;
    return `${views} مشاهدة`;
  };

  return (
    <article className="bg-white border-b border-gray-200 text-right flex flex-col mb-0 transition-all shadow-sm hover:shadow-md">
      <div className="flex gap-3 p-4">
        {/* Left Column (Threads Style Line) */}
        <div className="flex flex-col items-center gap-2 shrink-0">
          <div className="relative">
            <div 
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => onUserProfileClick(creator.id)}
            >
              {creator.avatar_url ? (
                <img
                  src={creator.avatar_url}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover border border-gray-100"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-200 text-gray-600 font-bold flex items-center justify-center text-xs">
                  {creator.username[0]}
                </div>
              )}
            </div>
            {!isFollowingCreator && currentUser.id !== creator.id && (
              <button 
                onClick={() => onFollowToggle(currentUser.id, creator.id)}
                className="absolute -bottom-1 -left-1 bg-black text-white rounded-full w-4 h-4 flex items-center justify-center border-2 border-white hover:scale-110 transition-transform"
              >
                <PlusCircle className="w-3 h-3" />
              </button>
            )}
            {isFollowingCreator && currentUser.id !== creator.id && (
              <div className="absolute -bottom-1 -left-1 bg-green-500 text-white rounded-full w-4 h-4 flex items-center justify-center border-2 border-white">
                <Check className="w-2.5 h-2.5" />
              </div>
            )}
          </div>
          <div className="w-0.5 grow bg-gray-100 rounded-full"></div>
          <div className="flex -space-x-1.5 rtl:space-x-reverse mb-1">
            <div className="w-4 h-4 rounded-full bg-gray-200 border border-white"></div>
            <div className="w-4 h-4 rounded-full bg-gray-300 border border-white"></div>
          </div>
        </div>

        {/* Right Column (Content) */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <span 
                className="font-bold text-sm text-gray-900 hover:underline cursor-pointer"
                onClick={() => onUserProfileClick(creator.id)}
              >
                {creator.username}
              </span>
              <span className="text-gray-400 text-xs">
                {new Date(meme.created_at).toLocaleDateString("ar-EG", { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {(currentUser.id === creator.id || currentUser.role === "admin") && (
                <button 
                  onClick={() => onDeleteMeme(meme.id)} 
                  className="text-gray-400 hover:text-red-500 transition-colors"
                  title="حذف الميم"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button onClick={() => setShowReportModal(true)} className="text-gray-400 hover:text-gray-600">
                <AlertOctagon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {meme.caption && (
            <div className="text-sm text-gray-800 leading-relaxed mb-3">
              {parseCaption(meme.caption)}
            </div>
          )}

          {meme.image_url && (
            <div 
              className="rounded-xl border border-gray-200 overflow-hidden mb-3 max-h-[500px] w-full bg-gray-50 flex justify-center cursor-pointer hover:opacity-90 transition-opacity group"
              onClick={() => {
                try {
                  if (onImageClick) {
                    onImageClick(meme.image_url);
                  }
                } catch (err) {
                  console.error("Error opening image:", err);
                }
              }}
            >
              <img
                src={meme.image_url}
                alt=""
                className="max-w-full max-h-[500px] object-contain group-hover:scale-105 transition-transform duration-200"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  console.error("Image failed to load:", meme.image_url);
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23f0f0f0" width="100" height="100"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="%23999" font-size="12"%3EImage Error%3C/text%3E%3C/svg%3E';
                }}
              />
            </div>
          )}

          {/* Action Buttons (Threads Style) */}
          <div className="flex items-center gap-4 py-1">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1 hover:scale-110 transition-transform ${meme.liked_by_me ? "text-red-500" : "text-gray-800"}`}
            >
              <Heart className={`w-5 h-5 ${meme.liked_by_me ? "fill-red-500" : ""}`} />
            </button>
            <button
              onClick={() => setShowComments(!showComments)}
              className="flex items-center gap-1 hover:scale-110 transition-transform text-gray-800"
            >
              <MessageCircle className="w-5 h-5" />
            </button>
            <button
              onClick={handleShareClick}
              className="flex items-center gap-1 hover:scale-110 transition-transform text-gray-800"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <button
              onClick={handleSave}
              className={`flex items-center gap-1 hover:scale-110 transition-transform ${meme.saved_by_me ? "text-orange-500" : "text-gray-800"}`}
            >
              <Bookmark className={`w-5 h-5 ${meme.saved_by_me ? "fill-orange-500" : ""}`} />
            </button>
          </div>

          <div className="flex items-center gap-2 mt-2 text-xs text-gray-400 font-medium">
            <span>{meme.likes_count} إعجاب</span>
            <span>•</span>
            <button onClick={() => setShowComments(!showComments)} className="hover:underline">
              {meme.comments_count} ردود
            </button>
          </div>
        </div>
      </div>

      {/* Copy Share Toast feedback */}
      {shareSuccess && (
        <div className="bg-green-50 border-y border-green-100 px-4 py-2 text-xs text-green-700 font-extrabold flex items-center justify-between animate-fade-in">
          <span>تم نسخ رابط الميم بنجاح يا ميمر يا رايق! ابعته لصحابك يفرفشوا معاك 🚀🔗</span>
          <Check className="w-4 h-4 text-green-600" />
        </div>
      )}

      {/* Warning/Alert message triggers (e.g. rate limit error warning) */}
      {commentError && (
        <div className="bg-red-50 border-y border-red-100 px-4 py-2.5 text-xs text-red-700 font-bold flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0 text-red-600" />
          <span className="flex-1">{commentError}</span>
        </div>
      )}

      {/* Comments Drawer Tab */}
      {showComments && (
        <div className="bg-gray-50/50 p-4 border-t border-gray-100 flex flex-col gap-3">
          {/* List existing comments */}
          <div className="flex flex-col gap-2.5">
            {loadingComments ? (
              <div className="text-center py-4 text-xs text-gray-400">تحميل الكمنتات...</div>
            ) : commentsList.length === 0 ? (
              <div className="text-center py-5 text-xs text-gray-400 flex flex-col items-center gap-1.5">
                <Frown className="w-5 h-5 text-gray-300" />
                <span>مفيش كومنتات خالص، خش اكتب أول إفيه يا كبير!</span>
              </div>
            ) : (
              commentsList.map((notifComment) => {
                const commentUser = notifComment.profiles || {
                  id: notifComment.user_id,
                  username: "ميمر_نشط",
                  avatar_url: null,
                  meme_level: "مبتدئ سكرولر"
                };

                return (
                  <div key={notifComment.id} className="flex items-start gap-2 text-right group">
                    {commentUser.avatar_url ? (
                      <img
                        src={commentUser.avatar_url}
                        alt=""
                        className="w-8 h-8 rounded-lg object-cover mt-0.5 border border-gray-100"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-gray-200 text-gray-600 flex items-center justify-center font-bold text-[10px] mt-0.5 shrink-0">
                        C
                      </div>
                    )}

                    <div className="flex-1 bg-gray-100 p-2.5 rounded-2xl relative">
                      <div className="flex items-center justify-between gap-2 max-w-full">
                        <div className="flex items-center gap-1">
                          <span className="font-extrabold text-xs text-gray-900">{commentUser.username}</span>
                          <span className="text-[8px] bg-white text-gray-400 px-1 py-0.5 rounded border border-gray-100">
                            {commentUser.meme_level.split(" ")[0]}
                          </span>
                        </div>
                        
                        {/* Allowed to delete or is admin */}
                        {(currentUser.id === commentUser.id || currentUser.role === "admin") && (
                          <button
                            onClick={async () => {
                              const success = await dataService.deleteComment(notifComment.id);
                              if (success) {
                                setCommentsList(commentsList.filter(c => c.id !== notifComment.id));
                                onDeleteComment(notifComment.id);
                              }
                            }}
                            className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-0.5"
                            title="حذف هذا الكمنت"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-gray-800 font-medium leading-relaxed mt-1">{notifComment.content}</p>
                      <span className="text-[8px] text-gray-400 block mt-1">
                        {new Date(notifComment.created_at).toLocaleTimeString("ar-EG", {
                          hour: 'numeric', minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* New comment input bar */}
          <form onSubmit={handlePostComment} className="flex gap-2.5 mt-2">
            <input
              type="text"
              placeholder="اكتب إفّييه أو تعليق مضحك..."
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              className="flex-1 bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 px-4 py-2 rounded-xl text-xs sm:text-sm text-gray-900 font-bold placeholder:text-gray-400"
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white w-9 h-9 rounded-xl flex items-center justify-center shrink-0 cursor-pointer shadow-sm shadow-blue-100 hover:scale-105 transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Funny Egyptian Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-right border border-gray-100 shadow-2xl relative">
            <h3 className="font-extrabold text-lg text-gray-900 flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 text-red-500 shrink-0" />
              <span>إبلاغ طوارئ للوزارة</span>
            </h3>
            
            {reportedMessage ? (
              <div className="py-8 text-center text-green-600 font-black text-sm flex flex-col items-center gap-3">
                <Sparkles className="w-8 h-8 text-yellow-500 animate-spin" />
                <span>{reportedMessage}</span>
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-500 mt-2 font-semibold">
                  شايف الميم ده مش مظبوط؟ قرر السبب وهنبعته للجنة الفرز والمراقبة تمسحه فورًا:
                </p>

                <div className="flex flex-col gap-2 mt-4">
                  {[
                    "يا باشا ميم بايخ جدًا ومحتاج رشة إبداع 🥱",
                    "مسروق قص ولصق من صفحات تويتر وفسيبوك ⚠️",
                    "بياخة مفرطة ممكن تسبب تصلب شرايين وجلطات من الضحك الفاشل 🏥",
                    "ألفاظ فجة وتجاوزات تضر بالصحة العامة 🤫",
                    "محتوى ممل ومخالف لسياسات الكرامة الفكاهية ❌"
                  ].map((val, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleReport(val)}
                      className="w-full text-right p-3 rounded-xl border border-gray-100 hover:border-red-100 hover:bg-red-50/40 text-xs font-bold text-gray-700 transition-all cursor-pointer"
                    >
                      {val}
                    </button>
                  ))}
                </div>

                <div className="mt-5 flex gap-2">
                  <button
                    onClick={() => setShowReportModal(false)}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    إلغاء الأمر
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

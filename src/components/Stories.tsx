import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, X, ChevronLeft, ChevronRight, Type, Video, Eye } from "lucide-react";
import { Story, Profile } from "../types";
import { dataService } from "../services/dataService";
import { socialService } from "../services/socialService";

interface StoriesProps {
  currentUser: Profile;
}

// أقصى مدة مسموحة لفيديو الحالة (بالثواني)
const MAX_STORY_VIDEO_SECONDS = 60;

// إيموجيهات التفاعل السريع بستايل واتساب
const QUICK_REACTIONS = ["❤️", "😂", "😮", "😢", "👏", "🔥"];

/**
 * توقيت نسبي حقيقي بالعربي بدل ما كانت كل الحالات مكتوب عليها "قبل قليل"
 * بشكل ثابت مهما كان وقتها الفعلي.
 */
function relativeTimeAr(dateStr: string): string {
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return "الآن";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `من ${diffMin} ${diffMin === 1 ? "دقيقة" : "دقايق"}`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `من ${diffHour} ${diffHour === 1 ? "ساعة" : "ساعات"}`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 2) return "امبارح";
  return date.toLocaleDateString("ar-EG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

export default function Stories({ currentUser }: StoriesProps) {
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploadStage, setUploadStage] = useState<string>("");
  // بستايل واتساب: الحالات اللي اتشافت فعلياً (محفوظة في الداتابيز، مش بترجع تختفي بعد ريفريش)
  const [viewedStoryIds, setViewedStoryIds] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createMode, setCreateMode] = useState<'image' | 'video' | 'text' | null>(null);
  const [textContent, setTextContent] = useState("");
  const [textBgColor, setTextBgColor] = useState("#1877F2");
  const [textFontSize, setTextFontSize] = useState(32);
  const [myReactions, setMyReactions] = useState<Record<string, string>>({});
  const [reactionFeedback, setReactionFeedback] = useState<string | null>(null);
  const [showViewers, setShowViewers] = useState(false);
  const [viewersList, setViewersList] = useState<{ viewer: Profile; emoji: string | null; viewedAt: string }[]>([]);
  const [loadingViewers, setLoadingViewers] = useState(false);

  const isRealUser = currentUser?.id && currentUser.id !== "guest-user-temp";

  // 1. تحميل الحالات + الحالات اللي المستخدم شافها فعلياً + تفاعلاته من قبل
  useEffect(() => {
    loadStories();
    if (isRealUser) {
      socialService.getViewedStoryIds(currentUser.id).then(ids => setViewedStoryIds(new Set(ids)));
      socialService.getMyStoryReactions(currentUser.id).then(setMyReactions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.id]);

  const loadStories = async () => {
    try {
      const data = await socialService.getStories();
      setStories(data || []);
    } catch (e) {
      console.error(e);
      setStories([]);
    }
  };

  // 2. تجميع الحالات حسب صاحبها
  const userStories = useMemo(() => {
    return (stories || []).reduce((acc, story) => {
      const uid = story?.user_id;
      if (!uid) return acc;
      if (!acc[uid]) acc[uid] = [];
      acc[uid].push(story);
      return acc;
    }, {} as Record<string, Story[]>);
  }, [stories]);

  const currentUserStories = useMemo(() => {
    return selectedStory ? userStories[selectedStory.user_id] || [] : [];
  }, [selectedStory, userStories]);

  // منع تمرير الصفحة الرئيسية لما يكون فيه حالة أو مودال إنشاء مفتوح
  useEffect(() => {
    const shouldLock = !!selectedStory || showCreateModal;
    document.body.style.overflow = shouldLock ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [selectedStory, showCreateModal]);

  // تسجيل المشاهدة فعلياً في الداتابيز أول ما الحالة تتفتح
  const markViewed = (story: Story) => {
    setViewedStoryIds(prev => new Set(prev).add(story.id));
    if (isRealUser) socialService.markStoryViewed(story.id, currentUser.id);
  };

  const openStory = (story: Story, index: number) => {
    setSelectedStory(story);
    setSelectedStoryIndex(index);
    markViewed(story);
  };

  const goToIndex = (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= currentUserStories.length) return;
    const next = currentUserStories[nextIndex];
    setSelectedStory(next);
    setSelectedStoryIndex(nextIndex);
    markViewed(next);
  };

  // 3. التنقل بالكيبورد
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedStory) return;
      if (e.key === "Escape") setSelectedStory(null);
      if (e.key === "ArrowLeft") goToIndex(selectedStoryIndex - 1);
      if (e.key === "ArrowRight") goToIndex(selectedStoryIndex + 1);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStory, selectedStoryIndex, currentUserStories]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isRealUser) {
      alert("سجل دخول الأول يا بطل عشان ترفع حالة!");
      return;
    }

    // فحص مدة الفيديو للحالات - أقصى دقيقة واحدة (طلب صريح، الحالات بس مش المنشورات)
    if (file.type.startsWith("video/")) {
      const durationOk = await new Promise<boolean>((resolve) => {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.onloadedmetadata = () => {
          window.URL.revokeObjectURL(video.src);
          resolve(video.duration <= MAX_STORY_VIDEO_SECONDS);
        };
        video.onerror = () => resolve(false);
        video.src = URL.createObjectURL(file);
      });
      if (!durationOk) {
        alert("فيديو الحالة لازم يكون دقيقة أو أقل.");
        return;
      }
    }

    setLoading(true);
    setUploadStage("جاري رفع الملف...");
    try {
      const url = await dataService.uploadMemeFile(file);
      const type = file.type.startsWith('video/') ? 'video' : 'image';
      setUploadStage("جاري نشر الحالة...");
      await socialService.createStory(currentUser.id, url, type);
      await loadStories();
      setShowCreateModal(false);
      setCreateMode(null);
    } catch (e) {
      console.error("Story upload error:", e);
      alert("فشل رفع الحالة، اتأكد إنك عامل تسجيل دخول حقيقي.");
    } finally {
      setLoading(false);
      setUploadStage("");
    }
  };

  const handleTextStory = async () => {
    if (!textContent.trim()) {
      alert("اكتب نص الحالة الأول!");
      return;
    }
    if (!isRealUser) {
      alert("سجل دخول الأول يا بطل عشان ترفع حالة!");
      return;
    }

    setLoading(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.fillStyle = textBgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${textFontSize * 2}px Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const words = textContent.split(' ');
        let line = '';
        const lines: string[] = [];
        const maxWidth = canvas.width - 160;

        words.forEach(word => {
          const testLine = line + word + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && line) {
            lines.push(line);
            line = word + ' ';
          } else {
            line = testLine;
          }
        });
        lines.push(line);

        const lineHeight = textFontSize * 2 + 20;
        let y = canvas.height / 2 - ((lines.length - 1) * lineHeight) / 2;
        lines.forEach(l => {
          ctx.fillText(l.trim(), canvas.width / 2, y);
          y += lineHeight;
        });
      }

      canvas.toBlob(async (blob) => {
        if (blob) {
          const file = new File([blob], 'text-story.png', { type: 'image/png' });
          const url = await dataService.uploadMemeFile(file);
          await socialService.createStory(currentUser.id, url, 'image');
          await loadStories();
          setShowCreateModal(false);
          setCreateMode(null);
          setTextContent("");
        }
        setLoading(false);
      });
    } catch (e) {
      console.error("Text story error:", e);
      alert("فشل إنشاء حالة النص");
      setLoading(false);
    }
  };

  const handleReact = async (emoji: string) => {
    if (!selectedStory) return;
    if (!isRealUser) {
      alert("سجل دخول الأول عشان تتفاعل مع الحالة!");
      return;
    }
    setMyReactions(prev => ({ ...prev, [selectedStory.id]: emoji }));
    setReactionFeedback(emoji);
    setTimeout(() => setReactionFeedback(null), 900);
    try {
      await socialService.reactToStory(selectedStory.id, currentUser.id, emoji);
    } catch (e) {
      console.error("Story reaction error:", e);
    }
  };

  // إغلاق قائمة المشاهدين تلقائياً لما تتنقل بين الحالات
  useEffect(() => { setShowViewers(false); }, [selectedStory?.id]);

  const openViewersPanel = async () => {
    if (!selectedStory) return;
    setShowViewers(true);
    setLoadingViewers(true);
    try {
      const list = await socialService.getStoryViewersWithReactions(selectedStory.id);
      setViewersList(list);
    } catch (e) {
      console.error("Error loading story viewers:", e);
    } finally {
      setLoadingViewers(false);
    }
  };

  return (
    <>
      <div className="flex gap-3 overflow-x-auto p-4 bg-white border border-gray-100 rounded-3xl shadow-sm m-3 no-scrollbar">
        {/* Add Story */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <button
            onClick={() => setShowCreateModal(true)}
            className="relative cursor-pointer group"
          >
            <img
              src={currentUser?.avatar_url || ""}
              className="w-14 h-14 rounded-full border-2 border-gray-200 object-cover group-hover:border-blue-500 transition-colors"
              alt="قصتك"
            />
            <div className="absolute bottom-0 right-0 bg-blue-500 text-white rounded-full p-0.5 border-2 border-white group-hover:bg-blue-600 transition-colors">
              <Plus className="w-3 h-3" />
            </div>
          </button>
          <span className="text-[10px] text-gray-500">قصتك</span>
        </div>

        {/* User Stories */}
        {Object.entries(userStories).map(([uid, uStories]) => {
          const isFullyViewed = uStories.every(s => viewedStoryIds.has(s.id));
          return (
            <div
              key={uid}
              className="flex flex-col items-center gap-1 shrink-0 cursor-pointer group"
              onClick={() => openStory(uStories[0], 0)}
            >
              <div className={
                isFullyViewed
                  ? "p-0.5 rounded-full border-2 border-gray-300 group-hover:border-gray-400 transition-colors relative"
                  : "p-[3px] rounded-full bg-gradient-to-tr from-amber-400 via-pink-500 to-blue-500 group-hover:opacity-90 transition-opacity relative"
              }>
                <img
                  src={uStories[0]?.profiles?.avatar_url || ""}
                  className="w-14 h-14 rounded-full border-2 border-white object-cover group-hover:scale-105 transition-transform"
                  alt={uStories[0]?.profiles?.username || "مستخدم"}
                />
                {/* شارة عدد الحالات لما يكون عند الشخص أكتر من حالة واحدة */}
                {uStories.length > 1 && (
                  <span className="absolute -bottom-0.5 -left-0.5 bg-blue-500 text-white text-[9px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center border-2 border-white px-1">
                    {uStories.length}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-gray-900 truncate w-14 text-center group-hover:text-blue-600 transition-colors">
                {uStories[0]?.profiles?.username || "مستخدم"}
              </span>
            </div>
          );
        })}
      </div>

      {/* عارض الحالات - شاشة كاملة زي فيسبوك/واتساب */}
      {selectedStory && (
        <div
          className="fixed inset-0 z-[100] bg-black flex flex-col select-none"
          onClick={() => setSelectedStory(null)}
        >
          {/* شريط التقدم المقسّم بستايل واتساب/انستجرام */}
          <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 p-2 pt-3">
            {currentUserStories.map((_, i) => (
              <div key={i} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-300 rounded-full"
                  style={{ width: i < selectedStoryIndex ? "100%" : i === selectedStoryIndex ? "100%" : "0%" }}
                />
              </div>
            ))}
          </div>

          {/* هيدر الحالة بستايل واتساب: أفاتار + اسم + وقت حقيقي + إغلاق */}
          <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/70 via-black/30 to-transparent pt-7 pb-6 px-3 flex items-center gap-3">
            <img
              src={selectedStory?.profiles?.avatar_url || ""}
              className="w-9 h-9 rounded-full border-2 border-white object-cover"
              alt="الملف الشخصي"
            />
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-bold truncate">{selectedStory?.profiles?.username || "مستخدم"}</p>
              <p className="text-white/70 text-xs">{relativeTimeAr(selectedStory.created_at)}</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setSelectedStory(null); }}
              className="text-white bg-white/10 hover:bg-white/20 p-2.5 rounded-full transition-all"
              title="إغلاق (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* منطقة عرض الميديا - شاشة كاملة فعلياً */}
          <div className="relative flex-1 flex items-center justify-center overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <AnimatePresence mode="wait">
              {selectedStory?.media_type === 'video' ? (
                <motion.video
                  key={selectedStory.id}
                  src={selectedStory?.media_url}
                  autoPlay
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="w-full h-full object-contain"
                  controls
                  onEnded={() => goToIndex(selectedStoryIndex + 1)}
                />
              ) : (
                <motion.img
                  key={selectedStory.id}
                  src={selectedStory?.media_url}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="w-full h-full object-contain"
                  alt="قصة"
                />
              )}
            </AnimatePresence>

            {/* منطقة لمس شفافة للتنقل - يمين/شمال زي واتساب وفيسبوك */}
            <button
              onClick={(e) => { e.stopPropagation(); goToIndex(selectedStoryIndex - 1); }}
              className="absolute left-0 top-0 bottom-0 w-1/3 flex items-center justify-start pl-2 opacity-0 hover:opacity-100 transition-opacity"
              disabled={selectedStoryIndex === 0}
            >
              {selectedStoryIndex > 0 && (
                <span className="bg-white/20 text-white p-2 rounded-full"><ChevronLeft className="w-5 h-5" /></span>
              )}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); goToIndex(selectedStoryIndex + 1); }}
              className="absolute right-0 top-0 bottom-0 w-1/3 flex items-center justify-end pr-2 opacity-0 hover:opacity-100 transition-opacity"
              disabled={selectedStoryIndex === currentUserStories.length - 1}
            >
              {selectedStoryIndex < currentUserStories.length - 1 && (
                <span className="bg-white/20 text-white p-2 rounded-full"><ChevronRight className="w-5 h-5" /></span>
              )}
            </button>

            {/* تفاعل طائر بستايل واتساب لما تدوس على إيموجي */}
            {reactionFeedback && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-7xl animate-ping-once">{reactionFeedback}</span>
              </div>
            )}
          </div>

          {/* لصاحب الحالة بس: زرار يشوف بيه مين شافها ومين تفاعل معاها */}
          {selectedStory.user_id === currentUser.id && (
            <button
              onClick={(e) => { e.stopPropagation(); openViewersPanel(); }}
              className="relative z-20 flex items-center justify-center gap-2 text-white/90 text-xs font-bold px-4 pb-2 pt-3 bg-gradient-to-t from-black/70 to-transparent"
            >
              <Eye className="w-4 h-4" />
              <span>مين شاف الحالة دي</span>
            </button>
          )}

          {/* شريط التفاعلات السريعة بستايل واتساب في الأسفل */}
          <div
            className="relative z-20 flex items-center justify-center gap-3 px-4 pb-6 pt-3 bg-gradient-to-t from-black/70 via-black/30 to-transparent"
            onClick={(e) => e.stopPropagation()}
          >
            {QUICK_REACTIONS.map(emoji => (
              <button
                key={emoji}
                onClick={() => handleReact(emoji)}
                className={`text-2xl w-11 h-11 flex items-center justify-center rounded-full transition-all active:scale-90 ${
                  myReactions[selectedStory.id] === emoji ? "bg-white/30 scale-110" : "bg-white/10 hover:bg-white/20"
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* قائمة مين شاف الحالة وتفاعل معاها - لصاحب الحالة بس */}
          {showViewers && (
            <div
              className="absolute inset-0 z-30 bg-black/70 flex items-end"
              onClick={(e) => { e.stopPropagation(); setShowViewers(false); }}
            >
              <div
                className="w-full bg-white dark:bg-gray-900 rounded-t-3xl max-h-[70vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
                  <h3 className="font-bold text-gray-900 dark:text-white">مشاهدات الحالة ({viewersList.length})</h3>
                  <button onClick={() => setShowViewers(false)} className="text-gray-500 p-1">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="overflow-y-auto flex-1">
                  {loadingViewers ? (
                    <div className="p-8 flex justify-center">
                      <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                    </div>
                  ) : viewersList.length === 0 ? (
                    <p className="text-center text-sm text-gray-500 p-8">لسه محدش شاف الحالة دي</p>
                  ) : (
                    viewersList.map((v, i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
                        <img src={v.viewer?.avatar_url || ""} className="w-10 h-10 rounded-full object-cover" alt="" />
                        <span className="flex-1 font-bold text-sm text-gray-900 dark:text-white">{v.viewer?.username || "مستخدم"}</span>
                        {v.emoji && <span className="text-xl">{v.emoji}</span>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* مودال إنشاء حالة جديدة */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
          {loading && createMode !== 'text' && (
            <div className="absolute inset-0 z-10 bg-black/80 flex flex-col items-center justify-center gap-3">
              <div className="w-10 h-10 border-4 border-white/20 border-t-blue-400 rounded-full animate-spin" />
              <p className="text-sm font-bold text-white">{uploadStage || "جاري الرفع..."}</p>
            </div>
          )}
          {!createMode ? (
            <div className="bg-white dark:bg-gray-900 w-full h-full flex flex-col">
              <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">إنشاء حالة جديدة</h2>
                <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-gray-900 dark:hover:text-white p-2">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-3 flex-1">
                <label className="block">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { setCreateMode('image'); handleFileUpload(e); }}
                    disabled={loading}
                  />
                  <div className="flex items-center gap-4 p-4 border-2 border-dashed border-blue-300 rounded-xl cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                      <img className="w-6 h-6" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%231877F2'%3E%3Crect x='3' y='3' width='18' height='18' rx='2'/%3E%3Ccircle cx='9' cy='9' r='2' fill='white'/%3E%3Cpath d='M3 15l6-6 9 9' stroke='white' stroke-width='2' fill='none'/%3E%3C/svg%3E" alt="صورة" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">صورة</p>
                      <p className="text-xs text-gray-500">اختر صورة من جهازك</p>
                    </div>
                  </div>
                </label>

                <label className="block">
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => { setCreateMode('video'); handleFileUpload(e); }}
                    disabled={loading}
                  />
                  <div className="flex items-center gap-4 p-4 border-2 border-dashed border-purple-300 rounded-xl cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-950 transition-colors">
                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                      <Video className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">فيديو</p>
                      <p className="text-xs text-gray-500">أقصى مدة دقيقة واحدة</p>
                    </div>
                  </div>
                </label>

                <button
                  onClick={() => setCreateMode('text')}
                  className="flex items-center gap-4 p-4 border-2 border-dashed border-green-300 rounded-xl cursor-pointer hover:bg-green-50 dark:hover:bg-green-950 transition-colors w-full"
                >
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                    <Type className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">نص</p>
                    <p className="text-xs text-gray-500">اكتب نص ملون بخلفية من اختيارك</p>
                  </div>
                </button>
              </div>
            </div>
          ) : createMode === 'text' ? (
            // محرر نص بستايل واتساب: شاشة كاملة، الخلفية اللونية تملأ الشاشة، الكتابة فوقها مباشرة
            <div className="w-full h-full flex flex-col relative" style={{ backgroundColor: textBgColor }}>
              <div className="relative z-10 flex items-center justify-between p-4">
                <button onClick={() => setCreateMode(null)} className="text-white bg-black/20 hover:bg-black/30 p-2.5 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
                <div className="flex gap-2">
                  {['#1877F2', '#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181', '#111827'].map(color => (
                    <button
                      key={color}
                      onClick={() => setTextBgColor(color)}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${textBgColor === color ? 'border-white scale-110' : 'border-white/40'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex-1 flex items-center justify-center px-8">
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="اكتب نصك هنا"
                  autoFocus
                  className="w-full bg-transparent border-none outline-none resize-none text-white font-bold text-center placeholder-white/60"
                  style={{ fontSize: `${textFontSize}px`, minHeight: "40%" }}
                />
              </div>

              <div className="relative z-10 p-4 flex items-center gap-3">
                <span className="text-white text-sm">حجم الخط</span>
                <input
                  type="range"
                  min="16"
                  max="64"
                  value={textFontSize}
                  onChange={(e) => setTextFontSize(Number(e.target.value))}
                  className="flex-1"
                />
                <button
                  onClick={handleTextStory}
                  disabled={loading || !textContent.trim()}
                  className="bg-white text-gray-900 disabled:bg-white/40 disabled:text-white font-bold px-6 py-2.5 rounded-full transition-colors shrink-0"
                >
                  {loading ? "..." : "نشر"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </>
  );
}

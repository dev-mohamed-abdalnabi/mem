import React, { useState, useEffect, useMemo } from "react";
import { Plus, X, ChevronLeft, ChevronRight, Type, Video } from "lucide-react";
import { Story, Profile } from "../types";
import { dataService } from "../services/dataService";
import { socialService } from "../services/socialService";

interface StoriesProps {
  currentUser: Profile;
}

export default function Stories({ currentUser }: StoriesProps) {
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploadStage, setUploadStage] = useState<string>("");
  // شكل واتساب: حلقة ملونة للحالات اللي لسه ما اتشافتش، وحلقة رمادية للي اتشافت
  const [viewedUserIds, setViewedUserIds] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createMode, setCreateMode] = useState<'image' | 'video' | 'text' | null>(null);
  const [textContent, setTextContent] = useState("");
  const [textBgColor, setTextBgColor] = useState("#1877F2");
  const [textFontSize, setTextFontSize] = useState(32);

  // 1. Load stories once when the component mounts
  useEffect(() => {
    loadStories();
  }, []);

  const loadStories = async () => {
    try {
      const data = await socialService.getStories();
      // أمان: لو الداتا رجعت null خليها مصفوفة فاضية
      setStories(data || []);
    } catch (e) {
      console.error(e);
      setStories([]);
    }
  };

  // 2. Memoize derived data to prevent infinite re-renders & secure against nulls
  const userStories = useMemo(() => {
    return (stories || []).reduce((acc, story) => {
      const uid = story?.user_id;
      if (!uid) return acc; // أمان: تجاهل القصة لو ملهاش صاحب
      if (!acc[uid]) acc[uid] = [];
      acc[uid].push(story);
      return acc;
    }, {} as Record<string, Story[]>);
  }, [stories]);

  const currentUserStories = useMemo(() => {
    return selectedStory ? userStories[selectedStory.user_id] || [] : [];
  }, [selectedStory, userStories]);

  // 3. Handle keyboard navigation safely
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedStory) return;
      
      if (e.key === "Escape") {
        setSelectedStory(null);
      }
      if (e.key === "ArrowLeft" && selectedStoryIndex > 0) {
        setSelectedStoryIndex(prev => Math.max(0, prev - 1));
      }
      if (e.key === "ArrowRight" && selectedStoryIndex < currentUserStories.length - 1) {
        const nextIndex = selectedStoryIndex + 1;
        if (nextIndex < currentUserStories.length) {
          setSelectedStory(currentUserStories[nextIndex]);
          setSelectedStoryIndex(nextIndex);
        }
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedStory, selectedStoryIndex, currentUserStories]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (currentUser?.id === "guest-user-temp" || !currentUser?.id) {
      alert("سجل دخول الأول يا بطل عشان ترفع حالة!");
      return;
    }

    setLoading(true);
    setUploadStage("جاري رفع الملف...");
    try {
      const url = await dataService.uploadMemeFile(file);
      const type = file.type.startsWith('video/') ? 'video' : 'image';
      setUploadStage("جاري نشر الحالة...");
      await socialService.createStory(currentUser.id, url, type);
      await loadStories(); // Refresh stories after uploading
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

    if (currentUser?.id === "guest-user-temp" || !currentUser?.id) {
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
        ctx.font = `bold ${textFontSize}px Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const words = textContent.split(' ');
        let line = '';
        let y = canvas.height / 2 - (textFontSize * 2);
        const maxWidth = canvas.width - 100;
        
        words.forEach(word => {
          const testLine = line + word + ' ';
          const metrics = ctx.measureText(testLine);
          
          if (metrics.width > maxWidth && line) {
            ctx.fillText(line, canvas.width / 2, y);
            line = word + ' ';
            y += textFontSize + 20;
          } else {
            line = testLine;
          }
        });
        ctx.fillText(line, canvas.width / 2, y);
      }
      
      canvas.toBlob(async (blob) => {
        if (blob) {
          const file = new File([blob], 'text-story.png', { type: 'image/png' });
          const url = await dataService.uploadMemeFile(file);
          await socialService.createStory(currentUser.id, url, 'image');
          loadStories();
          setShowCreateModal(false);
          setCreateMode(null);
          setTextContent("");
        }
      });
    } catch (e) {
      console.error("Text story error:", e);
      alert("فشل إنشاء حالة النص");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* تم تعديل الحاوية هنا لتكون دائرية الحواف (rounded-3xl) مع هوامش (m-3) وظل (shadow-sm) */}
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
        {Object.entries(userStories).map(([uid, uStories]) => (
          <div 
            key={uid} 
            className="flex flex-col items-center gap-1 shrink-0 cursor-pointer group"
            onClick={() => {
              setSelectedStory(uStories[0]);
              setSelectedStoryIndex(0);
              setViewedUserIds(prev => new Set(prev).add(uid));
            }}
          >
            {/* حلقة بستايل واتساب: متدرجة وسميكة للحالات الجديدة، رمادية رفيعة بعد المشاهدة */}
            <div className={
              viewedUserIds.has(uid)
                ? "p-0.5 rounded-full border-2 border-gray-300 group-hover:border-gray-400 transition-colors"
                : "p-[3px] rounded-full bg-gradient-to-tr from-amber-400 via-pink-500 to-blue-500 group-hover:opacity-90 transition-opacity"
            }>
              <img 
                src={uStories[0]?.profiles?.avatar_url || ""} 
                className="w-14 h-14 rounded-full border-2 border-white object-cover group-hover:scale-105 transition-transform" 
                alt={uStories[0]?.profiles?.username || "مستخدم"}
              />
            </div>
            <span className="text-[10px] text-gray-900 truncate w-14 text-center group-hover:text-blue-600 transition-colors">
              {uStories[0]?.profiles?.username || "مستخدم"}
            </span>
          </div>
        ))}
      </div>

      {/* Story Viewer Modal - Facebook Style Lightbox */}
      {selectedStory && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center backdrop-blur-sm p-4" onClick={() => setSelectedStory(null)}>
          <button 
            onClick={() => setSelectedStory(null)} 
            className="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 p-3 rounded-full transition-all z-10 hover:scale-110 active:scale-95"
            title="إغلاق (Esc)"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="relative w-full max-w-md aspect-[9/16] bg-gray-900 rounded-2xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {selectedStory?.media_type === 'video' ? (
              <video 
                src={selectedStory?.media_url} 
                autoPlay 
                className="w-full h-full object-cover"
                controls
              />
            ) : (
              <img 
                src={selectedStory?.media_url} 
                className="w-full h-full object-cover cursor-pointer hover:brightness-95 transition-all" 
                alt="قصة"
              />
            )}

            <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 via-black/40 to-transparent p-4 flex items-center gap-3">
              <img 
                src={selectedStory?.profiles?.avatar_url || ""} 
                className="w-10 h-10 rounded-full border-2 border-white object-cover" 
                alt="الملف الشخصي"
              />
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-bold truncate">{selectedStory?.profiles?.username || "مستخدم"}</p>
                <p className="text-white/70 text-xs">قبل قليل</p>
              </div>
            </div>

            {currentUserStories.length > 1 && (
              <>
                <button
                  onClick={() => setSelectedStoryIndex(prev => Math.max(0, prev - 1))}
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-2.5 rounded-full transition-all disabled:opacity-30 hover:scale-110 active:scale-95"
                  disabled={selectedStoryIndex === 0}
                  title="السابق"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    const nextIndex = selectedStoryIndex + 1;
                    if (nextIndex < currentUserStories.length) {
                      setSelectedStory(currentUserStories[nextIndex]);
                      setSelectedStoryIndex(nextIndex);
                    }
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-2.5 rounded-full transition-all disabled:opacity-30 hover:scale-110 active:scale-95"
                  disabled={selectedStoryIndex === currentUserStories.length - 1}
                  title="التالي"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-xs bg-black/50 px-3 py-1.5 rounded-full font-bold border border-white/20">
                  {selectedStoryIndex + 1} / {currentUserStories.length}
                </div>
              </>
            )}

            <div className="absolute top-0 left-0 right-0 h-1 bg-white/20">
              <div 
                className="h-full bg-white transition-all duration-300"
                style={{ width: `${((selectedStoryIndex + 1) / Math.max(1, currentUserStories.length)) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Create Story Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden relative">
            {/* أوفرلاي تحميل واضح أثناء رفع صورة/فيديو - قبل كده الشاشة كانت واقفة ثابتة من غير أي مؤشر */}
            {loading && createMode !== 'text' && (
              <div className="absolute inset-0 z-10 bg-white/90 dark:bg-gray-900/90 flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
                <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{uploadStage || "جاري الرفع..."}</p>
              </div>
            )}
            {!createMode ? (
              <>
                <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">إنشاء حالة جديدة</h2>
                </div>
                <div className="p-6 space-y-3">
                  <label className="block">
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        setCreateMode('image');
                        handleFileUpload(e);
                      }}
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
                      onChange={(e) => {
                        setCreateMode('video');
                        handleFileUpload(e);
                      }}
                      disabled={loading}
                    />
                    <div className="flex items-center gap-4 p-4 border-2 border-dashed border-purple-300 rounded-xl cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-950 transition-colors">
                      <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                        <Video className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white">فيديو</p>
                        <p className="text-xs text-gray-500">اختر فيديو من جهازك</p>
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
                      <p className="text-xs text-gray-500">اكتب نص ملون</p>
                    </div>
                  </button>
                </div>
                <div className="p-4 border-t border-gray-200 dark:border-gray-800">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="w-full py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors font-bold"
                  >
                    إلغاء
                  </button>
                </div>
              </>
            ) : createMode === 'text' ? (
              <>
                <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">إنشاء حالة نصية</h2>
                </div>
                <div className="p-6 space-y-4">
                  <div 
                    className="w-full aspect-[9/16] rounded-lg flex items-center justify-center text-center p-6"
                    style={{ backgroundColor: textBgColor }}
                  >
                    <p 
                      className="text-white font-bold break-words"
                      style={{ fontSize: `${textFontSize}px` }}
                    >
                      {textContent || "اكتب نصك هنا"}
                    </p>
                  </div>

                  <textarea
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder="اكتب النص هنا..."
                    className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white resize-none h-24"
                  />

                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">لون الخلفية</label>
                    <div className="flex gap-2">
                      {['#1877F2', '#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181'].map(color => (
                        <button
                          key={color}
                          onClick={() => setTextBgColor(color)}
                          className={`w-10 h-10 rounded-lg transition-all ${textBgColor === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">حجم الخط: {textFontSize}px</label>
                    <input
                      type="range"
                      min="16"
                      max="64"
                      value={textFontSize}
                      onChange={(e) => setTextFontSize(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex gap-2">
                  <button
                    onClick={() => setCreateMode(null)}
                    className="flex-1 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors font-bold"
                  >
                    رجوع
                  </button>
                  <button
                    onClick={handleTextStory}
                    disabled={loading || !textContent.trim()}
                    className="flex-1 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded-lg transition-colors font-bold"
                  >
                    {loading ? "جاري الإنشاء..." : "نشر الحالة"}
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}

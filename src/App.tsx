import React, { useState, useEffect, useRef } from "react";
import { 
  Home, Flame, Trophy, Bookmark, Cpu, 
  AlertTriangle, ShieldAlert, Sparkles, X, 
  Clock, PlusCircle, CheckCircle2, Award, 
  HelpCircle, User, Image as ImageIcon, Edit3, 
  Video, Type, Camera, Play, ChevronRight, ChevronLeft
} from "lucide-react";

import { Profile, Meme, Notification, Report } from "./types";
import { dataService, calculateMemeLevel } from "./services/dataService";

import Header from "./components/Header.tsx";
import Sidebar from "./components/Sidebar.tsx";
import MemeCard from "./components/MemeCard.tsx";
import Leaderboard from "./components/Leaderboard.tsx";

const initialGuestProfile: Profile = {
  id: "guest-user-temp",
  username: "زائر_مجهول",
  avatar_url: "https://api.dicebear.com/7.x/bottts/svg?seed=guest",
  bio: "يتصفح كزائر. سجل حساب لرفع صور حقيقية ومزامنة نقاطك! 🚀",
  website: "",
  role: "user",
  meme_level: "زائر متصفح 👀",
  total_points: 0,
  followers_count: 0,
  following_count: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

// --- Story System Types (Frontend Mock) ---
type StoryType = "text" | "image" | "video";
interface Story {
  id: string;
  type: StoryType;
  content: string; // URL for image/video, or text for text stories
  bg_color?: string; // for text stories
  created_at: string;
}
interface UserStories {
  user: Profile;
  stories: Story[];
  hasUnseen: boolean;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("feed");
  const [currentUser, setCurrentUser] = useState<Profile>(initialGuestProfile);
  const [memes, setMemes] = useState<Meme[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [dbError, setDbError] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  // New Post State
  const [newPostImage, setNewPostImage] = useState("");
  const [newPostCaption, setNewPostCaption] = useState("");
  const [newPostTags, setNewPostTags] = useState("");
  const [postError, setPostError] = useState("");
  const [postSuccess, setPostSuccess] = useState(false);
  const [quickPostFile, setQuickPostFile] = useState<File | null>(null);

  // Auth Modal State
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTab, setAuthTab] = useState<"signin" | "signup">("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authUsername, setAuthUsername] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Level Up State
  const [prevPoints, setPrevPoints] = useState(0);
  const [showLevelUpAlert, setShowLevelUpAlert] = useState(false);
  const [newLevelName, setNewLevelName] = useState("");

  // --- Story System States ---
  const [mockStories, setMockStories] = useState<UserStories[]>([]);
  const [showStoryCreator, setShowStoryCreator] = useState(false);
  const [storyCreatorType, setStoryCreatorType] = useState<StoryType>("image");
  const [storyTextContent, setStoryTextContent] = useState("");
  const [storyFilePreview, setStoryFilePreview] = useState<string | null>(null);
  const [storyBgColor, setStoryBgColor] = useState("bg-blue-600");
  
  // Story Viewer States
  const [viewingUserIndex, setViewingUserIndex] = useState<number | null>(null);
  const [viewingStoryIndex, setViewingStoryIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    setDbError(null);
    try {
      const dbCurrentUser = await dataService.getCurrentUser();
      setCurrentUser(dbCurrentUser);
      setPrevPoints(dbCurrentUser.total_points);

      const dbMemes = await dataService.getMemes("approved", undefined, dbCurrentUser.id);
      setMemes(dbMemes);

      const dbProfiles = await dataService.getProfilesList();
      setProfiles(dbProfiles);

      const dbNotifs = await dataService.getNotifications(dbCurrentUser.id);
      setNotifications(dbNotifs);

      const dbFollowingIds = await dataService.getFollowingList(dbCurrentUser.id);
      setFollowingIds(dbFollowingIds);

      const savedReports = localStorage.getItem("memesbook_reports_list");
      setReports(savedReports ? JSON.parse(savedReports) : []);

      // Generate some mock stories for the UI presentation
      generateMockStories(dbProfiles);

    } catch (e: any) {
      setDbError(e.message || "فشلت الاتصالات المباشرة. يرجى تهيئة الجداول.");
    } finally {
      setLoading(false);
    }
  };

  const generateMockStories = (allProfiles: Profile[]) => {
    if(allProfiles.length < 2) return;
    const fakeStories: UserStories[] = [
      {
        user: allProfiles[1] || allProfiles[0],
        hasUnseen: true,
        stories: [
          { id: 's1', type: 'text', content: 'صباح الفل يا أحلى ميمرز! 🚀', bg_color: 'bg-indigo-600', created_at: new Date().toISOString() },
          { id: 's2', type: 'image', content: 'https://placehold.co/600x800/22c55e/FFF?text=Meme+Story', created_at: new Date().toISOString() }
        ]
      },
      {
        user: allProfiles[2] || allProfiles[0],
        hasUnseen: true,
        stories: [
          { id: 's3', type: 'text', content: 'حد صاحي نعمل شير للميمز؟ 👀', bg_color: 'bg-orange-500', created_at: new Date().toISOString() }
        ]
      }
    ];
    setMockStories(fakeStories);
  };

  const checkLevelUp = (oldPts: number, newPts: number) => {
    const getLevel = (pts: number) => {
      if (pts <= 50) return "مبتدئ سكرولر 🥱";
      if (pts <= 150) return "آكل فلافل متفاعل 🧆";
      if (pts <= 350) return "ملك التشيير واللايكات 👍";
      if (pts <= 700) return "أسطورة الكوميكس 🤩";
      if (pts <= 1500) return "بابا الميمز والممبرز 👑";
      return "إمبراطور الكوميديا الفاخرة ✨👑";
    };
    const oldLvl = getLevel(oldPts);
    const newLvl = getLevel(newPts);
    if (oldLvl !== newLvl) {
      setNewLevelName(newLvl);
      setShowLevelUpAlert(true);
    }
  };

  const updateUserPointsInState = (addedPoints: number) => {
    const oldPts = currentUser.total_points;
    const newPts = oldPts + addedPoints;
    const updatedUser = { ...currentUser, total_points: newPts, meme_level: calculateMemeLevel(newPts) };
    setCurrentUser(updatedUser);
    setProfiles((prev) => prev.map(p => p.id === currentUser.id ? updatedUser : p));
    localStorage.setItem("memesbook_current_user", JSON.stringify(updatedUser));
    checkLevelUp(oldPts, newPts);
  };

  const handleLikeToggle = async (memeId: string) => {
    try {
      const { liked, likesCount } = await dataService.toggleLike(memeId, currentUser.id);
      setMemes((prev) => prev.map((m) => m.id === memeId ? { ...m, likes_count: likesCount, liked_by_me: liked } : m));
      const targetMeme = memes.find(m => m.id === memeId);
      if (targetMeme && targetMeme.user_id === currentUser.id) updateUserPointsInState(liked ? 5 : -5);
    } catch (e) { console.error(e); }
  };

  const handleSaveToggle = async (memeId: string) => {
    try {
      const saved = await dataService.toggleSave(memeId, currentUser.id);
      setMemes((prev) => prev.map((m) => m.id === memeId ? { ...m, saves_count: saved ? m.saves_count + 1 : Math.max(0, m.saves_count - 1), saved_by_me: saved } : m));
    } catch (e) { console.error(e); }
  };

  const handleFollowToggle = async (followerId: string, followingId: string) => {
    try {
      if (followingIds.includes(followingId)) return; 
      const success = await dataService.followUser(followerId, followingId);
      if (success) {
        setFollowingIds((prev) => prev.includes(followingId) ? prev : [...prev, followingId]);
        setProfiles((prev) => prev.map((p) => {
          if (p.id === followerId) return { ...p, following_count: p.following_count + 1 };
          if (p.id === followingId) return { ...p, followers_count: p.followers_count + 1, total_points: p.total_points + 10 };
          return p;
        }));
        if (currentUser.id === followerId) {
          const updatedUser = { ...currentUser, following_count: currentUser.following_count + 1 };
          setCurrentUser(updatedUser);
        }
        if (currentUser.id === followingId) updateUserPointsInState(10);
      }
    } catch (e) { console.error(e); }
  };

  const handlePublishMeme = async (caption: string, imageUrl: string, tags: string[]) => {
    try {
      // Fix for NOT NULL constraints in DB: Always pass at least an empty string.
      // If the backend strictly refuses "", we use a transparent pixel as fallback.
      const safeImageUrl = imageUrl || "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
      const newMeme = await dataService.createMeme({
        user_id: currentUser.id,
        image_url: safeImageUrl,
        caption: caption || "",
        tags: tags || []
      });
      setMemes((prev) => [newMeme, ...prev]);
      updateUserPointsInState(5);
    } catch (err: any) {
      throw err;
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        setPostError("حجم الملف كبير بزيادة! الحد الأقصى هو 8 ميجابايت.");
        return;
      }
      setQuickPostFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setNewPostImage(event.target.result as string);
          setPostError("");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleQuickPostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostImage.trim() && !newPostCaption.trim()) {
      setPostError("لازم تكتب نص أو ترفع صورة عشان تنشر الميم!");
      return;
    }
    setPostError("");
    setPostSuccess(false);
    try {
      let finalImageUrl = newPostImage.trim() || "";
      if (quickPostFile) {
        finalImageUrl = await dataService.uploadMemeFile(quickPostFile) || "";
      }
      const splitTags = newPostTags.split(" ").filter(t => t.startsWith("#")).map(t => t.replace("#", ""));
      
      // Call publish (handles null image logic internally)
      await handlePublishMeme(newPostCaption.trim(), finalImageUrl, splitTags);
      
      setPostSuccess(true);
      setNewPostImage("");
      setNewPostCaption("");
      setNewPostTags("");
      setQuickPostFile(null);
      setTimeout(() => setPostSuccess(false), 4400);
    } catch (err: any) {
      setPostError(err.message || "حدث خطأ أثناء النشر.");
    }
  };

  const handleStorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (storyCreatorType === "text" && !storyTextContent.trim()) return;
    if (storyCreatorType !== "text" && !storyFilePreview) return;

    const newStory: Story = {
      id: `my-story-${Date.now()}`,
      type: storyCreatorType,
      content: storyCreatorType === "text" ? storyTextContent : (storyFilePreview as string),
      bg_color: storyCreatorType === "text" ? storyBgColor : undefined,
      created_at: new Date().toISOString()
    };

    // Find if current user already has stories in mock
    const existingIndex = mockStories.findIndex(ms => ms.user.id === currentUser.id);
    let updatedStories = [...mockStories];
    
    if (existingIndex >= 0) {
      updatedStories[existingIndex].stories.push(newStory);
      updatedStories[existingIndex].hasUnseen = true;
    } else {
      updatedStories.unshift({
        user: currentUser,
        hasUnseen: true,
        stories: [newStory]
      });
    }

    setMockStories(updatedStories);
    setShowStoryCreator(false);
    setStoryTextContent("");
    setStoryFilePreview(null);
    setStoryCreatorType("image");
  };

  const handleStoryFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (storyCreatorType === "video") {
        // Simple client side limit for demo (2 mins simulated by file size ~30MB)
        if (file.size > 30 * 1024 * 1024) {
          alert("الفيديو كبير جداً، الحد الأقصى المسموح بيه هو دقيقتين تقريبا!");
          return;
        }
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) setStoryFilePreview(event.target.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const openStoryViewer = (userIndex: number) => {
    setViewingUserIndex(userIndex);
    setViewingStoryIndex(0);
    // Mark as seen
    const updated = [...mockStories];
    updated[userIndex].hasUnseen = false;
    setMockStories(updated);
  };

  const closeStoryViewer = () => {
    setViewingUserIndex(null);
    setViewingStoryIndex(0);
    if(videoRef.current) videoRef.current.pause();
  };

  const nextStory = () => {
    if (viewingUserIndex === null) return;
    const currentUserStories = mockStories[viewingUserIndex].stories;
    
    if (viewingStoryIndex < currentUserStories.length - 1) {
      setViewingStoryIndex(prev => prev + 1);
    } else if (viewingUserIndex < mockStories.length - 1) {
      // Go to next user's stories
      openStoryViewer(viewingUserIndex + 1);
    } else {
      // Finished all
      closeStoryViewer();
    }
  };

  const prevStory = () => {
    if (viewingUserIndex === null) return;
    if (viewingStoryIndex > 0) {
      setViewingStoryIndex(prev => prev - 1);
    } else if (viewingUserIndex > 0) {
      // Go to prev user's last story
      const prevUserStories = mockStories[viewingUserIndex - 1].stories;
      setViewingUserIndex(viewingUserIndex - 1);
      setViewingStoryIndex(prevUserStories.length - 1);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true); setAuthError(""); setAuthSuccess("");
    try {
      const profile = await dataService.signIn(authEmail, authPassword);
      setCurrentUser(profile); setPrevPoints(profile.total_points);
      setAuthSuccess("تم تسجيل الدخول بنجاح! 🎉");
      setTimeout(() => { setShowAuthModal(false); loadAllData(); }, 1500);
    } catch (err: any) { setAuthError(err.message || "فشل تسجيل الدخول."); } 
    finally { setAuthLoading(false); }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUsername.trim()) { setAuthError("يرجى كتابة اسم مستخدم!"); return; }
    setAuthLoading(true); setAuthError(""); setAuthSuccess("");
    try {
      const profile = await dataService.signUp(authEmail, authPassword, authUsername.trim());
      setCurrentUser(profile); setPrevPoints(profile.total_points);
      setAuthSuccess("تم إنشاء الحساب بنجاح! 🎉");
      setTimeout(() => { setShowAuthModal(false); loadAllData(); }, 1500);
    } catch (err: any) { setAuthError(err.message || "تعذّر إنشاء الحساب."); } 
    finally { setAuthLoading(false); }
  };

  const handleSignOutReal = async () => {
    try {
      await dataService.signOut();
      setCurrentUser(initialGuestProfile);
      setPrevPoints(0);
      loadAllData();
    } catch (e) { console.error(e); }
  };

  const handleReportSubmit = (memeId: string, reason: string) => {
    const newReport: Report = { id: `report-${Date.now()}`, meme_id: memeId, reporter_id: currentUser.id, reason, status: "open", resolved_by: null, resolution_note: null, created_at: new Date().toISOString() };
    const updatedReports = [...reports, newReport];
    setReports(updatedReports);
    localStorage.setItem("memesbook_reports_list", JSON.stringify(updatedReports));
  };

  const handleShareCompleted = async (memeId: string) => {
    await dataService.recordShare(memeId);
    setMemes((prev) => prev.map(m => m.id === memeId ? { ...m, shares_count: m.shares_count + 1 } : m));
  };

  const handleMarkNotificationsRead = async () => {
    await dataService.markNotificationsAsRead(currentUser.id);
    setNotifications((prev) => prev.map(n => ({ ...n, is_read: true })));
  };

  const handleDeleteMeme = async (memeId: string) => {
    if (window.confirm("هل أنت متأكد من حذف هذا الميم؟")) {
      try {
        await dataService.deleteMeme(memeId, currentUser.id);
        setMemes((prev) => prev.filter(m => m.id !== memeId));
      } catch (err: any) { alert(err.message || "فشل حذف الميم."); }
    }
  };

  const handleUserSwitch = (newProf: Profile) => {
    setCurrentUser(newProf);
    localStorage.setItem("memesbook_current_user", JSON.stringify(newProf));
    setPrevPoints(newProf.total_points);
    dataService.getNotifications(newProf.id).then(notifs => setNotifications(notifs));
  };

  const filteredMemes = memes.filter((meme) => {
    if (meme.status === "deleted" || meme.status === "rejected") return false;
    if (selectedTag) {
      const lowerTag = selectedTag.toLowerCase();
      return meme.tags?.some(t => t.toLowerCase() === lowerTag) || meme.caption?.toLowerCase().includes(`#${lowerTag}`);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return meme.profiles?.username.toLowerCase().includes(q) || meme.caption?.toLowerCase().includes(q) || meme.tags?.some(t => t.toLowerCase().includes(q));
    }
    return true;
  });

  const savedMemesCount = memes.filter(m => m.saved_by_me).length;
  const isRealUser = currentUser ? currentUser.id !== "guest-user-temp" : false;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans select-none pb-20 md:pb-6" dir="rtl">
      
      {/* Story Viewer Modal */}
      {viewingUserIndex !== null && mockStories[viewingUserIndex] && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-fade-in" dir="ltr">
          {/* Progress Bars */}
          <div className="absolute top-0 left-0 right-0 p-4 flex gap-1 z-10 bg-gradient-to-b from-black/60 to-transparent">
            {mockStories[viewingUserIndex].stories.map((s, i) => (
              <div key={s.id} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                <div className={`h-full bg-white transition-all duration-300 ${i < viewingStoryIndex ? 'w-full' : i === viewingStoryIndex ? 'w-full animate-progress' : 'w-0'}`} style={{ animationDuration: '5s' }} onAnimationEnd={() => i === viewingStoryIndex ? nextStory() : null} />
              </div>
            ))}
          </div>

          {/* Header */}
          <div className="absolute top-6 left-0 right-0 px-4 flex items-center justify-between z-10" dir="rtl">
            <div className="flex items-center gap-3">
              <img src={mockStories[viewingUserIndex].user.avatar_url || ""} className="w-10 h-10 rounded-full border-2 border-white object-cover" />
              <span className="text-white font-bold text-sm drop-shadow-md">{mockStories[viewingUserIndex].user.username}</span>
            </div>
            <button onClick={closeStoryViewer} className="text-white p-2 hover:bg-white/20 rounded-full"><X className="w-6 h-6" /></button>
          </div>

          {/* Story Content */}
          <div className="flex-1 relative flex items-center justify-center bg-zinc-900">
            {/* Click areas for nav */}
            <div className="absolute left-0 top-0 bottom-0 w-1/3 z-10 cursor-pointer" onClick={prevStory} />
            <div className="absolute right-0 top-0 bottom-0 w-2/3 z-10 cursor-pointer" onClick={nextStory} />

            {(() => {
              const currentStory = mockStories[viewingUserIndex].stories[viewingStoryIndex];
              if (currentStory.type === 'text') {
                return (
                  <div className={`w-full h-full flex items-center justify-center p-8 ${currentStory.bg_color || 'bg-blue-600'}`}>
                    <h2 className="text-white text-3xl md:text-5xl font-black text-center leading-relaxed" dir="rtl">{currentStory.content}</h2>
                  </div>
                );
              }
              if (currentStory.type === 'video') {
                return (
                  <video 
                    ref={videoRef}
                    src={currentStory.content} 
                    className="w-full h-full object-contain"
                    autoPlay playsInline
                    onEnded={nextStory}
                  />
                );
              }
              return (
                <img src={currentStory.content} className="w-full h-full object-contain pointer-events-none" />
              );
            })()}
          </div>
        </div>
      )}

      {/* Story Creator Modal */}
      {showStoryCreator && (
        <div className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl relative animate-scale-in">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h3 className="font-black text-lg text-gray-900">إضافة حالة (Story)</h3>
              <button onClick={() => { setShowStoryCreator(false); setStoryFilePreview(null); }} className="text-gray-500 hover:bg-gray-200 p-1.5 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-4">
              <div className="flex bg-gray-100 p-1 rounded-xl mb-4">
                <button onClick={() => {setStoryCreatorType("image"); setStoryFilePreview(null);}} className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${storyCreatorType === "image" ? "bg-white shadow-sm text-blue-600" : "text-gray-500"}`}><ImageIcon className="w-4 h-4"/> صورة</button>
                <button onClick={() => {setStoryCreatorType("video"); setStoryFilePreview(null);}} className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${storyCreatorType === "video" ? "bg-white shadow-sm text-blue-600" : "text-gray-500"}`}><Video className="w-4 h-4"/> فيديو</button>
                <button onClick={() => {setStoryCreatorType("text"); setStoryFilePreview(null);}} className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${storyCreatorType === "text" ? "bg-white shadow-sm text-blue-600" : "text-gray-500"}`}><Type className="w-4 h-4"/> نص</button>
              </div>

              <form onSubmit={handleStorySubmit} className="flex flex-col gap-4">
                {storyCreatorType === "text" ? (
                  <div className="flex flex-col gap-3">
                    <textarea 
                      placeholder="اكتب حالتك هنا..." 
                      value={storyTextContent} onChange={(e) => setStoryTextContent(e.target.value)}
                      className={`w-full h-40 resize-none rounded-2xl p-4 text-white text-center font-bold text-lg focus:outline-none focus:ring-2 focus:ring-black ${storyBgColor}`}
                      autoFocus
                    />
                    <div className="flex gap-2 justify-center">
                      {['bg-blue-600', 'bg-red-500', 'bg-green-500', 'bg-purple-600', 'bg-zinc-800', 'bg-orange-500'].map(bg => (
                        <div key={bg} onClick={() => setStoryBgColor(bg)} className={`w-8 h-8 rounded-full cursor-pointer border-2 ${storyBgColor === bg ? 'border-gray-900 scale-110' : 'border-transparent'} ${bg}`} />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {!storyFilePreview ? (
                      <label className="w-full h-40 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors text-gray-400">
                        <Camera className="w-8 h-8 mb-2" />
                        <span className="text-sm font-bold">اضغط لاختيار {storyCreatorType === "video" ? "فيديو (2 دقيقة بحد أقصى)" : "صورة"}</span>
                        <input type="file" accept={storyCreatorType === "video" ? "video/*" : "image/*"} onChange={handleStoryFileChange} className="hidden" />
                      </label>
                    ) : (
                      <div className="relative w-full h-48 bg-black rounded-2xl overflow-hidden flex items-center justify-center">
                        {storyCreatorType === "video" ? (
                          <video src={storyFilePreview} className="w-full h-full object-contain" controls />
                        ) : (
                          <img src={storyFilePreview} className="w-full h-full object-contain" />
                        )}
                        <button type="button" onClick={() => setStoryFilePreview(null)} className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-full shadow-lg"><X className="w-4 h-4" /></button>
                      </div>
                    )}
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={(storyCreatorType === "text" && !storyTextContent) || (storyCreatorType !== "text" && !storyFilePreview)}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-black py-3.5 rounded-xl transition-all shadow-md mt-2 flex justify-center gap-2"
                >
                  نشر الحالة <ChevronLeft className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Main Header */}
      <Header
        currentUser={currentUser}
        notifications={notifications}
        onNavigate={(tab) => { setActiveTab(tab); setSelectedTag(null); }}
        onSearch={(query) => setSearchQuery(query)}
        activeTab={activeTab}
        onUserSwitch={handleUserSwitch}
        availableProfiles={profiles}
        onMarkNotificationsRead={handleMarkNotificationsRead}
        onShowAuthModal={() => { setShowAuthModal(true); setAuthTab("signin"); }}
        onSignOutReal={handleSignOutReal}
        isRealUser={isRealUser}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 py-6 w-full flex-1 flex gap-6">
        
        {/* Right Sidebar (Desktop) */}
        <div className="w-64 shrink-0 hidden lg:flex flex-col gap-6 order-3">
          {!isRealUser && (
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-4 shadow-sm text-center text-white">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto text-white mb-3 backdrop-blur-sm"><User className="w-6 h-6" /></div>
              <h4 className="font-extrabold text-sm mb-1.5">مش مسجل دخول يا غالي؟ 👀</h4>
              <p className="text-[11px] text-blue-100 mb-4 leading-relaxed font-medium">سجل حساب دلوقتي عشان تشارك أحلى الميمز وتجمع نقاط وتنافس على الصدارة!</p>
              <button onClick={() => { setShowAuthModal(true); setAuthTab("signin"); }} className="w-full bg-white text-blue-600 hover:bg-gray-50 font-black py-2.5 rounded-xl text-xs shadow-md transition-all">تسجيل الدخول / إنشاء حساب</button>
            </div>
          )}

          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm text-right">
            <h4 className="font-extrabold text-xs text-gray-900 flex items-center justify-end gap-1.5 mb-3"><span>وزراء الكوميديا والضحك 👑</span><Trophy className="w-4 h-4 text-yellow-500" /></h4>
            <div className="flex flex-col gap-2.5">
              {profiles.slice(0, 3).map((prof, index) => (
                <div key={prof.id} className="flex items-center gap-2.5 border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                  <div className="text-xs font-black text-gray-400 font-mono">#{index + 1}</div>
                  {prof.avatar_url ? <img src={prof.avatar_url} className="w-8 h-8 rounded-lg object-cover" /> : <div className="w-8 h-8 rounded-lg bg-gray-200" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-800 truncate">{prof.username}</p>
                    <p className="text-[9px] text-orange-500 font-bold">{prof.total_points} XP</p>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setActiveTab("leaderboard")} className="w-full text-center text-xs text-blue-600 font-bold hover:underline mt-4 block">عرض الترتيب الكامل للرتب</button>
          </div>
        </div>

        {/* Center Feed Area */}
        <div className="flex-1 max-w-full md:max-w-2xl order-2">
          
          {/* Stories Bar (Only in Feed) */}
          {activeTab === "feed" && (
            <div className="flex gap-4 overflow-x-auto py-4 px-3 bg-white rounded-3xl mb-4 border border-gray-100 shadow-sm custom-scrollbar" style={{scrollbarWidth: 'none'}}>
              {/* Add My Story Button */}
              <div className="flex flex-col items-center gap-1.5 cursor-pointer shrink-0" onClick={() => isRealUser ? setShowStoryCreator(true) : setShowAuthModal(true)}>
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-blue-400 p-0.5 relative">
                  <div className="w-full h-full bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                    {currentUser.avatar_url ? <img src={currentUser.avatar_url} className="w-full h-full object-cover opacity-60" /> : <User className="w-6 h-6 text-gray-400" />}
                  </div>
                  <div className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-1 border-2 border-white shadow-sm">
                    <PlusCircle className="w-3 h-3" />
                  </div>
                </div>
                <span className="text-[10px] font-bold text-gray-600">إضافة حالة</span>
              </div>

              {/* Render Stories */}
              {mockStories.map((userStoryObj, index) => (
                <div key={userStoryObj.user.id} className="flex flex-col items-center gap-1.5 cursor-pointer shrink-0 group" onClick={() => openStoryViewer(index)}>
                  <div className={`w-16 h-16 rounded-full p-0.5 transition-all group-hover:scale-105 ${userStoryObj.hasUnseen ? 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500' : 'bg-gray-300'}`}>
                    <div className="w-full h-full rounded-full border-2 border-white overflow-hidden bg-white">
                      <img src={userStoryObj.user.avatar_url || ""} className="w-full h-full object-cover" />
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-gray-700 w-16 truncate text-center">{userStoryObj.user.username}</span>
                </div>
              ))}
            </div>
          )}

          {selectedTag && (
            <div className="bg-blue-50 border border-blue-100 px-4 py-3 rounded-2xl text-xs sm:text-sm text-blue-700 font-extrabold flex items-center justify-between mb-4 shadow-sm">
              <span className="flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-blue-500" /><span>عرض الميمز بالهاشتاج:</span><strong className="text-blue-900 bg-white border border-blue-200 px-2 py-0.5 rounded-lg">#{selectedTag}</strong></span>
              <button onClick={() => setSelectedTag(null)} className="text-blue-500 hover:text-blue-800 p-1"><X className="w-4 h-4" /></button>
            </div>
          )}

          {activeTab === "feed" && (
            <div className="flex flex-col gap-4">
              {!isRealUser && (
                <div className="lg:hidden bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-4 shadow-sm text-center text-white mb-1">
                  <h4 className="font-extrabold text-sm mb-1.5">مش مسجل دخول يا غالي؟ 👀</h4>
                  <p className="text-[11px] text-blue-100 mb-3 font-medium">سجل حساب دلوقتي عشان تشارك الميمز وتنافس!</p>
                  <button onClick={() => { setShowAuthModal(true); setAuthTab("signin"); }} className="bg-white text-blue-600 font-black py-2.5 px-4 rounded-xl text-xs w-full shadow-md">تسجيل الدخول / إنشاء حساب</button>
                </div>
              )}

              {loading ? (
                <div className="text-center py-12 text-gray-400">جاري تحميل ميم الفيد الحقيقي...</div>
              ) : filteredMemes.length === 0 ? (
                <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center text-gray-400 flex flex-col items-center gap-3">
                  <Clock className="w-10 h-10 text-gray-300 animate-spin" />
                  <p className="font-extrabold text-sm text-gray-700">مفيش ميمز تطابق استعلامك خالص!</p>
                  <button onClick={() => { setSearchQuery(""); setSelectedTag(null); }} className="mt-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-xs font-bold">إعادة تعيين الفيد</button>
                </div>
              ) : (
                filteredMemes.map((meme) => (
                  <MemeCard key={meme.id} meme={meme} currentUser={currentUser} onLikeToggle={handleLikeToggle} onSaveToggle={handleSaveToggle} onFollowToggle={handleFollowToggle} onTagClick={setSelectedTag} onDeleteComment={() => { setMemes(prev => prev.map(m => m.id === meme.id ? { ...m, comments_count: Math.max(0, m.comments_count - 1) } : m)); }} onReportSubmit={handleReportSubmit} onShareCompleted={handleShareCompleted} onDeleteMeme={handleDeleteMeme} onUserProfileClick={(uid) => { setSelectedProfileId(uid); setActiveTab("user-profile"); }} isFollowingCreator={followingIds.includes(meme.user_id)} />
                ))
              )}
            </div>
          )}

          {activeTab === "create-post" && (
            <div className="flex flex-col gap-4 animate-fade-in">
              <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm text-right flex flex-col gap-6">
                <div className="flex items-center justify-between border-b border-gray-50 pb-4">
                  <h2 className="text-xl font-black text-gray-900">إنشاء منشور جديد</h2>
                  <button onClick={() => setActiveTab("feed")} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleQuickPostSubmit} className="flex flex-col gap-4">
                  <textarea placeholder="اكتب تعليقاً مضحكاً أو ميم نصي..." value={newPostCaption} onChange={(e) => setNewPostCaption(e.target.value)} className="bg-gray-50 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 rounded-2xl px-4 py-4 text-sm font-extrabold text-gray-950 min-h-[150px] resize-none" autoFocus />
                  {!newPostImage ? (
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <label className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-600 px-6 py-3 rounded-2xl cursor-pointer border border-blue-100 font-black text-sm">
                        <PlusCircle className="w-5 h-5" /><span>إضافة صورة للميم</span>
                        <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                      </label>
                      <input type="text" placeholder="هاشتاجات (مثال: #ضحك #ميمز)..." value={newPostTags} onChange={(e) => setNewPostTags(e.target.value)} className="w-full sm:flex-1 bg-gray-50 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 rounded-2xl px-4 py-3 text-sm font-mono text-gray-950" />
                    </div>
                  ) : (
                    <div className="relative rounded-3xl overflow-hidden border-4 border-gray-50 max-h-96 bg-gray-900 flex items-center justify-center p-2 shadow-inner">
                      <img src={newPostImage} alt="preview" className="max-h-80 object-contain rounded-xl" />
                      <button type="button" onClick={() => setNewPostImage("")} className="absolute top-4 left-4 bg-red-600 hover:bg-red-700 text-white rounded-full px-4 py-2 shadow-xl cursor-pointer flex items-center gap-2"><X className="w-4 h-4" /><span>إزالة الصورة</span></button>
                    </div>
                  )}
                  <div className="flex flex-col gap-3 pt-4 border-t border-gray-50">
                    <button type="submit" disabled={!newPostCaption.trim() && !newPostImage} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-2xl py-4 text-base font-black flex items-center justify-center gap-2 shadow-lg shadow-blue-100">
                      <PlusCircle className="w-5 h-5" /><span>نشر الميم الآن</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeTab === "trending" && (
            <div className="flex flex-col gap-4 animate-fade-in">
              <div className="bg-white border border-gray-100 rounded-3xl p-5 text-right flex flex-col gap-2 mb-2">
                <span className="text-[10px] bg-red-100 border border-red-200 text-red-600 font-black px-2.5 py-1 rounded-full uppercase w-max">التريند الأقوى حالياً 🔥</span>
                <h2 className="font-extrabold text-xl text-gray-900 mt-1">الميمز صاحبة الأعلى تفاعل</h2>
              </div>
              {[...memes].sort((a,b) => (b.likes_count*10 + b.comments_count*15) - (a.likes_count*10 + a.comments_count*15)).map((m) => (
                <MemeCard key={m.id} meme={m} currentUser={currentUser} onLikeToggle={handleLikeToggle} onSaveToggle={handleSaveToggle} onFollowToggle={handleFollowToggle} onTagClick={setSelectedTag} onDeleteComment={() => {}} onReportSubmit={handleReportSubmit} onShareCompleted={handleShareCompleted} onDeleteMeme={handleDeleteMeme} onUserProfileClick={(uid) => { setSelectedProfileId(uid); setActiveTab("user-profile"); }} isFollowingCreator={followingIds.includes(m.user_id)} />
              ))}
            </div>
          )}

          {activeTab === "leaderboard" && (
            <Leaderboard profiles={profiles} currentUser={currentUser} onNavigate={setActiveTab} onFollowToggle={handleFollowToggle} followingIds={followingIds} />
          )}

          {activeTab === "user-profile" && selectedProfileId && (
            <div className="flex flex-col gap-4 animate-fade-in">
              {(() => {
                const profile = profiles.find(p => p.id === selectedProfileId) || (selectedProfileId === currentUser.id ? currentUser : null);
                if (!profile) return <div className="text-center py-10">المستخدم غير موجود</div>;
                const userMemes = memes.filter(m => m.user_id === selectedProfileId);
                return (
                  <>
                    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                      <div className="h-32 sm:h-48 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600 relative"><div className="absolute inset-0 bg-black/10"></div></div>
                      <div className="px-4 sm:px-6 pb-6 text-right relative">
                        <div className="flex justify-between items-end mb-4">
                          <div className="mb-2 relative z-10">
                            {profile.id !== currentUser.id && (
                              <button onClick={() => handleFollowToggle(currentUser.id, profile.id)} className={`px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${followingIds.includes(profile.id) ? "bg-gray-200 text-gray-800" : "bg-blue-600 text-white shadow-md"}`}>
                                {followingIds.includes(profile.id) ? <><CheckCircle2 className="w-4 h-4" /> متابع</> : <><User className="w-4 h-4" /> متابعة</>}
                              </button>
                            )}
                          </div>
                          <div className="relative -mt-12 sm:-mt-16 z-10 mr-2">
                            <img src={profile.avatar_url || ""} className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-white shadow-md bg-white" />
                          </div>
                        </div>
                        <div>
                          <h1 className="text-2xl sm:text-3xl font-black text-gray-900">{profile.username}</h1>
                          <p className="text-gray-500 font-medium text-sm mt-0.5" dir="ltr">@{profile.username.toLowerCase().replace(/\s+/g, '_')}</p>
                          <div className="inline-block bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-md mt-2">{profile.meme_level}</div>
                          <p className="text-gray-800 text-sm mt-3 leading-relaxed max-w-xl">{profile.bio || "لا يوجد وصف حالياً."}</p>
                        </div>
                        <hr className="my-5 border-gray-100" />
                        <div className="flex items-center justify-start gap-8 text-center px-2">
                          <div><p className="text-lg font-black text-gray-900">{userMemes.length}</p><p className="text-[11px] text-gray-500 font-bold uppercase">منشور</p></div>
                          <div><p className="text-lg font-black text-gray-900">{profile.followers_count}</p><p className="text-[11px] text-gray-500 font-bold uppercase">متابع</p></div>
                          <div><p className="text-lg font-black text-gray-900">{profile.following_count}</p><p className="text-[11px] text-gray-500 font-bold uppercase">يتابع</p></div>
                          <div><p className="text-lg font-black text-gray-900">{profile.total_points}</p><p className="text-[11px] text-gray-500 font-bold uppercase">نقاط XP</p></div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-4 mt-2">
                      <h3 className="font-black text-gray-900 px-2 flex items-center gap-2"><ImageIcon className="w-5 h-5 text-blue-600" /><span>المنشورات</span></h3>
                      {userMemes.length === 0 ? <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center text-gray-400 font-bold shadow-sm">لا يوجد منشورات.</div> : userMemes.map(meme => (
                        <MemeCard key={meme.id} meme={meme} currentUser={currentUser} onLikeToggle={handleLikeToggle} onSaveToggle={handleSaveToggle} onFollowToggle={handleFollowToggle} onTagClick={setSelectedTag} onDeleteComment={() => {}} onReportSubmit={handleReportSubmit} onShareCompleted={handleShareCompleted} onDeleteMeme={handleDeleteMeme} onUserProfileClick={() => {}} isFollowingCreator={followingIds.includes(meme.user_id)} />
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {activeTab === "saves" && (
            <div className="flex flex-col gap-4">
              {memes.filter(m => m.saved_by_me).map((savedMeme) => (
                <MemeCard key={savedMeme.id} meme={savedMeme} currentUser={currentUser} onLikeToggle={handleLikeToggle} onSaveToggle={handleSaveToggle} onFollowToggle={handleFollowToggle} onTagClick={setSelectedTag} onDeleteComment={() => {}} onReportSubmit={handleReportSubmit} onShareCompleted={handleShareCompleted} onDeleteMeme={handleDeleteMeme} onUserProfileClick={(uid) => { setSelectedProfileId(uid); setActiveTab("user-profile"); }} isFollowingCreator={followingIds.includes(savedMeme.user_id)} />
              ))}
            </div>
          )}

          {activeTab === "profile" && (
            <div className="flex flex-col gap-4 animate-fade-in">
              {!isRealUser && (
                <div className="bg-blue-50 border border-blue-200 rounded-3xl p-6 text-center text-blue-900 shadow-sm">
                  <User className="w-12 h-12 text-blue-400 mx-auto mb-3" />
                  <h2 className="text-xl font-black mb-2">انضم لعائلة ميمزبوك!</h2>
                  <p className="text-xs text-blue-700 mb-5 font-medium max-w-sm mx-auto">أنت تتصفح كزائر. سجل حسابك الحقيقي الآن لتتمكن من تعديل ملفك الشخصي.</p>
                  <button onClick={() => { setShowAuthModal(true); setAuthTab("signin"); }} className="bg-blue-600 hover:bg-blue-700 text-white font-black text-sm py-3 px-8 rounded-xl shadow-md">تسجيل الدخول / إنشاء حساب</button>
                </div>
              )}
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="h-32 sm:h-48 bg-slate-200 relative group flex items-center justify-center">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 opacity-80"></div>
                </div>
                <div className="px-4 sm:px-6 pb-6 text-right relative">
                  <div className="flex justify-between items-end mb-4">
                    <div className="mb-2 relative z-10 flex gap-2">
                      {isRealUser && <button className="bg-gray-200 hover:bg-gray-300 text-gray-900 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><Edit3 className="w-4 h-4" /> <span>تعديل</span></button>}
                    </div>
                    <div className="relative -mt-12 sm:-mt-16 z-10 mr-2 group">
                      <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-white shadow-md bg-gray-100 overflow-hidden relative cursor-pointer">
                        {currentUser.avatar_url ? <img src={currentUser.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-gray-400">{currentUser.username[0]}</div>}
                      </div>
                    </div>
                  </div>
                  <div>
                    <h2 className="font-black text-2xl sm:text-3xl text-gray-900 mb-1">{currentUser.username}</h2>
                    <p className="text-gray-500 font-medium text-sm mt-0.5" dir="ltr">@{currentUser.username.toLowerCase().replace(/\s+/g, '_')}</p>
                    <div className="inline-block bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-md mt-2">{currentUser.meme_level}</div>
                    <textarea value={currentUser.bio || ""} onChange={async (e) => { const newBio = e.target.value; setCurrentUser(prev => ({ ...prev, bio: newBio })); try { await dataService.updateProfile({ bio: newBio }); } catch (err) {} }} className="w-full bg-gray-50 border border-transparent focus:border-blue-300 rounded-lg p-3 text-sm text-gray-800 resize-none mt-3 outline-none" placeholder="اكتب نبذة عنك..." rows={2} />
                  </div>
                  <hr className="my-5 border-gray-100" />
                  <div className="flex items-center justify-start gap-8 text-center px-2">
                    <div><p className="text-lg font-black text-gray-900">{memes.filter(m => m.user_id === currentUser.id).length}</p><p className="text-[11px] text-gray-500 font-bold uppercase">منشوراتي</p></div>
                    <div><p className="text-lg font-black text-gray-900">{currentUser.followers_count}</p><p className="text-[11px] text-gray-500 font-bold uppercase">متابع</p></div>
                    <div><p className="text-lg font-black text-gray-900">{currentUser.following_count}</p><p className="text-[11px] text-gray-500 font-bold uppercase">أتابعهم</p></div>
                    <div><p className="text-lg font-black text-gray-900">{currentUser.total_points}</p><p className="text-[11px] text-gray-500 font-bold uppercase">نقاط XP</p></div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-4 mt-2">
                <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200"><h3 className="font-black text-gray-900 flex items-center gap-2"><ImageIcon className="w-5 h-5 text-gray-500" /><span>المنشورات الخاصة بي</span></h3></div>
                {memes.filter(m => m.user_id === currentUser.id).map((meme) => (
                  <MemeCard key={meme.id} meme={meme} currentUser={currentUser} onLikeToggle={handleLikeToggle} onSaveToggle={handleSaveToggle} onFollowToggle={handleFollowToggle} onTagClick={setSelectedTag} onDeleteComment={() => {}} onReportSubmit={handleReportSubmit} onShareCompleted={handleShareCompleted} onDeleteMeme={handleDeleteMeme} onUserProfileClick={(uid) => { setSelectedProfileId(uid); setActiveTab("user-profile"); }} isFollowingCreator={followingIds.includes(meme.user_id)} />
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Sidebar Left */}
        <Sidebar currentUser={currentUser} activeTab={activeTab} onNavigate={(tab) => { setActiveTab(tab); setSelectedTag(null); }} savedCount={savedMemesCount} />
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-xl border-t border-gray-100 flex items-center justify-around py-4 md:hidden">
        <button onClick={() => { setActiveTab("feed"); setSelectedTag(null); }} className={`${activeTab === 'feed' ? 'text-black' : 'text-gray-400'}`}><Home className="w-6 h-6" /></button>
        <button onClick={() => { setActiveTab("trending"); setSelectedTag(null); }} className={`${activeTab

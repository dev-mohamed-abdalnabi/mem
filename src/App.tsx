import React, { useState, useEffect } from "react";
import { 
  Home, Flame, Trophy, Bookmark, Cpu, 
  AlertTriangle, ShieldAlert, Sparkles, X, 
  Clock, PlusCircle, CheckCircle2, Award, 
  HelpCircle, MessageCircle, AlertCircle, Trash2, User, Image as ImageIcon, Check, Camera
} from "lucide-react";

import { Profile, Meme, Notification, Report, UserRole } from "./types";
import { dataService, calculateMemeLevel } from "./services/dataService";

import Header from "./components/Header.tsx";
import Sidebar from "./components/Sidebar.tsx";
import MemeCard from "./components/MemeCard.tsx";
// تم بناء لوحة الشرف داخلياً لضمان التصميم
// import Leaderboard from "./components/Leaderboard.tsx";

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

  const [newPostImage, setNewPostImage] = useState("");
  const [newPostCaption, setNewPostCaption] = useState("");
  const [newPostTags, setNewPostTags] = useState("");
  const [postError, setPostError] = useState("");
  const [postSuccess, setPostSuccess] = useState(false);
  const [quickPostFile, setQuickPostFile] = useState<File | null>(null);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTab, setAuthTab] = useState<"signin" | "signup">("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authUsername, setAuthUsername] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [prevPoints, setPrevPoints] = useState(0);
  const [showLevelUpAlert, setShowLevelUpAlert] = useState(false);
  const [newLevelName, setNewLevelName] = useState("");

  // حالة عرض الصورة بملء الشاشة (Lightbox)
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  useEffect(() => {
    loadAllData();
    const urlParams = new URLSearchParams(window.location.search);
    const sharedMemeId = urlParams.get('meme');
    if (sharedMemeId) {
      console.log("Shared meme ID:", sharedMemeId);
    }
  }, []);

  // مستمع عالمي لفتح أي صورة يتم الضغط عليها (ما عدا الأزرار والأيقونات الصغيرة)
  useEffect(() => {
    const handleGlobalImageClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG') {
        const imgElement = target as HTMLImageElement;
        // استثناء الأيقونات الصغيرة جداً أو الصور الموجودة داخل أزرار حقيقية
        if (imgElement.clientWidth > 35 && !target.closest('button')) {
          setViewingImage(imgElement.src);
        }
      }
    };
    document.addEventListener('click', handleGlobalImageClick);
    return () => document.removeEventListener('click', handleGlobalImageClick);
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    setDbError(null);
    try {
      const dbCurrentUser = await dataService.getCurrentUser();
      setCurrentUser(dbCurrentUser);
      setPrevPoints(dbCurrentUser.total_points);

      const dbMemes = await dataService.getMemes("approved", undefined, dbCurrentUser.id);
      
      const urlParams = new URLSearchParams(window.location.search);
      const sharedMemeId = urlParams.get('meme');
      
      if (sharedMemeId) {
        const sharedMeme = dbMemes.find(m => m.id === sharedMemeId);
        if (sharedMeme) {
          const otherMemes = dbMemes.filter(m => m.id !== sharedMemeId);
          setMemes([sharedMeme, ...otherMemes]);
        } else {
          setMemes(dbMemes);
        }
      } else {
        setMemes(dbMemes);
      }

      const dbProfiles = await dataService.getProfilesList();
      setProfiles(dbProfiles);

      const dbNotifs = await dataService.getNotifications(dbCurrentUser.id);
      setNotifications(dbNotifs);

      if (activeTab === "trending") {
        const dbTrending = await dataService.getTrendingMemes(dbCurrentUser.id);
        setMemes(dbTrending);
      }

      const dbFollowingIds = await dataService.getFollowingList(dbCurrentUser.id);
      setFollowingIds(dbFollowingIds);

      const savedReports = localStorage.getItem("memesbook_reports_list");
      setReports(savedReports ? JSON.parse(savedReports) : []);
    } catch (e: any) {
      console.warn("Database error:", e);
      setDbError(e.message || "فشل الاتصال بقاعدة البيانات.");
    } finally {
      setLoading(false);
    }
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
    
    const updatedUser = {
      ...currentUser,
      total_points: newPts,
      meme_level: calculateMemeLevel(newPts)
    };

    setCurrentUser(updatedUser);
    setProfiles((prev) => prev.map(p => p.id === currentUser.id ? updatedUser : p));
    localStorage.setItem("memesbook_current_user", JSON.stringify(updatedUser));
    
    checkLevelUp(oldPts, newPts);
  };

  const handleLikeToggle = async (memeId: string) => {
    if (!memeId) { loadAllData(); return; }
    try {
      const { liked, likesCount } = await dataService.toggleLike(memeId, currentUser.id);
      setMemes((prev) => prev.map((m) => {
          if (m.id === memeId) return { ...m, likes_count: likesCount, liked_by_me: liked };
          return m;
      }));
      if (activeTab === "trending") {
        const dbTrending = await dataService.getTrendingMemes(currentUser.id);
        setMemes(dbTrending);
      }
      const targetMeme = memes.find(m => m.id === memeId);
      if (targetMeme && targetMeme.user_id === currentUser.id) {
        updateUserPointsInState(liked ? 5 : -5);
      }
    } catch (e) { console.error(e); }
  };

  const handleSaveToggle = async (memeId: string) => {
    try {
      const saved = await dataService.toggleSave(memeId, currentUser.id);
      setMemes((prev) => prev.map((m) => {
          if (m.id === memeId) return { ...m, saves_count: saved ? m.saves_count + 1 : Math.max(0, m.saves_count - 1), saved_by_me: saved };
          return m;
      }));
    } catch (e) { console.error(e); }
  };

  const handleFollowToggle = async (followerId: string, followingId: string) => {
    try {
      if (followingIds.includes(followingId)) return; 
      
      const success = await dataService.followUser(followerId, followingId);
      if (success) {
        setFollowingIds((prev) => {
          if (prev.includes(followingId)) return prev;
          return [...prev, followingId];
        });
        
        setProfiles((prev) => prev.map((p) => {
          if (p.id === followerId) return { ...p, following_count: p.following_count + 1 };
          if (p.id === followingId) return { ...p, followers_count: p.followers_count + 1, total_points: p.total_points + 10 };
          return p;
        }));

        if (currentUser.id === followerId) {
          const updatedUser = { ...currentUser, following_count: currentUser.following_count + 1 };
          setCurrentUser(updatedUser);
          localStorage.setItem("memesbook_current_user", JSON.stringify(updatedUser));
        }

        if (currentUser.id === followingId) {
          updateUserPointsInState(10);
        }
      }
    } catch (e) { console.error(e); }
  };

  const handlePublishMeme = async (caption: string, imageUrl: string, tags: string[]) => {
    try {
      const newMeme = await dataService.createMeme({
        user_id: currentUser.id, image_url: imageUrl, caption, tags
      });
      setMemes((prev) => [newMeme, ...prev]);
      updateUserPointsInState(5);
    } catch (err: any) { throw err; }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        setPostError("الحد الأقصى هو 8 ميجابايت."); return;
      }
      setQuickPostFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) { setNewPostImage(event.target.result as string); setPostError(""); }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleQuickPostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostImage.trim() && !newPostCaption.trim()) {
      setPostError("يجب كتابة نص أو رفع صورة!"); return;
    }
    setPostError(""); setPostSuccess(false);
    try {
      let finalImageUrl = newPostImage.trim() || "";
      if (quickPostFile) { finalImageUrl = await dataService.uploadMemeFile(quickPostFile); }
      const splitTags = newPostTags.split(" ").filter(t => t.startsWith("#")).map(t => t.replace("#", ""));
      await handlePublishMeme(newPostCaption.trim(), finalImageUrl, splitTags);
      
      setPostSuccess(true); setNewPostImage(""); setNewPostCaption(""); setNewPostTags(""); setQuickPostFile(null);
      setTimeout(() => setPostSuccess(false), 4400);
    } catch (err: any) { setPostError(err.message || "حدث خطأ أثناء النشر."); }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true); setAuthError(""); setAuthSuccess("");
    try {
      const profile = await dataService.signIn(authEmail, authPassword);
      setCurrentUser(profile); setPrevPoints(profile.total_points);
      setAuthEmail(""); setAuthPassword("");
      setShowAuthModal(false); loadAllData();
    } catch (err: any) { setAuthError(err.message || "البيانات غير صحيحة."); } 
    finally { setAuthLoading(false); }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUsername.trim()) { setAuthError("الرجاء كتابة اسم المستخدم."); return; }
    setAuthLoading(true); setAuthError(""); setAuthSuccess("");
    try {
      const profile = await dataService.signUp(authEmail, authPassword, authUsername.trim());
      setCurrentUser(profile); setPrevPoints(profile.total_points);
      setAuthEmail(""); setAuthPassword(""); setAuthUsername("");
      setShowAuthModal(false); loadAllData();
    } catch (err: any) { setAuthError(err.message || "تعذّر إنشاء الحساب."); } 
    finally { setAuthLoading(false); }
  };

  const handleSignOutReal = async () => {
    try {
      await dataService.signOut();
      setCurrentUser(initialGuestProfile);
      setPrevPoints(0); loadAllData();
    } catch (e) { console.error(e); }
  };

  const handleReportSubmit = (memeId: string, reason: string) => {
    const newReport: Report = {
      id: `report-${Date.now()}`, meme_id: memeId, reporter_id: currentUser.id,
      reason, status: "open", resolved_by: null, resolution_note: null, created_at: new Date().toISOString()
    };
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

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        // نستخدم نفس دالة الرفع المتاحة ونخزن الرابط كغلاف
        const url = await dataService.uploadAvatar(file);
        const updatedUser = { ...currentUser, cover_url: url } as Profile;
        setCurrentUser(updatedUser);
        await dataService.updateProfile({ cover_url: url } as any);
      } catch (err: any) {
        alert("فشل رفع صورة الغلاف: " + err.message);
      }
    }
  };

  const filteredMemes = memes.filter((meme) => {
    if (meme.status === "deleted" || meme.status === "rejected") return false;
    if (selectedTag) {
      const lowerTag = selectedTag.toLowerCase();
      const match = meme.tags?.some(t => t.toLowerCase() === lowerTag) || meme.caption?.toLowerCase().includes(`#${lowerTag}`);
      if (!match) return false;
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
    <div className="min-h-screen bg-[#F0F2F5] dark:bg-slate-950 transition-colors duration-300 flex flex-col font-sans select-none pb-20 md:pb-6" dir="rtl">
      
      {/* Lightbox - Fullscreen Image Viewer */}
      {viewingImage && (
        <div 
          className="fixed inset-0 z-[99999] bg-black/95 flex items-center justify-center p-4" 
          onClick={() => setViewingImage(null)}
        >
          <button 
            className="absolute top-4 left-4 text-white hover:bg-white/20 p-2 rounded-full z-[100000] transition-colors cursor-pointer"
            onClick={() => setViewingImage(null)}
          >
            <X className="w-8 h-8" />
          </button>
          <img 
            src={viewingImage} 
            className="max-w-full max-h-[90vh] object-contain shadow-2xl rounded-sm" 
            onClick={(e) => e.stopPropagation()} 
            referrerPolicy="no-referrer"
            alt="Fullscreen View"
          />
        </div>
      )}

      {showLevelUpAlert && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 text-center border border-gray-100 dark:border-slate-800 shadow-2xl relative">
            <div className="w-20 h-20 bg-yellow-100 dark:bg-yellow-900/50 rounded-full flex items-center justify-center mx-auto text-yellow-500 animate-bounce shadow">
              <Award className="w-10 h-10" />
            </div>
            <h3 className="font-extrabold text-xl text-gray-900 dark:text-white mt-4">ترقيت في مستويات الميمز 🚀🔥</h3>
            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 py-3 px-5 rounded-2xl inline-block mt-3 text-blue-700 dark:text-blue-300 font-extrabold text-lg">
              {newLevelName}
            </div>
            <button onClick={() => setShowLevelUpAlert(false)} className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-2xl text-sm shadow-md cursor-pointer">
              جاهز! 👍
            </button>
          </div>
        </div>
      )}

      <Header
        currentUser={currentUser} notifications={notifications}
        onNavigate={(tab) => { setActiveTab(tab); setSelectedTag(null); }}
        onSearch={(query) => setSearchQuery(query)} activeTab={activeTab}
        onUserSwitch={handleUserSwitch} availableProfiles={profiles}
        onMarkNotificationsRead={handleMarkNotificationsRead}
        onShowAuthModal={() => { setShowAuthModal(true); setAuthTab("signin"); }}
        onSignOutReal={handleSignOutReal} isRealUser={isRealUser}
      />

      <main className="max-w-7xl mx-auto px-4 py-6 w-full flex-1 flex gap-6">
        
        {/* Right Sidebar */}
        <div className="w-64 shrink-0 hidden lg:flex flex-col gap-4 order-3">
          
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-4 shadow-sm text-right">
            <h4 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2 mb-4 border-b border-gray-100 dark:border-slate-800 pb-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              أفضل المبدعين
            </h4>
            
            <div className="flex flex-col gap-3">
              {profiles.slice(0, 5).map((prof) => (
                <div key={prof.id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <img src={prof.avatar_url || ""} className="w-8 h-8 rounded-full object-cover shrink-0 border border-gray-100 dark:border-slate-700" referrerPolicy="no-referrer" />
                    <div className="flex flex-col min-w-0">
                      <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{prof.username}</p>
                      <p className="text-[10px] text-gray-500 truncate">{prof.meme_level}</p>
                    </div>
                  </div>
                  {prof.id !== currentUser.id && isRealUser && (
                    <button
                      onClick={() => handleFollowToggle(currentUser.id, prof.id)}
                      className={`shrink-0 whitespace-nowrap text-[10px] font-bold px-2 py-1 rounded-md transition-colors ${
                        followingIds.includes(prof.id) 
                          ? "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300" 
                          : "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100"
                      }`}
                    >
                      {followingIds.includes(prof.id) ? "متابع" : "متابعة"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="text-xs text-gray-500 flex flex-wrap gap-2 px-2 mt-2 font-medium">
            <span>الخصوصية</span> · <span>الشروط</span> · <span>الإعلانات</span> · <span>ميمزبوك © 2024</span>
          </div>
        </div>

        {/* Central Content */}
        <div className="flex-1 max-w-full md:max-w-2xl order-2">
          
          {activeTab === "feed" && (
            <div className="flex flex-col gap-4">
              {!isRealUser && (
                <div className="lg:hidden bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm text-center border border-gray-200 dark:border-slate-800 mb-2">
                  <h4 className="font-bold text-sm mb-2 text-gray-900 dark:text-white">سجل دخولك لتتفاعل وتشارك!</h4>
                  <button onClick={() => { setShowAuthModal(true); setAuthTab("signin"); }} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg text-sm w-full shadow-sm">
                    تسجيل الدخول / إنشاء حساب
                  </button>
                </div>
              )}

              {loading ? (
                <div className="text-center py-12 text-gray-500">جاري التحميل...</div>
              ) : filteredMemes.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-12 text-center text-gray-500">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="font-bold text-sm">لا توجد منشورات تطابق بحثك.</p>
                </div>
              ) : (
                filteredMemes.map((meme) => (
                  <MemeCard
                    key={meme.id} meme={meme} currentUser={currentUser}
                    onLikeToggle={handleLikeToggle} onSaveToggle={handleSaveToggle}
                    onFollowToggle={handleFollowToggle} onTagClick={setSelectedTag}
                    onDeleteComment={() => {}} onReportSubmit={handleReportSubmit}
                    onShareCompleted={handleShareCompleted} onDeleteMeme={handleDeleteMeme}
                    onUserProfileClick={(uid) => { setSelectedProfileId(uid); setActiveTab("user-profile"); }}
                    isFollowingCreator={followingIds.includes(meme.user_id)}
                  />
                ))
              )}
            </div>
          )}

          {/* Facebook-style Profile */}
          {(activeTab === "profile" || (activeTab === "user-profile" && selectedProfileId)) && (() => {
            const isMyProfile = activeTab === "profile" || selectedProfileId === currentUser.id;
            const profile = isMyProfile ? currentUser : profiles.find(p => p.id === selectedProfileId);
            
            if (!profile) return <div className="text-center py-10 text-gray-500">المستخدم غير موجود</div>;
            const userMemes = memes.filter(m => m.user_id === profile.id);

            return (
              <div className="flex flex-col gap-4 animate-fade-in">
                {/* Profile Card FB Style */}
                <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
                  
                  {/* Cover Photo */}
                  <div className="h-48 sm:h-64 bg-gray-200 dark:bg-slate-800 relative w-full group">
                     {(profile as any).cover_url ? (
                       <img src={(profile as any).cover_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                     ) : (
                       <div className="w-full h-full bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-slate-800 dark:to-slate-700"></div>
                     )}
                     
                     {isMyProfile && (
                       <label className="absolute bottom-4 right-4 bg-white/90 hover:bg-white text-gray-900 px-3 py-1.5 rounded-md font-bold text-xs shadow-sm cursor-pointer flex items-center gap-1.5 transition-colors">
                         <Camera className="w-4 h-4" />
                         تعديل صورة الغلاف
                         <input type="file" className="hidden" accept="image/*" onChange={handleCoverUpload} />
                       </label>
                     )}
                     
                     {/* Avatar overlapping */}
                     <div className="absolute -bottom-16 right-6">
                        <div className="relative group w-32 h-32 rounded-full overflow-hidden border-4 border-white dark:border-slate-900 bg-gray-100 shadow-sm cursor-pointer">
                          {profile.avatar_url ? (
                            <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover bg-white" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-gray-400 bg-white">
                              {profile.username[0]}
                            </div>
                          )}
                          
                          {isMyProfile && (
                            <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                              <Camera className="w-8 h-8 text-white" />
                              <input 
                                type="file" className="hidden" accept="image/*"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    try {
                                      const url = await dataService.uploadAvatar(file);
                                      setCurrentUser(prev => ({ ...prev, avatar_url: url }));
                                      await dataService.updateProfile({ avatar_url: url });
                                    } catch (err) { alert("فشل الرفع"); }
                                  }
                                }}
                              />
                            </label>
                          )}
                        </div>
                     </div>
                  </div>

                  {/* Profile Details */}
                  <div className="pt-20 px-6 pb-6 text-right">
                     <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          {isMyProfile ? (
                            <input 
                              type="text" value={profile.username} 
                              onChange={async (e) => {
                                const newName = e.target.value;
                                setCurrentUser(prev => ({ ...prev, username: newName }));
                                try { await dataService.updateProfile({ username: newName }); } catch (err) {}
                              }}
                              className="bg-transparent border-none focus:outline-none focus:ring-0 p-0 w-full text-2xl font-black text-gray-900 dark:text-white"
                              placeholder="اسم المستخدم"
                            />
                          ) : (
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white truncate">{profile.username}</h2>
                          )}
                          
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">@{profile.username.toLowerCase().replace(/\s+/g, '_')} · <span className="font-bold text-blue-600 dark:text-blue-400">{profile.meme_level}</span></p>

                          <div className="mt-3">
                            {isMyProfile ? (
                              <textarea
                                value={profile.bio || ""}
                                onChange={async (e) => {
                                  const newBio = e.target.value;
                                  setCurrentUser(prev => ({ ...prev, bio: newBio }));
                                  try { await dataService.updateProfile({ bio: newBio }); } catch (err) {}
                                }}
                                className="w-full bg-gray-50 dark:bg-slate-800 border-none focus:ring-0 p-3 text-sm text-gray-800 dark:text-gray-200 resize-none rounded-lg"
                                placeholder="إضافة سيرة ذاتية..."
                                rows={2}
                              />
                            ) : (
                              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{profile.bio || "لا يوجد وصف حالياً."}</p>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 mt-2 md:mt-0 self-start">
                          {isMyProfile ? (
                             <button onClick={() => setActiveTab("create-post")} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shrink-0">
                               <PlusCircle className="w-4 h-4" /> إضافة ميم
                             </button>
                          ) : (
                            <>
                              <button className="bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white px-4 py-2 rounded-lg font-bold text-sm shrink-0 flex items-center gap-2">
                                <MessageCircle className="w-4 h-4" /> مراسلة
                              </button>
                              <button 
                                onClick={() => handleFollowToggle(currentUser.id, profile.id)}
                                className={`px-5 py-2 rounded-lg text-sm font-bold shrink-0 whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                                  followingIds.includes(profile.id) 
                                    ? "bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white" 
                                    : "bg-blue-600 text-white hover:bg-blue-700"
                                }`}
                              >
                                {followingIds.includes(profile.id) ? <><Check className="w-4 h-4"/> متابع</> : "متابعة"}
                              </button>
                            </>
                          )}
                        </div>
                     </div>

                     <div className="border-t border-gray-100 dark:border-slate-800 mt-6 pt-4 flex items-center gap-6 text-center">
                        <div>
                          <span className="block font-bold text-lg text-gray-900 dark:text-white">{userMemes.length}</span>
                          <span className="text-xs text-gray-500">منشورات</span>
                        </div>
                        <div>
                          <span className="block font-bold text-lg text-gray-900 dark:text-white">{profile.followers_count}</span>
                          <span className="text-xs text-gray-500">متابعين</span>
                        </div>
                        <div>
                          <span className="block font-bold text-lg text-gray-900 dark:text-white">{profile.total_points}</span>
                          <span className="text-xs text-gray-500">النقاط</span>
                        </div>
                     </div>
                  </div>
                </div>

                <div className="flex flex-col gap-4 mt-2">
                  <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-slate-800">
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg">المنشورات</h3>
                  </div>
                  
                  {userMemes.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-12 text-center text-gray-400">
                      <p className="font-bold text-sm">لا توجد منشورات.</p>
                    </div>
                  ) : (
                    userMemes.map((meme) => (
                      <MemeCard
                        key={meme.id} meme={meme} currentUser={currentUser}
                        onLikeToggle={handleLikeToggle} onSaveToggle={handleSaveToggle}
                        onFollowToggle={handleFollowToggle} onTagClick={setSelectedTag}
                        onDeleteComment={() => {}} onReportSubmit={handleReportSubmit}
                        onShareCompleted={handleShareCompleted} onDeleteMeme={handleDeleteMeme}
                        onUserProfileClick={() => {}} isFollowingCreator={followingIds.includes(meme.user_id)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })()}

          {/* لوحة الشرف المعاد تصميمها بشكل احترافي ونظيف (Clean List UI) */}
          {activeTab === "leaderboard" && (
            <div className="flex flex-col gap-4 animate-fade-in">
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50/50 dark:bg-slate-800/30">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-blue-600" />
                    لوحة الشرف والأوائل
                  </h2>
                </div>
                
                <div className="divide-y divide-gray-100 dark:divide-slate-800/80">
                  {[...profiles].sort((a,b) => b.total_points - a.total_points).map((prof, idx) => (
                    <div key={prof.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors">
                      
                      <div className="flex items-center gap-3 w-full min-w-0">
                        {/* الرقم */}
                        <div className="w-6 shrink-0 text-center font-bold text-gray-400 dark:text-gray-500 text-sm">
                          {idx + 1}
                        </div>
                        
                        {/* الصورة */}
                        <img 
                          src={prof.avatar_url || ""} 
                          className="w-12 h-12 rounded-full object-cover shrink-0 border border-gray-100 dark:border-slate-700 bg-white"
                          referrerPolicy="no-referrer"
                        />
                        
                        {/* الاسم والبيانات مع flex-1 و min-w-0 لضمان عدم الدفع */}
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <p className="text-sm font-bold text-gray-900 dark:text-white truncate" title={prof.username}>
                            {prof.username}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{prof.meme_level}</span>
                            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded-sm shrink-0">
                              {prof.total_points} XP
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* زر المتابعة مع shrink-0 و whitespace-nowrap لضمان ثباته */}
                      {prof.id !== currentUser.id && isRealUser && (
                        <button
                          onClick={() => handleFollowToggle(currentUser.id, prof.id)}
                          className={`ml-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 whitespace-nowrap min-w-[85px] text-center ${
                            followingIds.includes(prof.id) 
                              ? "bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white" 
                              : "bg-blue-600 text-white hover:bg-blue-700"
                          }`}
                        >
                          {followingIds.includes(prof.id) ? "متابع" : "متابعة"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "trending" && (
            <div className="flex flex-col gap-4 animate-fade-in">
               <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-4 shadow-sm text-right flex items-center justify-between">
                <h2 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                  <Flame className="w-5 h-5 text-red-500" /> التريند
                </h2>
              </div>
              {[...memes]
                .sort((a,b) => {
                  const scoreA = (a.likes_count * 10 + a.comments_count * 15 + a.shares_count * 20 + a.saves_count * 12);
                  const scoreB = (b.likes_count * 10 + b.comments_count * 15 + b.shares_count * 20 + b.saves_count * 12);
                  return scoreB - scoreA;
                })
                .map((m) => (
                  <MemeCard
                    key={m.id} meme={m} currentUser={currentUser}
                    onLikeToggle={handleLikeToggle} onSaveToggle={handleSaveToggle}
                    onFollowToggle={handleFollowToggle} onTagClick={setSelectedTag}
                    onDeleteComment={() => {}} onReportSubmit={handleReportSubmit}
                    onShareCompleted={handleShareCompleted} onDeleteMeme={handleDeleteMeme}
                    onUserProfileClick={(uid) => { setSelectedProfileId(uid); setActiveTab("user-profile"); }}
                    isFollowingCreator={followingIds.includes(m.user_id)}
                  />
                ))
              }
            </div>
          )}
        </div>

        <Sidebar
          currentUser={currentUser} activeTab={activeTab}
          onNavigate={(tab) => { setActiveTab(tab); setSelectedTag(null); }}
          savedCount={savedMemesCount}
        />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 flex items-center justify-around py-3 md:hidden">
        <button onClick={() => { setActiveTab("feed"); setSelectedTag(null); }} className={`p-2 rounded-lg ${activeTab === 'feed' ? 'bg-blue-50 text-blue-600 dark:bg-slate-800 dark:text-blue-400' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800'}`}>
          <Home className="w-6 h-6" />
        </button>
        <button onClick={() => { setActiveTab("trending"); setSelectedTag(null); }} className={`p-2 rounded-lg ${activeTab === 'trending' ? 'bg-blue-50 text-blue-600 dark:bg-slate-800 dark:text-blue-400' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800'}`}>
          <Flame className="w-6 h-6" />
        </button>
        <button onClick={() => { setActiveTab("leaderboard"); setSelectedTag(null); }} className={`p-2 rounded-lg ${activeTab === 'leaderboard' ? 'bg-blue-50 text-blue-600 dark:bg-slate-800 dark:text-blue-400' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800'}`}>
          <Trophy className="w-6 h-6" />
        </button>
        <button onClick={() => { setActiveTab("profile"); setSelectedTag(null); }} className={`p-2 rounded-lg ${activeTab === 'profile' ? 'bg-blue-50 text-blue-600 dark:bg-slate-800 dark:text-blue-400' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800'}`}>
          <User className="w-6 h-6" />
        </button>
      </nav>

      {/* نافذة تسجيل الدخول - تصميم فيسبوك الاحترافي */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-[400px] w-full p-6 text-right shadow-2xl relative animate-fade-in border border-gray-100 dark:border-slate-800">
            <button 
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 left-4 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6 mt-2">
              <h2 className="text-blue-600 dark:text-blue-500 text-3xl font-black font-sans tracking-tight mb-1">
                memesbook
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                تواصل مع الأصدقاء وشارك الضحك.
              </p>
            </div>

            <form onSubmit={authTab === "signin" ? handleSignIn : handleSignUp} className="flex flex-col gap-3">
              
              <input
                type="email" required placeholder="البريد الإلكتروني" value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent rounded-md px-4 py-3 text-base text-gray-900 dark:text-white"
              />

              {authTab === "signup" && (
                <input
                  type="text" required placeholder="اسم المستخدم" value={authUsername}
                  onChange={(e) => setAuthUsername(e.target.value.replace(/\s+/g, '_'))}
                  className="w-full bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent rounded-md px-4 py-3 text-base text-gray-900 dark:text-white"
                />
              )}

              <input
                type="password" required placeholder="كلمة السر" value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent rounded-md px-4 py-3 text-base text-gray-900 dark:text-white font-mono text-right"
                dir="ltr"
              />

              {authError && (
                <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 rounded-md mt-1 text-center">
                  {authError}
                </div>
              )}

              {authSuccess && (
                <div className="text-sm text-green-700 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 rounded-md mt-1 text-center font-bold">
                  {authSuccess}
                </div>
              )}

              <button
                type="submit" disabled={authLoading}
                className="w-full mt-2 bg-[#1877f2] hover:bg-[#166fe5] text-white font-bold py-3 rounded-md text-lg transition-colors flex items-center justify-center disabled:opacity-70"
              >
                {authLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (authTab === "signin" ? "تسجيل الدخول" : "إنشاء حساب")}
              </button>
            </form>

            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-800 text-center">
              {authTab === "signin" ? (
                <button onClick={() => { setAuthTab("signup"); setAuthError(""); }} className="bg-[#42b72a] hover:bg-[#36a420] text-white font-bold py-2.5 px-6 rounded-md text-base transition-colors inline-block mt-2">
                  إنشاء حساب جديد
                </button>
              ) : (
                <button onClick={() => { setAuthTab("signin"); setAuthError(""); }} className="text-blue-600 dark:text-blue-400 font-bold hover:underline">
                  لديك حساب بالفعل؟ تسجيل الدخول
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

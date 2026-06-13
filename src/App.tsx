import React, { useState, useEffect } from "react"; 
import { Home, Flame, Trophy, Bookmark, Sparkles, X, Clock, Award, CheckCircle2, User, Camera, Edit2, ShieldAlert, MessageCircle, PlusCircle } from "lucide-react";

import { Profile, Meme, Notification, Report } from "./types"; 
import { dataService, calculateMemeLevel } from "./services/dataService";

// استدعاء المكونات الخاصة بك
import Header from "./components/Header.tsx"; 
import Sidebar from "./components/Sidebar.tsx"; 
import MemeCard from "./components/MemeCard.tsx"; 
import Leaderboard from "./components/Leaderboard.tsx";

// المكونات الجديدة اللي فصلناها عشان ننضف الكود
import RightSidebar from "./components/RightSidebar.tsx";
import CreatePost from "./components/CreatePost.tsx";

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
  const [activeTab, setActiveTab] = useState("feed"); 
  const [currentUser, setCurrentUser] = useState(initialGuestProfile); 
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

  const [postError, setPostError] = useState("");
  const [postSuccess, setPostSuccess] = useState(false); 

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

  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

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
    const updatedUser = { ...currentUser, total_points: newPts, meme_level: calculateMemeLevel(newPts) };
    setCurrentUser(updatedUser);
    setProfiles((prev) => prev.map(p => p.id === currentUser.id ? updatedUser : p));
    localStorage.setItem("memesbook_current_user", JSON.stringify(updatedUser));
    checkLevelUp(oldPts, newPts);
  };

  const handleLikeToggle = async (memeId: string) => { 
    if (!memeId) return; 
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

  const handleCreatePostSubmit = async (caption: string, imagePreview: string, tags: string, file: File | null) => {
    setPostError(""); setPostSuccess(false); setLoading(true);
    try {
      let finalImageUrl = imagePreview.trim() || "";
      if (file) finalImageUrl = await dataService.uploadMemeFile(file);
      const splitTags = tags.split(" ").filter(t => t.startsWith("#")).map(t => t.replace("#", ""));
      const newMeme = await dataService.createMeme({ user_id: currentUser.id, image_url: finalImageUrl, caption: caption.trim(), tags: splitTags });
      setMemes((prev) => [newMeme, ...prev]);
      updateUserPointsInState(5);
      setPostSuccess(true);
      setActiveTab("feed");
      setTimeout(() => setPostSuccess(false), 4400);
    } catch (err: any) {
      setPostError(err.message || "حدث خطأ أثناء النشر.");
    } finally { setLoading(false); }
  };

  const handleSignIn = async (e: React.FormEvent) => { 
    e.preventDefault(); setAuthLoading(true); setAuthError(""); setAuthSuccess(""); 
    try { 
      const profile = await dataService.signIn(authEmail, authPassword); 
      setCurrentUser(profile); setPrevPoints(profile.total_points); 
      setAuthSuccess("تم الدخول بنجاح! نورت منصتك يا غالي 🎉"); 
      setAuthEmail(""); setAuthPassword(""); 
      setTimeout(() => { setShowAuthModal(false); loadAllData(); }, 1500); 
    } catch (err: any) { setAuthError(err.message || "فشل الدخول. تأكد من البيانات."); } finally { setAuthLoading(false); } 
  };

  const handleSignUp = async (e: React.FormEvent) => { 
    e.preventDefault(); 
    if (!authUsername.trim()) { setAuthError("يا غالي اكتب اسم مستخدم مميز!"); return; } 
    setAuthLoading(true); setAuthError(""); setAuthSuccess("");
    try { 
      const profile = await dataService.signUp(authEmail, authPassword, authUsername.trim()); 
      setCurrentUser(profile); setPrevPoints(profile.total_points); 
      setAuthSuccess("تم الإنشاء! أهلاً بك 😄🎉"); 
      setAuthEmail(""); setAuthPassword(""); setAuthUsername(""); 
      setTimeout(() => { setShowAuthModal(false); loadAllData(); }, 1500); 
    } catch (err: any) { setAuthError(err.message || "تعذّر الإنشاء. تأكد من البيانات."); } finally { setAuthLoading(false); } 
  };

  const handleSignOutReal = async () => { 
    try { await dataService.signOut(); setCurrentUser(initialGuestProfile); setPrevPoints(0); loadAllData(); } catch (e) { console.error(e); } 
  };

  const handleReportSubmit = (memeId: string, reason: string) => { 
    const newReport: Report = { id: `report-${Date.now()}`, meme_id: memeId, reporter_id: currentUser.id, reason, status: "open", resolved_by: null, resolution_note: null, created_at: new Date().toISOString() };
    const updatedReports = [...reports, newReport]; setReports(updatedReports); localStorage.setItem("memesbook_reports_list", JSON.stringify(updatedReports));
  };

  const handleShareCompleted = async (memeId: string) => { 
    await dataService.recordShare(memeId); setMemes((prev) => prev.map(m => m.id === memeId ? { ...m, shares_count: m.shares_count + 1 } : m)); 
  };

  const handleDeleteMeme = async (memeId: string) => { 
    if (window.confirm("هل أنت متأكد من حذف هذا الميم؟")) { 
      try { await dataService.deleteMeme(memeId, currentUser.id); setMemes((prev) => prev.filter(m => m.id !== memeId)); } catch (err: any) { alert(err.message || "فشل الحذف."); } 
    } 
  };

  const isRealUser = currentUser.id !== "guest-user-temp";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans selection:bg-blue-200 dark:selection:bg-blue-900" dir="rtl">
      <style>{`
        .post-wrapper > div, .post-wrapper > article { border-radius: 12px !important; overflow: hidden !important; }
        .post-wrapper img:not(.rounded-full) { cursor: pointer; border-radius: 8px !important; }
        .min-w-0 { min-width: 0; }
        .truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .flex-1 { flex: 1 1 0%; }
        .shrink-0 { flex-shrink: 0; }
      `}</style>

      {/* Lightbox */}
      {lightboxImage && (
        <div className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center backdrop-blur-sm transition-opacity duration-300" onClick={() => setLightboxImage(null)}>
          <button className="absolute top-4 right-4 md:top-6 md:right-6 text-white/70 hover:text-white bg-white/10 p-2 rounded-full z-50"><X className="w-8 h-8" /></button>
          <img src={lightboxImage} alt="Full size" className="max-w-full max-h-[95vh] object-contain animate-fade-in" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      <Header currentUser={currentUser} notifications={notifications} onNavigate={(tab) => { setActiveTab(tab); setSelectedTag(null); }} onSearch={setSearchQuery} activeTab={activeTab} onUserSwitch={(p) => setCurrentUser(p)} availableProfiles={profiles} onMarkNotificationsRead={() => {}} onShowAuthModal={() => { setShowAuthModal(true); setAuthTab("signin"); }} onSignOutReal={handleSignOutReal} isRealUser={isRealUser} />

      <main className="max-w-7xl mx-auto px-0 md:px-4 py-4 md:py-6 pb-24 md:pb-8 flex gap-6" onClick={(e) => { const target = e.target as HTMLElement; if (target.tagName === 'IMG' && !target.className.includes('rounded-full')) setLightboxImage((target as HTMLImageElement).src); }}>
        
        {/* الويدجتس الجانبية - استدعيناها كملف منفصل */}
        <RightSidebar isRealUser={isRealUser} profiles={profiles} onAuthClick={() => { setShowAuthModal(true); setAuthTab("signin"); }} onProfileClick={(id) => { setSelectedProfileId(id); setActiveTab("user-profile"); }} onViewLeaderboard={() => setActiveTab("leaderboard")} />

        <div className="flex-1 max-w-full md:max-w-[600px] lg:max-w-[640px] xl:max-w-2xl mx-auto order-2 w-full">
          
          {activeTab === "feed" && (
            <div className="flex flex-col gap-4 px-0 md:px-0">
              {memes.filter(m => !searchQuery || m.caption?.includes(searchQuery)).map((meme) => (
                <div key={meme.id} className="post-wrapper w-full">
                  <MemeCard meme={meme} currentUser={currentUser} onLikeToggle={handleLikeToggle} onSaveToggle={handleSaveToggle} onFollowToggle={handleFollowToggle} onTagClick={setSelectedTag} onDeleteComment={() => {}} onReportSubmit={handleReportSubmit} onShareCompleted={handleShareCompleted} onDeleteMeme={handleDeleteMeme} onUserProfileClick={(uid) => { setSelectedProfileId(uid); setActiveTab("user-profile"); }} isFollowingCreator={followingIds.includes(meme.user_id)} onImageClick={(url) => setLightboxImage(url)} />
                </div>
              ))}
            </div>
          )}

          {activeTab === "create-post" && (
            <CreatePost currentUser={currentUser} loading={loading} postError={postError} onCancel={() => setActiveTab("feed")} onSubmit={handleCreatePostSubmit} />
          )}

          {activeTab === "leaderboard" && (
            <Leaderboard profiles={profiles} currentUser={currentUser} followingIds={followingIds} onFollowToggle={handleFollowToggle} onNavigate={setActiveTab} />
          )}

          {/* صفحة البروفايل (عدلنا فيها مشكلة التداخل) */}
          {(activeTab === "profile" || (activeTab === "user-profile" && selectedProfileId)) && (
            <div className="flex flex-col w-full animate-fade-in md:pb-10">
              {(() => {
                const isOwnProfile = activeTab === "profile" || selectedProfileId === currentUser.id;
                const profile = isOwnProfile ? currentUser : profiles.find(p => p.id === selectedProfileId);
                if (!profile) return <div className="text-center py-10 font-bold text-gray-500">المستخدم غير موجود</div>;
                const userMemes = memes.filter(m => m.user_id === profile.id);

                return (
                  <>
                    <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm mb-4 pb-6 md:rounded-b-2xl">
                      <div className="w-full h-48 sm:h-72 bg-gradient-to-r from-blue-600 to-indigo-700 relative md:rounded-t-none"></div>
                      <div className="px-4 sm:px-8 max-w-5xl mx-auto flex flex-col sm:flex-row items-center sm:items-end justify-between relative -mt-16 sm:-mt-20 gap-4 sm:gap-0">
                        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-3 sm:gap-5 w-full text-center sm:text-right min-w-0">
                          <div className="w-32 h-32 sm:w-40 sm:h-40 shrink-0 rounded-full border-4 border-white dark:border-gray-900 bg-gray-100 overflow-hidden cursor-pointer">
                            <img src={profile.avatar_url} className="w-full h-full object-cover" />
                          </div>
                          <div className="pb-2 flex-1 min-w-0">
                            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mb-1 truncate">{profile.username}</h1>
                            <p className="text-sm font-bold text-gray-500 mb-2 truncate">{profile.followers_count} متابع • {profile.following_count || 0} يتابع</p>
                            <span className="text-xs text-blue-700 font-bold bg-blue-50 px-2.5 py-1 rounded-md">{profile.meme_level}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0 pb-2">
                          {!isOwnProfile && isRealUser ? (
                            <button onClick={() => handleFollowToggle(currentUser.id, profile.id)} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold flex items-center gap-2">
                              {followingIds.includes(profile.id) ? <CheckCircle2 className="w-4 h-4"/> : <PlusCircle className="w-4 h-4"/>} 
                              {followingIds.includes(profile.id) ? "يتابع" : "متابعة"}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>

        <Sidebar currentUser={currentUser} activeTab={activeTab} onNavigate={setActiveTab} savedCount={memes.filter(m => m.saved_by_me).length} />
      </main>

      {/* Auth Modal UI */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm p-6 text-right relative">
             <button onClick={() => setShowAuthModal(false)} className="absolute top-4 left-4 p-1"><X className="w-5 h-5"/></button>
             <h3 className="font-bold text-lg mb-4 text-center">دخول المنصة</h3>
             <form onSubmit={authTab === "signin" ? handleSignIn : handleSignUp} className="flex flex-col gap-3">
               <input type="email" placeholder="البريد" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" required />
               {authTab === "signup" && <input type="text" placeholder="الاسم" value={authUsername} onChange={(e) => setAuthUsername(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" required />}
               <input type="password" placeholder="الرقم السري" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" required />
               {authError && <div className="text-red-500 text-xs">{authError}</div>}
               <button type="submit" disabled={authLoading} className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-bold mt-2">دخول</button>
             </form>
          </div>
        </div>
      )}
    </div>
  ); 
  }

import React, { useState, useEffect } from "react";
import { Home, Flame, Bookmark, User, X, Award, ShieldAlert, CheckCircle2, Clock, PlusCircle } from "lucide-react";

import { Profile, Meme, Notification, Report } from "./types";
import { dataService, calculateMemeLevel } from "./services/dataService";

// استيراد المكونات المشتركة
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Leaderboard from "./components/Leaderboard";
import RightSidebar from "./components/RightSidebar";

// استيراد الصفحات المستقلة النضيفة والمثالية
import FeedPage from "./pages/FeedPage";
import CreatePostPage from "./pages/CreatePostPage";
import SavesPage from "./pages/SavesPage";
import TrendingPage from "./pages/TrendingPage";
import ProfilePage from "./pages/ProfilePage";

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
  const [currentUser, setCurrentUser] = useState<Profile>(initialGuestProfile);
  const [memes, setMemes] = useState<Meme[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [dbError, setDbError] = useState<string | null>(null);

  // الفلاتر والبحث
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  // بيانات واجهة النشر والبوستات
  const [newPostImage, setNewPostImage] = useState("");
  const [newPostCaption, setNewPostCaption] = useState("");
  const [newPostTags, setNewPostTags] = useState("");
  const [postError, setPostError] = useState("");
  const [postSuccess, setPostSuccess] = useState(false);
  const [quickPostFile, setQuickPostFile] = useState<File | null>(null);

  // مودال الحسابات والتوثيق
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTab, setAuthTab] = useState<"signin" | "signup">("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authUsername, setAuthUsername] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // الترقية واللايت بوكس
  const [showLevelUpAlert, setShowLevelUpAlert] = useState(false);
  const [newLevelName, setNewLevelName] = useState("");
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    loadAllData();
  }, [activeTab]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const dbCurrentUser = await dataService.getCurrentUser();
      setCurrentUser(dbCurrentUser);

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
    } catch (e: any) {
      console.warn("Database init error:", e);
      setDbError(e.message || "خطأ اتصال مؤقت بجداول السيرفر.");
    } finally {
      setLoading(false);
    }
  };

  const updateUserPointsInState = (addedPoints: number) => {
    const oldPts = currentUser.total_points;
    const newPts = oldPts + addedPoints;
    const updatedUser = { ...currentUser, total_points: newPts, meme_level: calculateMemeLevel(newPts) };
    setCurrentUser(updatedUser);
    setProfiles((prev) => prev.map(p => p.id === currentUser.id ? updatedUser : p));
    localStorage.setItem("memesbook_current_user", JSON.stringify(updatedUser));
  };

  const handleLikeToggle = async (memeId: string) => {
    try {
      const { liked, likesCount } = await dataService.toggleLike(memeId, currentUser.id);
      setMemes(prev => prev.map(m => m.id === memeId ? { ...m, likes_count: likesCount, liked_by_me: liked } : m));
    } catch (e) { console.error(e); }
  };

  const handleSaveToggle = async (memeId: string) => {
    try {
      const saved = await dataService.toggleSave(memeId, currentUser.id);
      setMemes(prev => prev.map(m => m.id === memeId ? { ...m, saved_by_me: saved } : m));
    } catch (e) { console.error(e); }
  };

  const handleFollowToggle = async (followerId: string, followingId: string) => {
    try {
      const success = await dataService.followUser(followerId, followingId);
      if (success) {
        setFollowingIds(prev => [...prev, followingId]);
        await loadAllData();
      }
    } catch (e) { console.error(e); }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        setPostError("حجم الميم كبير بزيادة! الحد الأقصى 8 ميجابايت.");
        return;
      }
      setQuickPostFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) setNewPostImage(event.target.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleQuickPostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostImage.trim() && !newPostCaption.trim()) {
      setPostError("لازم تكتب نص أو ترفع صورة عشان تنشر الميم يا قبطان!");
      return;
    }
    setLoading(true);
    try {
      let finalImageUrl = newPostImage.trim() || "";
      if (quickPostFile) {
        finalImageUrl = await dataService.uploadMemeFile(quickPostFile);
      }
      const splitTags = newPostTags.split(" ").filter(t => t.startsWith("#")).map(t => t.replace("#", ""));
      await dataService.createMeme({ user_id: currentUser.id, image_url: finalImageUrl, caption: newPostCaption.trim(), tags: splitTags });
      
      updateUserPointsInState(5);
      setNewPostImage(""); setNewPostCaption(""); setNewPostTags(""); setQuickPostFile(null);
      setActiveTab("feed");
    } catch (err: any) {
      setPostError(err.message || "حدث خطأ غير متوقع أثناء المعالجة والنشر.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault(); setAuthLoading(true); setAuthError("");
    try {
      const profile = await dataService.signIn(authEmail, authPassword);
      setCurrentUser(profile); setShowAuthModal(false); loadAllData();
    } catch (err: any) { setAuthError(err.message || "بيانات الدخول غير صحيحة."); }
    finally { setAuthLoading(false); }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault(); setAuthLoading(true); setAuthError("");
    try {
      const profile = await dataService.signUp(authEmail, authPassword, authUsername.trim());
      setCurrentUser(profile); setShowAuthModal(false); loadAllData();
    } catch (err: any) { setAuthError(err.message || "فشل الإنشاء (الباسورد يجب أن يتعدى 6 رموز)."); }
    finally { setAuthLoading(false); }
  };

  const filteredMemes = memes.filter((meme) => {
    if (selectedTag && !meme.tags?.map(t=>t.toLowerCase()).includes(selectedTag.toLowerCase())) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return meme.caption?.toLowerCase().includes(q) || meme.profiles?.username.toLowerCase().includes(q);
    }
    return true;
  });

  const isRealUser = currentUser.id !== "guest-user-temp";
  const savedMemesCount = memes.filter(m => m.saved_by_me).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100 flex flex-col antialiased" dir="rtl">
      <style>{`
        .post-wrapper > div { border-radius: 16px !important; overflow: hidden !important; }
        .truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .min-w-0 { min-width: 0; }
        .shrink-0 { shrink-0: true; }
      `}</style>

      {/* شاشة عرض لايت بوكس للصور الكبيرة */}
      {lightboxImage && (
        <div className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center backdrop-blur-sm" onClick={() => setLightboxImage(null)}>
          <button className="absolute top-4 right-4 text-white bg-white/10 p-3 rounded-full hover:bg-white/20 transition-all"><X className="w-6 h-6" /></button>
          <img src={lightboxImage} alt="Full Size" className="max-w-full max-h-[92vh] object-contain animate-fade-in" />
        </div>
      )}

      {/* هيدر التطبيق العلوي */}
      <Header
        currentUser={currentUser} notifications={notifications} activeTab={activeTab} isRealUser={isRealUser} availableProfiles={profiles}
        onNavigate={(tab) => { setActiveTab(tab); setSelectedTag(null); }} onSearch={setSearchQuery}
        onUserSwitch={(p) => { setCurrentUser(p); loadAllData(); }} onMarkNotificationsRead={async () => {}}
        onShowAuthModal={() => { setShowAuthModal(true); setAuthTab("signin"); }} onSignOutReal={async () => { setCurrentUser(initialGuestProfile); loadAllData(); }}
      />

      {/* جسد التخطيط والصفحات */}
      <main className="max-w-7xl mx-auto px-0 md:px-4 py-6 w-full flex-1 flex gap-6">
        
        {/* البطاقات الجانبية (تم إصلاحها بالكامل لتكون رائعة واحترافية) */}
        <RightSidebar
          isRealUser={isRealUser} profiles={profiles}
          onShowAuthModal={() => { setShowAuthModal(true); setAuthTab("signin"); }}
          setSelectedProfileId={setSelectedProfileId} setActiveTab={setActiveTab}
        />

        {/* عرض خلاصة الصفحات المختارة بناءً على الـ activeTab وبدون استبعاد أي صفحة */}
        <div className="flex-1 max-w-full md:max-w-[640px] xl:max-w-2xl mx-auto order-2 w-full">
          {activeTab === "feed" && (
            <FeedPage
              isRealUser={isRealUser} loading={loading} filteredMemes={filteredMemes} currentUser={currentUser} followingIds={followingIds}
              setMemes={setMemes} setShowAuthModal={setShowAuthModal} setAuthTab={setAuthTab} setSearchQuery={setSearchQuery} setSelectedTag={setSelectedTag}
              handleLikeToggle={handleLikeToggle} handleSaveToggle={handleSaveToggle} handleFollowToggle={handleFollowToggle}
              handleReportSubmit={() => {}} handleShareCompleted={async () => {}} handleDeleteMeme={async () => {}}
              setSelectedProfileId={setSelectedProfileId} setActiveTab={setActiveTab} setLightboxImage={setLightboxImage}
            />
          )}

          {activeTab === "create-post" && (
            <CreatePostPage
              currentUser={currentUser} loading={loading} newPostCaption={newPostCaption} setNewPostCaption={setNewPostCaption}
              newPostImage={newPostImage} setNewPostImage={setNewPostImage} newPostTags={newPostTags} setNewPostTags={setNewPostTags}
              postError={postError} handleFileChange={handleFileChange} handleQuickPostSubmit={handleQuickPostSubmit} setActiveTab={setActiveTab}
            />
          )}

          {activeTab === "saves" && (
            <SavesPage
              memes={memes} currentUser={currentUser} followingIds={followingIds} handleLikeToggle={handleLikeToggle}
              handleSaveToggle={handleSaveToggle} handleFollowToggle={handleFollowToggle} setSelectedTag={setSelectedTag}
              handleReportSubmit={() => {}} handleShareCompleted={async () => {}} handleDeleteMeme={async () => {}}
              setSelectedProfileId={setSelectedProfileId} setActiveTab={setActiveTab} setLightboxImage={setLightboxImage}
            />
          )}

          {activeTab === "trending" && (
            <TrendingPage
              memes={memes} currentUser={currentUser} followingIds={followingIds} handleLikeToggle={handleLikeToggle}
              handleSaveToggle={handleSaveToggle} handleFollowToggle={handleFollowToggle} setSelectedTag={setSelectedTag}
              handleReportSubmit={() => {}} handleShareCompleted={async () => {}} handleDeleteMeme={async () => {}}
              setSelectedProfileId={setSelectedProfileId} setActiveTab={setActiveTab} setLightboxImage={setLightboxImage}
            />
          )}

          {(activeTab === "profile" || (activeTab === "user-profile" && selectedProfileId)) && (
            <ProfilePage
              profile={activeTab === "profile" ? currentUser : profiles.find(p => p.id === selectedProfileId)!}
              currentUser={currentUser} isOwnProfile={activeTab === "profile" || selectedProfileId === currentUser.id}
              isRealUser={isRealUser} userMemes={memes.filter(m => m.user_id === (activeTab === "profile" ? currentUser.id : selectedProfileId))}
              followingIds={followingIds} setCurrentUser={setCurrentUser} setProfiles={setProfiles} setShowAuthModal={setShowAuthModal}
              handleFollowToggle={handleFollowToggle} handleLikeToggle={handleLikeToggle} handleSaveToggle={handleSaveToggle}
              setSelectedTag={setSelectedTag} handleReportSubmit={() => {}} handleShareCompleted={async () => {}}
              handleDeleteMeme={async () => {}} setSelectedProfileId={setSelectedProfileId} setActiveTab={setActiveTab} setLightboxImage={setLightboxImage}
            />
          )}

          {activeTab === "leaderboard" && (
            <Leaderboard profiles={profiles} currentUser={currentUser} onNavigate={setActiveTab} onFollowToggle={handleFollowToggle} followingIds={followingIds} />
          )}
        </div>

        {/* شريط الأيقونات الجانبي الأيسر */}
        <Sidebar currentUser={currentUser} activeTab={activeTab} onNavigate={(tab) => { setActiveTab(tab); setSelectedTag(null); }} savedCount={savedMemesCount} />
      </main>

      {/* الملاحة السفلية للشاشات الصغيرة */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex items-center justify-around py-3 md:hidden shadow-[0_-5px_10px_rgba(0,0,0,0.05)]">
        <button onClick={() => setActiveTab("feed")} className={`flex flex-col items-center gap-1 ${activeTab === 'feed' ? 'text-blue-600' : 'text-gray-500'}`}><Home className="w-5 h-5" /><span className="text-[10px] font-bold">الرئيسية</span></button>
        <button onClick={() => setActiveTab("trending")} className={`flex flex-col items-center gap-1 ${activeTab === 'trending' ? 'text-blue-600' : 'text-gray-500'}`}><Flame className="w-5 h-5" /><span className="text-[10px] font-bold">تريند</span></button>
        <button onClick={() => setActiveTab("create-post")} className={`flex flex-col items-center gap-1 ${activeTab === 'create-post' ? 'text-blue-600' : 'text-gray-500'}`}><PlusCircle className="w-5 h-5" /><span className="text-[10px] font-bold">نشر ميم</span></button>
        <button onClick={() => setActiveTab("saves")} className={`flex flex-col items-center gap-1 ${activeTab === 'saves' ? 'text-blue-600' : 'text-gray-500'}`}><Bookmark className="w-5 h-5" /><span className="text-[10px] font-bold">محفوظات</span></button>
        <button onClick={() => setActiveTab("profile")} className={`flex flex-col items-center gap-1 ${activeTab === 'profile' || activeTab === 'user-profile' ? 'text-blue-600' : 'text-gray-500'}`}><User className="w-5 h-5" /><span className="text-[10px] font-bold">حسابي</span></button>
      </nav>

      {/* مودال الدخول والاشتراك */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-sm w-full p-6 text-right border dark:border-gray-800 relative shadow-2xl">
            <button onClick={() => setShowAuthModal(false)} className="absolute top-4 left-4 text-gray-400 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg"><X className="w-4 h-4" /></button>
            <h3 className="font-bold text-center text-lg mb-4 text-gray-900 dark:text-white">بوابة مجتمع ميمزبوك 🎯</h3>
            
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl mb-4">
              <button onClick={() => setAuthTab("signin")} className={`flex-1 text-center py-2 text-xs font-bold rounded-lg ${authTab === "signin" ? "bg-white dark:bg-gray-900 text-blue-600 shadow" : "text-gray-400"}`}>تسجيل دخول</button>
              <button onClick={() => setAuthTab("signup")} className={`flex-1 text-center py-2 text-xs font-bold rounded-lg ${authTab === "signup" ? "bg-white dark:bg-gray-900 text-blue-600 shadow" : "text-gray-400"}`}>عضو جديد</button>
            </div>

            <form onSubmit={authTab === "signin" ? handleSignIn : handleSignUp} className="flex flex-col gap-3">
              <input type="email" required placeholder="البريد الإلكتروني" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-950 border dark:border-gray-800 rounded-xl px-3 py-2.5 text-sm" />
              {authTab === "signup" && <input type="text" required placeholder="اسم المستخدم (بدون مسافات)" value={authUsername} onChange={(e) => setAuthUsername(e.target.value.replace(/\s+/g, '_'))} className="w-full bg-gray-50 dark:bg-gray-950 border dark:border-gray-800 rounded-xl px-3 py-2.5 text-sm" />}
              <input type="password" required placeholder="كلمة المرور" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-950 border dark:border-gray-800 rounded-xl px-3 py-2.5 text-sm" />
              {authError && <div className="text-xs text-red-600 bg-red-50 p-2 rounded-lg flex items-center gap-1"><ShieldAlert className="w-4 h-4" />{authError}</div>}
              <button type="submit" disabled={authLoading} className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-xl text-sm transition-all hover:bg-blue-700 flex justify-center">
                {authLoading ? <Clock className="w-4 h-4 animate-spin" /> : <span>تأكيد الدخول 🚀</span>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

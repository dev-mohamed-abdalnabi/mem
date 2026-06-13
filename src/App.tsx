import React, { useState, useEffect } from "react";
import { Home, Flame, Trophy, Bookmark, User, X, Award, ShieldAlert, CheckCircle2, Clock } from "lucide-react";

import { Profile, Meme, Notification, Report } from "./types";
import { dataService, calculateMemeLevel } from "./services/dataService";

// الاستيرادات من المكونات المقسمة
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Leaderboard from "./components/Leaderboard";
import RightSidebar from "./components/RightSidebar";

// الاستيرادات من الصفحات المعزولة حديثاً
import FeedPage from "./pages/FeedPage";
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

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  // Authentication & Lightbox States
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTab, setAuthTab] = useState<"signin" | "signup">("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authUsername, setAuthUsername] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

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
      console.warn("Supabase init warning:", e);
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

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault(); setAuthLoading(true); setAuthError("");
    try {
      const profile = await dataService.signIn(authEmail, authPassword);
      setCurrentUser(profile); setShowAuthModal(false); loadAllData();
    } catch (err: any) { setAuthError(err.message || "خطأ بالدخول."); }
    finally { setAuthLoading(false); }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault(); setAuthLoading(true); setAuthError("");
    try {
      const profile = await dataService.signUp(authEmail, authPassword, authUsername.trim());
      setCurrentUser(profile); setShowAuthModal(false); loadAllData();
    } catch (err: any) { setAuthError(err.message || "خطأ بالتسجيل."); }
    finally { setAuthLoading(false); }
  };

  const filteredMemes = memes.filter((meme) => {
    if (selectedTag && !meme.tags?.includes(selectedTag)) return false;
    if (searchQuery) return meme.caption?.toLowerCase().includes(searchQuery.toLowerCase());
    return true;
  });

  const isRealUser = currentUser.id !== "guest-user-temp";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100 flex flex-col antialiased">
      {/* ستايل مخصص للبوستات لمنع قفشات الحواف والأبعاد */}
      <style>{`
        .post-wrapper > div { border-radius: 16px !important; overflow: hidden !important; }
        .truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      `}</style>

      {/* Lightbox المكبّر */}
      {lightboxImage && (
        <div className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center backdrop-blur-sm" onClick={() => setLightboxImage(null)}>
          <button className="absolute top-4 right-4 text-white bg-white/10 p-2 rounded-full"><X className="w-6 h-6" /></button>
          <img src={lightboxImage} alt="" className="max-w-full max-h-[92vh] object-contain" />
        </div>
      )}

      {/* الهيدر العلوي */}
      <Header
        currentUser={currentUser} notifications={notifications} activeTab={activeTab} isRealUser={isRealUser} availableProfiles={profiles}
        onNavigate={(tab) => { setActiveTab(tab); setSelectedTag(null); }} onSearch={setSearchQuery}
        onUserSwitch={(p) => { setCurrentUser(p); loadAllData(); }} onMarkNotificationsRead={async () => {}}
        onShowAuthModal={() => { setShowAuthModal(true); setAuthTab("signin"); }} onSignOutReal={async () => { setCurrentUser(initialGuestProfile); }}
      />

      {/* المسرح الرئيسي للمنصة */}
      <main className="max-w-7xl mx-auto px-2 md:px-4 py-6 w-full flex-1 flex gap-6">
        
        {/* العمود الأيمن المعدل (مكون خارجي مجمّل) */}
        <RightSidebar
          isRealUser={isRealUser} profiles={profiles}
          onShowAuthModal={() => { setShowAuthModal(true); setAuthTab("signin"); }}
          setSelectedProfileId={setSelectedProfileId} setActiveTab={setActiveTab}
        />

        {/* مساحة العرض المركزية المتغيرة حسب التاب */}
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

        {/* الشريط الجانبي الأيسر (أيقونات التنقل) */}
        <Sidebar currentUser={currentUser} activeTab={activeTab} onNavigate={(tab) => { setActiveTab(tab); setSelectedTag(null); }} savedCount={0} />
      </main>

      {/* شريط الملاحة السفلي للموبايل */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex items-center justify-around py-3 md:hidden shadow-lg">
        <button onClick={() => setActiveTab("feed")} className={`flex flex-col items-center gap-1 ${activeTab === 'feed' ? 'text-blue-600' : 'text-gray-500'}`}><Home className="w-5 h-5" /><span className="text-[10px] font-bold">الرئيسية</span></button>
        <button onClick={() => setActiveTab("profile")} className={`flex flex-col items-center gap-1 ${activeTab === 'profile' ? 'text-blue-600' : 'text-gray-500'}`}><User className="w-5 h-5" /><span className="text-[10px] font-bold">حسابي</span></button>
      </nav>

      {/* مودال الدخول والتسجيل */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-sm w-full p-6 text-right border dark:border-gray-800 relative shadow-2xl">
            <button onClick={() => setShowAuthModal(false)} className="absolute top-4 left-4 text-gray-400 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg"><X className="w-4 h-4" /></button>
            <h3 className="font-bold text-center text-lg mb-4">بوابة غزاة الميمز 🎯</h3>
            
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl mb-4">
              <button onClick={() => setAuthTab("signin")} className={`flex-1 text-center py-2 text-xs font-bold rounded-lg ${authTab === "signin" ? "bg-white dark:bg-gray-900 text-blue-600 shadow" : "text-gray-400"}`}>تسجيل دخول</button>
              <button onClick={() => setAuthTab("signup")} className={`flex-1 text-center py-2 text-xs font-bold rounded-lg ${authTab === "signup" ? "bg-white dark:bg-gray-900 text-blue-600 shadow" : "text-gray-400"}`}>عضو جديد</button>
            </div>

            <form onSubmit={authTab === "signin" ? handleSignIn : handleSignUp} className="flex flex-col gap-3">
              <input type="email" required placeholder="الإيميل بتاعك" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-950 border dark:border-gray-800 rounded-xl px-3 py-2.5 text-sm" />
              {authTab === "signup" && <input type="text" required placeholder="اسم مستخدم روش بدون فواصل" value={authUsername} onChange={(e) => setAuthUsername(e.target.value.replace(/\s+/g, '_'))} className="w-full bg-gray-50 dark:bg-gray-950 border dark:border-gray-800 rounded-xl px-3 py-2.5 text-sm" />}
              <input type="password" required placeholder="الرقم السري" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-950 border dark:border-gray-800 rounded-xl px-3 py-2.5 text-sm" />
              {authError && <div className="text-xs text-red-600 bg-red-50 p-2 rounded-lg flex items-center gap-1"><ShieldAlert className="w-4 h-4" />{authError}</div>}
              <button type="submit" disabled={authLoading} className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-xl text-sm transition-all hover:bg-blue-700 flex justify-center">
                {authLoading ? <Clock className="w-4 h-4 animate-spin" /> : <span>جووو!</span>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

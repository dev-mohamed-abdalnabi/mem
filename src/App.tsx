import React, { useState, useEffect } from "react";
import { Home, Flame, Bookmark, User, X, PlusCircle, Clock, ShieldAlert } from "lucide-react";

import { Profile, Meme, Notification, Report } from "./types";
import { dataService, calculateMemeLevel } from "./services/dataService";

import Header from "./components/Header";
import RightSidebar from "./components/RightSidebar"; // ده بقى القائمة الرئيسية

import FeedPage from "./pages/FeedPage";
import CreatePostPage from "./pages/CreatePostPage";
import SavesPage from "./pages/SavesPage";
import TrendingPage from "./pages/TrendingPage";
import ProfilePage from "./pages/ProfilePage";
import Leaderboard from "./components/Leaderboard";

// ... (باقي الـ initial states كما هي)
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
  const [loading, setLoading] = useState(true);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  // ... (باقي الـ states الخاصة بالنشر والأوث كما هي)
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTab, setAuthTab] = useState<"signin" | "signup">("signin");
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [followingIds, setFollowingIds] = useState<string[]>([]);

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
      const dbFollowingIds = await dataService.getFollowingList(dbCurrentUser.id);
      setFollowingIds(dbFollowingIds);
    } catch (e) { console.warn(e); } finally { setLoading(false); }
  };

  const isRealUser = currentUser.id !== "guest-user-temp";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100 flex flex-col antialiased" dir="rtl">
      
      {/* لايت بوكس للصور */}
      {lightboxImage && (
        <div className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center backdrop-blur-sm" onClick={() => setLightboxImage(null)}>
          <button className="absolute top-4 right-4 text-white bg-white/10 p-3 rounded-full"><X className="w-6 h-6" /></button>
          <img src={lightboxImage} alt="Full Size" className="max-w-full max-h-[92vh] object-contain" />
        </div>
      )}

      {/* الهيدر العلوي */}
      <Header
        currentUser={currentUser} notifications={notifications} activeTab={activeTab} isRealUser={isRealUser} availableProfiles={profiles}
        onNavigate={(tab) => { setActiveTab(tab); setSelectedTag(null); }} onSearch={setSearchQuery}
        onUserSwitch={(p) => { setCurrentUser(p); loadAllData(); }} onMarkNotificationsRead={async () => {}}
        onShowAuthModal={() => { setShowAuthModal(true); setAuthTab("signin"); }} onSignOutReal={async () => { setCurrentUser(initialGuestProfile); loadAllData(); }}
      />

      {/* جسد التطبيق */}
      <main className="max-w-7xl mx-auto px-0 md:px-4 py-6 w-full flex-1 flex gap-6">
        
        {/* الشريط الجانبي (القائمة الرئيسية) - لاحظ تمرير الـ activeTab */}
        <RightSidebar
          isRealUser={isRealUser} 
          profiles={profiles}
          onShowAuthModal={() => { setShowAuthModal(true); setAuthTab("signin"); }}
          setSelectedProfileId={setSelectedProfileId} 
          setActiveTab={setActiveTab}
          activeTab={activeTab} 
        />

        {/* مساحة الصفحات */}
        <div className="flex-1 max-w-full md:max-w-[640px] xl:max-w-2xl mx-auto order-2 w-full">
          {activeTab === "feed" && (
            <FeedPage {.../* props */} isRealUser={isRealUser} loading={loading} filteredMemes={memes.filter(m => m.caption.includes(searchQuery))} currentUser={currentUser} followingIds={followingIds} setMemes={setMemes} setShowAuthModal={setShowAuthModal} setAuthTab={setAuthTab} setSearchQuery={setSearchQuery} setSelectedTag={setSelectedTag} handleLikeToggle={async()=>{}} handleSaveToggle={async()=>{}} handleFollowToggle={async()=>{}} handleReportSubmit={()=>{}} handleShareCompleted={async()=>{}} handleDeleteMeme={async()=>{}} setSelectedProfileId={setSelectedProfileId} setActiveTab={setActiveTab} setLightboxImage={setLightboxImage} />
          )}
          {activeTab === "trending" && <TrendingPage memes={memes} currentUser={currentUser} followingIds={followingIds} handleLikeToggle={async()=>{}} handleSaveToggle={async()=>{}} handleFollowToggle={async()=>{}} setSelectedTag={setSelectedTag} handleReportSubmit={()=>{}} handleShareCompleted={async()=>{}} handleDeleteMeme={async()=>{}} setSelectedProfileId={setSelectedProfileId} setActiveTab={setActiveTab} setLightboxImage={setLightboxImage} />}
          {activeTab === "saves" && <SavesPage memes={memes} currentUser={currentUser} followingIds={followingIds} handleLikeToggle={async()=>{}} handleSaveToggle={async()=>{}} handleFollowToggle={async()=>{}} setSelectedTag={setSelectedTag} handleReportSubmit={()=>{}} handleShareCompleted={async()=>{}} handleDeleteMeme={async()=>{}} setSelectedProfileId={setSelectedProfileId} setActiveTab={setActiveTab} setLightboxImage={setLightboxImage} />}
          {activeTab === "leaderboard" && <Leaderboard profiles={profiles} currentUser={currentUser} onNavigate={setActiveTab} onFollowToggle={async()=>{}} followingIds={followingIds} />}
          {activeTab === "profile" && <ProfilePage profile={currentUser} currentUser={currentUser} isOwnProfile={true} isRealUser={isRealUser} userMemes={[]} followingIds={followingIds} setCurrentUser={setCurrentUser} setProfiles={setProfiles} setShowAuthModal={setShowAuthModal} handleFollowToggle={async()=>{}} handleLikeToggle={async()=>{}} handleSaveToggle={async()=>{}} setSelectedTag={setSelectedTag} handleReportSubmit={()=>{}} handleShareCompleted={async()=>{}} handleDeleteMeme={async()=>{}} setSelectedProfileId={setSelectedProfileId} setActiveTab={setActiveTab} setLightboxImage={setLightboxImage} />}
        </div>
      </main>

      {/* الملاحة السفلية (للموبايل فقط) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex items-center justify-around py-3 md:hidden">
        <button onClick={() => setActiveTab("feed")} className={activeTab === 'feed' ? 'text-blue-600' : 'text-gray-500'}><Home className="w-5 h-5" /></button>
        <button onClick={() => setActiveTab("trending")} className={activeTab === 'trending' ? 'text-blue-600' : 'text-gray-500'}><Flame className="w-5 h-5" /></button>
        <button onClick={() => setActiveTab("create-post")} className={activeTab === 'create-post' ? 'text-blue-600' : 'text-gray-500'}><PlusCircle className="w-5 h-5" /></button>
        <button onClick={() => setActiveTab("saves")} className={activeTab === 'saves' ? 'text-blue-600' : 'text-gray-500'}><Bookmark className="w-5 h-5" /></button>
        <button onClick={() => setActiveTab("profile")} className={activeTab === 'profile' ? 'text-blue-600' : 'text-gray-500'}><User className="w-5 h-5" /></button>
      </nav>
    </div>
  );
}

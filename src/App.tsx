import React, { useState, useEffect } from "react";
import { Home, Flame, Bookmark, User, X, PlusCircle, Clock, ShieldAlert } from "lucide-react";

import { Profile, Meme, Notification, Report } from "./types";
import { dataService, calculateMemeLevel } from "./services/dataService";

import Header from "./components/Header";
import RightSidebar from "./components/RightSidebar";

import FeedPage from "./pages/FeedPage";
import CreatePostPage from "./pages/CreatePostPage";
import SavesPage from "./pages/SavesPage";
import TrendingPage from "./pages/TrendingPage";
import ProfilePage from "./pages/ProfilePage";
import Leaderboard from "./components/Leaderboard";

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

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTab, setAuthTab] = useState<"signin" | "signup">("signin");
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [followingIds, setFollowingIds] = useState<string[]>([]);

  // 1. التعديل الأول: الفيتش بيحصل مرة واحدة بس لما التطبيق يفتح عشان نمنع الراستر المتكرر
  useEffect(() => {
    loadAllData();
  }, []); // مصفوفة فاضية هنا تمنع التحميل مع كل نقلة تاب

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
    } catch (e) { 
      console.warn(e); 
    } finally { 
      setLoading(false); 
    }
  };

  const isRealUser = currentUser.id !== "guest-user-temp";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100 flex flex-col antialiased" dir="rtl">
      
      {/* لايت بوكس الصور */}
      {lightboxImage && (
        <div className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center backdrop-blur-sm" onClick={() => setLightboxImage(null)}>
          <button className="absolute top-4 right-4 text-white bg-white/10 p-3 rounded-full"><X className="w-6 h-6" /></button>
          <img src={lightboxImage} alt="Full Size" className="max-w-full max-h-[92vh] object-contain" />
        </div>
      )}

      {/* الهيدر */}
      <Header
        currentUser={currentUser} notifications={notifications} activeTab={activeTab} isRealUser={isRealUser} availableProfiles={profiles}
        onNavigate={(tab) => { setActiveTab(tab); setSelectedTag(null); }} onSearch={setSearchQuery}
        onUserSwitch={(p) => { setCurrentUser(p); loadAllData(); }} onMarkNotificationsRead={async () => {}}
        onShowAuthModal={() => { setShowAuthModal(true); setAuthTab("signin"); }} onSignOutReal={async () => { setCurrentUser(initialGuestProfile); loadAllData(); }}
      />

      {/* جسد التطبيق */}
      <main className="max-w-7xl mx-auto px-0 md:px-4 py-6 w-full flex-1 flex gap-6">
        
        {/* قائمة الأقسام الرئيسية اليمين */}
        <RightSidebar
          isRealUser={isRealUser} 
          profiles={profiles}
          onShowAuthModal={() => { setShowAuthModal(true); setAuthTab("signin"); }}
          setSelectedProfileId={setSelectedProfileId} 
          setActiveTab={setActiveTab}
          activeTab={activeTab} 
        />

        {/* 2. التعديل الثاني: ضفنا pb-32 هنا لحماية كل الصفحات من الاختفاء تحت الـ Navbar في الموبايل */}
        <div className="flex-1 max-w-full md:max-w-[640px] xl:max-w-2xl mx-auto order-2 w-full pb-32 md:pb-0">
          
          {/* 3. التعديل الثالث: استبدال الـ Conditional Rendering بـ wrapper يحمل كلاسات hidden/block */}
          {/* صفحة الـ Feed */}
          <div className={activeTab === "feed" ? "block" : "hidden"}>
            <FeedPage isRealUser={isRealUser} loading={loading} filteredMemes={memes.filter(m => m.caption.includes(searchQuery))} currentUser={currentUser} followingIds={followingIds} setMemes={setMemes} setShowAuthModal={setShowAuthModal} setAuthTab={setAuthTab} setSearchQuery={setSearchQuery} setSelectedTag={setSelectedTag} handleLikeToggle={async()=>{}} handleSaveToggle={async()=>{}} handleFollowToggle={async()=>{}} handleReportSubmit={()=>{}} handleShareCompleted={async()=>{}} handleDeleteMeme={async()=>{}} setSelectedProfileId={setSelectedProfileId} setActiveTab={setActiveTab} setLightboxImage={setLightboxImage} />
          </div>

          {/* صفحة الترند */}
          <div className={activeTab === "trending" ? "block" : "hidden"}>
            <TrendingPage memes={memes} currentUser={currentUser} followingIds={followingIds} handleLikeToggle={async()=>{}} handleSaveToggle={async()=>{}} handleFollowToggle={async()=>{}} setSelectedTag={setSelectedTag} handleReportSubmit={()=>{}} handleShareCompleted={async()=>{}} handleDeleteMeme={async()=>{}} setSelectedProfileId={setSelectedProfileId} setActiveTab={setActiveTab} setLightboxImage={setLightboxImage} />
          </div>

          {/* صفحة الحفظ */}
          <div className={activeTab === "saves" ? "block" : "hidden"}>
            <SavesPage memes={memes} currentUser={currentUser} followingIds={followingIds} handleLikeToggle={async()=>{}} handleSaveToggle={async()=>{}} handleFollowToggle={async()=>{}} setSelectedTag={setSelectedTag} handleReportSubmit={()=>{}} handleShareCompleted={async()=>{}} handleDeleteMeme={async()=>{}} setSelectedProfileId={setSelectedProfileId} setActiveTab={setActiveTab} setLightboxImage={setLightboxImage} />
          </div>

          {/* صفحة الـ Leaderboard */}
          <div className={activeTab === "leaderboard" ? "block" : "hidden"}>
            <Leaderboard profiles={profiles} currentUser={currentUser} onNavigate={setActiveTab} onFollowToggle={async()=>{}} followingIds={followingIds} />
          </div>

          {/* صفحة الـ Profile والـ User Profile */}
          <div className={(activeTab === "profile" || activeTab === "user-profile") ? "block" : "hidden"}>
            <ProfilePage profile={activeTab === "profile" ? currentUser : (profiles.find(p => p.id === selectedProfileId) || currentUser)} currentUser={currentUser} isOwnProfile={activeTab === "profile" || selectedProfileId === currentUser.id} isRealUser={isRealUser} userMemes={memes.filter(m => m.user_id === (activeTab === "profile" ? currentUser.id : selectedProfileId))} followingIds={followingIds} setCurrentUser={setCurrentUser} setProfiles={setProfiles} setShowAuthModal={setShowAuthModal} handleFollowToggle={async()=>{}} handleLikeToggle={async()=>{}} handleSaveToggle={async()=>{}} setSelectedTag={setSelectedTag} handleReportSubmit={()=>{}} handleShareCompleted={async()=>{}} handleDeleteMeme={async()=>{}} setSelectedProfileId={setSelectedProfileId} setActiveTab={setActiveTab} setLightboxImage={setLightboxImage} />
          </div>
          
        </div>
      </main>

      {/* الملاحة السفلية (للموبايل فقط) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex items-center justify-around py-3 md:hidden shadow-[0_-5px_10px_rgba(0,0,0,0.05)]">
        <button onClick={() => setActiveTab("feed")} className={activeTab === 'feed' ? 'text-blue-600' : 'text-gray-500'}><Home className="w-5 h-5" /></button>
        <button onClick={() => setActiveTab("trending")} className={activeTab === 'trending' ? 'text-blue-600' : 'text-gray-500'}><Flame className="w-5 h-5" /></button>
        <button onClick={() => setActiveTab("create-post")} className={activeTab === 'create-post' ? 'text-blue-600' : 'text-gray-500'}><PlusCircle className="w-5 h-5" /></button>
        <button onClick={() => setActiveTab("saves")} className={activeTab === 'saves' ? 'text-blue-600' : 'text-gray-500'}><Bookmark className="w-5 h-5" /></button>
        <button onClick={() => setActiveTab("profile")} className={(activeTab === 'profile' || activeTab === 'user-profile') ? 'text-blue-600' : 'text-gray-500'}><User className="w-5 h-5" /></button>
      </nav>
    </div>
  );
}

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Home, Flame, Bookmark, User, X, PlusCircle } from "lucide-react";

import { Profile, Meme, Notification } from "./types";
import { dataService } from "./services/dataService";

import Header from "./components/Header";
import RightSidebar from "./components/RightSidebar";
import AuthModal from "./components/AuthModal";
import Lightbox from "./components/Lightbox";

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
  const [lightboxMediaType, setLightboxMediaType] = useState<'image' | 'video' | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [followingIds, setFollowingIds] = useState<string[]>([]);

  // Cache references - prevent reloading
  const cacheRef = useRef({
    feed: [] as Meme[],
    trending: [] as Meme[],
    profiles: [] as Profile[],
    lastLoadTime: 0,
    loadedTabs: new Set<string>()
  });

  // Load data only on first mount or when explicitly needed
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        const dbCurrentUser = await dataService.getCurrentUser();
        setCurrentUser(dbCurrentUser || initialGuestProfile);
        
        const dbMemes = await dataService.getMemes("approved", undefined, dbCurrentUser?.id || initialGuestProfile.id);
        setMemes(dbMemes);
        cacheRef.current.feed = dbMemes;
        cacheRef.current.trending = dbMemes;
        
        const dbProfiles = await dataService.getProfilesList();
        setProfiles(dbProfiles);
        cacheRef.current.profiles = dbProfiles;
        
        const dbFollowingIds = await dataService.getFollowingList(dbCurrentUser?.id || initialGuestProfile.id);
        setFollowingIds(dbFollowingIds);
        
        cacheRef.current.loadedTabs.add("feed");
        cacheRef.current.lastLoadTime = Date.now();
      } catch (e) { 
        console.warn(e); 
      } finally { 
        setLoading(false); 
      }
    };

    loadInitialData();
  }, []); // Only on mount

  // ✅ Handle Like Toggle
  const handleLikeToggle = useCallback(async (memeId: string) => {
    const isRealUser = currentUser.id !== "guest-user-temp";
    if (!isRealUser) {
      setShowAuthModal(true);
      setAuthTab("signin");
      return;
    }

    try {
      const result = await dataService.toggleLike(memeId, currentUser.id);
      
      setMemes(prev => prev.map(m => 
        m.id === memeId 
          ? { ...m, liked_by_me: result.liked, likes_count: result.likesCount }
          : m
      ));
      
      cacheRef.current.feed = cacheRef.current.feed.map(m =>
        m.id === memeId
          ? { ...m, liked_by_me: result.liked, likes_count: result.likesCount }
          : m
      );
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  }, [currentUser.id]);

  // ✅ Handle Save Toggle
  const handleSaveToggle = useCallback(async (memeId: string) => {
    const isRealUser = currentUser.id !== "guest-user-temp";
    if (!isRealUser) {
      setShowAuthModal(true);
      setAuthTab("signin");
      return;
    }

    try {
      const result = await dataService.toggleSave(memeId, currentUser.id);
      
      setMemes(prev => prev.map(m =>
        m.id === memeId
          ? { ...m, saved_by_me: result }
          : m
      ));
      
      cacheRef.current.feed = cacheRef.current.feed.map(m =>
        m.id === memeId
          ? { ...m, saved_by_me: result }
          : m
      );
    } catch (error) {
      console.error("Error toggling save:", error);
    }
  }, [currentUser.id]);

  // ✅ Handle Follow Toggle
  const handleFollowToggle = useCallback(async (followerId: string, followingId: string) => {
    const isRealUser = currentUser.id !== "guest-user-temp";
    if (!isRealUser) {
      setShowAuthModal(true);
      setAuthTab("signin");
      return;
    }

    try {
      await dataService.followUser(followerId, followingId);
      
      setFollowingIds(prev => 
        prev.includes(followingId)
          ? prev.filter(id => id !== followingId)
          : [...prev, followingId]
      );
    } catch (error) {
      console.error("Error toggling follow:", error);
    }
  }, [currentUser.id]);

  // ✅ Handle Report Submit
  const handleReportSubmit = useCallback((memeId: string, reason: string) => {
    console.log("Report submitted:", { memeId, reason });
  }, []);

  // ✅ Handle Share Completed
  const handleShareCompleted = useCallback(async (memeId: string) => {
    try {
      console.log("Share completed for meme:", memeId);
    } catch (error) {
      console.error("Error handling share:", error);
    }
  }, []);

  // ✅ Handle Delete Meme
  const handleDeleteMeme = useCallback(async (memeId: string) => {
    const isRealUser = currentUser.id !== "guest-user-temp";
    if (!isRealUser) {
      setShowAuthModal(true);
      setAuthTab("signin");
      return;
    }

    try {
      await dataService.deleteMeme(memeId, currentUser.id);
      
      setMemes(prev => prev.filter(m => m.id !== memeId));
      cacheRef.current.feed = cacheRef.current.feed.filter(m => m.id !== memeId);
    } catch (error) {
      console.error("Error deleting meme:", error);
    }
  }, [currentUser.id]);

  const isRealUser = currentUser.id !== "guest-user-temp";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100 flex flex-col antialiased" dir="rtl">
      
      {/* مودال تسجيل الدخول وإنشاء الحساب */}
      {showAuthModal && (
        <AuthModal 
          isOpen={showAuthModal} 
          onClose={() => setShowAuthModal(false)} 
          initialTab={authTab}
          authTab={authTab}
          setAuthTab={setAuthTab}
          setShowAuthModal={setShowAuthModal}
        />
      )}

      {/* Lightbox component for images and videos */}
      <Lightbox
        mediaUrl={lightboxImage}
        mediaType={lightboxMediaType || 'image'}
        onClose={() => {
          setLightboxImage(null);
          setLightboxMediaType(null);
        }}
      />
      {/* الهيدر العلوي */}
      <Header
        currentUser={currentUser} 
        notifications={notifications} 
        activeTab={activeTab} 
        isRealUser={isRealUser} 
        availableProfiles={profiles}
        onNavigate={(tab) => { setActiveTab(tab); setSelectedTag(null); }} 
        onSearch={setSearchQuery}
        onUserSwitch={(p) => { setCurrentUser(p); }} 
        onMarkNotificationsRead={async () => {}}
        onShowAuthModal={() => { setShowAuthModal(true); setAuthTab("signin"); }} 
        onSignOutReal={async () => {
          try {
            if (dataService.logout) {
              await dataService.logout();
            } else if (dataService.signOut) {
              await dataService.signOut();
            }
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            localStorage.removeItem("supabase.auth.token");
            sessionStorage.clear();
          } catch (error) {
            console.error("خطأ أثناء تسجيل الخروج الحقيقي:", error);
          } finally {
            setCurrentUser(initialGuestProfile);
            window.location.reload();
          }
        }}
      />

      {/* جسد التطبيق والمحتوى الرئيسي */}
      <main className="max-w-7xl mx-auto px-0 md:px-4 py-6 w-full flex-1 flex lg:flex-row flex-col gap-6 items-start">
        
        {/* القائمة الجانبية للشاشات الكبيرة */}
        <RightSidebar
          isRealUser={isRealUser} 
          profiles={profiles}
          onShowAuthModal={() => { setShowAuthModal(true); setAuthTab("signin"); }}
          setSelectedProfileId={setSelectedProfileId} 
          setActiveTab={setActiveTab}
          activeTab={activeTab} 
        />

        {/* مساحة عرض الصفحات بناءً على التبويب النشط */}
        <div className="flex-1 max-w-full lg:max-w-2xl mx-auto w-full">
          
          {/* صفحة الفيد الرئيسي */}
          {activeTab === "feed" && (
            <FeedPage 
              isRealUser={isRealUser} 
              loading={loading} 
              filteredMemes={memes.filter(m => m.caption.includes(searchQuery))} 
              currentUser={currentUser} 
              followingIds={followingIds} 
              setMemes={setMemes} 
              setShowAuthModal={setShowAuthModal} 
              setAuthTab={setAuthTab} 
              setSearchQuery={setSearchQuery} 
              setSelectedTag={setSelectedTag} 
              handleLikeToggle={handleLikeToggle}
              handleSaveToggle={handleSaveToggle}
              handleFollowToggle={handleFollowToggle}
              handleReportSubmit={handleReportSubmit}
              handleShareCompleted={handleShareCompleted}
              handleDeleteMeme={handleDeleteMeme}
              setSelectedProfileId={setSelectedProfileId} 
              setActiveTab={setActiveTab} 
              setLightboxImage={setLightboxImage} 
            />
          )}
          
          {/* صفحة التريند والمنشورات الشائعة */}
          {activeTab === "trending" && (
            <TrendingPage 
              memes={memes} 
              currentUser={currentUser} 
              followingIds={followingIds} 
              handleLikeToggle={handleLikeToggle}
              handleSaveToggle={handleSaveToggle}
              handleFollowToggle={handleFollowToggle}
              setSelectedTag={setSelectedTag} 
              handleReportSubmit={handleReportSubmit}
              handleShareCompleted={handleShareCompleted}
              handleDeleteMeme={handleDeleteMeme}
              setSelectedProfileId={setSelectedProfileId} 
              setActiveTab={setActiveTab} 
              setLightboxImage={setLightboxImage} 
            />
          )}
          
          {/* صفحة إنشاء منشور جديد */}
          {activeTab === "create-post" && (
            <CreatePostPage 
              currentUser={currentUser} 
              setActiveTab={setActiveTab} 
            />
          )}
          
          {/* صفحة المحفوظات */}
          {activeTab === "saves" && (
            <SavesPage 
              memes={memes} 
              currentUser={currentUser} 
              followingIds={followingIds} 
              handleLikeToggle={handleLikeToggle}
              handleSaveToggle={handleSaveToggle}
              handleFollowToggle={handleFollowToggle}
              setSelectedTag={setSelectedTag} 
              handleReportSubmit={handleReportSubmit}
              handleShareCompleted={handleShareCompleted}
              handleDeleteMeme={handleDeleteMeme}
              setSelectedProfileId={setSelectedProfileId} 
              setActiveTab={setActiveTab} 
              setLightboxImage={setLightboxImage} 
            />
          )}
          
          {/* صفحة قائمة المتصدرين */}
          {activeTab === "leaderboard" && (
            <Leaderboard 
              profiles={profiles} 
              currentUser={currentUser} 
              onNavigate={setActiveTab} 
              onFollowToggle={handleFollowToggle}
              followingIds={followingIds} 
            />
          )}
          
          {/* صفحة الملف الشخصي */}
          {activeTab === "profile" && (
            <ProfilePage 
              profile={currentUser} 
              currentUser={currentUser} 
              isOwnProfile={true} 
              isRealUser={isRealUser} 
              userMemes={memes.filter(m => m.user_id === currentUser.id)} 
              followingIds={followingIds} 
              setCurrentUser={setCurrentUser} 
              setProfiles={setProfiles} 
              setShowAuthModal={setShowAuthModal} 
              handleFollowToggle={handleFollowToggle}
              handleLikeToggle={handleLikeToggle}
              handleSaveToggle={handleSaveToggle}
              setSelectedTag={setSelectedTag} 
              handleReportSubmit={handleReportSubmit}
              handleShareCompleted={handleShareCompleted}
              handleDeleteMeme={handleDeleteMeme}
              setSelectedProfileId={setSelectedProfileId} 
              setActiveTab={setActiveTab} 
              setLightboxImage={setLightboxImage} 
            />
          )}
        </div>
      </main>

      {/* الملاحة السفلية للهواتف والموبايل فقط */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex items-center justify-around py-3 lg:hidden">
        <button onClick={() => setActiveTab("feed")} className={`p-2 ${activeTab === 'feed' ? 'text-blue-600' : 'text-gray-500'}`}><Home className="w-6 h-6" /></button>
        <button onClick={() => setActiveTab("trending")} className={`p-2 ${activeTab === 'trending' ? 'text-blue-600' : 'text-gray-500'}`}><Flame className="w-6 h-6" /></button>
        <button onClick={() => setActiveTab("create-post")} className={`p-2 ${activeTab === 'create-post' ? 'text-blue-600' : 'text-gray-500'}`}><PlusCircle className="w-6 h-6" /></button>
        <button onClick={() => setActiveTab("saves")} className={`p-2 ${activeTab === 'saves' ? 'text-blue-600' : 'text-gray-500'}`}><Bookmark className="w-6 h-6" /></button>
        <button onClick={() => setActiveTab("profile")} className={`p-2 ${activeTab === 'profile' ? 'text-blue-600' : 'text-gray-500'}`}><User className="w-6 h-6" /></button>
      </nav>
    </div>
  );
}

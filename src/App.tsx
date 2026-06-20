import React, { useState, useEffect, useRef, useCallback } from "react";

// استيراد الأنواع والخدمات
import { Profile, Meme, Notification } from "./types";
import { dataService } from "./services/dataService";

// استيراد مكونات الواجهة
import MainLayout from "./components/layout/MainLayout";
import FeedPage from "./pages/FeedPage";
import CreatePostPage from "./pages/CreatePostPage";
import SavesPage from "./pages/SavesPage";
import TrendingPage from "./pages/TrendingPage";
import ProfilePage from "./pages/ProfilePage";
import Leaderboard from "./components/Leaderboard";

/**
 * البيانات الافتراضية للمستخدم الزائر
 */
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
  // --- حالات التطبيق (States) ---
  const [activeTab, setActiveTab] = useState("feed"); // التبويب النشط
  const [currentUser, setCurrentUser] = useState<Profile>(initialGuestProfile); // المستخدم الحالي
  const [memes, setMemes] = useState<Meme[]>([]); // قائمة الميمز المعروضة
  const [profiles, setProfiles] = useState<Profile[]>([]); // قائمة البروفايلات
  const [notifications, setNotifications] = useState<Notification[]>([]); // الإشعارات
  const [loading, setLoading] = useState(true); // حالة التحميل الأولية
  const [loadingMore, setLoadingMore] = useState(false); // حالة تحميل المزيد من البيانات
  const [hasMore, setHasMore] = useState(true); // هل توجد بيانات إضافية للتحميل
  const [page, setPage] = useState(0); // رقم الصفحة الحالية للتحميل التدريجي
  
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null); // معرف البروفايل المختار
  const [showAuthModal, setShowAuthModal] = useState(false); // إظهار مودال الدخول
  const [authTab, setAuthTab] = useState<"signin" | "signup">("signin"); // تبويب مودال الدخول
  const [lightboxImage, setLightboxImage] = useState<string | null>(null); // صورة اللايت بوكس
  const [lightboxMediaType, setLightboxMediaType] = useState<'image' | 'video' | null>(null); // نوع ميديا اللايت بوكس
  const [selectedMemeForComments, setSelectedMemeForComments] = useState<Meme | null>(null); // المنشور المختار لعرض التعليقات
  const [searchQuery, setSearchQuery] = useState(""); // نص البحث
  const [selectedTag, setSelectedTag] = useState<string | null>(null); // التاج المختار
  const [followingIds, setFollowingIds] = useState<string[]>([]); // قائمة المعرفات التي يتابعها المستخدم

  // مرجع للكاش لمنع إعادة التحميل غير الضرورية
  const cacheRef = useRef({
    feed: [] as Meme[],
    trending: [] as Meme[],
    profiles: [] as Profile[],
    lastLoadTime: 0,
    loadedTabs: new Set<string>()
  });

  /**
   * تحميل البيانات الأولية عند تشغيل التطبيق
   */
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        const dbCurrentUser = await dataService.getCurrentUser();
        setCurrentUser(dbCurrentUser || initialGuestProfile);
        
        // تحميل الصفحة الأولى من الميمز (10 عناصر)
        const dbMemes = await dataService.getMemes("approved", undefined, dbCurrentUser?.id || initialGuestProfile.id, 0, 10);
        setMemes(dbMemes);
        setPage(1); // الاستعداد للصفحة التالية
        setHasMore(dbMemes.length === 10);
        
        const dbProfiles = await dataService.getProfilesList();
        setProfiles(dbProfiles);
        
        const dbFollowingIds = await dataService.getFollowingList(dbCurrentUser?.id || initialGuestProfile.id);
        setFollowingIds(dbFollowingIds);
      } catch (e) { 
        console.warn("خطأ في تحميل البيانات:", e); 
      } finally { 
        setLoading(false); 
      }
    };

    loadInitialData();
  }, []);

  /**
   * تحميل المزيد من الميمز (Infinite Scroll)
   */
  const loadMoreMemes = useCallback(async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      const nextMemes = await dataService.getMemes(
        "approved", 
        undefined, 
        currentUser.id, 
        page, 
        10
      );

      if (nextMemes.length < 10) {
        setHasMore(false);
      }

      setMemes(prev => [...prev, ...nextMemes]);
      setPage(prev => prev + 1);
    } catch (error) {
      console.error("Error loading more memes:", error);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, page, currentUser.id]);

  // --- دوال التعامل مع الأحداث (Handlers) ---

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
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  }, [currentUser.id]);

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
        m.id === memeId ? { ...m, saved_by_me: result } : m
      ));
    } catch (error) {
      console.error("Error toggling save:", error);
    }
  }, [currentUser.id]);

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

  const handleDeleteMeme = useCallback(async (memeId: string) => {
    const isRealUser = currentUser.id !== "guest-user-temp";
    if (!isRealUser) return;

    try {
      await dataService.deleteMeme(memeId, currentUser.id);
      setMemes(prev => prev.filter(m => m.id !== memeId));
    } catch (error) {
      console.error("Error deleting meme:", error);
    }
  }, [currentUser.id]);

  const isRealUser = currentUser.id !== "guest-user-temp";

  /**
   * عرض المحتوى بناءً على التبويب النشط
   */
  const renderContent = () => {
    const commonProps = {
      currentUser,
      followingIds,
      handleLikeToggle,
      handleSaveToggle,
      handleFollowToggle,
      setSelectedTag,
      handleReportSubmit: (memeId: string, reason: string) => console.log("Report:", { memeId, reason }),
      handleShareCompleted: async (memeId: string) => console.log("Shared:", memeId),
      handleDeleteMeme,
      setSelectedProfileId,
      setActiveTab,
      setLightboxImage
    };

    switch (activeTab) {
      case "feed":
        return (
          <FeedPage 
            {...commonProps}
            isRealUser={isRealUser} 
            loading={loading} 
            loadingMore={loadingMore}
            hasMore={hasMore}
            loadMore={loadMoreMemes}
            filteredMemes={memes.filter(m => (m.caption || "").includes(searchQuery))} 
            setMemes={setMemes} 
            setShowAuthModal={setShowAuthModal} 
            setAuthTab={setAuthTab} 
            setSearchQuery={setSearchQuery}
            onOpenComments={(meme) => setSelectedMemeForComments(meme)}
          />
        );
      case "trending":
        return <TrendingPage {...commonProps} memes={memes} />;
      case "create-post":
        return <CreatePostPage currentUser={currentUser} setActiveTab={setActiveTab} />;
      case "saves":
        return <SavesPage {...commonProps} memes={memes} />;
      case "leaderboard":
        return (
          <Leaderboard 
            profiles={profiles} 
            currentUser={currentUser} 
            onNavigate={setActiveTab} 
            onFollowToggle={handleFollowToggle}
            followingIds={followingIds} 
          />
        );
      case "profile":
      case "user-profile":
        const profileToShow = activeTab === "profile" 
          ? currentUser 
          : (profiles.find(p => p.id === selectedProfileId) || initialGuestProfile);
        return (
          <ProfilePage 
            {...commonProps}
            profile={profileToShow} 
            isOwnProfile={profileToShow.id === currentUser.id} 
            isRealUser={isRealUser} 
            userMemes={memes.filter(m => m.user_id === profileToShow.id)} 
            setCurrentUser={setCurrentUser} 
            setProfiles={setProfiles} 
            setShowAuthModal={setShowAuthModal} 
          />
        );
      default:
        return null;
    }
  };

  return (
    <MainLayout
      currentUser={currentUser}
      notifications={notifications}
      activeTab={activeTab}
      isRealUser={isRealUser}
      profiles={profiles}
      showAuthModal={showAuthModal}
      authTab={authTab}
      lightboxImage={lightboxImage}
      lightboxMediaType={lightboxMediaType}
      onNavigate={(tab) => { 
        setActiveTab(tab); 
        setSelectedTag(null);
        // إعادة تعيين الصفحة عند تغيير التبويب إذا لزم الأمر
        if (tab === "feed") {
          setPage(1);
          setHasMore(true);
        }
      }}
      onSearch={setSearchQuery}
      onUserSwitch={setCurrentUser}
      onMarkNotificationsRead={async () => {}}
      onShowAuthModal={() => { setShowAuthModal(true); setAuthTab("signin"); }}
      onCloseAuthModal={() => setShowAuthModal(false)}
      setAuthTab={setAuthTab}
      setShowAuthModal={setShowAuthModal}
      onSignOutReal={async () => {
        try {
          await dataService.signOut?.();
          localStorage.clear();
          sessionStorage.clear();
        } catch (error) {
          console.error("Logout error:", error);
        } finally {
          window.location.reload();
        }
      }}
      setSelectedProfileId={setSelectedProfileId}
      onCloseLightbox={() => { setLightboxImage(null); setLightboxMediaType(null); }}
    >
      {renderContent()}
      
      {selectedMemeForComments && (
        <PostDetailModal 
          meme={selectedMemeForComments}
          currentUser={currentUser}
          onClose={() => setSelectedMemeForComments(null)}
          onLikeToggle={handleLikeToggle}
          onSaveToggle={handleSaveToggle}
          onShare={(id) => {
            const shareLink = `${window.location.origin}/?meme=${id}`;
            navigator.clipboard.writeText(shareLink);
          }}
          onUserProfileClick={(id) => {
            setSelectedProfileId(id);
            setActiveTab("user-profile");
            setSelectedMemeForComments(null);
          }}
        />
      )}
    </MainLayout>
  );
}

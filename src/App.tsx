import React, { useState, useEffect, useRef, useCallback } from "react";

// استيراد الأنواع والخدمات
import { Profile, Meme, Notification } from "./types";
import { dataService } from "./services/dataService";

// استيراد مكونات الواجهة
import MainLayout from "./components/layout/MainLayout";
import FeedPage from "./pages/FeedPage";
import CreatePostPage from "./pages/CreatePostPage";
import SavesPage from "./pages/SavesPage";
import ReelsPage from "./pages/ReelsPage";
import TrendingPage from "./pages/TrendingPage";
import ProfilePage from "./pages/ProfilePage";
import Leaderboard from "./components/Leaderboard";
import PostDetailModal from "./components/PostDetailModal";
import AdminPanel from "./pages/AdminPanel"; // لوحة تحكم المشرف
import MessagesPage from "./pages/MessagesPage"; // نظام الرسايل الخاصة (زي الماسنجر)
import { messagesService } from "./services/messagesService";
import { pushService } from "./services/pushService";

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
  // بنتتبع آخر وقت اتسجلت فيه مشاركة لكل بوست، عشان نمنع تكرار العداد لو
  // المستخدم دوس زرار المشاركة كذا مرة ورا بعض بسرعة
  const lastShareAtRef = useRef<Map<string, number>>(new Map());
  const [hasMore, setHasMore] = useState(true); // هل توجد بيانات إضافية للتحميل
  const [page, setPage] = useState(0); // رقم الصفحة الحالية للتحميل التدريجي
  
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null); // معرف البروفايل المختار
  const [showAuthModal, setShowAuthModal] = useState(false); // إظهار مودال الدخول
  const [authTab, setAuthTab] = useState<"signin" | "signup">("signin"); // تبويب مودال الدخول
  const [lightboxImage, setLightboxImage] = useState<string | null>(null); // صورة اللايت بوكس
  const [lightboxMediaType, setLightboxMediaType] = useState<'image' | 'video' | null>(null); // نوع ميديا اللايت بوكس
  const [selectedMemeForComments, setSelectedMemeForComments] = useState<Meme | null>(null); // المنشور المختار لعرض التعليقات
  const [highlightedMemeId, setHighlightedMemeId] = useState<string | null>(null); // البوست اللي جاي من لينك مشاركة، عشان نوصله له وننده عليه بالضوء
  const [searchQuery, setSearchQuery] = useState(""); // نص البحث
  const [selectedTag, setSelectedTag] = useState<string | null>(null); // التاج المختار
  const [followingIds, setFollowingIds] = useState<string[]>([]); // قائمة المعرفات التي يتابعها المستخدم
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0); // عدد الرسايل الغير مقروءة (بادج زرار الرسايل)
  const [pendingMessageTargetId, setPendingMessageTargetId] = useState<string | null>(null); // لفتح شات معين مباشرة (مثلاً من زرار "راسلني" في بروفايل)

  /**
   * كل تنقل بين التبويبات لازم يعدي من هنا، مش نداء مباشر لـ setActiveTab.
   * كان فيه أماكن كتير (لينك البروفايل جوه بوست، صفحة المتصدرين، بعد نشر
   * بوست جديد، بروفايل من الريلز، لوحة الأدمن) بتنادي setActiveTab مباشرة
   * من غير ما تسجل خطوة في الـ browser history؛ فلما تدوس زرار الرجوع في
   * أندرويد من واحدة من الشاشات دي، كان بيتخطى خطوات أو يقفل التطبيق على
   * طول بدل ما يرجعك للشاشة اللي قبلها جوا التطبيق نفسه.
   *
   * ملحوظة: الدالة دي لازم تتعرّف بعد كل الـ useState اللي بتستخدمها
   * (selectedProfileId وغيرها)، لأن الاعتماد عليها جوه مصفوفة الـ deps
   * بتاعة useCallback قبل ما الـ const بتاعها يتعرّف في الكود كان بيسبب
   * "Cannot access before initialization" وبيوقع الصفحة كلها بشاشة سودة.
   */
  const navigateToTab = useCallback((tab: string, options?: { profileId?: string }) => {
    // بدون الشرط ده، الانتقال من بروفايل لبروفايل تاني (تبويب "user-profile"
    // فاضل زي ما هو، بس المعرف بيتغير) كان بيتسجلش كخطوة history خالص.
    const isProfileSwitch = tab === "user-profile" && !!options?.profileId && options.profileId !== selectedProfileId;
    if (tab !== activeTab || isProfileSwitch) {
      window.history.pushState({ tab }, "", window.location.href);
    }
    if (options?.profileId) setSelectedProfileId(options.profileId);
    setActiveTab(tab);
    setSelectedTag(null);
    if (tab === "feed") {
      setPage(1);
      setHasMore(true);
    }
    // كان فتح بروفايل (أو أي تبويب) بعد ما تكون سكرولت لتحت في صفحة تانية
    // (زي الفيد) بيسيب موضع السكرول القديم زي ما هو، وبما إن صفحة البروفايل
    // غالباً أقصر بكتير من صفحة الفيد، كان المستخدم "يلاقي نفسه" في نص أو
    // آخر صفحة البروفايل على طول بدل ما يبدأ من فوق. دلوقتي بنرجع السكرول
    // لفوق مع كل تنقل بين الصفحات/البروفايلات.
    window.scrollTo(0, 0);
  }, [activeTab, selectedProfileId]);

  // بيتبع حالة عارض الحالات (Stories) - لو مفتوح، زرار الرجوع في الموبايل
  // لازم يقفله بس، مش يقفز لصفحة تانية. الإغلاق الفعلي بيحصل عن طريق
  // closeStoryViewerRef اللي Stories.tsx بيسجله فينا.
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);
  const closeStoryViewerRef = useRef<(() => void) | null>(null);
  const handleStoryViewerChange = useCallback((isOpen: boolean, closeFn: (() => void) | null) => {
    setStoryViewerOpen(isOpen);
    closeStoryViewerRef.current = closeFn;
  }, []);

  /**
   * زي ما اتصلح في عارض الحالات (Stories) بالظبط: فتح أي مودال (لايتبوكس،
   * تسجيل الدخول، أو أي حاجة تانية بتتفتح فوق الصفحة) لازم يسجل خطوة في
   * الـ browser history. من غيرها، زرار الرجوع في أندرويد كان بيتخطى
   * المودال تماماً - إما مبيعملش حاجة، أو بيطلعك برة الصفحة/التطبيق على
   * طول بدل ما يقفل المودال بس. الدوال دي بتلف الـ setState الأصلي
   * وتسجل خطوة history بس لما المودال بيتفتح فعلياً (مش لما يتقفل، عشان
   * الإغلاق بيحصل من خلال زرار الرجوع نفسه أو زرار X).
   */
  const openLightboxGuarded = useCallback((url: string | null) => {
    if (url) {
      window.history.pushState({ modal: "lightbox" }, "", window.location.href);
    }
    setLightboxImage(url);
  }, []);

  const openAuthModalGuarded = useCallback((show: boolean) => {
    if (show) {
      window.history.pushState({ modal: "auth" }, "", window.location.href);
    }
    setShowAuthModal(show);
  }, []);

  const openCommentsGuarded = useCallback((meme: Meme) => {
    window.history.pushState({ modal: "comments" }, "", window.location.href);
    setSelectedMemeForComments(meme);
  }, []);

  /**
   * لما المستخدم يدوس على إشعار من قايمة الإشعارات، بنوديه للمكان اللي
   * حصل فيه الحدث نفسه: إشعار متابعة -> بروفايل اللي عمل المتابعة،
   * إشعار لايك/كومنت -> البوست نفسه في الفيد (ولو كومنت بنفتحله
   * قسم التعليقات على طول بدل ما يدور عليه).
   */
  const handleNotificationClick = useCallback(async (notif: Notification) => {
    if (notif.type === "follow") {
      if (notif.actor_id) {
        navigateToTab("user-profile", { profileId: notif.actor_id });
      }
      return;
    }
    if (notif.meme_id) {
      try {
        const meme = notif.meme || memes.find(m => m.id === notif.meme_id) || await dataService.getMemeById(notif.meme_id);
        if (meme) {
          setMemes(prev => prev.some(m => m.id === meme.id) ? prev : [meme, ...prev]);
          navigateToTab("feed");
          setHighlightedMemeId(meme.id);
          if (notif.type === "comment") {
            openCommentsGuarded(meme);
          }
        }
      } catch (e) {
        console.error("خطأ في فتح البوست بتاع الإشعار:", e);
      }
    }
  }, [navigateToTab, openCommentsGuarded, memes]);

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
   * والتحقق من رابط الصفحة الحالي
   */
  useEffect(() => {
    // التحقق من رابط الصفحة لتحديد التبويب النشط
    const path = window.location.pathname;
    let startTab = "feed";
    if (path === '/admin' || path.includes('admin')) {
      startTab = 'admin';
      setActiveTab('admin');
    }

    // بنسجل أول حالة في الـ history عشان زرار الرجوع في الموبايل يرجع جوا التطبيق
    // (بين التبويبات) بدل ما يقفل الموقع/الـ webview على طول من أول ضغطة
    window.history.replaceState({ tab: startTab }, "", window.location.href);

    const loadInitialData = async () => {
      setLoading(true);
      try {
        const dbCurrentUser = await dataService.getCurrentUser();
        setCurrentUser(dbCurrentUser || initialGuestProfile);
        
        // تحميل الصفحة الأولى من الميمز (10 عناصر) - عن طريق خوارزمية الترتيب الحقيقية
        const dbMemes = await dataService.getMemes("approved", undefined, dbCurrentUser?.id || initialGuestProfile.id, 0, 10);
        setMemes(dbMemes);
        setPage(1); // الاستعداد للصفحة التالية
        setHasMore(dbMemes.length === 10);
        
        const dbProfiles = await dataService.getProfilesList();
        setProfiles(dbProfiles);
        
        const dbFollowingIds = await dataService.getFollowingList(dbCurrentUser?.id || initialGuestProfile.id);
        setFollowingIds(dbFollowingIds);

        // تحميل الإشعارات الحقيقية (كانت مش بتتحمل خالص قبل كده)
        if (dbCurrentUser && dbCurrentUser.id !== "guest-user-temp") {
          const dbNotifications = await dataService.getNotifications();
          setNotifications(dbNotifications);

          // تحميل عدد الرسايل الغير مقروءة عشان البادج جنب زرار الرسايل
          const totalUnread = await messagesService.getTotalUnreadCount();
          setUnreadMessagesCount(totalUnread);
        }

        // فتح البوست مباشرة لو الرابط جاي من مشاركة (?meme=<id>). كان اللينك
        // بيوديك للصفحة الرئيسية بس من غير ما يفتح البوست المقصود خالص.
        // ملحوظة: بنوديه للبوست نفسه جوه الفيد (وننده عليه بالضوء) من غير
        // ما نفتح قسم التعليقات تلقائي - المستخدم مش عايز البوست يتفتح بتعليقاته.
        const urlParams = new URLSearchParams(window.location.search);
        const sharedMemeId = urlParams.get("meme");
        const chatUserId = urlParams.get("chat");
        const profileId = urlParams.get("profile");

        if (sharedMemeId) {
          const sharedMeme = await dataService.getMemeById(sharedMemeId);
          if (sharedMeme) {
            setMemes(prev => prev.some(m => m.id === sharedMeme.id) ? prev : [sharedMeme, ...prev]);
            setActiveTab("feed");
            setHighlightedMemeId(sharedMeme.id);
          }
        } else if (chatUserId && dbCurrentUser && dbCurrentUser.id !== "guest-user-temp") {
          // جاي من إشعار رسالة جديدة (send-push) - نفتحله المحادثة مع اللي بعتله على طول
          setPendingMessageTargetId(chatUserId);
          setActiveTab("messages");
        } else if (profileId) {
          // جاي من إشعار فولو - نفتحله بروفايل اللي عمل فولو
          setSelectedProfileId(profileId);
          setActiveTab("user-profile");
        }

        // بننضف الرابط من الـ query params بعد ما فتحنا الوجهة المقصودة عشان لو
        // المستخدم عمل ريفريش أو رجع، الرابط يفضل نضيف ومايعيدش يفتح نفس الحاجة تاني
        if (sharedMemeId || chatUserId || profileId) {
          const cleanUrl = window.location.pathname + window.location.hash;
          window.history.replaceState({ tab: activeTab }, "", cleanUrl);
        }
      } catch (e) { 
        console.warn("خطأ في تحميل البيانات:", e); 
      } finally { 
        setLoading(false); 
      }
    };

    loadInitialData();
  }, []);

  /**
   * التعامل مع زرار الرجوع (Back) في الموبايل والمتصفح.
   * كان زرار الرجوع بيطلع برا الموقع خالص لأن التبويبات كانت state عادي
   * من غير أي تسجيل في الـ browser history. دلوقتي كل تنقل بين
   * التبويبات بيتسجل كخطوة history، فزرار الرجوع يرجع خطوة جوا التطبيق.
   * أول حاجة بيقفلها الرجوع لو فيه مودال/لايتبوكس مفتوح، بعدين يرجع للتاب اللي قبله.
   */
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (storyViewerOpen) {
        closeStoryViewerRef.current?.();
        window.history.pushState({ tab: activeTab }, "", window.location.href);
        return;
      }
      if (lightboxImage) {
        setLightboxImage(null);
        setLightboxMediaType(null);
        window.history.pushState({ tab: activeTab }, "", window.location.href);
        return;
      }
      if (selectedMemeForComments) {
        setSelectedMemeForComments(null);
        window.history.pushState({ tab: activeTab }, "", window.location.href);
        return;
      }
      if (showAuthModal) {
        setShowAuthModal(false);
        window.history.pushState({ tab: activeTab }, "", window.location.href);
        return;
      }
      const targetTab = e.state?.tab || "feed";
      setActiveTab(targetTab);
      window.scrollTo(0, 0);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [activeTab, lightboxImage, selectedMemeForComments, showAuthModal, storyViewerOpen]);

  /**
   * اشتراك لايف على مستوى التطبيق كله عشان بادج الرسايل جنب زرار الرسايل
   * يفضل محدث حتى لو صفحة الرسايل نفسها مش مفتوحة حالياً
   */
  useEffect(() => {
    if (currentUser.id === "guest-user-temp") return;
    const unsubscribe = messagesService.subscribeToInbox(async () => {
      try {
        const totalUnread = await messagesService.getTotalUnreadCount();
        setUnreadMessagesCount(totalUnread);
      } catch (error) {
        console.error("Error refreshing unread messages count:", error);
      }
    });
    return unsubscribe;
  }, [currentUser.id]);

  /**
   * تفعيل إشعارات الـ Push للمستخدم الحقيقي عشان يوصله إشعار برسايل/لايكات/
   * كومنتات جديدة حتى لو قافل المتصفح خالص - مش بس لما التطبيق يكون مفتوح
   */
  useEffect(() => {
    if (currentUser.id === "guest-user-temp") return;
    pushService.subscribe(currentUser.id);
  }, [currentUser.id]);

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
        10,
        selectedTag,
        searchQuery
      );

      if (nextMemes.length < 10) {
        setHasMore(false);
      }

      // منع تكرار بوستات لو حصل أي تداخل بين الصفحات (كان بيحصل مع باج إعادة تعيين page)
      setMemes(prev => {
        const existingIds = new Set(prev.map(m => m.id));
        return [...prev, ...nextMemes.filter(m => !existingIds.has(m.id))];
      });
      setPage(prev => prev + 1);
    } catch (error) {
      console.error("Error loading more memes:", error);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, page, currentUser.id, selectedTag, searchQuery]);

  /**
   * كانت الفلترة بالتاج/البحث بتحصل محلياً بس على الـ caption، ومحدش كان بيوصل selectedTag
   * فعلياً للفيد (الضغط على تاج مكنش بيعمل حاجة). دلوقتي كل تغيير في التاج/البحث
   * بيعمل fetch جديد من الفيد المُرتَّب نفسه (get_ranked_feed) بفلترة حقيقية من الداتابيز.
   */
  useEffect(() => {
    if (activeTab !== "feed") return;
    let cancelled = false;
    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const dbMemes = await dataService.getMemes("approved", undefined, currentUser.id, 0, 10, selectedTag, searchQuery);
        if (cancelled) return;
        setMemes(dbMemes);
        setPage(1);
        setHasMore(dbMemes.length === 10);
      } catch (e) {
        console.error("Error filtering feed:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, searchQuery ? 400 : 0); // debounce للبحث بس، التاج بيتفلتر فوراً

    return () => { cancelled = true; clearTimeout(timeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTag, searchQuery]);

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
   * لو حصل وتاب "الرسايل" اتفتح لزائر مش مسجل دخول (بالرغم إن نقاط الدخول
   * التانية بتتحقق من isRealUser قبل ما تنقل هنا)، بنرجعه للفيد ونفتحله
   * مودال تسجيل الدخول. ده بيحصل هنا في useEffect (بعد الرندر) مش أثناء
   * الرندر نفسه - استدعاء setState وسط رندر كومبوننت تاني كان بيسبب كراش
   * وشاشة سودا.
   */
  useEffect(() => {
    if (activeTab === "messages" && !isRealUser) {
      navigateToTab("feed");
      openAuthModalGuarded(true);
    }
  }, [activeTab, isRealUser, navigateToTab, openAuthModalGuarded]);

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
      // البلاغات كانت بتتسجل بس في console.log من غير أي حفظ حقيقي في
      // الداتابيز، رغم وجود جدول reports ودالة submitReport جاهزة أصلاً.
      // المستخدم كان بيشوف رسالة "تم الإبلاغ" بس البلاغ بيروح في الفاضي.
      handleReportSubmit: async (memeId: string, reason: string) => {
        try {
          await dataService.submitReport(memeId, currentUser.id, reason);
        } catch (error) {
          console.error("Error submitting report:", error);
        }
      },
      // كانت دي بس console.log ومفيش أي تسجيل حقيقي للمشاركة في الداتابيز رغم وجود
      // عمود shares_count وRPC جاهزة (increment_share_count). دلوقتي بتتسجل فعلياً.
      // كمان بنمنع تكرار التسجيل لو المستخدم ضغط زرار المشاركة كذا مرة ورا بعض
      // بسرعة لنفس البوست (زي فيسبوك بالظبط: مش كل ضغطة بتتحسب مشاركة جديدة).
      handleShareCompleted: async (memeId: string) => {
        const now = Date.now();
        const lastSharedAt = lastShareAtRef.current.get(memeId) || 0;
        const SHARE_COOLDOWN_MS = 10000; // 10 ثواني كحد أدنى بين مشاركتين لنفس البوست
        if (now - lastSharedAt < SHARE_COOLDOWN_MS) return;
        lastShareAtRef.current.set(memeId, now);
        try {
          const newCount = await dataService.recordShare(memeId);
          setMemes(prev => prev.map(m => m.id === memeId ? { ...m, shares_count: newCount } : m));
        } catch (error) {
          console.error("Error recording share:", error);
        }
      },
      handleDeleteMeme,
      setSelectedProfileId,
      setActiveTab: navigateToTab,
      setLightboxImage: openLightboxGuarded,
      // زرار الرسايل في البروفايل (كان ديمو من غير أي وظيفة) - دلوقتي بيفتح
      // محادثة حقيقية مع صاحب البروفايل عن طريق نظام الرسايل الجديد
      onMessageUser: (userId: string) => {
        if (!isRealUser) {
          openAuthModalGuarded(true);
          return;
        }
        setPendingMessageTargetId(userId);
        navigateToTab("messages");
      }
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
            // الفلترة بالبحث/التاج بقت تحصل في الداتابيز نفسها عن طريق get_ranked_feed
            filteredMemes={memes}
            setMemes={setMemes} 
            setShowAuthModal={openAuthModalGuarded} 
            setAuthTab={setAuthTab} 
            setSearchQuery={setSearchQuery}
            onOpenComments={openCommentsGuarded}
            highlightedMemeId={highlightedMemeId}
            onHighlightConsumed={() => setHighlightedMemeId(null)}
            onStoryViewerChange={handleStoryViewerChange}
          />
        );
      case "trending":
        return <TrendingPage {...commonProps} />;
      case "create-post":
        return (
          <CreatePostPage
            currentUser={currentUser}
            setActiveTab={navigateToTab}
            onPostCreated={(meme) => {
              // بنضيف المنشور الجديد فوراً لأول الفيد (حالته pending لحد ما الـ AI يوافق عليه)
              // بدل ما المستخدم يحتاج يعمل ريفريش يدوي للصفحة عشان يشوفه
              setMemes(prev => [meme, ...prev]);
            }}
          />
        );
      case "saves":
        return <SavesPage {...commonProps} memes={memes} />;
      case "reels":
        return (
          <ReelsPage
            currentUser={currentUser}
            isRealUser={isRealUser}
            handleLikeToggle={handleLikeToggle}
            handleSaveToggle={handleSaveToggle}
            handleShareCompleted={commonProps.handleShareCompleted}
            onOpenComments={openCommentsGuarded}
            setShowAuthModal={openAuthModalGuarded}
            onUserProfileClick={(userId) => navigateToTab("user-profile", { profileId: userId })}
          />
        );
      case "leaderboard":
        return (
          <Leaderboard 
            profiles={profiles} 
            currentUser={currentUser} 
            onNavigate={navigateToTab} 
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
            setShowAuthModal={openAuthModalGuarded} 
          />
        );
      case "messages":
        // نظام الرسايل الخاصة - محمي أصلاً من مصدر الدخول (زرار الهيدر وزرار
        // البروفايل بيتحققوا من isRealUser قبل ما ينقلوا هنا خالص)
        return (
          <MessagesPage
            currentUser={currentUser}
            profiles={profiles}
            onUserProfileClick={(userId) => navigateToTab("user-profile", { profileId: userId })}
            onUnreadCountChange={setUnreadMessagesCount}
            initialOtherUserId={pendingMessageTargetId}
            onInitialConversationConsumed={() => setPendingMessageTargetId(null)}
          />
        );
      case "admin":
        // لوحة تحكم المشرف - محمية بكلمة مرور
        return <AdminPanel currentUser={currentUser} setActiveTab={navigateToTab} />;
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
      onNavigate={navigateToTab}
      onSearch={setSearchQuery}
      onUserSwitch={setCurrentUser}
      onMarkNotificationsRead={async () => {
        try {
          await dataService.markAllNotificationsRead();
          setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch (error) {
          console.error("Error marking notifications read:", error);
        }
      }}
      onNotificationClick={handleNotificationClick}
      onShowAuthModal={() => { openAuthModalGuarded(true); setAuthTab("signin"); }}
      onCloseAuthModal={() => setShowAuthModal(false)}
      setAuthTab={setAuthTab}
      setShowAuthModal={openAuthModalGuarded}
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
      unreadMessagesCount={unreadMessagesCount}
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
            navigateToTab("user-profile", { profileId: id });
            setSelectedMemeForComments(null);
          }}
        />
      )}
    </MainLayout>
  );
}

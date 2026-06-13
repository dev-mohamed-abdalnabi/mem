import React, { useState, useEffect } from "react"; 
import { Home, Flame, Trophy, Bookmark, Cpu, AlertTriangle, ShieldAlert, Sparkles, X, Clock, PlusCircle, CheckCircle2, Award, HelpCircle, MessageCircle, AlertCircle, Trash2, User, Camera, Edit2 } from "lucide-react";

import { Profile, Meme, Notification, Report, UserRole } from "./types"; 
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

export default function App() { 
  const [activeTab, setActiveTab] = useState("feed"); 
  const [currentUser, setCurrentUser] = useState(initialGuestProfile); 
  const [memes, setMemes] = useState<Meme[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]); 
  const [notifications, setNotifications] = useState<Notification[]>([]); 
  const [reports, setReports] = useState<Report[]>([]); 
  const [dbError, setDbError] = useState<string | null>(null);

  // Interaction and filtering state 
  const [searchQuery, setSearchQuery] = useState(""); 
  const [selectedTag, setSelectedTag] = useState<string | null>(null); 
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true); 
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  // New Post Widget inputs 
  const [newPostImage, setNewPostImage] = useState("");
  const [newPostCaption, setNewPostCaption] = useState(""); 
  const [newPostTags, setNewPostTags] = useState(""); 
  const [postError, setPostError] = useState("");
  const [postSuccess, setPostSuccess] = useState(false); 
  const [quickPostFile, setQuickPostFile] = useState<File | null>(null);

  // Supabase Authentications Modal state values 
  const [showAuthModal, setShowAuthModal] = useState(false); 
  const [authTab, setAuthTab] = useState<"signin" | "signup">("signin"); 
  const [authEmail, setAuthEmail] = useState(""); 
  const [authPassword, setAuthPassword] = useState(""); 
  const [authUsername, setAuthUsername] = useState(""); 
  const [authError, setAuthError] = useState(""); 
  const [authSuccess, setAuthSuccess] = useState(""); 
  const [authLoading, setAuthLoading] = useState(false);

  // Level Up overlay / state 
  const [prevPoints, setPrevPoints] = useState(0);
  const [showLevelUpAlert, setShowLevelUpAlert] = useState(false); 
  const [newLevelName, setNewLevelName] = useState("");

  // Lightbox State
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => { 
    loadAllData();

    // Check for shared meme in URL
    const urlParams = new URLSearchParams(window.location.search);
    const sharedMemeId = urlParams.get('meme');
    if (sharedMemeId) {
      console.log("Shared meme ID:", sharedMemeId);
    }
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
      console.warn("Database connection initialization warning:", e);
      setDbError(e.message || "فشلت الاتصالات المباشرة بجداول Supabase. يرجى تهيئة الجداول.");
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
    if (!memeId) { 
      loadAllData(); 
      return; 
    }

    try {
      const { liked, likesCount } = await dataService.toggleLike(memeId, currentUser.id);
      
      setMemes((prev) => 
        prev.map((m) => {
          if (m.id === memeId) {
            return {
              ...m,
              likes_count: likesCount,
              liked_by_me: liked
            };
          }
          return m;
        })
      );

      if (activeTab === "trending") {
        const dbTrending = await dataService.getTrendingMemes(currentUser.id);
        setMemes(dbTrending);
      }

      const targetMeme = memes.find(m => m.id === memeId);
      if (targetMeme && targetMeme.user_id === currentUser.id) {
        updateUserPointsInState(liked ? 5 : -5);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveToggle = async (memeId: string) => { 
    try { 
      const saved = await dataService.toggleSave(memeId, currentUser.id); 
      setMemes((prev) => prev.map((m) => { 
        if (m.id === memeId) { 
          return { ...m, saves_count: saved ? m.saves_count + 1 : Math.max(0, m.saves_count - 1), saved_by_me: saved }; 
        } 
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

        const followActor = profiles.find(p => p.id === followerId) || currentUser;
        const newNotif: Notification = {
          id: `notif-f-${Date.now()}`,
          recipient_id: followingId,
          actor_id: followerId,
          type: "follow",
          meme_id: null,
          content: null,
          is_read: false,
          created_at: new Date().toISOString(),
          actor: followActor
        };
        setNotifications((prev) => [newNotif, ...prev]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePublishMeme = async (caption: string, imageUrl: string, tags: string[]) => { 
    try { 
      const newMeme = await dataService.createMeme({ user_id: currentUser.id, image_url: imageUrl, caption, tags });
      setMemes((prev) => [newMeme, ...prev]);
      updateUserPointsInState(5);
    } catch (err: any) {
      throw err;
    }
  };

  const handleUpdateProfile = async (updates: Partial<Profile>) => { 
    try { 
      const updated = await dataService.updateProfile(updates); 
      setCurrentUser(updated);
      setProfiles(prev => prev.map(p => p.id === updated.id ? updated : p)); 
    } catch (err) { console.error(err); } 
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { 
    const file = e.target.files?.[0]; 
    if (file) { 
      if (file.size > 8 * 1024 * 1024) {
        setPostError("يا رايق حجم ملف الميم ده كبير بزيادة! الحد الأقصى هو 8 ميجابايت."); 
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
      reader.onerror = () => { setPostError("فشل قراءة الصورة المرفوعة."); };
      reader.readAsDataURL(file); 
    } 
  };

  const handleQuickPostSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); 
    if (!newPostImage.trim() && !newPostCaption.trim()) {
      setPostError("يا رايق، لازم تكتب نص أو ترفع صورة عشان تنشر الميم!"); return; 
    }

    setPostError("");
    setPostSuccess(false);
    setLoading(true);

    try {
      let finalImageUrl = newPostImage.trim() || "";
      if (quickPostFile) {
        finalImageUrl = await dataService.uploadMemeFile(quickPostFile);
      }

      const splitTags = newPostTags
        .split(" ")
        .filter(t => t.startsWith("#"))
        .map(t => t.replace("#", ""));

      await handlePublishMeme(newPostCaption.trim(), finalImageUrl, splitTags);
      
      setPostSuccess(true);
      setNewPostImage("");
      setNewPostCaption("");
      setNewPostTags("");
      setQuickPostFile(null);
      setActiveTab("feed");
      
      setTimeout(() => setPostSuccess(false), 4400);
    } catch (err: any) {
      setPostError(err.message || "حدث خطأ أثناء النشر.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => { 
    e.preventDefault();
    setAuthLoading(true); setAuthError(""); setAuthSuccess(""); 
    try { 
      const profile = await dataService.signIn(authEmail, authPassword); 
      setCurrentUser(profile);
      setPrevPoints(profile.total_points); 
      setAuthSuccess("تم الدخول بنجاح! نورت منصتك يا غالي 🎉"); 
      setAuthEmail(""); setAuthPassword(""); 
      setTimeout(() => {
        setShowAuthModal(false); 
        loadAllData(); 
      }, 1500); 
    } catch (err: any) {
      setAuthError(err.message || "فشل الدخول. تأكد من البيانات."); 
    } finally { setAuthLoading(false); } 
  };

  const handleSignUp = async (e: React.FormEvent) => { 
    e.preventDefault(); 
    if (!authUsername.trim()) { setAuthError("يا غالي اكتب اسم مستخدم مميز!"); return; } 
    setAuthLoading(true); setAuthError(""); setAuthSuccess("");
    try { 
      const profile = await dataService.signUp(authEmail, authPassword, authUsername.trim()); 
      setCurrentUser(profile);
      setPrevPoints(profile.total_points); 
      setAuthSuccess("تم الإنشاء! أهلاً بك 😄🎉"); 
      setAuthEmail(""); setAuthPassword(""); setAuthUsername(""); 
      setTimeout(() => { setShowAuthModal(false); loadAllData(); }, 1500); 
    } catch (err: any) { 
      setAuthError(err.message || "تعذّر الإنشاء. تأكد من البيانات (الرقم السري 6 رموز)."); 
    } finally { setAuthLoading(false); } 
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
    const newReport: Report = { 
      id: `report-${Date.now()}`, 
      meme_id: memeId, 
      reporter_id: currentUser.id, 
      reason, 
      status: "open", 
      resolved_by: null,
      resolution_note: null, 
      created_at: new Date().toISOString() 
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
      } catch (err: any) { alert(err.message || "فشل الحذف."); } 
    } 
  };

  const handleUserSwitch = (newProf: Profile) => { 
    setCurrentUser(newProf);
    localStorage.setItem("memesbook_current_user", JSON.stringify(newProf));
    setPrevPoints(newProf.total_points);
    dataService.getNotifications(newProf.id).then(notifs => setNotifications(notifs));
  };

  // التقاط الضغط على أي صورة بوست لفتحها في شاشة كاملة
  const handleGlobalImageClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'IMG') {
      const className = target.className || '';
      const isAvatar = className.includes('rounded-full') || className.includes('avatar') || target.closest('header');
      if (!isAvatar && target.closest('.post-wrapper')) {
        setLightboxImage((target as HTMLImageElement).src);
      }
    }
  };

  const filteredMemes = memes.filter((meme) => {
    if (meme.status === "deleted" || meme.status === "rejected") return false;

    if (selectedTag) {
      const lowerTag = selectedTag.toLowerCase();
      const match = meme.tags?.some(t => t.toLowerCase() === lowerTag) || 
                    meme.caption?.toLowerCase().includes(`#${lowerTag}`);
      if (!match) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const userMatch = meme.profiles?.username.toLowerCase().includes(q);
      const capMatch = meme.caption?.toLowerCase().includes(q);
      const tagMatch = meme.tags?.some(t => t.toLowerCase().includes(q));
      return userMatch || capMatch || tagMatch;
    }

    return true;
  });

  const savedMemesCount = memes.filter(m => m.saved_by_me).length; 
  const isRealUser = currentUser ? currentUser.id !== "guest-user-temp" : false;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans selection:bg-blue-200 dark:selection:bg-blue-900" dir="rtl">
      {/* 
        إصلاحات حواف البوستات والصور لتبدو دائرية انسيابية 
      */}
      <style>{`
        .post-wrapper > div, .post-wrapper > article {
          border-radius: 16px !important;
          overflow: hidden !important;
        }
        .post-wrapper img:not(.rounded-full) {
          cursor: pointer;
          border-radius: 12px !important;
        }
      `}</style>

      {/* Lightbox for Images (فيسبوك ستايل) */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-[9999] bg-black flex items-center justify-center backdrop-blur-none transition-opacity duration-300"
          onClick={() => setLightboxImage(null)}
        >
          {/* خلفية سوداء صلبة مثل فيسبوك وزر إغلاق واضح */}
          <button 
            className="absolute top-4 right-4 md:top-6 md:right-6 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 md:p-3 rounded-full transition-all z-50 cursor-pointer"
            onClick={() => setLightboxImage(null)}
          >
            <X className="w-6 h-6 md:w-8 md:h-8" />
          </button>
          <img 
            src={lightboxImage} 
            alt="Full size" 
            className="w-auto h-auto max-w-full max-h-[95vh] object-contain animate-fade-in cursor-default"
            onClick={(e) => e.stopPropagation()}
            referrerPolicy="no-referrer"
          />
        </div>
      )}

      {/* Level Up Notification Banners */}
      {showLevelUpAlert && (   
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-2xl text-center flex flex-col items-center max-w-sm w-full relative animate-bounce-short">
            <button
              onClick={() => setShowLevelUpAlert(false)} 
              className="absolute top-4 left-4 text-gray-400 hover:text-gray-900 dark:hover:text-white cursor-pointer" 
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-20 h-20 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto text-yellow-500 shadow">
              <Award className="w-10 h-10" />
            </div>

            <h3 className="font-extrabold text-xl text-gray-900 dark:text-white mt-4 leading-tight">
              ألف مبروك يا الغالي! ترقيت 🚀🔥
            </h3>
            
            <p className="text-xs text-blue-600 dark:text-blue-400 font-extrabold mt-1.5 uppercase tracking-wide">
              المستوى الجديد المحقق
            </p>

            <div className="bg-blue-50 dark:bg-blue-900/40 border border-blue-100 dark:border-blue-800 py-3 px-5 rounded-2xl inline-block mt-3 text-blue-700 dark:text-blue-300 font-extrabold text-lg">
              {newLevelName}
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold leading-relaxed mt-4">
              إمكانيات ميمزبوك بتفتح معاك! استمر بنشر أحلى الإفيهات.
            </p>

            <button
              onClick={() => setShowLevelUpAlert(false)}
              className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-2xl text-sm shadow-md cursor-pointer transition-all hover:scale-105 active:scale-95"
            >
              جاهز! 👍
            </button>
          </div>
        </div>
      )}

      {/* Header bar component */}
      <Header
        currentUser={currentUser}
        notifications={notifications}
        onNavigate={(tab) => {
          setActiveTab(tab);
          setSelectedTag(null);
        }}
        onSearch={(query) => setSearchQuery(query)}
        activeTab={activeTab}
        onUserSwitch={handleUserSwitch}
        availableProfiles={profiles}
        onMarkNotificationsRead={handleMarkNotificationsRead}
        onShowAuthModal={() => {
          setShowAuthModal(true);
          setAuthTab("signin");
          setAuthError("");
          setAuthSuccess("");
        }}
        onSignOutReal={handleSignOutReal}
        isRealUser={isRealUser}
      />

      {/* Main stage layout block */}
      <main 
        className="max-w-7xl mx-auto px-4 py-6 pb-24 md:pb-8 w-full flex-1 flex gap-6"
        onClick={handleGlobalImageClick}
      >
        
        {/* Right side helper columns (الودجات الجانبية بشكل عصري وأنظف) */}
        <div className="w-72 shrink-0 hidden lg:flex flex-col gap-5 order-3">
          
          {!isRealUser && (
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] p-6 shadow-sm text-center text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
              <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto text-white mb-4 backdrop-blur-md relative z-10">
                <User className="w-7 h-7" />
              </div>
              <h4 className="font-extrabold text-base mb-2 relative z-10">انضم للمجتمع الآن 👋</h4>
              <p className="text-xs text-blue-100 mb-5 font-medium relative z-10">سجل حسابك عشان تشارك وتنافس على الصدارة!</p>
              <button
                onClick={() => { setShowAuthModal(true); setAuthTab("signin"); }}
                className="w-full bg-white text-blue-600 hover:bg-gray-50 font-black py-3 rounded-2xl text-sm shadow-md transition-all hover:scale-105 relative z-10"
              >
                دخول / إنشاء حساب
              </button>
            </div>
          )}

          {/* ودجت ترتيب الوزراء - تصميم نظيف وبدون حواف مزعجة */}
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] p-6 shadow-sm">
            <h4 className="font-black text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-5">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <span>توب التفاعل</span>
            </h4>
            
            <div className="flex flex-col gap-4">
              {profiles.slice(0, 3).map((prof, index) => (
                <div key={prof.id} className="flex items-center gap-3 group cursor-pointer" onClick={() => { setSelectedProfileId(prof.id); setActiveTab("user-profile"); }}>
                  <div className="w-6 text-center text-base font-black text-gray-300 dark:text-gray-600 group-hover:text-blue-500 transition-colors">
                    {index + 1}
                  </div>
                  {prof.avatar_url ? (
                    <img
                      src={prof.avatar_url}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover border border-gray-100 dark:border-gray-700"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 font-bold">
                      {prof.username[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-500 transition-colors">{prof.username}</p>
                    <p className="text-[11px] text-blue-600 dark:text-blue-400 font-bold mt-0.5">{prof.total_points} نقطة</p>
                  </div>
                </div>
              ))}
            </div>
            
            <button
              onClick={() => setActiveTab("leaderboard")}
              className="w-full text-center text-xs text-gray-500 hover:text-blue-600 dark:text-gray-400 font-bold hover:underline mt-5 pt-4 border-t border-gray-50 dark:border-gray-800 transition-colors block"
            >
              عرض الترتيب الكامل
            </button>
          </div>

          {/* ودجت القوانين - تصميم ناعم */}
          <div className="bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800/60 rounded-[2rem] p-6 text-right flex flex-col gap-4">
            <h4 className="font-black text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mb-1">
              <HelpCircle className="w-4 h-4" />
              <span>قواعد بسيطة</span>
            </h4>
            <ul className="text-[13px] text-gray-600 dark:text-gray-300 flex flex-col gap-3 font-medium pr-1">
              <li className="flex items-start gap-2 before:content-['•'] before:text-blue-500 before:font-bold">الميمز الكرينج بتتمسح فوراً.</li>
              <li className="flex items-start gap-2 before:content-['•'] before:text-blue-500 before:font-bold">خليك رايق وبلاش تجاوزات.</li>
              <li className="flex items-start gap-2 before:content-['•'] before:text-blue-500 before:font-bold">ممنوع تكرار نفس البوست (سبام).</li>
            </ul>
          </div>
        </div>

        {/* Central main viewport */}
        <div className="flex-1 max-w-full md:max-w-[600px] lg:max-w-[640px] xl:max-w-2xl mx-auto order-2">
          
          {selectedTag && (
            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 px-4 py-3 rounded-2xl text-xs sm:text-sm text-blue-800 dark:text-blue-200 font-extrabold flex items-center justify-between mb-4 shadow-sm">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-500" />
                <span>الميمز بالهاشتاج:</span>
                <strong className="bg-white dark:bg-gray-800 px-2 py-0.5 rounded-lg">#{selectedTag}</strong>
              </span>
              <button onClick={() => setSelectedTag(null)} className="hover:scale-110 transition-transform">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {activeTab === "feed" && (
            <div className="flex flex-col gap-5">
              {!isRealUser && (
                <div className="lg:hidden bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2rem] p-5 shadow-sm text-center text-white mb-2">
                  <h4 className="font-extrabold text-base mb-2">انضم لمجتمعنا 👀</h4>
                  <button
                    onClick={() => { setShowAuthModal(true); setAuthTab("signin"); }}
                    className="bg-white text-blue-600 hover:bg-gray-50 font-black py-3 px-4 rounded-xl text-sm w-full shadow-sm"
                  >
                    دخول / إنشاء حساب
                  </button>
                </div>
              )}

              {loading ? (
                <div className="text-center py-12 text-gray-400">جاري التحميل...</div>
              ) : filteredMemes.length === 0 ? (
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] p-12 text-center flex flex-col items-center gap-3">
                  <Clock className="w-12 h-12 text-gray-200 dark:text-gray-700 animate-spin" />
                  <p className="font-extrabold text-base text-gray-700 dark:text-gray-300">مفيش ميمز تطابق استعلامك!</p>
                  <button onClick={() => { setSearchQuery(""); setSelectedTag(null); }} className="mt-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-5 py-2.5 rounded-xl text-sm font-bold hover:scale-105 transition-transform">
                    إعادة تعيين
                  </button>
                </div>
              ) : (
                filteredMemes.map((meme) => (
                  <div key={meme.id} className="post-wrapper w-full mb-2">
                    <MemeCard
                      meme={meme}
                      currentUser={currentUser}
                      onLikeToggle={handleLikeToggle}
                      onSaveToggle={handleSaveToggle}
                      onFollowToggle={handleFollowToggle}
                      onTagClick={(tag) => setSelectedTag(tag)}
                      onDeleteComment={() => {
                        setMemes(prev => prev.map(m => m.id === meme.id ? { ...m, comments_count: Math.max(0, m.comments_count - 1) } : m));
                      }}
                      onReportSubmit={handleReportSubmit}
                      onShareCompleted={handleShareCompleted}
                      onDeleteMeme={handleDeleteMeme}
                      onUserProfileClick={(uid) => {
                        setSelectedProfileId(uid);
                        setActiveTab("user-profile");
                      }}
                      isFollowingCreator={followingIds.includes(meme.user_id)}
                      onImageClick={(url: string) => setLightboxImage(url)} 
                    />
                  </div>
                ))
              )}
            </div>
          )}

          {/* صفحة إنشاء منشور (ستايل Threads) */}
          {activeTab === "create-post" && (
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] p-5 sm:p-6 shadow-sm text-right flex flex-col gap-4 animate-fade-in mb-8 mx-auto max-w-xl">
              {/* هيدر النشر */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-50 dark:border-gray-800/50">
                <button onClick={() => setActiveTab("feed")} className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-sm font-bold">
                  إلغاء
                </button>
                <h2 className="text-base font-black text-gray-900 dark:text-white">منشور جديد</h2>
                <div className="w-10"></div> {/* Placeholder للموازنة */}
              </div>

              <form onSubmit={handleQuickPostSubmit} className="flex flex-col gap-2 pt-2">
                {/* منطقة الإدخال بستايل ثريدز (صورة شخصية + خط عمودي + محتوى) */}
                <div className="flex gap-3 relative">
                  {/* العمود الأيمن: الصورة الشخصية */}
                  <div className="flex flex-col items-center pt-1 z-10 bg-white dark:bg-gray-900 pb-2">
                    <img 
                      src={currentUser.avatar_url || "https://api.dicebear.com/7.x/bottts/svg?seed=guest"} 
                      className="w-10 h-10 rounded-full object-cover border border-gray-100 dark:border-gray-800"
                      alt="avatar"
                      referrerPolicy="no-referrer"
                    />
                    <div className="w-[2px] h-full bg-gray-100 dark:bg-gray-800 mt-2 rounded-full min-h-[40px]"></div>
                  </div>

                  {/* العمود الأيسر: الإدخال */}
                  <div className="flex-1 flex flex-col pt-1 pb-4">
                    <span className="font-bold text-[15px] text-gray-900 dark:text-white mb-1.5">{currentUser.username}</span>
                    
                    <textarea
                      placeholder="إيه اللي بيضحكك النهاردة؟..."
                      value={newPostCaption}
                      onChange={(e) => setNewPostCaption(e.target.value)}
                      className="w-full bg-transparent border-none focus:ring-0 p-0 text-[15px] text-gray-800 dark:text-gray-100 resize-none min-h-[70px] placeholder-gray-400 dark:placeholder-gray-500"
                      autoFocus
                    />

                    {/* معاينة الصورة المرفوعة */}
                    {newPostImage && (
                      <div className="relative mt-3 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 w-max max-w-full shadow-sm">
                        <img src={newPostImage} className="max-h-72 w-auto object-contain rounded-xl" alt="Preview" />
                        <button type="button" onClick={() => setNewPostImage("")} className="absolute top-2 right-2 bg-black/50 backdrop-blur-md text-white rounded-full p-1.5 hover:bg-black/70 transition-all cursor-pointer">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {/* أزرار الإرفاق السفلية */}
                    <div className="flex items-center gap-3 mt-4 text-gray-400 relative z-10">
                      <label className="p-2 -m-2 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-blue-500 rounded-full cursor-pointer transition-colors" title="إرفاق صورة">
                        <Camera className="w-5 h-5" />
                        <input type="file" accept="image/*" onChange={handleFileChange} className="hidden"/>
                      </label>
                      <input 
                        type="text" 
                        placeholder="# ضيف_هاشتاج (اختياري)..." 
                        value={newPostTags} 
                        onChange={(e) => setNewPostTags(e.target.value)} 
                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm p-0 text-blue-500 placeholder-gray-300 dark:placeholder-gray-600" 
                      />
                    </div>
                  </div>
                </div>

                {/* زر النشر */}
                <div className="flex justify-end mt-2 pt-4 border-t border-gray-50 dark:border-gray-800/50">
                  <button 
                    type="submit" 
                    disabled={(!newPostCaption.trim() && !newPostImage) || loading} 
                    className="bg-black dark:bg-white text-white dark:text-black px-8 py-2.5 rounded-full text-sm font-black disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 transition-transform flex items-center justify-center min-w-[100px]"
                  >
                    {loading ? <Clock className="w-4 h-4 animate-spin" /> : "نشر"}
                  </button>
                </div>
              </form>
              {postError && <p className="text-red-500 text-sm mt-2 text-center bg-red-50 dark:bg-red-900/20 p-2 rounded-lg font-bold">{postError}</p>}
            </div>
          )}

          {/* PROFILE - REDESIGNED FB STYLE (With Cover Upload Fix) */}
          {(activeTab === "profile" || (activeTab === "user-profile" && selectedProfileId)) && (
            <div className="flex flex-col gap-5 animate-fade-in">
              {(() => {
                const isOwnProfile = activeTab === "profile" || selectedProfileId === currentUser.id;
                const profile = isOwnProfile ? currentUser : profiles.find(p => p.id === selectedProfileId);
                
                if (!profile) return <div className="text-center py-10">المستخدم غير موجود</div>;
                const userMemes = memes.filter(m => m.user_id === profile.id);

                return (
                  <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] overflow-hidden shadow-sm">
                    {/* FB Style Cover Photo (تغيير البانر) */}
                    <div 
                      className="h-44 sm:h-60 bg-gradient-to-tr from-blue-600 to-indigo-800 relative group w-full bg-cover bg-center transition-all duration-300"
                      style={(profile as any).cover_url ? { backgroundImage: `url(${(profile as any).cover_url})` } : {}}
                    >
                      {/* طبقة تظليل خفيفة لجعل الزر واضح */}
                      <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-all pointer-events-none"></div>
                      
                      {isOwnProfile && (
                        <label className="absolute bottom-4 right-4 bg-white/90 dark:bg-black/60 hover:bg-white dark:hover:bg-black backdrop-blur-md text-gray-900 dark:text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg opacity-90 hover:opacity-100 hover:scale-105 z-10 border border-gray-200 dark:border-gray-700">
                          <Camera className="w-4 h-4" />
                          <span className="hidden sm:inline">تغيير الغلاف</span>
                          <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                try {
                                  // نقوم برفع الصورة واستخدامها كغلاف
                                  const url = await dataService.uploadAvatar(file); // assuming same logic applies
                                  const updated = { ...currentUser, cover_url: url } as any;
                                  setCurrentUser(updated);
                                  setProfiles(prev => prev.map(p => p.id === updated.id ? updated : p));
                                  await dataService.updateProfile({ cover_url: url } as any);
                                } catch (err: any) { alert("فشل رفع الغلاف: " + err.message); }
                              }
                            }}
                          />
                        </label>
                      )}
                    </div>

                    {/* FB Style Avatar & Info Row */}
                    <div className="px-6 relative flex flex-col sm:flex-row items-center sm:items-end justify-between -mt-16 sm:-mt-14 pb-5 border-b border-gray-100 dark:border-gray-800 gap-4">
                      
                      <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6 w-full relative z-10">
                        {/* Avatar */}
                        <div className="relative group shrink-0">
                          <div 
                            className="w-32 h-32 sm:w-36 sm:h-36 rounded-full border-4 border-white dark:border-gray-900 bg-gray-100 shadow-xl overflow-hidden cursor-pointer"
                            onClick={() => setLightboxImage(profile.avatar_url || null)}
                          >
                            {profile.avatar_url ? (
                              <img src={profile.avatar_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-5xl font-bold text-gray-300 dark:text-gray-600">{profile.username[0]}</div>
                            )}
                          </div>
                          
                          {isOwnProfile && (
                            <label className="absolute bottom-1 right-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white p-3 rounded-full cursor-pointer shadow-lg transition-all border-4 border-white dark:border-gray-900 hover:scale-110">
                              <Camera className="w-5 h-5" />
                              <input 
                                type="file" className="hidden" accept="image/*"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    try {
                                      const url = await dataService.uploadAvatar(file);
                                      setCurrentUser(prev => ({ ...prev, avatar_url: url }));
                                      await dataService.updateProfile({ avatar_url: url });
                                    } catch (err: any) { alert("فشل: " + err.message); }
                                  }
                                }}
                              />
                            </label>
                          )}
                        </div>

                        {/* Name & Basic Stats */}
                        <div className="flex-1 text-center sm:text-right mt-2 sm:mb-3 w-full">
                          {isOwnProfile ? (
                            <input 
                              type="text" 
                              value={profile.username} 
                              onChange={async (e) => {
                                const newName = e.target.value;
                                setCurrentUser(prev => ({ ...prev, username: newName }));
                                dataService.updateProfile({ username: newName });
                              }}
                              className="bg-transparent border-none focus:ring-2 focus:ring-blue-400 p-0 text-2xl sm:text-3xl font-black text-gray-900 dark:text-white text-center sm:text-right w-full"
                            />
                          ) : (
                            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">{profile.username}</h1>
                          )}
                          <p className="text-sm font-bold text-gray-500 mt-1">{profile.followers_count} متابع • {profile.following_count || 0} يتابع</p>
                          <p className="text-xs text-blue-600 dark:text-blue-400 font-bold mt-1.5 bg-blue-50 dark:bg-blue-900/30 inline-block px-3 py-1 rounded-lg">{profile.meme_level}</p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 sm:mb-3 w-full sm:w-auto justify-center">
                        {!isOwnProfile && isRealUser ? (
                          <>
                            <button 
                              onClick={() => handleFollowToggle(currentUser.id, profile.id)}
                              className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-black transition-all flex items-center justify-center gap-1.5 ${
                                followingIds.includes(profile.id) 
                                  ? "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200" 
                                  : "bg-blue-600 text-white hover:bg-blue-700"
                              }`}
                            >
                              {followingIds.includes(profile.id) ? (
                                <><CheckCircle2 className="w-4 h-4"/> يتابع</>
                              ) : (
                                <><PlusCircle className="w-4 h-4"/> متابعة</>
                              )}
                            </button>
                            <button className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-200 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all">
                              <MessageCircle className="w-4 h-4" /> مراسلة
                            </button>
                          </>
                        ) : isOwnProfile && !isRealUser ? (
                          <button onClick={() => setShowAuthModal(true)} className="bg-blue-600 text-white px-8 py-2.5 rounded-xl text-sm font-bold w-full">
                            تسجيل الدخول
                          </button>
                        ) : isOwnProfile ? (
                          <button className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-200 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all w-full sm:w-auto">
                            <Edit2 className="w-4 h-4" /> تعديل الملف
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {/* FB Style Content Area */}
                    <div className="flex flex-col md:flex-row p-5 gap-5 bg-gray-50/50 dark:bg-gray-950/30 min-h-[400px]">
                      
                      {/* Left Sidebar (Intro/About) */}
                      <div className="w-full md:w-1/3 flex flex-col gap-4">
                        <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
                          <h3 className="font-bold text-gray-900 dark:text-white mb-3 text-lg">حول</h3>
                          {isOwnProfile ? (
                            <textarea
                              value={profile.bio || ""}
                              onChange={(e) => {
                                const newBio = e.target.value;
                                setCurrentUser(prev => ({ ...prev, bio: newBio }));
                                dataService.updateProfile({ bio: newBio });
                              }}
                              className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 focus:ring-2 focus:ring-blue-400 p-3 text-sm text-gray-800 dark:text-gray-200 rounded-xl resize-none text-center"
                              placeholder="اكتب نبذة عنك..."
                              rows={3}
                            />
                          ) : (
                            <p className="text-sm text-gray-600 dark:text-gray-300 text-center leading-relaxed">{profile.bio || "لا يوجد وصف."}</p>
                          )}
                          
                          <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-3 text-sm text-gray-600 dark:text-gray-300">
                            <div className="flex items-center gap-2.5">
                              <Award className="w-5 h-5 text-gray-400" />
                              <span>النقاط: <strong className="text-gray-900 dark:text-white">{profile.total_points} XP</strong></span>
                            </div>
                            <div className="flex items-center gap-2.5">
                              <Clock className="w-5 h-5 text-gray-400" />
                              <span>عضو منذ {new Date(profile.created_at).getFullYear()}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Feed (Posts) */}
                      <div className="w-full md:w-2/3 flex flex-col gap-4">
                        <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between">
                          <h3 className="font-bold text-gray-900 dark:text-white text-lg">المنشورات</h3>
                          <span className="text-sm font-bold text-gray-500 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-lg">{userMemes.length} منشور</span>
                        </div>

                        {userMemes.length === 0 ? (
                          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-10 text-center text-gray-400 font-bold">
                            لا توجد ميمز هنا بعد.
                          </div>
                        ) : (
                          userMemes.map(meme => (
                            <div key={meme.id} className="post-wrapper w-full">
                              <MemeCard
                                meme={meme}
                                currentUser={currentUser}
                                onLikeToggle={handleLikeToggle}
                                onSaveToggle={handleSaveToggle}
                                onFollowToggle={handleFollowToggle}
                                onTagClick={(tag) => setSelectedTag(tag)}
                                onDeleteComment={() => {}}
                                onReportSubmit={handleReportSubmit}
                                onShareCompleted={handleShareCompleted}
                                onDeleteMeme={handleDeleteMeme}
                                onUserProfileClick={(uid) => {
                                  setSelectedProfileId(uid);
                                  setActiveTab("user-profile");
                                }}
                                isFollowingCreator={followingIds.includes(meme.user_id)}
                                onImageClick={(url: string) => setLightboxImage(url)}
                              />
                            </div>
                          ))
                        )}
                      </div>

                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {activeTab === "trending" && (
            <div className="flex flex-col gap-4 animate-fade-in">
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] p-6 mb-2 shadow-sm">
                <span className="text-[11px] bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800/50 font-black px-3 py-1.5 rounded-full w-max flex items-center gap-1">التريند <Flame className="w-3 h-3"/></span>
                <h2 className="font-extrabold text-2xl mt-3">الأعلى تفاعل</h2>
              </div>
              {[...memes].sort((a,b) => (b.likes_count*10 + b.comments_count*15) - (a.likes_count*10 + a.comments_count*15)).map((m) => (
                <div key={m.id} className="post-wrapper w-full mb-2">
                  <MemeCard meme={m} currentUser={currentUser} onLikeToggle={handleLikeToggle} onSaveToggle={handleSaveToggle} onFollowToggle={handleFollowToggle} onTagClick={setSelectedTag} onDeleteComment={() => {}} onReportSubmit={handleReportSubmit} onShareCompleted={handleShareCompleted} onDeleteMeme={handleDeleteMeme} onUserProfileClick={(uid) => { setSelectedProfileId(uid); setActiveTab("user-profile"); }} isFollowingCreator={followingIds.includes(m.user_id)} onImageClick={(url: string) => setLightboxImage(url)} />
                </div>
              ))}
            </div>
          )}

          {activeTab === "leaderboard" && (
            <Leaderboard profiles={profiles} currentUser={currentUser} onNavigate={setActiveTab} onFollowToggle={handleFollowToggle} followingIds={followingIds} />
          )}

          {activeTab === "saves" && (
            <div className="flex flex-col gap-4">
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] p-6 shadow-sm text-right">
                <h2 className="font-extrabold text-2xl mt-1 flex items-center gap-2">المحفوظات <Bookmark className="w-6 h-6 text-blue-500" /></h2>
              </div>
              {memes.filter(m => m.saved_by_me).map((m) => (
                <div key={m.id} className="post-wrapper w-full mb-2">
                  <MemeCard meme={m} currentUser={currentUser} onLikeToggle={handleLikeToggle} onSaveToggle={handleSaveToggle} onFollowToggle={handleFollowToggle} onTagClick={setSelectedTag} onDeleteComment={() => {}} onReportSubmit={handleReportSubmit} onShareCompleted={handleShareCompleted} onDeleteMeme={handleDeleteMeme} onUserProfileClick={(uid) => { setSelectedProfileId(uid); setActiveTab("user-profile"); }} isFollowingCreator={followingIds.includes(m.user_id)} onImageClick={(url: string) => setLightboxImage(url)} />
                </div>
              ))}
            </div>
          )}

          {activeTab === "moderation" && (
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] shadow-sm p-6 text-right flex flex-col gap-5">
              <h2 className="font-black text-xl flex items-center gap-1.5"><AlertTriangle className="w-5 h-5 text-red-500" /> البلاغات</h2>
              {reports.length === 0 ? (
                <div className="py-12 text-center text-gray-400">لا توجد بلاغات 🎉</div>
              ) : (
                reports.map((rep) => {
                  const reportedMeme = memes.find(m => m.id === rep.meme_id);
                  return (
                    <div key={rep.id} className="p-4 bg-gray-50 dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800">
                      <p className="text-xs font-bold mb-3">السبب: <span className="text-red-600">{rep.reason}</span></p>
                      <div className="flex gap-2">
                        <button onClick={() => { if(reportedMeme) setMemes(memes.map(m=>m.id===reportedMeme.id?{...m,status:"deleted"}:m)); const updated=reports.filter(r=>r.id!==rep.id); setReports(updated); localStorage.setItem("memesbook_reports_list", JSON.stringify(updated)); }} className="flex-1 bg-red-600 text-white rounded-xl py-2.5 text-sm font-black hover:bg-red-700 transition-colors">حذف البوست</button>
                        <button onClick={() => { const updated=reports.filter(r=>r.id!==rep.id); setReports(updated); localStorage.setItem("memesbook_reports_list", JSON.stringify(updated)); }} className="flex-1 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-xl py-2.5 text-sm font-black hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors">تجاهل</button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        <Sidebar
          currentUser={currentUser}
          activeTab={activeTab}
          onNavigate={(tab) => { setActiveTab(tab); setSelectedTag(null); }}
          savedCount={savedMemesCount}
        />
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-t border-gray-100 dark:border-gray-800 flex items-center justify-around py-4 md:hidden shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.1)]">
        <button onClick={() => setActiveTab("feed")} className={activeTab === 'feed' ? 'text-blue-600 dark:text-blue-400 scale-110 transition-transform' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}><Home className="w-6 h-6" /></button>
        <button onClick={() => setActiveTab("trending")} className={activeTab === 'trending' ? 'text-blue-600 dark:text-blue-400 scale-110 transition-transform' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}><Flame className="w-6 h-6" /></button>
        <button onClick={() => setActiveTab("saves")} className={activeTab === 'saves' ? 'text-blue-600 dark:text-blue-400 scale-110 transition-transform' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}><Bookmark className="w-6 h-6" /></button>
        <button onClick={() => setActiveTab("profile")} className={activeTab === 'profile' ? 'text-blue-600 dark:text-blue-400 scale-110 transition-transform' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}><User className="w-6 h-6" /></button>
      </nav>

      {/* AUTHENTICATION MODAL */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 shadow-2xl" dir="rtl">
          <div className="bg-white dark:bg-gray-900 rounded-[2rem] max-w-md w-full p-7 text-right border border-gray-100 dark:border-gray-800 shadow-2xl relative animate-fade-in">
            <button 
              onClick={() => setShowAuthModal(false)}
              className="absolute top-5 left-5 text-gray-400 hover:text-gray-900 dark:hover:text-white cursor-pointer p-1.5 bg-gray-50 dark:bg-gray-800 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6 mt-2">
              <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400 mb-3">
                <User className="w-7 h-7" />
              </div>
              <h3 className="font-black text-xl text-gray-900 dark:text-white">
                انضم لعشاق الضحك 🎭
              </h3>
            </div>

            {/* Tabs */}
            <div className="flex bg-gray-50 dark:bg-gray-950 p-1 rounded-2xl mb-5 border border-gray-100 dark:border-gray-800">
              <button
                onClick={() => { setAuthTab("signin"); setAuthError(""); setAuthSuccess(""); }}
                className={`flex-1 text-center py-2.5 text-xs font-black rounded-xl cursor-pointer transition-all ${
                  authTab === "signin" ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm" : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                تسجيل الدخول 👋
              </button>
              <button
                onClick={() => { setAuthTab("signup"); setAuthError(""); setAuthSuccess(""); }}
                className={`flex-1 text-center py-2.5 text-xs font-black rounded-xl cursor-pointer transition-all ${
                  authTab === "signup" ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm" : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                إنشاء حساب 🚀
              </button>
            </div>

            <form onSubmit={authTab === "signin" ? handleSignIn : handleSignUp} className="flex flex-col gap-4">
              <div>
                <label className="block text-[11px] font-extrabold text-gray-500 dark:text-gray-400 mb-1.5 ml-1">البريد الإلكتروني 📧</label>
                <input
                  type="email" required placeholder="name@example.com"
                  value={authEmail} onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-2xl px-4 py-3 text-sm text-gray-900 dark:text-white transition-all"
                />
              </div>

              {authTab === "signup" && (
                <div>
                  <label className="block text-[11px] font-extrabold text-gray-500 dark:text-gray-400 mb-1.5 ml-1">اليوزر نيم 🎭</label>
                  <input
                    type="text" required placeholder="وزير_الميمز"
                    value={authUsername} onChange={(e) => setAuthUsername(e.target.value.replace(/\s+/g, '_'))}
                    className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-2xl px-4 py-3 text-sm font-bold text-gray-900 dark:text-white transition-all"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-extrabold text-gray-500 dark:text-gray-400 mb-1.5 ml-1">الرقم السري 🔒</label>
                <input
                  type="password" required placeholder="••••••"
                  value={authPassword} onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-2xl px-4 py-3 text-sm font-mono text-gray-900 dark:text-white transition-all"
                />
              </div>

              {authError && (
                <div className="text-sm text-red-600 dark:text-red-400 font-extrabold bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 p-3 rounded-2xl flex items-center gap-2 mt-1">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span className="text-xs">{authError}</span>
                </div>
              )}

              {authSuccess && (
                <div className="text-xs text-green-700 dark:text-green-400 font-black bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30 p-3 rounded-2xl flex items-center gap-2 mt-1">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{authSuccess}</span>
                </div>
              )}

              <button
                type="submit" disabled={authLoading}
                className="w-full mt-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 text-white font-black py-3.5 rounded-2xl text-sm cursor-pointer flex justify-center gap-2 transition-all hover:scale-105 active:scale-95"
              >
                {authLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (
                  <span>{authTab === "signin" ? "دخول 👋" : "إنشاء حساب 🚀"}</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  ); 
    }

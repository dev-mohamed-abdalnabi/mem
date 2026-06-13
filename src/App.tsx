import React, { useState, useEffect } from "react"; 
import { Home, Flame, Trophy, Bookmark, Cpu, AlertTriangle, ShieldAlert, Sparkles, X, Clock, PlusCircle, CheckCircle2, Award, HelpCircle, MessageCircle, AlertCircle, Trash2, User, Camera, Edit2, LogIn } from "lucide-react";

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
      <style>{`
        /* تنسيقات حواف الميمز */
        .post-wrapper > div, .post-wrapper > article {
          border-radius: 12px !important;
          overflow: hidden !important;
        }
        .post-wrapper img:not(.rounded-full) {
          cursor: pointer;
          border-radius: 8px !important;
        }
        
        /* حلول عامة لمشكلة خروج نصوص وزر المتابعة في قائمة الأوائل وغيرها */
        .min-w-0 { min-width: 0; }
        .truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .flex-1 { flex: 1 1 0%; }
      `}</style>

      {/* Lightbox */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setLightboxImage(null)}
        >
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
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-2xl text-center flex flex-col items-center max-w-sm w-full relative animate-bounce-short">
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
            <div className="bg-blue-50 dark:bg-blue-900/40 border border-blue-100 dark:border-blue-800 py-3 px-5 rounded-xl inline-block mt-3 text-blue-700 dark:text-blue-300 font-extrabold text-lg">
              {newLevelName}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold leading-relaxed mt-4">
              إمكانيات ميمزبوك بتفتح معاك! استمر بنشر أحلى الإفيهات.
            </p>
            <button
              onClick={() => setShowLevelUpAlert(false)}
              className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-xl text-sm shadow-md cursor-pointer transition-all hover:scale-105 active:scale-95"
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
        onNavigate={(tab) => { setActiveTab(tab); setSelectedTag(null); }}
        onSearch={(query) => setSearchQuery(query)}
        activeTab={activeTab}
        onUserSwitch={handleUserSwitch}
        availableProfiles={profiles}
        onMarkNotificationsRead={handleMarkNotificationsRead}
        onShowAuthModal={() => { setShowAuthModal(true); setAuthTab("signin"); }}
        onSignOutReal={handleSignOutReal}
        isRealUser={isRealUser}
      />

      {/* Main stage layout block */}
      <main className="max-w-7xl mx-auto px-0 md:px-4 py-4 md:py-6 pb-24 md:pb-8 w-full flex-1 flex gap-6" onClick={handleGlobalImageClick}>
        
        {/* Right side helper columns (تصميم نظيف واحترافي) */}
        <div className="w-72 shrink-0 hidden lg:flex flex-col gap-4 order-3">
          
          {!isRealUser && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm text-center flex flex-col items-center">
              <div className="w-12 h-12 bg-blue-50 dark:bg-gray-800 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 mb-3">
                <LogIn className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-gray-900 dark:text-white text-base mb-1">انضم لمجتمع ميمزبوك</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 font-medium">سجل حسابك لتتمكن من الإعجاب والتعليق ورفع الميمز الخاصة بك.</p>
              <button
                onClick={() => { setShowAuthModal(true); setAuthTab("signin"); }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors"
              >
                دخول / إنشاء حساب
              </button>
            </div>
          )}

          {/* ودجت ترتيب الوزراء - تصميم احترافي بدون حواف مبالغة */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
            <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4 border-b border-gray-100 dark:border-gray-800 pb-3">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <span>أعلى المتفاعلين</span>
            </h4>
            
            <div className="flex flex-col gap-4">
              {profiles.slice(0, 4).map((prof, index) => (
                <div key={prof.id} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 p-1.5 -mx-1.5 rounded-lg transition-colors" onClick={() => { setSelectedProfileId(prof.id); setActiveTab("user-profile"); }}>
                  <div className={`w-5 text-center text-sm font-bold ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : index === 2 ? 'text-amber-600' : 'text-gray-300 dark:text-gray-600'}`}>
                    {index + 1}
                  </div>
                  {prof.avatar_url ? (
                    <img src={prof.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover border border-gray-100 dark:border-gray-700" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 font-bold text-sm">{prof.username[0]}</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{prof.username}</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium truncate">{prof.meme_level}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <button
              onClick={() => setActiveTab("leaderboard")}
              className="w-full text-center text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 transition-colors block"
            >
              عرض القائمة الكاملة
            </button>
          </div>

          {/* ودجت القوانين */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
            <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-3 pb-2 border-b border-gray-100 dark:border-gray-800">
              <HelpCircle className="w-4 h-4 text-gray-400" />
              <span>قوانين المجتمع</span>
            </h4>
            <ul className="text-xs text-gray-600 dark:text-gray-400 flex flex-col gap-2.5 font-medium">
              <li className="flex items-start gap-2">
                <span className="text-blue-500 font-bold mt-0.5">•</span>
                <span>الميمز الكرينج والمكررة يتم إزالتها.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 font-bold mt-0.5">•</span>
                <span>احترم الجميع، ممنوع التجاوزات.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 font-bold mt-0.5">•</span>
                <span>استخدم جودة صور مناسبة للبوست.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Central main viewport */}
        <div className="flex-1 max-w-full md:max-w-[600px] lg:max-w-[640px] xl:max-w-2xl mx-auto order-2 w-full">
          
          {selectedTag && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 px-4 py-3 rounded-xl text-sm text-blue-800 dark:text-blue-300 font-bold flex items-center justify-between mb-4 shadow-sm mx-4 md:mx-0">
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-500" />
                <span>نتائج الهاشتاج:</span>
                <strong className="bg-white dark:bg-gray-800 px-2 py-0.5 rounded-md">#{selectedTag}</strong>
              </span>
              <button onClick={() => setSelectedTag(null)} className="hover:bg-blue-100 dark:hover:bg-blue-800 p-1 rounded-md transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {activeTab === "feed" && (
            <div className="flex flex-col gap-4 px-0 md:px-0">
              {!isRealUser && (
                <div className="lg:hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm text-center mx-4 md:mx-0 flex items-center justify-between gap-4">
                  <div className="text-right">
                    <h4 className="font-bold text-sm text-gray-900 dark:text-white">أهلاً بك كزائر 👋</h4>
                    <p className="text-xs text-gray-500">سجل لدعم صناع الميمز.</p>
                  </div>
                  <button
                    onClick={() => { setShowAuthModal(true); setAuthTab("signin"); }}
                    className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg text-xs whitespace-nowrap"
                  >
                    تسجيل الدخول
                  </button>
                </div>
              )}

              {loading ? (
                <div className="text-center py-12 text-gray-400">جاري التحميل...</div>
              ) : filteredMemes.length === 0 ? (
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-12 text-center flex flex-col items-center gap-3 mx-4 md:mx-0">
                  <Clock className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                  <p className="font-bold text-gray-500 dark:text-gray-400">لا توجد منشورات تطابق بحثك</p>
                  <button onClick={() => { setSearchQuery(""); setSelectedTag(null); }} className="mt-2 text-blue-600 dark:text-blue-400 text-sm font-bold hover:underline">
                    مسح البحث
                  </button>
                </div>
              ) : (
                filteredMemes.map((meme) => (
                  <div key={meme.id} className="post-wrapper w-full">
                    <MemeCard
                      meme={meme} currentUser={currentUser} onLikeToggle={handleLikeToggle} onSaveToggle={handleSaveToggle} onFollowToggle={handleFollowToggle} onTagClick={(tag) => setSelectedTag(tag)}
                      onDeleteComment={() => setMemes(prev => prev.map(m => m.id === meme.id ? { ...m, comments_count: Math.max(0, m.comments_count - 1) } : m))}
                      onReportSubmit={handleReportSubmit} onShareCompleted={handleShareCompleted} onDeleteMeme={handleDeleteMeme}
                      onUserProfileClick={(uid) => { setSelectedProfileId(uid); setActiveTab("user-profile"); }}
                      isFollowingCreator={followingIds.includes(meme.user_id)}
                      onImageClick={(url: string) => setLightboxImage(url)} 
                    />
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "create-post" && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm text-right flex flex-col gap-4 animate-fade-in mb-8 mx-4 md:mx-auto max-w-xl">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
                <button onClick={() => setActiveTab("feed")} className="text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors text-sm font-bold">إلغاء</button>
                <h2 className="text-base font-bold text-gray-900 dark:text-white">إنشاء منشور</h2>
                <div className="w-8"></div>
              </div>

              <form onSubmit={handleQuickPostSubmit} className="flex flex-col gap-2 pt-2">
                <div className="flex gap-3">
                  <div className="shrink-0">
                    <img src={currentUser.avatar_url || "https://api.dicebear.com/7.x/bottts/svg?seed=guest"} className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-800" alt="avatar" referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex-1 flex flex-col">
                    <span className="font-bold text-sm text-gray-900 dark:text-white mb-1">{currentUser.username}</span>
                    <textarea
                      placeholder="بماذا تفكر يا غالي؟..."
                      value={newPostCaption} onChange={(e) => setNewPostCaption(e.target.value)}
                      className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm text-gray-800 dark:text-gray-100 resize-none min-h-[80px] placeholder-gray-400"
                      autoFocus
                    />

                    {newPostImage && (
                      <div className="relative mt-2 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 w-max max-w-full">
                        <img src={newPostImage} className="max-h-64 w-auto object-contain" alt="Preview" />
                        <button type="button" onClick={() => setNewPostImage("")} className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/80 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-3 mt-4 text-gray-400 border-t border-gray-50 dark:border-gray-800/50 pt-3">
                      <label className="p-2 -m-2 hover:bg-gray-100 dark:hover:bg-gray-800 text-blue-500 rounded-full cursor-pointer transition-colors" title="إرفاق صورة">
                        <Camera className="w-5 h-5" />
                        <input type="file" accept="image/*" onChange={handleFileChange} className="hidden"/>
                      </label>
                      <input 
                        type="text" placeholder="أضف هاشتاج #ميمز..." value={newPostTags} onChange={(e) => setNewPostTags(e.target.value)} 
                        className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-white" 
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end mt-4">
                  <button type="submit" disabled={(!newPostCaption.trim() && !newPostImage) || loading} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors flex items-center justify-center min-w-[100px]">
                    {loading ? <Clock className="w-4 h-4 animate-spin" /> : "نشر الميم"}
                  </button>
                </div>
              </form>
              {postError && <p className="text-red-500 text-sm mt-2 text-center font-bold bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">{postError}</p>}
            </div>
          )}

          {/* PROFILE - REDESIGNED FACEBOOK STYLE (Full width, No external Card) */}
          {(activeTab === "profile" || (activeTab === "user-profile" && selectedProfileId)) && (
            <div className="flex flex-col w-full animate-fade-in md:pb-10">
              {(() => {
                const isOwnProfile = activeTab === "profile" || selectedProfileId === currentUser.id;
                const profile = isOwnProfile ? currentUser : profiles.find(p => p.id === selectedProfileId);
                
                if (!profile) return <div className="text-center py-10 font-bold text-gray-500">المستخدم غير موجود</div>;
                const userMemes = memes.filter(m => m.user_id === profile.id);

                return (
                  <>
                    {/* Header Area (Cover + Avatar + Info) */}
                    <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm mb-4 pb-6 md:rounded-b-2xl">
                      
                      {/* Cover Banner */}
                      <div 
                        className="w-full h-48 sm:h-72 bg-gray-200 dark:bg-gray-800 relative group bg-cover bg-center md:rounded-t-none"
                        style={(profile as any).cover_url ? { backgroundImage: `url(${(profile as any).cover_url})` } : { backgroundImage: 'linear-gradient(to right, #3b82f6, #8b5cf6)' }}
                      >
                        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-all pointer-events-none"></div>
                        
                        {isOwnProfile && (
                          <label className="absolute bottom-4 right-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer shadow border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors z-10">
                            <Camera className="w-4 h-4" />
                            <span className="hidden sm:inline">تعديل الغلاف</span>
                            <span className="sm:hidden">الغلاف</span>
                            <input 
                              type="file" className="hidden" accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  try {
                                    const url = await dataService.uploadAvatar(file); // assuming same logic applies
                                    const updated = { ...currentUser, cover_url: url } as any;
                                    setCurrentUser(updated);
                                    setProfiles(prev => prev.map(p => p.id === updated.id ? updated : p));
                                    await dataService.updateProfile({ cover_url: url } as any);
                                  } catch (err: any) { alert("فشل رفع الغلاف"); }
                                }
                              }}
                            />
                          </label>
                        )}
                      </div>

                      {/* Avatar and Main Info Container */}
                      <div className="px-4 sm:px-8 max-w-5xl mx-auto flex flex-col sm:flex-row items-center sm:items-end justify-between relative -mt-16 sm:-mt-20 gap-4 sm:gap-0">
                        
                        {/* Avatar & Name */}
                        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-3 sm:gap-5 w-full text-center sm:text-right">
                          <div className="relative group shrink-0">
                            <div 
                              className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-white dark:border-gray-900 bg-gray-100 dark:bg-gray-800 shadow-md overflow-hidden cursor-pointer"
                              onClick={() => setLightboxImage(profile.avatar_url || null)}
                            >
                              {profile.avatar_url ? (
                                <img src={profile.avatar_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-5xl font-bold text-gray-300 dark:text-gray-600">{profile.username[0]}</div>
                              )}
                            </div>
                            
                            {isOwnProfile && (
                              <label className="absolute bottom-2 right-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white p-2 sm:p-2.5 rounded-full cursor-pointer shadow border-2 border-white dark:border-gray-900 transition-colors">
                                <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
                                <input 
                                  type="file" className="hidden" accept="image/*"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      try {
                                        const url = await dataService.uploadAvatar(file);
                                        setCurrentUser(prev => ({ ...prev, avatar_url: url }));
                                        await dataService.updateProfile({ avatar_url: url });
                                      } catch (err: any) { alert("فشل الرفع"); }
                                    }
                                  }}
                                />
                              </label>
                            )}
                          </div>

                          <div className="pb-2 flex-1">
                            {isOwnProfile ? (
                              <input 
                                type="text" value={profile.username} 
                                onChange={(e) => {
                                  const newName = e.target.value;
                                  setCurrentUser(prev => ({ ...prev, username: newName }));
                                  dataService.updateProfile({ username: newName });
                                }}
                                className="bg-transparent border-none focus:ring-2 focus:ring-blue-400 p-0 text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white text-center sm:text-right w-full mb-1"
                              />
                            ) : (
                              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mb-1">{profile.username}</h1>
                            )}
                            <p className="text-sm font-bold text-gray-500 mb-2">{profile.followers_count} متابع • {profile.following_count || 0} يتابع</p>
                            <span className="text-xs text-blue-700 dark:text-blue-300 font-bold bg-blue-50 dark:bg-blue-900/40 px-2.5 py-1 rounded-md border border-blue-100 dark:border-blue-800/50">
                              {profile.meme_level}
                            </span>
                          </div>
                        </div>

                        {/* Actions (Follow/Message) */}
                        <div className="flex gap-2 w-full sm:w-auto justify-center pb-2 shrink-0">
                          {!isOwnProfile && isRealUser ? (
                            <>
                              <button 
                                onClick={() => handleFollowToggle(currentUser.id, profile.id)}
                                className={`px-5 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
                                  followingIds.includes(profile.id) 
                                    ? "bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200" 
                                    : "bg-blue-600 text-white hover:bg-blue-700"
                                }`}
                              >
                                {followingIds.includes(profile.id) ? <><CheckCircle2 className="w-4 h-4"/> يتابع</> : <><PlusCircle className="w-4 h-4"/> متابعة</>}
                              </button>
                              <button className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors">
                                <MessageCircle className="w-4 h-4" /> <span className="hidden sm:inline">مراسلة</span>
                              </button>
                            </>
                          ) : isOwnProfile && !isRealUser ? (
                            <button onClick={() => setShowAuthModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-bold">تسجيل الدخول</button>
                          ) : isOwnProfile ? (
                            <button className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors w-full sm:w-auto">
                              <Edit2 className="w-4 h-4" /> تعديل النبذة
                            </button>
                          ) : null}
                        </div>

                      </div>
                    </div>

                    {/* Profile Content (Two Columns Layout like FB) */}
                    <div className="flex flex-col md:flex-row gap-4 px-4 md:px-0">
                      
                      {/* Left Sidebar (About Card) */}
                      <div className="w-full md:w-[320px] shrink-0 flex flex-col gap-4">
                        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-xl shadow-sm">
                          <h3 className="font-bold text-gray-900 dark:text-white mb-3">نبذة</h3>
                          {isOwnProfile ? (
                            <textarea
                              value={profile.bio || ""}
                              onChange={(e) => {
                                const newBio = e.target.value;
                                setCurrentUser(prev => ({ ...prev, bio: newBio }));
                                dataService.updateProfile({ bio: newBio });
                              }}
                              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-1 focus:ring-blue-400 p-2 text-sm text-gray-800 dark:text-gray-200 rounded-lg resize-none"
                              placeholder="اكتب شيئاً عنك..." rows={3}
                            />
                          ) : (
                            <p className="text-sm text-gray-700 dark:text-gray-300 text-center">{profile.bio || "لا يوجد وصف حالياً."}</p>
                          )}
                          
                          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-3 text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex items-center gap-2">
                              <Award className="w-4 h-4" />
                              <span>إجمالي النقاط: <strong className="text-gray-900 dark:text-white">{profile.total_points} XP</strong></span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              <span>انضم في {new Date(profile.created_at).getFullYear()}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Feed (Posts) */}
                      <div className="flex-1 flex flex-col gap-4">
                        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-xl shadow-sm flex items-center justify-between">
                          <h3 className="font-bold text-gray-900 dark:text-white">المنشورات</h3>
                          <span className="text-xs font-bold text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{userMemes.length} منشور</span>
                        </div>

                        {userMemes.length === 0 ? (
                          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-10 text-center text-gray-500 font-bold shadow-sm">
                            لا توجد ميمز هنا بعد.
                          </div>
                        ) : (
                          userMemes.map(meme => (
                            <div key={meme.id} className="post-wrapper w-full">
                              <MemeCard
                                meme={meme} currentUser={currentUser} onLikeToggle={handleLikeToggle} onSaveToggle={handleSaveToggle} onFollowToggle={handleFollowToggle} onTagClick={(tag) => setSelectedTag(tag)}
                                onDeleteComment={() => {}} onReportSubmit={handleReportSubmit} onShareCompleted={handleShareCompleted} onDeleteMeme={handleDeleteMeme}
                                onUserProfileClick={(uid) => { setSelectedProfileId(uid); setActiveTab("user-profile"); }}
                                isFollowingCreator={followingIds.includes(meme.user_id)}
                                onImageClick={(url: string) => setLightboxImage(url)}
                              />
                            </div>
                          ))
                        )}
                      </div>

                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {activeTab === "trending" && (
            <div className="flex flex-col gap-4 animate-fade-in px-4 md:px-0">
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm text-right">
                <h2 className="font-bold text-xl flex items-center gap-2">الأعلى تفاعلاً <Flame className="w-5 h-5 text-red-500" /></h2>
                <p className="text-sm text-gray-500 mt-1">البوستات المولعة الساحة اليومين دول 🔥</p>
              </div>
              {[...memes].sort((a,b) => (b.likes_count*10 + b.comments_count*15) - (a.likes_count*10 + a.comments_count*15)).map((m) => (
                <div key={m.id} className="post-wrapper w-full">
                  <MemeCard meme={m} currentUser={currentUser} onLikeToggle={handleLikeToggle} onSaveToggle={handleSaveToggle} onFollowToggle={handleFollowToggle} onTagClick={setSelectedTag} onDeleteComment={() => {}} onReportSubmit={handleReportSubmit} onShareCompleted={handleShareCompleted} onDeleteMeme={handleDeleteMeme} onUserProfileClick={(uid) => { setSelectedProfileId(uid); setActiveTab("user-profile"); }} isFollowingCreator={followingIds.includes(m.user_id)} onImageClick={(url: string) => setLightboxImage(url)} />
                </div>
              ))}
            </div>
          )}

          {activeTab === "leaderboard" && (
            <div className="px-4 md:px-0">
              <Leaderboard profiles={profiles} currentUser={currentUser} onNavigate={setActiveTab} onFollowToggle={handleFollowToggle} followingIds={followingIds} />
            </div>
          )}

          {activeTab === "saves" && (
            <div className="flex flex-col gap-4 px-4 md:px-0">
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm text-right">
                <h2 className="font-bold text-xl flex items-center gap-2">المحفوظات <Bookmark className="w-5 h-5 text-blue-500" /></h2>
              </div>
              {memes.filter(m => m.saved_by_me).length === 0 && (
                <div className="text-center py-10 text-gray-500 font-bold bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">لم تقم بحفظ أي منشورات بعد.</div>
              )}
              {memes.filter(m => m.saved_by_me).map((m) => (
                <div key={m.id} className="post-wrapper w-full">
                  <MemeCard meme={m} currentUser={currentUser} onLikeToggle={handleLikeToggle} onSaveToggle={handleSaveToggle} onFollowToggle={handleFollowToggle} onTagClick={setSelectedTag} onDeleteComment={() => {}} onReportSubmit={handleReportSubmit} onShareCompleted={handleShareCompleted} onDeleteMeme={handleDeleteMeme} onUserProfileClick={(uid) => { setSelectedProfileId(uid); setActiveTab("user-profile"); }} isFollowingCreator={followingIds.includes(m.user_id)} onImageClick={(url: string) => setLightboxImage(url)} />
                </div>
              ))}
            </div>
          )}
        </div>

        <Sidebar currentUser={currentUser} activeTab={activeTab} onNavigate={(tab) => { setActiveTab(tab); setSelectedTag(null); }} savedCount={savedMemesCount} />
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex items-center justify-around py-3 md:hidden shadow-[0_-5px_10px_rgba(0,0,0,0.05)]">
        <button onClick={() => setActiveTab("feed")} className={`flex flex-col items-center gap-1 ${activeTab === 'feed' ? 'text-blue-600' : 'text-gray-500'}`}><Home className="w-5 h-5" /><span className="text-[10px] font-bold">الرئيسية</span></button>
        <button onClick={() => setActiveTab("trending")} className={`flex flex-col items-center gap-1 ${activeTab === 'trending' ? 'text-blue-600' : 'text-gray-500'}`}><Flame className="w-5 h-5" /><span className="text-[10px] font-bold">تريند</span></button>
        <button onClick={() => setActiveTab("saves")} className={`flex flex-col items-center gap-1 ${activeTab === 'saves' ? 'text-blue-600' : 'text-gray-500'}`}><Bookmark className="w-5 h-5" /><span className="text-[10px] font-bold">محفوظات</span></button>
        <button onClick={() => setActiveTab("profile")} className={`flex flex-col items-center gap-1 ${activeTab === 'profile' || activeTab === 'user-profile' ? 'text-blue-600' : 'text-gray-500'}`}><User className="w-5 h-5" /><span className="text-[10px] font-bold">حسابي</span></button>
      </nav>

      {/* MODAL الدخول */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 shadow-2xl" dir="rtl">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-sm w-full p-6 text-right border border-gray-200 dark:border-gray-800 shadow-xl relative animate-fade-in">
            <button onClick={() => setShowAuthModal(false)} className="absolute top-4 left-4 text-gray-400 hover:text-gray-900 dark:hover:text-white p-1 bg-gray-100 dark:bg-gray-800 rounded-md transition-colors"><X className="w-5 h-5" /></button>
            <div className="text-center mb-5 mt-2">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto text-blue-600 mb-2"><User className="w-6 h-6" /></div>
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">أهلاً بك في ميمزبوك</h3>
            </div>
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg mb-4">
              <button onClick={() => { setAuthTab("signin"); setAuthError(""); setAuthSuccess(""); }} className={`flex-1 text-center py-2 text-sm font-bold rounded-md transition-all ${authTab === "signin" ? "bg-white dark:bg-gray-900 text-blue-600 shadow-sm" : "text-gray-500"}`}>تسجيل الدخول</button>
              <button onClick={() => { setAuthTab("signup"); setAuthError(""); setAuthSuccess(""); }} className={`flex-1 text-center py-2 text-sm font-bold rounded-md transition-all ${authTab === "signup" ? "bg-white dark:bg-gray-900 text-blue-600 shadow-sm" : "text-gray-500"}`}>حساب جديد</button>
            </div>
            <form onSubmit={authTab === "signin" ? handleSignIn : handleSignUp} className="flex flex-col gap-3">
              <div>
                <input type="email" required placeholder="البريد الإلكتروني" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
              </div>
              {authTab === "signup" && (
                <div>
                  <input type="text" required placeholder="اسم المستخدم (بدون مسافات)" value={authUsername} onChange={(e) => setAuthUsername(e.target.value.replace(/\s+/g, '_'))} className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
                </div>
              )}
              <div>
                <input type="password" required placeholder="الرقم السري" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
              </div>
              {authError && <div className="text-xs text-red-600 bg-red-50 p-2 rounded-lg flex items-center gap-1.5"><ShieldAlert className="w-4 h-4" /> <span>{authError}</span></div>}
              {authSuccess && <div className="text-xs text-green-700 bg-green-50 p-2 rounded-lg flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> <span>{authSuccess}</span></div>}
              <button type="submit" disabled={authLoading} className="w-full mt-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-2.5 rounded-lg text-sm transition-colors flex justify-center">
                {authLoading ? <Clock className="w-4 h-4 animate-spin" /> : (<span>{authTab === "signin" ? "دخول" : "إنشاء الحساب"}</span>)}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  ); 
          }

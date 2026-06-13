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
      
      setTimeout(() => setPostSuccess(false), 4400);
    } catch (err: any) {
      setPostError(err.message || "حدث خطأ أثناء النشر.");
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans" dir="rtl">
      {/* Lightbox for Images */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setLightboxImage(null)}
        >
          <button 
            className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/50 p-2 rounded-full transition-colors z-50"
            onClick={() => setLightboxImage(null)}
          >
            <X className="w-8 h-8" />
          </button>
          <img 
            src={lightboxImage} 
            alt="Full size" 
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
            referrerPolicy="no-referrer"
          />
        </div>
      )}

      {/* Level Up Notification Banners */}
      {showLevelUpAlert && (   
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-8 shadow-2xl text-center flex flex-col items-center max-w-sm w-full relative animate-bounce-short">
            <button
              onClick={() => setShowLevelUpAlert(false)} 
              className="absolute top-4 left-4 text-gray-400 hover:text-gray-900 cursor-pointer" 
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto text-yellow-500 shadow">
              <Award className="w-10 h-10" />
            </div>

            <h3 className="font-extrabold text-xl text-gray-900 mt-4 leading-tight">
              ألف مبروك يا الغالي! ترقيت 🚀🔥
            </h3>
            
            <p className="text-xs text-blue-600 font-extrabold mt-1.5 uppercase tracking-wide">
              المستوى الجديد المحقق
            </p>

            <div className="bg-blue-50 border border-blue-100 py-3 px-5 rounded-2xl inline-block mt-3 text-blue-700 font-extrabold text-lg">
              {newLevelName}
            </div>

            <p className="text-xs text-gray-500 font-semibold leading-relaxed mt-4">
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
      <main className="max-w-7xl mx-auto px-4 py-6 w-full flex-1 flex gap-6">
        
        {/* Right side helper columns */}
        <div className="w-64 shrink-0 hidden lg:flex flex-col gap-6 order-3">
          
          {/* Guest User CTA Banner */}
          {!isRealUser && (
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-4 shadow-md border-2 border-blue-400 text-center text-white">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto text-white mb-3 backdrop-blur-sm">
                <User className="w-6 h-6" />
              </div>
              <h4 className="font-extrabold text-sm mb-1.5">
                مش مسجل دخول؟ 👀
              </h4>
              <p className="text-[11px] text-blue-100 mb-4 font-medium">
                سجل دلوقتي عشان تنافس على الصدارة!
              </p>
              <button
                onClick={() => { setShowAuthModal(true); setAuthTab("signin"); }}
                className="w-full bg-white text-blue-600 hover:bg-gray-50 font-black py-2.5 rounded-xl text-xs shadow-md cursor-pointer"
              >
                دخول / إنشاء حساب
              </button>
            </div>
          )}

          {/* Top Active Widget - Redesigned for better light mode visibility */}
          <div className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl p-4 shadow-md text-right">
            <h4 className="font-extrabold text-xs text-gray-900 dark:text-gray-100 flex items-center justify-end gap-1.5 mb-3">
              <span>وزراء الكوميديا 👑</span>
              <Trophy className="w-4 h-4 text-yellow-500" />
            </h4>
            
            <div className="flex flex-col gap-2.5">
              {profiles.slice(0, 3).map((prof, index) => (
                <div key={prof.id} className="flex items-center gap-2.5 border-b border-gray-100 dark:border-gray-700 pb-2 last:border-0 last:pb-0">
                  <div className="text-xs font-black text-gray-400 font-mono">#{index + 1}</div>
                  {prof.avatar_url ? (
                    <img
                      src={prof.avatar_url}
                      alt=""
                      className="w-8 h-8 rounded-lg object-cover cursor-pointer"
                      onClick={() => setLightboxImage(prof.avatar_url)}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">{prof.username}</p>
                    <p className="text-[9px] text-orange-500 font-bold mt-0.5">{prof.total_points} XP</p>
                  </div>
                </div>
              ))}
            </div>
            
            <button
              onClick={() => setActiveTab("leaderboard")}
              className="w-full text-center text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline mt-4 cursor-pointer block"
            >
              الترتيب الكامل
            </button>
          </div>

          {/* Golden Rules - Redesigned */}
          <div className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl p-4 shadow-md text-right flex flex-col gap-3">
            <h4 className="font-extrabold text-xs text-gray-900 dark:text-gray-100 flex items-center justify-end gap-1.5 border-b border-gray-100 dark:border-gray-700 pb-2">
              <span>تعليمات الوزير 📜</span>
              <HelpCircle className="w-4 h-4 text-blue-500" />
            </h4>
            <ul className="text-[11px] text-gray-600 dark:text-gray-400 flex flex-col gap-2 font-bold leading-relaxed pr-2 list-disc list-inside">
              <li>الميمز الكرينج بتدخل الإشراف في غيبوبة!</li>
              <li>التحفيل مسموح في نطاق الضحك.</li>
              <li>ممنوع السبام ورفع الكوميكس المكرر.</li>
            </ul>
          </div>
        </div>

        {/* Central main viewport */}
        <div className="flex-1 max-w-full md:max-w-2xl order-2">
          
          {selectedTag && (
            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 px-4 py-3 rounded-2xl text-xs sm:text-sm text-blue-800 dark:text-blue-200 font-extrabold flex items-center justify-between mb-4 shadow-sm">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-500" />
                <span>الميمز بالهاشتاج:</span>
                <strong className="bg-white dark:bg-gray-800 px-2 py-0.5 rounded-lg">#{selectedTag}</strong>
              </span>
              <button onClick={() => setSelectedTag(null)} className="hover:scale-110">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {activeTab === "feed" && (
            <div className="flex flex-col gap-4">
              {!isRealUser && (
                <div className="lg:hidden bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-4 shadow-md text-center text-white mb-1">
                  <h4 className="font-extrabold text-sm mb-1.5">مش مسجل دخول؟ 👀</h4>
                  <button
                    onClick={() => { setShowAuthModal(true); setAuthTab("signin"); }}
                    className="bg-white text-blue-600 hover:bg-gray-50 font-black py-2.5 px-4 rounded-xl text-xs w-full shadow-md"
                  >
                    دخول / إنشاء حساب
                  </button>
                </div>
              )}

              {loading ? (
                <div className="text-center py-12 text-gray-400">جاري التحميل...</div>
              ) : filteredMemes.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-12 text-center flex flex-col items-center gap-3">
                  <Clock className="w-10 h-10 text-gray-300 animate-spin" />
                  <p className="font-extrabold text-sm">مفيش ميمز تطابق استعلامك!</p>
                  <button onClick={() => { setSearchQuery(""); setSelectedTag(null); }} className="mt-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-xs font-bold">
                    إعادة تعيين
                  </button>
                </div>
              ) : (
                filteredMemes.map((meme) => (
                  <MemeCard
                    key={meme.id}
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
                    // Pass image click to open lightbox if MemeCard supports it
                    onImageClick={(url: string) => setLightboxImage(url)} 
                  />
                ))
              )}
            </div>
          )}

          {/* PROFILE - REDESIGNED FB STYLE */}
          {(activeTab === "profile" || (activeTab === "user-profile" && selectedProfileId)) && (
            <div className="flex flex-col gap-4 animate-fade-in">
              {(() => {
                const isOwnProfile = activeTab === "profile" || selectedProfileId === currentUser.id;
                const profile = isOwnProfile ? currentUser : profiles.find(p => p.id === selectedProfileId);
                
                if (!profile) return <div className="text-center py-10">المستخدم غير موجود</div>;
                const userMemes = memes.filter(m => m.user_id === profile.id);

                return (
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl overflow-hidden shadow-sm">
                    {/* FB Style Cover Photo */}
                    <div className="h-40 sm:h-56 bg-gradient-to-r from-blue-600 to-indigo-700 relative group w-full">
                      {isOwnProfile && (
                        <button className="absolute bottom-3 right-3 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white p-2 rounded-lg text-xs font-bold flex items-center gap-1 transition-all">
                          <Camera className="w-4 h-4" />
                          <span className="hidden sm:inline">تعديل الغلاف</span>
                        </button>
                      )}
                    </div>

                    {/* FB Style Avatar & Info Row */}
                    <div className="px-6 relative flex flex-col sm:flex-row items-center sm:items-end justify-between -mt-16 sm:-mt-12 pb-4 border-b border-gray-100 dark:border-gray-700 gap-4">
                      
                      <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6 w-full">
                        {/* Avatar */}
                        <div className="relative group shrink-0">
                          <div 
                            className="w-32 h-32 sm:w-36 sm:h-36 rounded-full border-4 border-white dark:border-gray-800 bg-gray-200 shadow-lg overflow-hidden cursor-pointer"
                            onClick={() => setLightboxImage(profile.avatar_url || null)}
                          >
                            {profile.avatar_url ? (
                              <img src={profile.avatar_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-gray-400">{profile.username[0]}</div>
                            )}
                          </div>
                          
                          {isOwnProfile && (
                            <label className="absolute bottom-1 right-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 p-2.5 rounded-full cursor-pointer shadow-md transition-all border-2 border-white dark:border-gray-800">
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
                        <div className="flex-1 text-center sm:text-right mt-2 sm:mb-2 w-full">
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
                          <p className="text-xs text-blue-600 dark:text-blue-400 font-bold mt-1 bg-blue-50 dark:bg-blue-900/30 inline-block px-2 py-0.5 rounded-md">{profile.meme_level}</p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 sm:mb-2 w-full sm:w-auto justify-center">
                        {!isOwnProfile && isRealUser ? (
                          <>
                            <button 
                              onClick={() => handleFollowToggle(currentUser.id, profile.id)}
                              className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-black transition-all flex items-center justify-center gap-1.5 ${
                                followingIds.includes(profile.id) 
                                  ? "bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200" 
                                  : "bg-blue-600 text-white hover:bg-blue-700"
                              }`}
                            >
                              {followingIds.includes(profile.id) ? (
                                <><CheckCircle2 className="w-4 h-4"/> يتابع</>
                              ) : (
                                <><PlusCircle className="w-4 h-4"/> متابعة</>
                              )}
                            </button>
                            <button className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all">
                              <MessageCircle className="w-4 h-4" /> مراسلة
                            </button>
                          </>
                        ) : isOwnProfile && !isRealUser ? (
                          <button onClick={() => setShowAuthModal(true)} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-bold w-full">
                            تسجيل الدخول
                          </button>
                        ) : isOwnProfile ? (
                          <button className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all w-full sm:w-auto justify-center">
                            <Edit2 className="w-4 h-4" /> تعديل الملف
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {/* FB Style Content Area */}
                    <div className="flex flex-col md:flex-row p-4 gap-4 bg-gray-50 dark:bg-gray-900 min-h-[400px]">
                      
                      {/* Left Sidebar (Intro/About) */}
                      <div className="w-full md:w-1/3 flex flex-col gap-4">
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                          <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3 text-lg">حول</h3>
                          {isOwnProfile ? (
                            <textarea
                              value={profile.bio || ""}
                              onChange={(e) => {
                                const newBio = e.target.value;
                                setCurrentUser(prev => ({ ...prev, bio: newBio }));
                                dataService.updateProfile({ bio: newBio });
                              }}
                              className="w-full bg-gray-100 dark:bg-gray-700 border-none focus:ring-2 focus:ring-blue-400 p-3 text-sm text-gray-800 dark:text-gray-200 rounded-lg resize-none text-center"
                              placeholder="اكتب نبذة عنك..."
                              rows={3}
                            />
                          ) : (
                            <p className="text-sm text-gray-600 dark:text-gray-300 text-center">{profile.bio || "لا يوجد وصف."}</p>
                          )}
                          
                          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-2 text-sm text-gray-600 dark:text-gray-300">
                            <div className="flex items-center gap-2">
                              <Award className="w-5 h-5 text-gray-400" />
                              <span>النقاط: <strong className="text-gray-900 dark:text-white">{profile.total_points} XP</strong></span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-5 h-5 text-gray-400" />
                              <span>عضو منذ {new Date(profile.created_at).getFullYear()}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Feed (Posts) */}
                      <div className="w-full md:w-2/3 flex flex-col gap-4">
                        <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center justify-between">
                          <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">المنشورات</h3>
                          <span className="text-sm text-gray-500">{userMemes.length} منشور</span>
                        </div>

                        {userMemes.length === 0 ? (
                          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-10 text-center text-gray-400 font-bold">
                            لا توجد ميمز هنا بعد.
                          </div>
                        ) : (
                          userMemes.map(meme => (
                            <MemeCard
                              key={meme.id}
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
                          ))
                        )}
                      </div>

                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {activeTab === "create-post" && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl p-6 shadow-sm text-right flex flex-col gap-6 animate-fade-in">
              {/* ... (Create Post contents remain same, just add dark mode classes if needed) */}
              <div className="flex items-center justify-between border-b border-gray-50 dark:border-gray-700 pb-4">
                <h2 className="text-xl font-black">إنشاء منشور</h2>
                <button onClick={() => setActiveTab("feed")} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleQuickPostSubmit} className="flex flex-col gap-4">
                <textarea
                  placeholder="اكتب تعليقاً مضحكاً..."
                  value={newPostCaption}
                  onChange={(e) => setNewPostCaption(e.target.value)}
                  className="bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-2xl px-4 py-4 text-sm font-extrabold min-h-[150px] resize-none"
                />
                {!newPostImage ? (
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <label className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 px-6 py-3 rounded-2xl cursor-pointer border border-blue-100 dark:border-blue-800 text-sm font-black">
                      <PlusCircle className="w-5 h-5" /><span>صورة</span>
                      <input type="file" accept="image/*" onChange={handleFileChange} className="hidden"/>
                    </label>
                    <input type="text" placeholder="#هاشتاج..." value={newPostTags} onChange={(e) => setNewPostTags(e.target.value)} className="w-full flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-2xl px-4 py-3 text-sm" />
                  </div>
                ) : (
                  <div className="relative rounded-3xl overflow-hidden border-4 border-gray-50 dark:border-gray-800 bg-gray-900 flex justify-center p-2">
                    <img src={newPostImage} className="max-h-80 object-contain rounded-xl" />
                    <button type="button" onClick={() => setNewPostImage("")} className="absolute top-4 left-4 bg-red-600 text-white rounded-full px-4 py-2 text-xs font-black flex items-center gap-2">
                      <X className="w-4 h-4" /> إزالة
                    </button>
                  </div>
                )}
                <button type="submit" disabled={!newPostCaption.trim() && !newPostImage} className="w-full bg-blue-600 text-white rounded-2xl py-4 text-base font-black disabled:bg-gray-400">
                  نشر
                </button>
              </form>
              {postError && <p className="text-red-600">{postError}</p>}
            </div>
          )}

          {activeTab === "trending" && (
            <div className="flex flex-col gap-4 animate-fade-in">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl p-5 mb-2 shadow-sm">
                <span className="text-[10px] bg-red-100 text-red-600 font-black px-2.5 py-1 rounded-full w-max">التريند 🔥</span>
                <h2 className="font-extrabold text-xl mt-1">الأعلى تفاعل</h2>
              </div>
              {[...memes].sort((a,b) => (b.likes_count*10 + b.comments_count*15) - (a.likes_count*10 + a.comments_count*15)).map((m) => (
                <MemeCard key={m.id} meme={m} currentUser={currentUser} onLikeToggle={handleLikeToggle} onSaveToggle={handleSaveToggle} onFollowToggle={handleFollowToggle} onTagClick={setSelectedTag} onDeleteComment={() => {}} onReportSubmit={handleReportSubmit} onShareCompleted={handleShareCompleted} onDeleteMeme={handleDeleteMeme} onUserProfileClick={(uid) => { setSelectedProfileId(uid); setActiveTab("user-profile"); }} isFollowingCreator={followingIds.includes(m.user_id)} onImageClick={(url: string) => setLightboxImage(url)} />
              ))}
            </div>
          )}

          {activeTab === "leaderboard" && (
            <Leaderboard profiles={profiles} currentUser={currentUser} onNavigate={setActiveTab} onFollowToggle={handleFollowToggle} followingIds={followingIds} />
          )}

          {activeTab === "saves" && (
            <div className="flex flex-col gap-4">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl p-5 shadow-sm text-right">
                <h2 className="font-extrabold text-xl mt-1">المحفوظات 💾</h2>
              </div>
              {memes.filter(m => m.saved_by_me).map((m) => (
                <MemeCard key={m.id} meme={m} currentUser={currentUser} onLikeToggle={handleLikeToggle} onSaveToggle={handleSaveToggle} onFollowToggle={handleFollowToggle} onTagClick={setSelectedTag} onDeleteComment={() => {}} onReportSubmit={handleReportSubmit} onShareCompleted={handleShareCompleted} onDeleteMeme={handleDeleteMeme} onUserProfileClick={(uid) => { setSelectedProfileId(uid); setActiveTab("user-profile"); }} isFollowingCreator={followingIds.includes(m.user_id)} onImageClick={(url: string) => setLightboxImage(url)} />
              ))}
            </div>
          )}

          {activeTab === "moderation" && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl shadow-sm p-6 text-right flex flex-col gap-5">
              <h2 className="font-black text-xl flex items-center gap-1.5"><AlertTriangle className="w-5 h-5 text-red-500" /> البلاغات</h2>
              {reports.length === 0 ? (
                <div className="py-12 text-center text-gray-400">لا توجد بلاغات 🎉</div>
              ) : (
                reports.map((rep) => {
                  const reportedMeme = memes.find(m => m.id === rep.meme_id);
                  return (
                    <div key={rep.id} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700">
                      <p className="text-xs font-bold mb-3">السبب: <span className="text-red-600">{rep.reason}</span></p>
                      <div className="flex gap-2">
                        <button onClick={() => { if(reportedMeme) setMemes(memes.map(m=>m.id===reportedMeme.id?{...m,status:"deleted"}:m)); const updated=reports.filter(r=>r.id!==rep.id); setReports(updated); localStorage.setItem("memesbook_reports_list", JSON.stringify(updated)); }} className="flex-1 bg-red-600 text-white rounded-xl py-2 text-xs font-black">حذف</button>
                        <button onClick={() => { const updated=reports.filter(r=>r.id!==rep.id); setReports(updated); localStorage.setItem("memesbook_reports_list", JSON.stringify(updated)); }} className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl py-2 text-xs font-black">تجاهل</button>
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
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800 flex items-center justify-around py-4 md:hidden">
        <button onClick={() => setActiveTab("feed")} className={activeTab === 'feed' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}><Home className="w-6 h-6" /></button>
        <button onClick={() => setActiveTab("trending")} className={activeTab === 'trending' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}><Flame className="w-6 h-6" /></button>
        <button onClick={() => setActiveTab("saves")} className={activeTab === 'saves' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}><Bookmark className="w-6 h-6" /></button>
        <button onClick={() => setActiveTab("profile")} className={activeTab === 'profile' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}><User className="w-6 h-6" /></button>
      </nav>

      {/* AUTHENTICATION MODAL - REDESIGNED FOR DARK/LIGHT MODE */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 shadow-2xl" dir="rtl">
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-md w-full p-6 text-right border border-gray-200 dark:border-gray-700 shadow-2xl relative animate-fade-in">
            <button 
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 left-4 text-gray-400 hover:text-gray-900 dark:hover:text-white cursor-pointer p-1.5"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400 mb-2">
                <User className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-lg text-gray-900 dark:text-white">
                انضم لعشاق الضحك 🎭
              </h3>
            </div>

            {/* Tabs */}
            <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-2xl mb-4">
              <button
                onClick={() => { setAuthTab("signin"); setAuthError(""); setAuthSuccess(""); }}
                className={`flex-1 text-center py-2 text-[11px] font-black rounded-xl cursor-pointer transition-all ${
                  authTab === "signin" ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm" : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                تسجيل الدخول 👋
              </button>
              <button
                onClick={() => { setAuthTab("signup"); setAuthError(""); setAuthSuccess(""); }}
                className={`flex-1 text-center py-2 text-[11px] font-black rounded-xl cursor-pointer transition-all ${
                  authTab === "signup" ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm" : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                إنشاء حساب 🚀
              </button>
            </div>

            <form onSubmit={authTab === "signin" ? handleSignIn : handleSignUp} className="flex flex-col gap-3">
              <div>
                <label className="block text-[11px] font-extrabold text-gray-500 dark:text-gray-400 mb-1">البريد الإلكتروني 📧</label>
                <input
                  type="email" required placeholder="name@example.com"
                  value={authEmail} onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-xl px-3 py-2.5 text-xs text-gray-900 dark:text-white"
                />
              </div>

              {authTab === "signup" && (
                <div>
                  <label className="block text-[11px] font-extrabold text-gray-500 dark:text-gray-400 mb-1">اليوزر نيم 🎭</label>
                  <input
                    type="text" required placeholder="وزير_الميمز"
                    value={authUsername} onChange={(e) => setAuthUsername(e.target.value.replace(/\s+/g, '_'))}
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-900 dark:text-white"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-extrabold text-gray-500 dark:text-gray-400 mb-1">الرقم السري 🔒</label>
                <input
                  type="password" required placeholder="••••••"
                  value={authPassword} onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-xl px-3 py-2.5 text-xs font-mono text-gray-900 dark:text-white"
                />
              </div>

              {authError && (
                <div className="text-sm text-red-600 dark:text-red-400 font-extrabold bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 p-3 rounded-xl flex items-center gap-1.5 mt-1">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span className="text-xs">{authError}</span>
                </div>
              )}

              {authSuccess && (
                <div className="text-xs text-green-700 dark:text-green-400 font-black bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30 p-2.5 rounded-xl flex items-center gap-1.5 mt-1">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{authSuccess}</span>
                </div>
              )}

              <button
                type="submit" disabled={authLoading}
                className="w-full mt-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 text-white font-black py-3 rounded-2xl text-xs cursor-pointer flex justify-center gap-2"
              >
                {authLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (
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

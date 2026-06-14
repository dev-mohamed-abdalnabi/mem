import React, { useState, useEffect } from "react";
import { Camera, CheckCircle2, PlusCircle, MessageCircle, Edit2, Award, Clock, Users, Flame, Check, X } from "lucide-react";
import { Profile, Meme } from "../types";
import MemeCard from "../components/MemeCard";
import { dataService } from "../services/dataService";
import { socialService } from "../services/socialService";

interface ProfilePageProps {
  profile: Profile;
  currentUser: Profile;
  isOwnProfile: boolean;
  isRealUser: boolean;
  userMemes: Meme[];
  followingIds: string[];
  setCurrentUser: React.Dispatch<React.SetStateAction<Profile>>;
  setProfiles: React.Dispatch<React.SetStateAction<Profile[]>>;
  setShowAuthModal: (show: boolean) => void;
  handleFollowToggle: (followerId: string, followingId: string) => Promise<void>;
  handleLikeToggle: (id: string) => Promise<void>;
  handleSaveToggle: (id: string) => Promise<void>;
  setSelectedTag: (tag: string | null) => void;
  handleReportSubmit: (id: string, reason: string) => void;
  handleShareCompleted: (id: string) => Promise<void>;
  handleDeleteMeme: (id: string) => Promise<void>;
  setSelectedProfileId: (id: string | null) => void;
  setActiveTab: (tab: string) => void;
  setLightboxImage: (url: string | null) => void;
}

export default function ProfilePage({
  profile,
  currentUser,
  isOwnProfile,
  isRealUser,
  userMemes,
  followingIds,
  setCurrentUser,
  setProfiles,
  setShowAuthModal,
  handleFollowToggle,
  handleLikeToggle,
  handleSaveToggle,
  setSelectedTag,
  handleReportSubmit,
  handleShareCompleted,
  handleDeleteMeme,
  setSelectedProfileId,
  setActiveTab,
  setLightboxImage,
}: ProfilePageProps) {
  
  // الـ States الخاصة بالتعديل والتبويبات
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempBio, setTempBio] = useState(profile.bio || "");
  const [tempName, setTempName] = useState(profile.username);
  
  // تبويب محلي آمن عشان نمنع الكراش الأسود نهائياً
  const [currentTab, setCurrentTab] = useState<"posts" | "about">("posts");
  const [localUserMemes, setLocalUserMemes] = useState<Meme[]>(userMemes);
  const [isLoadingMemes, setIsLoadingMemes] = useState(false);

  useEffect(() => {
    const fetchUserMemes = async () => {
      if (profile.id) {
        setIsLoadingMemes(true);
        try {
          const memes = await dataService.getMemes("approved", profile.id, currentUser.id);
          setLocalUserMemes(memes);
        } catch (err) {
          console.error("Error fetching user memes:", err);
        } finally {
          setIsLoadingMemes(false);
        }
      }
    };
    fetchUserMemes();
  }, [profile.id, currentUser.id]);

  const onFollowClick = async () => {
    if (!isRealUser) {
      setShowAuthModal(true);
      return;
    }
    await handleFollowToggle(currentUser.id, profile.id);
  };

  // حفظ الاسم
  const handleSaveName = async () => {
    if (!tempName.trim()) return;
    try {
      setCurrentUser(prev => ({ ...prev, username: tempName }));
      setProfiles(prev => prev.map(p => p.id === currentUser.id ? { ...p, username: tempName } : p));
      await dataService.updateProfile({ username: tempName });
      setIsEditingName(false);
    } catch (err) {
      alert("فشل حفظ الاسم");
    }
  };

  // حفظ النبذة
  const handleSaveBio = async () => {
    try {
      setCurrentUser(prev => ({ ...prev, bio: tempBio }));
      setProfiles(prev => prev.map(p => p.id === currentUser.id ? { ...p, bio: tempBio } : p));
      await dataService.updateProfile({ bio: tempBio });
      setIsEditingBio(false);
    } catch (err) {
      alert("فشل حفظ النبذة");
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#F0F2F5] dark:bg-[#0B0F19] text-gray-950 dark:text-gray-100 font-sans pb-12">
      
      {/* هيدر البروفايل */}
      <div className="w-full bg-white dark:bg-[#111827] shadow-md border-b border-gray-200 dark:border-gray-800/60">
        <div className="max-w-5xl mx-auto relative">
          
          {/* صورة الغلاف - محسّنة وزي الفيسبوك */}
          <div
            className="w-full h-48 sm:h-72 md:h-80 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-700 relative bg-cover bg-center overflow-hidden cursor-pointer group"
            style={profile.cover_url ? { backgroundImage: `url(${profile.cover_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
            onClick={() => profile.cover_url && setLightboxImage(profile.cover_url)}
          >
            {/* Overlay - Professional */}
            <div className={`absolute inset-0 ${profile.cover_url ? 'bg-black/20 group-hover:bg-black/30' : 'bg-gradient-to-b from-transparent to-black/20'} transition-all duration-300`} />
            
            {/* Edit Button for Own Profile - Facebook Style */}
            {isOwnProfile && (
              <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-20">
                <label 
                  className="bg-white hover:bg-gray-100 text-gray-900 backdrop-blur-md px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer transition-all shadow-lg hover:shadow-xl active:scale-95 border border-gray-200" 
                  onClick={(e) => e.stopPropagation()}
                >
                  <Camera className="w-4 h-4" />
                  <span className="hidden sm:inline">تحديث الغلاف</span>
                  <span className="sm:hidden">تعديل</span>
                  <input
                    type="file" 
                    className="hidden" 
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const url = await socialService.uploadCover(currentUser.id, file);
                          const updated = { ...currentUser, cover_url: url };
                          setCurrentUser(updated);
                          setProfiles(prev => prev.map(p => p.id === updated.id ? updated : p));
                          alert("تم تحديث الغلاف بنجاح! 🎉");
                        } catch (err) { 
                          console.error("Cover upload error:", err);
                          alert("فشل رفع الغلاف: " + (err instanceof Error ? err.message : 'خطأ غير معروف')); 
                        }
                      }
                    }}
                  />
                </label>
              </div>
            )}
            
            {/* Hint for Own Profile */}
            {isOwnProfile && !profile.cover_url && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/20 transition-all">
                <div className="text-center">
                  <Camera className="w-10 sm:w-12 h-10 sm:h-12 text-white/70 mx-auto mb-2" />
                  <p className="text-white font-bold text-xs sm:text-sm">اضغط لإضافة صورة غلاف</p>
                </div>
              </div>
            )}
          </div>

          {/* تفاصيل الهيدر السفلي الأنيق - Facebook Style */}
          <div className="px-4 sm:px-8 pb-4 flex flex-col md:flex-row items-center md:items-end justify-between relative -mt-16 sm:-mt-20 gap-6 bg-gradient-to-b from-transparent to-white dark:to-[#111827] pt-4">
            
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 text-center sm:text-right w-full min-w-0">
              
              {/* صورة الأفاتار - Facebook Style */}
              <div className="relative shrink-0 group">
                <div
                  className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-white dark:border-[#111827] bg-gray-100 dark:bg-gray-800 shadow-2xl overflow-hidden cursor-pointer relative hover:shadow-3xl transition-shadow"
                  onClick={() => setLightboxImage(profile.avatar_url || null)}
                >
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" referrerPolicy="no-referrer" alt="" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl sm:text-6xl font-black bg-gradient-to-br from-blue-200 to-indigo-300 dark:from-blue-700 dark:to-indigo-800 text-white">{profile.username[0]}</div>
                  )}
                </div>
                
                {isOwnProfile && (
                  <label className="absolute bottom-0 right-0 bg-[#1877F2] hover:bg-[#166FE5] text-white p-2.5 sm:p-3 rounded-full cursor-pointer shadow-lg border-4 border-white dark:border-[#111827] transition-all active:scale-90 hover:shadow-xl" onClick={(e) => e.stopPropagation()}>
                    <Camera className="w-4 h-4" />
                    <input
                      type="file" className="hidden" accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const url = await dataService.uploadAvatar(file);
                            setCurrentUser(prev => ({ ...prev, avatar_url: url }));
                            await dataService.updateProfile({ avatar_url: url });
                            alert("تم تحديث الصورة الشخصية! 🎉");
                          } catch (err) { alert("فشل الرفع: " + (err instanceof Error ? err.message : 'خطأ غير معروف')); }
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              {/* نصوص الحساب والاسم - Facebook Style */}
              <div className="pb-2 min-w-0 flex-1">
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-2 min-h-[44px]">
                  {isEditingName ? (
                    <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 p-1 rounded-lg border border-gray-300 dark:border-gray-700 w-full max-w-sm">
                      <input
                        type="text" value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        className="bg-transparent border-none focus:ring-0 font-bold text-lg text-gray-900 dark:text-white px-2 py-1 w-full"
                      />
                      <button onClick={handleSaveName} className="p-1.5 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"><Check className="w-4 h-4" /></button>
                      <button onClick={() => { setTempName(profile.username); setIsEditingName(false); }} className="p-1.5 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 dark:bg-gray-700 dark:text-gray-300 transition-colors"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <>
                      <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white truncate">{profile.username}</h1>
                      {isOwnProfile && (
                        <button onClick={() => setIsEditingName(true)} className="p-1 text-gray-400 hover:text-blue-500 transition-colors" title="تعديل الاسم"><Edit2 className="w-4 h-4" /></button>
                      )}
                      <Flame className="w-5 h-5 text-orange-500 shrink-0 animate-pulse" />
                    </>
                  )}
                </div>

                <p className="text-sm font-bold text-gray-600 dark:text-gray-400 mb-3">
                  <span className="text-gray-900 dark:text-white font-black">{profile.followers_count}</span> متابع • <span className="text-gray-900 dark:text-white font-black">{profile.following_count || 0}</span> يتابع
                </p>
                
                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-3 py-1.5 rounded-full border border-blue-100 dark:border-blue-900/50 shadow-sm hover:shadow-md transition-shadow">
                  <Award className="w-3.5 h-3.5" />
                  {profile.meme_level}
                </span>
              </div>
            </div>

            {/* أزرار التحكم الرئيسية - Facebook Style */}
            <div className="flex gap-2 w-full md:w-auto justify-center shrink-0 mb-2 flex-wrap">
              {!isOwnProfile && isRealUser ? (
                <>
                  <button
                    onClick={onFollowClick}
                    className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-black flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 ${
                      followingIds.includes(profile.id)
                        ? "bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-200"
                        : "bg-[#1877F2] text-white hover:bg-[#166FE5]"
                    }`}
                  >
                    {followingIds.includes(profile.id) ? <><CheckCircle2 className="w-4 h-4" /> يتابع</> : <><PlusCircle className="w-4 h-4" /> متابعة</>}
                  </button>
                  <button className="flex-1 sm:flex-none bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 px-5 py-2.5 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all active:scale-95">
                    <MessageCircle className="w-4 h-4" /> <span>مراسلة</span>
                  </button>
                </>
              ) : isOwnProfile && !isRealUser ? (
                <button onClick={() => setShowAuthModal(true)} className="w-full sm:w-auto bg-[#1877F2] hover:bg-[#166FE5] text-white px-8 py-2.5 rounded-xl text-sm font-black transition-all active:scale-95 shadow-md">
                  تسجيل الدخول للمجرة
                </button>
              ) : isOwnProfile ? (
                /* زرار التعديل الكبير شغال ويقوم بفتح تعديل النبذة تلقائياً */
                <button 
                  onClick={() => {
                    setIsEditingBio(true);
                    // لو النبذة تحت في الصفحة مش باينة، هنعمل Scroll خفيف ليها
                    document.getElementById("bio-section")?.scrollIntoView({ behavior: "smooth" });
                  }} 
                  className="w-full sm:w-auto bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 px-5 py-2.5 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all active:scale-95 border border-gray-200 dark:border-gray-700 shadow-sm"
                >
                  <Edit2 className="w-4 h-4 text-blue-500" /> <span>تعديل السيرة والنبذة</span>
                </button>
              ) : null}
            </div>

          </div>

          {/* شريط التبويبات - Facebook Style */}
          <div className="flex items-center px-4 sm:px-8 border-t border-gray-200 dark:border-gray-800/60 overflow-x-auto no-scrollbar bg-white dark:bg-[#111827]">
            <button
              onClick={() => setCurrentTab("posts")}
              className={`px-4 py-3 font-black text-sm whitespace-nowrap transition-all border-b-[3px] ${
                currentTab === "posts" ? "text-[#1877F2] border-[#1877F2]" : "text-gray-600 dark:text-gray-400 border-transparent hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              المنشورات
            </button>
            <button
              onClick={() => setCurrentTab("about")}
              className={`px-4 py-3 font-black text-sm whitespace-nowrap transition-all border-b-[3px] ${
                currentTab === "about" ? "text-[#1877F2] border-[#1877F2]" : "text-gray-600 dark:text-gray-400 border-transparent hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              عن الملف الشخصي
            </button>
          </div>
        </div>
      </div>

      {/* محتوى الصفحة */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {currentTab === "posts" ? (
          <div className="space-y-4">
            {isLoadingMemes ? (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 text-gray-300 mx-auto animate-spin" />
              </div>
            ) : localUserMemes.length > 0 ? (
              localUserMemes.map(meme => (
                <MemeCard
                  key={meme.id}
                  meme={meme}
                  currentUser={currentUser}
                  onLikeToggle={handleLikeToggle}
                  onSaveToggle={handleSaveToggle}
                  onFollowToggle={handleFollowToggle}
                  onTagClick={setSelectedTag}
                  onDeleteComment={() => {}}
                  onReportSubmit={handleReportSubmit}
                  onShareCompleted={handleShareCompleted}
                  onDeleteMeme={handleDeleteMeme}
                  onUserProfileClick={setSelectedProfileId}
                  isFollowingCreator={followingIds.includes(meme.user_id)}
                  onImageClick={setLightboxImage}
                />
              ))
            ) : (
              <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                <p className="text-gray-500 dark:text-gray-400 font-bold">لا توجد منشورات حتى الآن</p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="text-lg font-black text-gray-900 dark:text-white mb-4">النبذة الشخصية</h3>
            
            {isEditingBio ? (
              <div className="space-y-3">
                <textarea
                  value={tempBio}
                  onChange={(e) => setTempBio(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 text-gray-900 dark:text-white resize-none min-h-[120px]"
                  placeholder="اكتب نبذة عن نفسك..."
                />
                <div className="flex gap-2">
                  <button onClick={handleSaveBio} className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-bold transition-colors flex items-center justify-center gap-2">
                    <Check className="w-4 h-4" /> حفظ
                  </button>
                  <button onClick={() => { setTempBio(profile.bio || ""); setIsEditingBio(false); }} className="flex-1 bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white px-4 py-2 rounded-lg font-bold transition-colors flex items-center justify-center gap-2">
                    <X className="w-4 h-4" /> إلغاء
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                  {profile.bio || "لا توجد نبذة شخصية بعد"}
                </p>
                {isOwnProfile && (
                  <button onClick={() => setIsEditingBio(true)} className="text-blue-600 dark:text-blue-400 hover:underline font-bold flex items-center gap-2">
                    <Edit2 className="w-4 h-4" /> تعديل النبذة
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

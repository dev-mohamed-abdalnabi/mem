import React, { useState, useEffect } from "react";
import { Camera, MessageCircle, Award, Clock } from "lucide-react";
import { Profile, Meme } from "../types";
import MemeCard from "../components/MemeCard";
import { dataService } from "../services/dataService";

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
  setLightboxImage,
}: ProfilePageProps) {
  
  const [isEditing, setIsEditing] = useState(false);
  const [tempBio, setTempBio] = useState(profile.bio || "");
  const [tempName, setTempName] = useState(profile.username);
  
  // تبويبات الصفحة (المنشورات / معلومات)
  const [activeProfileTab, setActiveProfileTab] = useState<"posts" | "info">("posts");
  
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
          console.error(err);
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

  const handleSaveProfile = async () => {
    if (!tempName.trim()) return;
    try {
      setCurrentUser(prev => ({ ...prev, username: tempName, bio: tempBio }));
      setProfiles(prev => prev.map(p => p.id === currentUser.id ? { ...p, username: tempName, bio: tempBio } : p));
      await dataService.updateProfile({ username: tempName, bio: tempBio });
      setIsEditing(false);
    } catch (err) {
      alert("فشل حفظ التعديلات");
    }
  };

  const startEditing = () => {
    setIsEditing(true);
    setActiveProfileTab("info"); // يفتح تاب المعلومات تلقائياً عند التعديل
  };

  return (
    <div className="w-full pb-20 text-gray-900 dark:text-gray-100 font-sans">
      
      {/* الهيدر العلوي (الصورة، الاسم، الأزرار) */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex justify-between items-start mb-3">
          
          {/* الصورة الشخصية */}
          <div className="relative">
            <div
              className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden cursor-pointer"
              onClick={() => setLightboxImage(profile.avatar_url || null)}
            >
              {profile.avatar_url ? (
                <img src={profile.avatar_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-gray-400">{profile.username[0]}</div>
              )}
            </div>
            
            {isOwnProfile && (
              <label className="absolute bottom-0 right-0 bg-[#1d9bf0] hover:bg-[#1a8cd8] p-1.5 rounded-full cursor-pointer transition-colors shadow-md">
                <Camera className="w-3.5 h-3.5 text-white" />
                <input
                  type="file" className="hidden" accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      try {
                        const url = await dataService.uploadAvatar(file);
                        setCurrentUser(prev => ({ ...prev, avatar_url: url }));
                        await dataService.updateProfile({ avatar_url: url });
                      } catch (err) {
                        alert("فشل الرفع");
                      }
                    }
                  }}
                />
              </label>
            )}
          </div>

          {/* أزرار الإجراءات - تم إصلاح الألوان للدارك مود */}
          <div className="pt-2">
            {!isOwnProfile && isRealUser ? (
              <div className="flex gap-2">
                <button className="p-1.5 border border-gray-400 dark:border-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                  <MessageCircle className="w-5 h-5 text-gray-900 dark:text-white" />
                </button>
                <button
                  onClick={onFollowClick}
                  className={`px-5 py-1.5 rounded-full font-bold text-[14px] transition-colors border ${
                    followingIds.includes(profile.id)
                      ? "border-gray-400 dark:border-gray-600 text-gray-900 dark:text-white hover:text-red-500 hover:border-red-500 hover:bg-red-500/10"
                      : "bg-black dark:bg-white text-white dark:text-black border-black dark:border-white"
                  }`}
                >
                  {followingIds.includes(profile.id) ? "يتابع" : "متابعة"}
                </button>
              </div>
            ) : isOwnProfile && !isRealUser ? (
              <button onClick={() => setShowAuthModal(true)} className="bg-[#1d9bf0] text-white px-5 py-1.5 rounded-full font-bold text-[14px]">
                تسجيل الدخول
              </button>
            ) : isOwnProfile ? (
              <button 
                onClick={startEditing}
                className="px-4 py-1.5 border border-gray-400 dark:border-gray-600 text-gray-900 dark:text-white rounded-full font-bold text-[14px] hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              >
                تعديل الملف الشخصي
              </button>
            ) : null}
          </div>
        </div>

        {/* الاسم واليوزر */}
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-5">
            {profile.username}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[14px] text-gray-500" dir="ltr">@{profile.username.replace(/\s+/g, '_').toLowerCase()}</span>
          </div>
        </div>
      </div>

      {/* شريط التبويبات (Tabs) - مقسوم نصين بشكل احترافي */}
      <div className="flex w-full border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() => setActiveProfileTab("posts")}
          className={`flex-1 text-center py-3 text-[15px] font-bold transition-colors relative hover:bg-gray-100 dark:hover:bg-white/5 ${
            activeProfileTab === "posts" ? "text-gray-900 dark:text-white" : "text-gray-500"
          }`}
        >
          المنشورات
          {activeProfileTab === "posts" && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 bg-[#1d9bf0] rounded-t-full"></div>
          )}
        </button>
        <button
          onClick={() => setActiveProfileTab("info")}
          className={`flex-1 text-center py-3 text-[15px] font-bold transition-colors relative hover:bg-gray-100 dark:hover:bg-white/5 ${
            activeProfileTab === "info" ? "text-gray-900 dark:text-white" : "text-gray-500"
          }`}
        >
          معلومات
          {activeProfileTab === "info" && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 bg-[#1d9bf0] rounded-t-full"></div>
          )}
        </button>
      </div>

      {/* محتوى التبويبات */}
      <div className="pb-10">
        
        {/* تاب المنشورات */}
        {activeProfileTab === "posts" && (
          <div>
            {isLoadingMemes ? (
              <div className="text-center py-10">
                <Clock className="w-6 h-6 text-gray-400 mx-auto animate-spin" />
              </div>
            ) : localUserMemes.length > 0 ? (
              localUserMemes.map(meme => (
                <div key={meme.id} className="border-b border-gray-200 dark:border-gray-800/60">
                  <MemeCard
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
                </div>
              ))
            ) : (
              <div className="text-center py-16">
                <p className="text-gray-500 text-[15px]">لا توجد منشورات.</p>
              </div>
            )}
          </div>
        )}

        {/* تاب المعلومات */}
        {activeProfileTab === "info" && (
          <div className="p-4">
            {isEditing ? (
              // وضع تعديل المعلومات
              <div className="space-y-4">
                <div>
                  <label className="block text-[13px] text-gray-500 mb-1 px-1">الاسم</label>
                  <input
                    type="text" value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    className="w-full bg-transparent border border-gray-300 dark:border-gray-700 rounded-md py-2 px-3 focus:border-[#1d9bf0] focus:ring-1 focus:ring-[#1d9bf0] outline-none text-[15px] text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[13px] text-gray-500 mb-1 px-1">النبذة الشخصية</label>
                  <textarea
                    value={tempBio}
                    onChange={(e) => setTempBio(e.target.value)}
                    className="w-full bg-transparent border border-gray-300 dark:border-gray-700 rounded-md py-2 px-3 focus:border-[#1d9bf0] focus:ring-1 focus:ring-[#1d9bf0] outline-none resize-none h-20 text-[15px] text-gray-900 dark:text-white"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setIsEditing(false)} className="px-5 py-2 rounded-full text-[14px] font-bold border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10">إلغاء</button>
                  <button onClick={handleSaveProfile} className="px-5 py-2 bg-black dark:bg-white text-white dark:text-black rounded-full text-[14px] font-bold">حفظ التعديلات</button>
                </div>
              </div>
            ) : (
              // عرض المعلومات
              <div className="space-y-6">
                
                {/* النبذة */}
                <div>
                  <h3 className="text-[16px] font-bold text-gray-900 dark:text-white mb-2">النبذة الشخصية</h3>
                  <p className="text-[15px] text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {profile.bio || "لا توجد نبذة شخصية حتى الآن."}
                  </p>
                </div>

                {/* الإحصائيات (المتابعين، يتابع، المستوى) */}
                <div>
                  <h3 className="text-[16px] font-bold text-gray-900 dark:text-white mb-3">الإحصائيات</h3>
                  <div className="flex flex-wrap gap-6 border border-gray-200 dark:border-gray-800 rounded-xl p-4 bg-gray-50 dark:bg-gray-900/30">
                    <div className="flex flex-col">
                      <span className="text-2xl font-bold text-gray-900 dark:text-white">{profile.followers_count}</span>
                      <span className="text-[13px] text-gray-500">متابع</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-2xl font-bold text-gray-900 dark:text-white">{profile.following_count || 0}</span>
                      <span className="text-[13px] text-gray-500">يتابع</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-2xl font-bold flex items-center gap-1 text-[#1d9bf0]">
                        <Award className="w-5 h-5" />
                        {profile.meme_level}
                      </span>
                      <span className="text-[13px] text-gray-500">المستوى الحالي</span>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
          }

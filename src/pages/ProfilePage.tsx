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

  return (
    // شلنا الألوان والحدود عشان الصفحة تندمج مع الموقع بدون ما تبان إنها صندوق معزول
    <div className="w-full pb-20 text-gray-900 dark:text-gray-100 font-sans">
      
      {/* الهيدر الشخصي - تصميم متناسق وملموم */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex justify-between items-start">
          
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

          {/* أزرار الإجراءات */}
          <div className="pt-2">
            {!isOwnProfile && isRealUser ? (
              <div className="flex gap-2">
                <button className="p-1.5 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                  <MessageCircle className="w-5 h-5 text-gray-900 dark:text-gray-100" />
                </button>
                <button
                  onClick={onFollowClick}
                  className={`px-4 py-1.5 rounded-full font-bold text-[14px] transition-colors ${
                    followingIds.includes(profile.id)
                      ? "border border-gray-300 dark:border-gray-600 hover:text-red-500 hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 text-gray-900 dark:text-gray-100"
                      : "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900"
                  }`}
                >
                  {followingIds.includes(profile.id) ? "يتابع" : "متابعة"}
                </button>
              </div>
            ) : isOwnProfile && !isRealUser ? (
              <button onClick={() => setShowAuthModal(true)} className="bg-[#1d9bf0] text-white px-4 py-1.5 rounded-full font-bold text-[14px]">
                تسجيل الدخول
              </button>
            ) : isOwnProfile ? (
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className="px-4 py-1.5 border border-gray-300 dark:border-gray-600 rounded-full font-bold text-[14px] hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              >
                تعديل الملف الشخصي
              </button>
            ) : null}
          </div>
        </div>

        {/* وضع التعديل */}
        {isEditing ? (
          <div className="mt-4 space-y-3">
            <input
              type="text" value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              placeholder="الاسم"
              className="w-full bg-transparent border-b border-gray-300 dark:border-gray-700 py-2 focus:border-[#1d9bf0] focus:ring-0 outline-none text-[15px] text-gray-900 dark:text-white"
            />
            <textarea
              value={tempBio}
              onChange={(e) => setTempBio(e.target.value)}
              placeholder="النبذة الشخصية"
              className="w-full bg-transparent border-b border-gray-300 dark:border-gray-700 py-2 focus:border-[#1d9bf0] focus:ring-0 outline-none resize-none h-16 text-[15px] text-gray-900 dark:text-white"
            />
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setIsEditing(false)} className="px-4 py-1.5 rounded-full text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10">إلغاء</button>
              <button onClick={handleSaveProfile} className="px-4 py-1.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-full text-sm font-bold">حفظ</button>
            </div>
          </div>
        ) : (
          /* معلومات الحساب */
          <div className="mt-3">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-5">
              {profile.username}
            </h1>
            
            <div className="flex items-center gap-2 mt-1 mb-3">
              <span className="text-[14px] text-gray-500" dir="ltr">@{profile.username.replace(/\s+/g, '_').toLowerCase()}</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1d9bf0] bg-[#1d9bf0]/10 px-1.5 py-0.5 rounded border border-[#1d9bf0]/20">
                <Award className="w-3 h-3" />
                {profile.meme_level}
              </span>
            </div>

            {profile.bio && (
              <p className="text-[14px] text-gray-900 dark:text-gray-100 leading-relaxed mb-3 whitespace-pre-wrap">
                {profile.bio}
              </p>
            )}

            <div className="flex gap-4 text-[14px] text-gray-500 mb-2">
              <span className="flex gap-1">
                <strong className="text-gray-900 dark:text-white">{profile.following_count || 0}</strong> يتابع
              </span>
              <span className="flex gap-1">
                <strong className="text-gray-900 dark:text-white">{profile.followers_count}</strong> متابع
              </span>
            </div>
          </div>
        )}
      </div>

      {/* تبويب المنشورات */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        <div className="w-1/2 text-center">
          <div className="inline-block py-3 px-2 font-bold text-[15px] border-b-4 border-[#1d9bf0] text-gray-900 dark:text-white">
            المنشورات
          </div>
        </div>
      </div>

      {/* المنشورات */}
      <div className="pb-10">
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
            <p className="text-gray-500 text-[15px]">لا توجد منشورات.<

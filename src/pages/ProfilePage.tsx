import React, { useState, useEffect } from "react";
import { Camera, MessageCircle, Award, Clock, ArrowRight } from "lucide-react";
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
    <div className="w-full min-h-screen text-gray-900 dark:text-gray-100 font-sans pb-20">
      <div className="max-w-[600px] mx-auto sm:border-x border-gray-200 dark:border-gray-800/60 min-h-screen">
        
        <div 
          className="sticky top-0 z-50 bg-white/80 dark:bg-[#16181c]/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800/60 px-4 py-2 flex items-center gap-6 cursor-pointer" 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <button onClick={() => setSelectedProfileId(null)} className="p-2 -mx-2 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
            <ArrowRight className="w-5 h-5" />
          </button>
          <div className="flex flex-col">
            <h2 className="text-xl font-extrabold leading-tight">{profile.username}</h2>
            <span className="text-[13px] text-gray-500 dark:text-gray-400">{localUserMemes.length} منشور</span>
          </div>
        </div>

        <div className="px-4 py-3">
          <div className="flex justify-between items-start mb-3">
            <div className="relative group">
              <div
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gray-100 dark:bg-[#16181c] border-4 border-white dark:border-[#16181c] overflow-hidden cursor-pointer shrink-0"
                onClick={() => setLightboxImage(profile.avatar_url || null)}
              >
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-gray-400">{profile.username[0]}</div>
                )}
              </div>
              
              {isOwnProfile && (
                <label className="absolute bottom-1 right-1 bg-gray-900/60 hover:bg-gray-900/80 p-1.5 sm:p-2 rounded-full cursor-pointer transition-colors backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
                  <Camera className="w-4 h-4 text-white" />
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

            <div className="pt-2 flex gap-2">
              {!isOwnProfile && isRealUser ? (
                <>
                  <button className="p-2 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                    <MessageCircle className="w-5 h-5 text-black dark:text-white" />
                  </button>
                  <button
                    onClick={onFollowClick}
                    className={`px-4 py-1.5 rounded-full font-bold text-[15px] transition-colors ${
                      followingIds.includes(profile.id)
                        ? "border border-gray-300 dark:border-gray-600 hover:text-red-500 hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 text-black dark:text-white"
                        : "bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200"
                    }`}
                  >
                    {followingIds.includes(profile.id) ? "يتابع" : "متابعة"}
                  </button>
                </>
              ) : isOwnProfile && !isRealUser ? (
                <button onClick={() => setShowAuthModal(true)} className="bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white px-4 py-1.5 rounded-full font-bold text-[15px] transition-colors">
                  تسجيل الدخول
                </button>
              ) : isOwnProfile ? (
                <button 
                  onClick={() => setIsEditing(!isEditing)}
                  className="px-4 py-1.5 border border-gray-300 dark:border-gray-600 text-black dark:text-white rounded-full font-bold text-[15px] hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                >
                  تعديل الملف الشخصي
                </button>
              ) : null}
            </div>
          </div>

          {isEditing ? (
            <div className="space-y-4 mb-4 mt-3">
              <div className="bg-gray-50 dark:bg-[#16181c] rounded-md px-3 pt-2 pb-1 border border-gray-200 dark:border-gray-700 focus-within:border-[#1d9bf0] focus-within:ring-1 focus-within:ring-[#1d9bf0] transition-shadow">
                <label className="block text-xs text-gray-500 mb-0.5">الاسم</label>
                <input
                  type="text" value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="w-full bg-transparent border-none p-0 focus:ring-0 outline-none text-black dark:text-white text-[15px]"
                />
              </div>
              <div className="bg-gray-50 dark:bg-[#16181c] rounded-md px-3 pt-2 pb-1 border border-gray-200 dark:border-gray-700 focus-within:border-[#1d9bf0] focus-within:ring-1 focus-within:ring-[#1d9bf0] transition-shadow">
                <label className="block text-xs text-gray-500 mb-0.5">النبذة</label>
                <textarea
                  value={tempBio}
                  onChange={(e) => setTempBio(e.target.value)}
                  className="w-full bg-transparent border-none p-0 focus:ring-0 outline-none resize-none h-24 text-black dark:text-white text-[15px]"
                />
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button onClick={() => setIsEditing(false)} className="px-5 py-2 border border-gray-300 dark:border-gray-600 rounded-full text-sm font-bold hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">إلغاء</button>
                <button onClick={handleSaveProfile} className="px-5 py-2 bg-black dark:bg-white text-white dark:text-black rounded-full text-sm font-bold hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors">حفظ</button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-3">
                <h1 className="text-[20px] font-extrabold leading-tight text-black dark:text-white">
                  {profile.username}
                </h1>
                <div className="flex items-center gap-2 mt-0.5 text-[15px] text-gray-500 dark:text-gray-400">
                  <span dir="ltr">@{profile.username.replace(/\s+/g, '_').toLowerCase()}</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1d9bf0] bg-[#1d9bf0]/10 px-1.5 py-0.5 rounded border border-[#1d9bf0]/20">
                    <Award className="w-3 h-3" />
                    {profile.meme_level}
                  </span>
                </div>
              </div>

              <div className="mb-3 text-[15px] leading-normal whitespace-pre-wrap text-black dark:text-white">
                {profile.bio || "لا توجد نبذة شخصية"}
              </div>

              <div className="flex gap-5 text-[15px] text-gray-500 dark:text-gray-400 mb-2">
                <button className="hover:underline flex gap-1">
                  <span className="font-bold text-black dark:text-white">{profile.following_count || 0}</span> يتابع
                </button>
                <button className="hover:underline flex gap-1">
                  <span className="font-bold text-black dark:text-white">{profile.followers_count}</span> متابع
                </button>
              </div>
            </>
          )}
        </div>

        <div className="flex border-b border-gray-200 dark:border-gray-800/60 mt-1">
          <div className="flex-1 text-center hover:bg-gray-200 dark:hover:bg-white/5 transition-colors cursor-pointer flex justify-center">
            <div className="py-3.5 font-bold text-black dark:text-white border-b-4 border-[#1d9bf0] rounded-sm text-[15px]">
              المنشورات
            </div>
          </div>
        </div>

        <div className="pb-20">
          {isLoadingMemes ? (
            <div className="text-center py-12">
              <Clock className="w-8 h-8 text-gray-400 mx-auto animate-spin" />
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
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400 font-bold text-[15px]">لا توجد منشورات</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

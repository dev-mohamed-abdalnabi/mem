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
    <div className="w-full min-h-screen text-gray-900 dark:text-gray-100 font-sans pb-24">
      <div className="max-w-[600px] mx-auto sm:border-x border-gray-100 dark:border-gray-800/50 min-h-screen">
        
        {/* معلومات الحساب الأساسية */}
        <div className="px-4 pt-6 pb-3">
          <div className="flex justify-between items-start mb-4">
            
            {/* الصورة الشخصية */}
            <div className="relative">
              <div
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden cursor-pointer shrink-0 ring-4 ring-transparent hover:ring-gray-100 dark:hover:ring-gray-800 transition-all"
                onClick={() => setLightboxImage(profile.avatar_url || null)}
              >
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-gray-400">{profile.username[0]}</div>
                )}
              </div>
              
              {/* زر تغيير الصورة (يظهر لصاحب الحساب فقط) */}
              {isOwnProfile && (
                <label className="absolute bottom-0 right-0 bg-black/60 hover:bg-black/80 p-2 rounded-full cursor-pointer transition-colors backdrop-blur-md">
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

            {/* الأزرار (تعديل - متابعة - مراسلة) */}
            <div className="flex gap-2 pt-2">
              {!isOwnProfile && isRealUser ? (
                <>
                  <button className="p-2 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <MessageCircle className="w-5 h-5 text-gray-900 dark:text-gray-100" />
                  </button>
                  <button
                    onClick={onFollowClick}
                    className={`px-5 py-1.5 rounded-full font-bold text-[15px] transition-colors ${
                      followingIds.includes(profile.id)
                        ? "border border-gray-300 dark:border-gray-600 hover:text-red-500 hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 text-gray-900 dark:text-gray-100"
                        : "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-white"
                    }`}
                  >
                    {followingIds.includes(profile.id) ? "يتابع" : "متابعة"}
                  </button>
                </>
              ) : isOwnProfile && !isRealUser ? (
                <button onClick={() => setShowAuthModal(true)} className="bg-blue-500 hover:bg-blue-600 text-white px-5 py-1.5 rounded-full font-bold text-[15px] transition-colors">
                  تسجيل الدخول
                </button>
              ) : isOwnProfile ? (
                <button 
                  onClick={() => setIsEditing(!isEditing)}
                  className="px-5 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-full font-bold text-[15px] hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  تعديل
                </button>
              ) : null}
            </div>
          </div>

          {/* وضع التعديل */}
          {isEditing ? (
            <div className="space-y-4 mb-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm text-gray-500 font-medium px-1">الاسم</label>
                <input
                  type="text" value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-[15px]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm text-gray-500 font-medium px-1">النبذة</label>
                <textarea
                  value={tempBio}
                  onChange={(e) => setTempBio(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none resize-none h-24 text-[15px]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setIsEditing(false)} className="px-5 py-2 border border-gray-300 dark:border-gray-600 rounded-full text-sm font-bold hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">إلغاء</button>
                <button onClick={handleSaveProfile} className="px-5 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-full text-sm font-bold hover:bg-gray-800 dark:hover:bg-white transition-colors">حفظ</button>
              </div>
            </div>
          ) : (
            /* عرض البيانات العادية */
            <>
              <div className="mb-3">
                <h1 className="text-[22px] font-extrabold leading-tight">
                  {profile.username}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[15px] text-gray-500" dir="ltr">@{profile.username.replace(/\s+/g, '_').toLowerCase()}</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-100 dark:border-blue-500/20">
                    <Award className="w-3 h-3" />
                    {profile.meme_level}
                  </span>
                </div>
              </div>

              <div className="mb-4 text-[15px] leading-relaxed whitespace-pre-wrap">
                {profile.bio || "لا توجد نبذة شخصية."}
              </div>

              <div className="flex gap-5 text-[15px] text-gray-500 mb-2">
                <button className="hover:underline flex gap-1.5">
                  <span className="font-bold text-gray-900 dark:text-gray-100">{profile.following_count || 0}</span> يتابع
                </button>
                <button className="hover:underline flex gap-1.5">
                  <span className="font-bold text-gray-900 dark:text-gray-100">{profile.followers_count}</span> متابع
                </button>
              </div>
            </>
          )}
        </div>

        {/* شريط التبويبات (المنشورات) */}
        <div className="border-b border-gray-200 dark:border-gray-800/60 flex">
          <div className="flex-1 flex justify-center hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors cursor-pointer">
            <div className="py-3.5 font-bold border-b-4 border-blue-500 rounded-sm text-[15px]">
              المنشورات
            </div>
          </div>
        </div>

        {/* قائمة المنشورات */}
        <div className="pb-10">
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
            <div className="text-center py-16">
              <p className="text-gray-500 text-[15px]">ليس لديه أي منشورات حتى الآن.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
                                         }

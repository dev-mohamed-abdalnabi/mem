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
    <div className="w-full min-h-screen bg-white dark:bg-black text-gray-900 dark:text-gray-100 font-sans pb-12">
      <div className="max-w-2xl mx-auto border-x border-gray-200 dark:border-gray-800 min-h-screen">
        
        <div 
          className="sticky top-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-4 py-2 flex items-center gap-6 cursor-pointer" 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <button onClick={() => setSelectedProfileId(null)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-900 transition-colors">
            <ArrowRight className="w-5 h-5" />
          </button>
          <div className="flex flex-col">
            <h2 className="text-xl font-bold">{profile.username}</h2>
            <span className="text-xs text-gray-500 dark:text-gray-400">{localUserMemes.length} منشور</span>
          </div>
        </div>

        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <div className="flex justify-between items-start mb-4">
            <div className="relative group">
              <div
                className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white dark:border-black bg-gray-100 dark:bg-gray-800 overflow-hidden cursor-pointer"
                onClick={() => setLightboxImage(profile.avatar_url || null)}
              >
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-gray-400">{profile.username[0]}</div>
                )}
              </div>
              
              {isOwnProfile && (
                <label className="absolute bottom-0 right-0 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full cursor-pointer shadow-md border-2 border-white dark:border-black transition-colors" onClick={(e) => e.stopPropagation()}>
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
                  <button className="p-2 border border-gray-300 dark:border-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-900 transition-colors">
                    <MessageCircle className="w-5 h-5" />
                  </button>
                  <button
                    onClick={onFollowClick}
                    className={`px-4 py-1.5 rounded-full font-bold text-sm transition-colors ${
                      followingIds.includes(profile.id)
                        ? "border border-gray-300 dark:border-gray-700 hover:text-red-500 hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                        : "bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200"
                    }`}
                  >
                    {followingIds.includes(profile.id) ? "يتابع" : "متابعة"}
                  </button>
                </>
              ) : isOwnProfile && !isRealUser ? (
                <button onClick={() => setShowAuthModal(true)} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-1.5 rounded-full font-bold text-sm transition-colors">
                  تسجيل الدخول
                </button>
              ) : isOwnProfile ? (
                <button 
                  onClick={() => setIsEditing(!isEditing)}
                  className="px-4 py-1.5 border border-gray-300 dark:border-gray-700 rounded-full font-bold text-sm hover:bg-gray-200 dark:hover:bg-gray-900 transition-colors"
                >
                  تعديل الملف الشخصي
                </button>
              ) : null}
            </div>
          </div>

          {isEditing ? (
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">الاسم</label>
                <input
                  type="text" value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="w-full bg-transparent border border-gray-300 dark:border-gray-700 rounded p-2 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">النبذة</label>
                <textarea
                  value={tempBio}
                  onChange={(e) => setTempBio(e.target.value)}
                  className="w-full bg-transparent border border-gray-300 dark:border-gray-700 rounded p-2 focus:ring-1 focus:ring-blue-500 outline-none resize-none h-20"
                />
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <button onClick={() => setIsEditing(false)} className="px-4 py-1.5 border border-gray-300 dark:border-gray-700 rounded-full text-sm font-bold">إلغاء</button>
                <button onClick={handleSaveProfile} className="px-4 py-1.5 bg-black dark:bg-white text-white dark:text-black rounded-full text-sm font-bold">حفظ</button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-3">
                <h1 className="text-xl font-bold flex items-center gap-2">
                  {profile.username}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-gray-500 text-sm">@{profile.username.replace(/\s+/g, '_').toLowerCase()}</span>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-900/50">
                    <Award className="w-3 h-3" />
                    {profile.meme_level}
                  </span>
                </div>
              </div>

              <div className="mb-3 text-sm leading-relaxed whitespace-pre-wrap">
                {profile.bio || "لا توجد نبذة شخصية"}
              </div>

              <div className="flex gap-4 text-sm text-gray-500 dark:text-gray-400 mb-2">
                <button className="hover:underline hover:text-black dark:hover:text-white transition-colors">
                  <strong className="text-black dark:text-white">{profile.following_count || 0}</strong> يتابع
                </button>
                <button className="hover:underline hover:text-black dark:hover:text-white transition-colors">
                  <strong className="text-black dark:text-white">{profile.followers_count}</strong> متابع
                </button>
              </div>
            </>
          )}
        </div>

        <div className="flex border-b border-gray-200 dark:border-gray-800">
          <div className="flex-1 text-center hover:bg-gray-200 dark:hover:bg-gray-900 transition-colors cursor-pointer">
            <div className="inline-block py-3 font-bold text-black dark:text-white border-b-4 border-blue-500">
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
              <div key={meme.id} className="border-b border-gray-200 dark:border-gray-800">
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
              <p className="text-gray-500 dark:text-gray-400 font-bold">لا توجد منشورات</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
              }

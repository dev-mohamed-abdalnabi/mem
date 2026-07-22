import React, { useState, useEffect, useRef } from "react";
import { Camera, MessageCircle, Award, Clock, X, Check, CalendarDays, Users, UserPlus, Image as ImageIcon, Flame, Eye, Heart } from "lucide-react";
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
  onMessageUser?: (userId: string) => void;
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

// تنسيق الأرقام الكبيرة بشكل شيك (1.2K / 3.4M) بدل ما تتكتب كاملة وتبوظ التصميم
function formatCompactNumber(num: number): string {
  if (!num) return "0";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(num);
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
  onMessageUser,
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
  // --- إظهار/إخفاء النبذة الطويلة (عرض المزيد) - نفس منطق caption البوست ---
  const [bioExpanded, setBioExpanded] = useState(false);
  const [bioOverflowing, setBioOverflowing] = useState(false);
  const bioRef = useRef<HTMLParagraphElement>(null);
  const [infoBioExpanded, setInfoBioExpanded] = useState(false);
  const [infoBioOverflowing, setInfoBioOverflowing] = useState(false);
  const infoBioRef = useRef<HTMLParagraphElement>(null);

  const [tempName, setTempName] = useState(profile.username);
  const [nameError, setNameError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const USERNAME_MAX_LEN = 20;
  
  // تبويبات الصفحة
  const [activeProfileTab, setActiveProfileTab] = useState<"posts" | "info">("posts");
  const [localUserMemes, setLocalUserMemes] = useState<Meme[]>(userMemes);
  const [isLoadingMemes, setIsLoadingMemes] = useState(false);

  useEffect(() => {
    if (bioRef.current) {
      setBioOverflowing(bioRef.current.scrollHeight > bioRef.current.clientHeight + 1);
    }
    if (infoBioRef.current) {
      setInfoBioOverflowing(infoBioRef.current.scrollHeight > infoBioRef.current.clientHeight + 1);
    }
  }, [profile.bio, activeProfileTab]);

  // --- حالات أداة قص الصورة (Cropper) ---
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [zoom, setZoom] = useState(1);
  // مقياس "احتواء" الصورة جوه الدائرة أول ما تتفتح (زي object-fit: cover)
  // قبل كده الصورة كانت بترسم بحجمها الطبيعي بالبيكسل، فأي صورة موبايل
  // (غالبًا آلاف البيكسل) كانت بتظهر مكبّرة جدًا وتفص من نص الصورة بس.
  const [baseScale, setBaseScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);
  const cropContainerRef = useRef<HTMLDivElement>(null);

  // منع السكرول عند فتح شاشة الصورة
  useEffect(() => {
    if (avatarPreview) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => { document.body.style.overflow = "auto"; };
  }, [avatarPreview]);

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

  // إجمالي المشاهدات والإعجابات على كل منشورات المستخدم (للإحصائيات في الهيدر)
  const totalViews = localUserMemes.reduce((sum, m) => sum + (m.views_count || 0), 0);
  const totalLikes = localUserMemes.reduce((sum, m) => sum + (m.likes_count || 0), 0);

  const onFollowClick = async () => {
    if (!isRealUser) {
      setShowAuthModal(true);
      return;
    }
    await handleFollowToggle(currentUser.id, profile.id);
  };

  const handleSaveProfile = async () => {
    if (!tempName.trim()) return;
    setNameError(null);
    setIsSavingProfile(true);
    try {
      const usernameChanged = tempName.trim() !== profile.username;
      let updatedProfile: Profile = { ...currentUser, bio: tempBio };

      if (usernameChanged) {
        // بيعدي على فلتر الأحرف الممنوعة + حد الطول + حد المرتين في الشهر
        // (الدالة change_username في قاعدة البيانات) - لو رفضت، بنعرض
        // رسالة الخطأ الحقيقية بدل رسالة عامة.
        const result = await dataService.changeUsername(tempName.trim());
        updatedProfile = { ...updatedProfile, ...result };
      }

      // النبذة الشخصية بتتحدث عادي من غير قيود
      await dataService.updateProfile({ bio: tempBio });

      setCurrentUser(updatedProfile);
      setProfiles(prev => prev.map(p => (p.id === currentUser.id ? updatedProfile : p)));
      setTempName(updatedProfile.username);
      setIsEditing(false);
    } catch (err: any) {
      setNameError(err?.message || "فشل حفظ التعديلات");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // --- دوال قص الصورة ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setAvatarPreview(URL.createObjectURL(file));
      setZoom(1);
      setBaseScale(1);
      setPosition({ x: 0, y: 0 });
    }
  };

  // بيتنفذ أول ما الصورة تحمّل جوه أداة القص، وبيحسب أصغر مقياس يخلي
  // الصورة تغطي الدائرة بالكامل (زي object-fit: cover) بدل ما تظهر
  // بحجمها الطبيعي وتبان مكبّرة جدًا.
  const handleCropImageLoad = () => {
    const img = imageRef.current;
    const containerSize = cropContainerRef.current?.getBoundingClientRect().width || 256;
    if (!img || !img.naturalWidth || !img.naturalHeight) return;
    const fitScale = Math.max(containerSize / img.naturalWidth, containerSize / img.naturalHeight);
    setBaseScale(fitScale);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const handleConfirmUpload = async () => {
    if (!selectedFile || !imageRef.current) return;
    setIsUploadingAvatar(true);
    
    try {
      // إنشاء Canvas لقص الصورة بالأبعاد والتحريك اللي اختاره المستخدم
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const size = 300; // حجم الصورة النهائي

      /**
       * باگ القص القديم: كان بيحسب position.x/position.y ودي إحداثيات
       * بمقياس حاوية العرض الفعلية (256px، w-64)، لكن بعدين كان بيرسمهم
       * على canvas مقاسه 300px من غير أي تحويل بين المقياسين. النتيجة إن
       * الصورة كانت بترتسم في مكان تاني خالص عن اللي المستخدم شافه وحركه،
       * فبتطلع مقصوصة غلط ("بتفص من نص الصورة"). دلوقتي بنجيب حجم الحاوية
       * الفعلي بالـ ref ونحول بيه كل الإحداثيات لمقياس الـ canvas.
       */
      const containerSize = cropContainerRef.current?.getBoundingClientRect().width || 256;
      const scaleFactor = size / containerSize;
      canvas.width = size;
      canvas.height = size;

      if (ctx) {
        // حساب الأبعاد بنفس مقياس الحاوية اللي المستخدم شاف الصورة جواها
        // (baseScale بيخلي الصورة تغطي الدائرة زي المعاينة بالظبط، وzoom فوقه)
        const img = imageRef.current;
        const effectiveScale = baseScale * zoom;
        const displayWidth = img.naturalWidth * effectiveScale;
        const displayHeight = img.naturalHeight * effectiveScale;
        const width = displayWidth * scaleFactor;
        const height = displayHeight * scaleFactor;
        const drawX = (size - width) / 2 + position.x * scaleFactor;
        const drawY = (size - height) / 2 + position.y * scaleFactor;

        // رسم الصورة مع تطبيق التحريك بنفس ما هو ظاهر على الشاشة بالظبط
        ctx.drawImage(img, drawX, drawY, width, height);

        // تحويل الـ Canvas لـ File ورفعه - باستخدام Promise عشان نستنى
        // الرفع فعلاً يخلص جوه try/catch، بدل ما finally يقفل اللودينج
        // فورًا وأي error يضيع من غير ما يبان للمستخدم
        let blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));

        // بعض متصفحات الموبايل القديمة (خصوصاً WebView بتاعة تطبيقات زي
        // فيسبوك/إنستجرام) بترجع null من canvas.toBlob من غير أي سبب واضح.
        // في الحالة دي بنستخدم toDataURL كبديل (أوسع دعم) ونحولها بايدنا لـ Blob.
        if (!blob) {
          try {
            const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
            const res = await fetch(dataUrl);
            blob = await res.blob();
          } catch (fallbackErr) {
            console.error("toDataURL fallback failed:", fallbackErr);
          }
        }

        if (blob) {
          const croppedFile = new File([blob], "avatar.jpg", { type: "image/jpeg" });
          const url = await dataService.uploadAvatar(croppedFile);
          setCurrentUser(prev => ({ ...prev, avatar_url: url }));
          setProfiles(prev => prev.map(p => p.id === currentUser.id ? { ...p, avatar_url: url } : p));
          await dataService.updateProfile({ avatar_url: url });
          setAvatarPreview(null);
          setSelectedFile(null);
        } else {
          throw new Error("فشل إنشاء ملف الصورة.");
        }
      }
    } catch (err: any) {
      console.error("Avatar upload error:", err);
      // كانت رسالة التنبيه ثابتة دايماً "فشل رفع الصورة، حاول تاني" مهما كان
      // سبب الخطأ الحقيقي (صلاحيات، حجم، نوع ملف...)، فالمستخدم ما كانش يعرف
      // يشخّص المشكلة. دلوقتي بنعرض رسالة الخطأ الفعلية لو موجودة.
      alert(err?.message || "فشل رفع الصورة، حاول تاني.");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // تنسيق تاريخ الانضمام
  const joinDate = profile.created_at 
    ? new Date(profile.created_at).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })
    : "غير محدد";

  return (
    <div className="w-full pb-20 text-gray-900 dark:text-gray-100 font-sans">
      
      {/* شاشة قص الصورة (Cropper Modal) */}
      {avatarPreview && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-sm flex flex-col items-center">
            <h3 className="text-white text-lg font-bold mb-2">ضبط الصورة الشخصية</h3>
            <p className="text-gray-400 text-sm mb-6">قم بتحريك وتكبير الصورة لتناسب الدائرة</p>
            
            {/* حاوية القص الدائرية */}
            <div 
              ref={cropContainerRef}
              className="w-64 h-64 rounded-full overflow-hidden border-4 border-white dark:border-gray-700 bg-black relative touch-none cursor-move shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            >
              <img loading="lazy" decoding="async" 
                ref={imageRef}
                src={avatarPreview} 
                alt="Crop preview" 
                onLoad={handleCropImageLoad}
                className="absolute top-1/2 left-1/2 origin-center max-w-none pointer-events-none"
                style={{
                  transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) scale(${baseScale * zoom})`,
                }}
              />
            </div>

            {/* التحكم في الزوم */}
            <div className="w-full mt-8 px-4 flex items-center gap-3">
              <span className="text-white text-xl">-</span>
              <input 
                type="range" 
                min="0.5" 
                max="3" 
                step="0.1" 
                value={zoom} 
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 accent-[#1d9bf0]"
              />
              <span className="text-white text-xl">+</span>
            </div>

            {/* أزرار الحفظ والإلغاء مع تأثير التحميل */}
            <div className="flex gap-3 w-full mt-8">
              <button 
                disabled={isUploadingAvatar}
                onClick={() => { setAvatarPreview(null); setSelectedFile(null); }}
                className="flex-1 py-3 rounded-full font-bold bg-gray-800 text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                إلغاء
              </button>
              <button 
                disabled={isUploadingAvatar}
                onClick={handleConfirmUpload}
                className="flex-1 py-3 rounded-full font-bold bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isUploadingAvatar ? <Clock className="w-5 h-5 animate-spin" /> : "حفظ الصورة"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* الهيدر العلوي */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex justify-between items-start mb-3">
          
          <div className="relative group">
            <div
              className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden cursor-pointer relative ${isUploadingAvatar && !avatarPreview ? 'opacity-50' : ''}`}
              onClick={() => !isUploadingAvatar && setLightboxImage(profile.avatar_url || null)}
            >
              {profile.avatar_url ? (
                <img loading="lazy" decoding="async" src={profile.avatar_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-gray-400">{profile.username[0]}</div>
              )}
              {isUploadingAvatar && !avatarPreview && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Clock className="w-6 h-6 text-white animate-spin" />
                </div>
              )}
            </div>
            
            {isOwnProfile && !isUploadingAvatar && (
              <label className="absolute bottom-0 right-0 bg-gray-900 dark:bg-white p-1.5 sm:p-2 rounded-full cursor-pointer shadow-md border-2 border-white dark:border-[#16181c]">
                <Camera className="w-4 h-4 text-white dark:text-black" />
                <input type="file" className="hidden" accept="image/*" onChange={handleFileSelect} />
              </label>
            )}
          </div>

          <div className="pt-2">
            {!isOwnProfile && isRealUser ? (
              <div className="flex gap-2">
                <button
                  onClick={() => onMessageUser?.(profile.id)}
                  title="راسله"
                  className="p-1.5 border border-gray-400 dark:border-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                >
                  <MessageCircle className="w-5 h-5 text-gray-900 dark:text-white" />
                </button>
                <button
                  onClick={onFollowClick}
                  className={`px-5 py-1.5 rounded-full font-bold text-[14px] transition-colors border ${
                    followingIds.includes(profile.id)
                      ? "border-gray-400 dark:border-gray-600 text-gray-900 dark:text-white hover:text-red-500 hover:border-red-500 hover:bg-red-500/10"
                      : "bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white"
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
                onClick={() => { setIsEditing(true); setActiveProfileTab("info"); }}
                className="px-4 py-1.5 border border-gray-400 dark:border-gray-600 text-gray-900 dark:text-white rounded-full font-bold text-[14px] hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              >
                تعديل الملف الشخصي
              </button>
            ) : null}
          </div>
        </div>

        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-5">{profile.username}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[14px] text-gray-500" dir="ltr">@{profile.username.replace(/\s+/g, '_').toLowerCase()}</span>
          </div>
          {/* وصف المستخدم (النبذة الشخصية) - كانت المساحة دي فاضية تماماً حتى
              لو المستخدم كاتب نبذة، لأنها كانت بتتعرض جوه تبويب "معلومات
              الحساب" بس مش هنا في الهيدر نفسه زي فيسبوك/تويتر */}
          {profile.bio && (
            <div className="mt-3">
              <p
                ref={bioRef}
                className="text-[15px] text-gray-800 dark:text-gray-100 leading-relaxed whitespace-pre-wrap"
                style={
                  bioExpanded
                    ? undefined
                    : {
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }
                }
              >
                {profile.bio}
              </p>
              {(bioOverflowing || bioExpanded) && (
                <button
                  onClick={() => setBioExpanded(prev => !prev)}
                  className="text-xs text-gray-500 font-semibold mt-1 hover:underline"
                >
                  {bioExpanded ? "عرض أقل" : "عرض المزيد"}
                </button>
              )}
            </div>
          )}
        </div>

        {/* إحصائيات سريعة - شريط كامل العرض تحت النبذة، بدل ما تتزنق جنب
            الصورة وتتلزق فوق بعض. كل رقم له مساحته وواضح لوحده. */}
        <div className="grid grid-cols-4 mt-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-2xl py-3">
          {[
            { icon: Flame, value: profile.total_points || 0, label: "نقطة", color: "text-amber-500" },
            { icon: Users, value: profile.followers_count || 0, label: "متابع", color: "text-[#1d9bf0]" },
            { icon: Eye, value: totalViews, label: "مشاهدة", color: "text-emerald-500" },
            { icon: Heart, value: totalLikes, label: "إعجاب", color: "text-rose-500" },
          ].map(({ icon: Icon, value, label, color }, i) => (
            <div
              key={label}
              className={`flex flex-col items-center gap-1 ${i > 0 ? "border-r border-gray-200 dark:border-gray-800" : ""}`}
            >
              <Icon className={`w-[18px] h-[18px] ${color}`} />
              <span className="text-[16px] font-extrabold text-gray-900 dark:text-white leading-none">
                {formatCompactNumber(value)}
              </span>
              <span className="text-[11px] text-gray-500 dark:text-gray-400 leading-none">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* شريط التبويبات */}
      <div className="flex w-full border-b border-gray-200 dark:border-gray-800 mt-2">
        <button
          onClick={() => setActiveProfileTab("posts")}
          className={`flex-1 text-center py-3 text-[15px] font-bold transition-colors relative hover:bg-gray-100 dark:hover:bg-white/5 ${activeProfileTab === "posts" ? "text-gray-900 dark:text-white" : "text-gray-500"}`}
        >
          المنشورات
          {activeProfileTab === "posts" && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 bg-[#1d9bf0] rounded-t-full"></div>}
        </button>
        <button
          onClick={() => setActiveProfileTab("info")}
          className={`flex-1 text-center py-3 text-[15px] font-bold transition-colors relative hover:bg-gray-100 dark:hover:bg-white/5 ${activeProfileTab === "info" ? "text-gray-900 dark:text-white" : "text-gray-500"}`}
        >
          معلومات الحساب
          {activeProfileTab === "info" && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 bg-[#1d9bf0] rounded-t-full"></div>}
        </button>
      </div>

      {/* محتوى التبويبات */}
      <div className="pb-10 pt-4 bg-gray-50/50 dark:bg-transparent min-h-screen">
        
        {/* المنشورات (شكل كروت) */}
        {activeProfileTab === "posts" && (
          <div className="space-y-4 px-2 sm:px-4">
            {isLoadingMemes ? (
              <div className="text-center py-10"><Clock className="w-6 h-6 text-gray-400 mx-auto animate-spin" /></div>
            ) : localUserMemes.length > 0 ? (
              localUserMemes.map(meme => (
                <div key={meme.id} className="bg-white dark:bg-[#16181c] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                  <MemeCard
                    meme={meme} currentUser={currentUser} onLikeToggle={handleLikeToggle} onSaveToggle={handleSaveToggle}
                    onFollowToggle={handleFollowToggle} onTagClick={setSelectedTag} onDeleteComment={() => {}}
                    onReportSubmit={handleReportSubmit} onShareCompleted={handleShareCompleted} onDeleteMeme={handleDeleteMeme}
                    onUserProfileClick={setSelectedProfileId} isFollowingCreator={followingIds.includes(meme.user_id)} onImageClick={setLightboxImage}
                  />
                </div>
              ))
            ) : (
              <div className="text-center py-16 bg-white dark:bg-[#16181c] rounded-2xl border border-gray-200 dark:border-gray-800">
                <p className="text-gray-500 text-[15px]">لا توجد منشورات.</p>
              </div>
            )}
          </div>
        )}

        {/* معلومات الحساب (ستايل فيسبوك النظيف) */}
        {activeProfileTab === "info" && (
          <div className="px-4">
            {isEditing ? (
              <div className="space-y-4 bg-white dark:bg-[#16181c] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                <div>
                  <input
                    type="text"
                    value={tempName}
                    maxLength={USERNAME_MAX_LEN}
                    onChange={(e) => { setTempName(e.target.value); setNameError(null); }}
                    placeholder="الاسم"
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl py-2 px-3 outline-none text-gray-900 dark:text-white"
                  />
                  <div className="flex items-center justify-between mt-1 px-1">
                    <span className={`text-xs ${nameError ? "text-red-500" : "text-gray-400"}`}>
                      {nameError || "بحد أقصى مرتين تغيير في الشهر"}
                    </span>
                    <span className="text-xs text-gray-400 shrink-0">{tempName.length}/{USERNAME_MAX_LEN}</span>
                  </div>
                </div>
                <textarea value={tempBio} onChange={(e) => setTempBio(e.target.value)} placeholder="النبذة الشخصية..." className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl py-2 px-3 outline-none resize-none h-20 text-gray-900 dark:text-white" />
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => { setIsEditing(false); setTempName(profile.username); setNameError(null); }} className="px-5 py-2 rounded-full font-bold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">إلغاء</button>
                  <button onClick={handleSaveProfile} disabled={isSavingProfile} className="px-5 py-2 bg-[#1d9bf0] text-white rounded-full font-bold disabled:opacity-60">
                    {isSavingProfile ? "جاري الحفظ..." : "حفظ التغييرات"}
                  </button>
                </div>
              </div>
            ) : (
              // تصميم المعلومات الجديد (بدون مربعات، ستايل ليست زي الفيسبوك)
              <div className="space-y-6">
                
                {/* النبذة */}
                <div className="border-b border-gray-200 dark:border-gray-800 pb-5">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">نبذة</h2>
                  <p
                    ref={infoBioRef}
                    className="text-[15px] text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed"
                    style={
                      infoBioExpanded
                        ? undefined
                        : {
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }
                    }
                  >
                    {profile.bio ? profile.bio : "لا توجد نبذة شخصية."}
                  </p>
                  {profile.bio && (infoBioOverflowing || infoBioExpanded) && (
                    <button
                      onClick={() => setInfoBioExpanded(prev => !prev)}
                      className="text-xs text-gray-500 font-semibold mt-1 hover:underline"
                    >
                      {infoBioExpanded ? "عرض أقل" : "عرض المزيد"}
                    </button>
                  )}
                </div>

                {/* التفاصيل (قائمة) */}
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">التفاصيل</h2>
                  <ul className="space-y-4">
                    <li className="flex items-center gap-3">
                      <Award className="w-6 h-6 text-gray-400 dark:text-gray-500 shrink-0" />
                      <span className="text-[15px] text-gray-900 dark:text-white">المستوى الحالي: <strong>{profile.meme_level}</strong></span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Users className="w-6 h-6 text-gray-400 dark:text-gray-500 shrink-0" />
                      <span className="text-[15px] text-gray-900 dark:text-white">يتابعه <strong>{profile.followers_count}</strong> شخص</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <UserPlus className="w-6 h-6 text-gray-400 dark:text-gray-500 shrink-0" />
                      <span className="text-[15px] text-gray-900 dark:text-white">يتابع <strong>{profile.following_count || 0}</strong> شخص</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <ImageIcon className="w-6 h-6 text-gray-400 dark:text-gray-500 shrink-0" />
                      <span className="text-[15px] text-gray-900 dark:text-white">نشر <strong>{localUserMemes.length}</strong> منشورات</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CalendarDays className="w-6 h-6 text-gray-400 dark:text-gray-500 shrink-0" />
                      <span className="text-[15px] text-gray-900 dark:text-white">انضم في <strong>{joinDate}</strong></span>
                    </li>
                    {profile.previous_usernames && profile.previous_usernames.length > 0 && (
                      <li className="flex items-center gap-3">
                        <Clock className="w-6 h-6 text-gray-400 dark:text-gray-500 shrink-0" />
                        <span className="text-[15px] text-gray-900 dark:text-white">
                          الاسم السابق: <strong>{profile.previous_usernames[profile.previous_usernames.length - 1]}</strong>
                        </span>
                      </li>
                    )}
                  </ul>
                </div>

              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
                   }

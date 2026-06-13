import React, { useState, useEffect } from "react"; 
import { dataService, calculateMemeLevel } from "./services/dataService";
import { Profile, Meme, Notification, Report } from "./types"; 

// --- Components Imports ---
import Header from "./components/Header.tsx"; 
import Sidebar from "./components/Sidebar.tsx"; 
import RightSidebar from "./components/RightSidebar.tsx"; 
import MemeCard from "./components/MemeCard.tsx"; 
import Leaderboard from "./pages/Leaderboard.tsx";
import CreatePost from "./pages/CreatePost.tsx";
// (افترض أنك ستنقل كود الـ Profile لملف منفصل بنفس الطريقة، سأضع الكود هنا اختصاراً إذا أردت)

const initialGuestProfile: Profile = { /* نفس بياناتك السابقة */ };

export default function App() { 
  const [activeTab, setActiveTab] = useState("feed"); 
  const [currentUser, setCurrentUser] = useState(initialGuestProfile); 
  const [memes, setMemes] = useState<Meme[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]); 
  const [loading, setLoading] = useState(true);
  
  // States الأخرى كما هي...
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState(""); 
  const [selectedTag, setSelectedTag] = useState<string | null>(null); 
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [postError, setPostError] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false); 

  // قم بإضافة دوال (loadAllData, handleLikeToggle, الخ) نفس اللي كانت في ملفك الأصلي هنا...
  // ...
  
  const handleQuickPostSubmit = async (caption: string, imagePreview: string, tags: string, file: File | null) => {
    setIsPosting(true);
    setPostError("");
    try {
      let finalImageUrl = imagePreview;
      if (file) {
        finalImageUrl = await dataService.uploadMemeFile(file); // الدالة المسؤولة عن الرفع
      }
      const splitTags = tags.split(" ").filter(t => t.startsWith("#")).map(t => t.replace("#", ""));
      // استدعاء دالة النشر
      await dataService.createMeme({ user_id: currentUser.id, image_url: finalImageUrl, caption, tags: splitTags });
      setActiveTab("feed");
    } catch (err: any) {
      setPostError(err.message || "فشل الرفع، يرجى المحاولة مرة أخرى.");
    } finally {
      setIsPosting(false);
    }
  };

  const isRealUser = currentUser.id !== "guest-user-temp";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans" dir="rtl">
      
      <Header 
        currentUser={currentUser} 
        activeTab={activeTab} 
        onNavigate={setActiveTab} 
        isRealUser={isRealUser}
        // ... باقي الخصائص
      />

      <main className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
        
        {/* البطاقات الجانبية (تم فصلها في كومبوننت مخصص) */}
        <RightSidebar 
          isRealUser={isRealUser} 
          profiles={profiles} 
          onAuthClick={() => setShowAuthModal(true)}
          onProfileClick={(id) => { setSelectedProfileId(id); setActiveTab("user-profile"); }}
          onViewLeaderboard={() => setActiveTab("leaderboard")}
        />

        {/* المنتصف (المحتوى المتغير حسب الصفحة) */}
        <div className="flex-1 max-w-2xl mx-auto order-2 w-full">
          
          {activeTab === "feed" && (
             <div className="flex flex-col gap-5">
               {/* كود عرض الميمز هنا */}
             </div>
          )}

          {activeTab === "create-post" && (
            <CreatePost 
              currentUser={currentUser}
              loading={isPosting}
              postError={postError}
              onCancel={() => setActiveTab("feed")}
              onSubmit={handleQuickPostSubmit}
            />
          )}

          {activeTab === "leaderboard" && (
            <Leaderboard 
              profiles={profiles}
              currentUser={currentUser}
              followingIds={followingIds}
              onFollowToggle={(fid, tid) => {/* دالة الفولو */}}
              onNavigate={setActiveTab}
            />
          )}

          {/* يمكنك فصل Profile بنفس الطريقة للحفاظ على App.tsx نظيفاً */}

        </div>

        {/* القائمة الجانبية اليمنى */}
        <Sidebar 
          currentUser={currentUser} 
          activeTab={activeTab} 
          onNavigate={setActiveTab} 
        />
      </main>

    </div>
  );
}

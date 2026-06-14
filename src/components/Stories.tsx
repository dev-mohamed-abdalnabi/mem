import React, { useState, useEffect } from "react";
import { Plus, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Story, Profile } from "../types";
import { dataService } from "../services/dataService";
import { socialService } from "../services/socialService";

interface StoriesProps {
  currentUser: Profile;
}

export default function Stories({ currentUser }: StoriesProps) {
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStories();
  }, []);

  const loadStories = async () => {
    try {
      const data = await socialService.getStories();
      setStories(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (currentUser.id === "guest-user-temp") {
      alert("سجل دخول الأول يا بطل عشان ترفع حالة!");
      return;
    }

    setLoading(true);
    try {
      const url = await dataService.uploadMemeFile(file);
      const type = file.type.startsWith('video/') ? 'video' : 'image';
      await socialService.createStory(currentUser.id, url, type);
      loadStories();
    } catch (e) {
      console.error("Story upload error:", e);
      alert("فشل رفع الحالة، اتأكد إنك عامل تسجيل دخول حقيقي.");
    } finally {
      setLoading(false);
    }
  };

  // Group stories by user
  const userStories = stories.reduce((acc, story) => {
    const uid = story.user_id;
    if (!acc[uid]) acc[uid] = [];
    acc[uid].push(story);
    return acc;
  }, {} as Record<string, Story[]>);

  return (
    <div className="flex gap-3 overflow-x-auto p-4 bg-white border-b border-gray-200 no-scrollbar">
      {/* Add Story */}
      <div className="flex flex-col items-center gap-1 shrink-0">
        <label className="relative cursor-pointer">
          <img src={currentUser.avatar_url || ""} className="w-14 h-14 rounded-full border-2 border-gray-200 object-cover" />
          <div className="absolute bottom-0 right-0 bg-blue-500 text-white rounded-full p-0.5 border-2 border-white">
            <Plus className="w-3 h-3" />
          </div>
          <input type="file" accept="image/*,video/*" className="hidden" onChange={handleFileUpload} disabled={loading} />
        </label>
        <span className="text-[10px] text-gray-500">قصتك</span>
      </div>

      {/* User Stories */}
      {Object.entries(userStories).map(([uid, uStories]) => (
        <div key={uid} className="flex flex-col items-center gap-1 shrink-0 cursor-pointer" onClick={() => setSelectedStory(uStories[0])}>
          <div className="p-0.5 rounded-full border-2 border-blue-500">
            <img src={uStories[0].profiles?.avatar_url || ""} className="w-14 h-14 rounded-full border-2 border-white object-cover" />
          </div>
          <span className="text-[10px] text-gray-900 truncate w-14 text-center">{uStories[0].profiles?.username}</span>
        </div>
      ))}

      {/* Story Viewer Modal */}
      {selectedStory && (
        <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
          <button onClick={() => setSelectedStory(null)} className="absolute top-4 right-4 text-white z-10"><X /></button>
          <div className="relative w-full max-w-md aspect-[9/16] bg-gray-900">
            {selectedStory.media_type === 'video' ? (
              <video src={selectedStory.media_url} autoPlay className="w-full h-full object-contain" />
            ) : (
              <img src={selectedStory.media_url} className="w-full h-full object-contain" />
            )}
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <img src={selectedStory.profiles?.avatar_url || ""} className="w-8 h-8 rounded-full border border-white" />
              <span className="text-white text-sm font-bold">{selectedStory.profiles?.username}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

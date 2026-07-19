import React from "react";
import { Trophy, Award, Crown, User, Star, Zap, Flame, Target } from "lucide-react";
import { Profile } from "../types";

interface LeaderboardProps {
  profiles: Profile[];
  currentUser: Profile;
  onNavigate: (tab: string) => void;
  onFollowToggle: (followerId: string, followingId: string) => void;
  followingIds: string[];
}

export default function Leaderboard({
  profiles,
  currentUser,
  onNavigate,
  onFollowToggle,
  followingIds
}: LeaderboardProps) {

  // Sort by total points descending
  const sortedProfiles = [...profiles].sort((a, b) => b.total_points - a.total_points);

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown className="w-5 h-5 text-yellow-500 fill-yellow-200 animate-bounce" />;
    if (index === 1) return <Award className="w-5 h-5 text-gray-400 fill-gray-100" />;
    if (index === 2) return <Award className="w-5 h-5 text-amber-600 fill-amber-50" />;
    return <span className="font-mono text-xs font-bold text-gray-400">#{index + 1}</span>;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-3xl p-5 text-right flex flex-col gap-6 shadow-sm mb-20 md:mb-0">
      {/* Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 rounded-2xl p-5 text-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-32 h-32 bg-white/5 rounded-full -translate-x-10 -translate-y-10 blur-xl" />
        <div className="absolute bottom-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full translate-x-16 translate-y-16 blur-2xl" />
        
        <div className="relative z-10">
          <span className="bg-white/15 px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase mb-2 inline-block">
            نخبة صُنّاع البهجة والضحك
          </span>
          <h2 className="font-extrabold text-lg sm:text-xl leading-snug">
            لوحة شرف الأباطرة والرواد
          </h2>
          <p className="text-xs text-blue-100 mt-1 max-w-lg font-bold leading-relaxed">
            اللايكات والكمنتات على ميمزك بتتحول لنقاط خبرة وترقّي مستواك فورًا من مجرد مستخدم مبدئ لقمم مستويات الإبداع!
          </p>
        </div>
      </div>

      {/* Point Rules Grid */}
      <div>
        <h3 className="font-extrabold text-xs text-gray-700 flex items-center justify-end gap-1.5 mb-3">
          <span>دليل مستويات الأرباح والنقاط</span>
          <Target className="w-4 h-4 text-blue-500" />
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { metric: "+5 نقاط", act: "لكل لايك على ميمزك" },
            { metric: "+2 نقطة", act: "لكل تعليق على ميمزك" },
            { metric: "+10 نقاط", act: "لكل متابع جديد" },
            { metric: "1500+ XP", act: "مستوى الإمبراطور" }
          ].map((rule, i) => (
            <div key={i} className="bg-gray-50 border border-gray-200 p-2.5 rounded-xl text-center shadow-sm">
              <p className="text-xs font-black text-blue-600 font-mono leading-none">{rule.metric}</p>
              <p className="text-[10px] text-gray-500 font-extrabold mt-1">{rule.act}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Sorted Meme Lords List */}
      <div className="flex flex-col gap-3">
        <h3 className="font-extrabold text-sm text-gray-900">سجل التتويج التاريخي</h3>

        <div className="flex flex-col gap-2">
          {sortedProfiles.map((prof, index) => {
            const isMe = prof.id === currentUser.id;
            const isFollowing = followingIds.includes(prof.id);
            return (
              <div
                key={prof.id}
                className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                  isMe
                    ? "bg-blue-50 dark:bg-blue-500/10 border-blue-300 dark:border-blue-500/30 shadow-sm"
                    : "bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm"
                }`}
              >
                {/* User details and position */}
                <div className="flex items-center gap-3">
                  {/* Position number */}
                  <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 border border-gray-200">
                    {getRankIcon(index)}
                  </div>

                  {prof.avatar_url ? (
                    <img
                      src={prof.avatar_url}
                      alt={prof.username}
                      className="w-10 h-10 rounded-xl object-cover border border-gray-200 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 font-extrabold flex items-center justify-center text-xs shrink-0">
                      U
                    </div>
                  )}

                  <div className="text-right">
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-sm text-gray-900 truncate max-w-[120px]">
                        {prof.username}
                      </span>
                      {isMe && (
                        <span className="bg-blue-600 text-white font-black text-[8px] px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                          أنت
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-orange-600 font-bold leading-tight mt-0.5">
                      {prof.meme_level}
                    </p>
                  </div>
                </div>

                {/* Score and actions */}
                <div className="flex items-center gap-4">
                  {/* XP Points Score */}
                  <div className="text-center shrink-0">
                    <div className="flex items-center gap-1 bg-gray-100 px-2.5 py-1 rounded-xl border border-gray-300 shadow-sm">
                      <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
                      <span className="text-xs font-black text-gray-900 font-mono tracking-tight">
                        {prof.total_points}
                      </span>
                    </div>
                    <span className="text-[8px] text-gray-400 font-bold block mt-0.5">نقاط التفاعل</span>
                  </div>

                  {/* Follow actions button */}
                  {!isMe && (
                    <button
                      onClick={() => onFollowToggle(currentUser.id, prof.id)}
                      disabled={isFollowing}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                        isFollowing
                          ? "bg-gray-100 text-gray-400 border border-gray-100 cursor-not-allowed"
                          : "bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:scale-105"
                      }`}
                    >
                      {isFollowing ? "متابع" : "متابعة"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

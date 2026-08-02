import React from "react";
import { Crown, Award, Flame, Heart, MessageCircle, UserPlus, CheckCircle2, Lock, Sparkles } from "lucide-react";
import { Profile } from "../types";
import { formatCompactNumber } from "../utils/format";

interface LeaderboardProps {
  profiles: Profile[];
  currentUser: Profile;
  onNavigate: (tab: string, options?: { profileId?: string }) => void;
  onFollowToggle: (followerId: string, followingId: string) => void;
  followingIds: string[];
}

/**
 * مصدر الحقيقة الوحيد لمستويات "مم" - منسوخة حرفيًا من فانكشن
 * compute_meme_level(p_points) في الداتابيز (SQL). أي تعديل هناك لازم
 * ينعكس هنا كمان، وإلا الواجهة هتفضل بتوري أرقام غلط زي ما كان حاصل قبل
 * كده (كانت البطاقة بتقول "1500 XP = إمبراطور" والحقيقي في الداتابيز
 * 25,000 نقطة - فرق 16 ضعف!).
 */
const LEVELS = [
  { min: 0, name: "نورمي", emoji: "🧍" },
  { min: 100, name: "هاوي", emoji: "🌱" },
  { min: 300, name: "ناشط", emoji: "📈" },
  { min: 800, name: "مؤثر", emoji: "📣" },
  { min: 2000, name: "مُحترف", emoji: "🎬" },
  { min: 5000, name: "مبدع", emoji: "🎨" },
  { min: 10000, name: "أسطورة", emoji: "👑" },
  { min: 25000, name: "إمبراطور", emoji: "🏆" },
  { min: 50000, name: "دخل التاريخ", emoji: "📜" },
  { min: 100000, name: "بقاله تمثال", emoji: "🗿" },
  { min: 200000, name: "بيتدرّس في المدارس", emoji: "📚" },
  { min: 500000, name: "فرعون الميمز", emoji: "🔺" },
  { min: 1000000, name: "هيروغليفي", emoji: "𓂀" },
] as const;

/**
 * مصادر النقاط الحقيقية - منسوخة من الـ triggers الفعلية في الداتابيز
 * (handle_counters_and_points و tg_points_on_post_approved). "نشر ميم
 * اتوافق عليه" كان مصدر نقاط شغال فعليًا في الباك من غير ما يتذكر في
 * الصفحة خالص.
 */
const POINT_RULES = [
  { icon: Heart, points: 5, label: "لايك جديد على ميمك" },
  { icon: CheckCircle2, points: 10, label: "ميمك يتوافق عليه وينشر" },
  { icon: UserPlus, points: 10, label: "متابع جديد" },
  { icon: MessageCircle, points: 2, label: "تعليق جديد على ميمك" },
];

function getLevelIndex(points: number): number {
  let idx = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (points >= LEVELS[i].min) idx = i;
  }
  return idx;
}

export default function Leaderboard({
  profiles,
  currentUser,
  onNavigate,
  onFollowToggle,
  followingIds,
}: LeaderboardProps) {
  const sortedProfiles = [...profiles].sort((a, b) => b.total_points - a.total_points);

  const myPoints = currentUser.total_points || 0;
  const myLevelIdx = getLevelIndex(myPoints);
  const myLevel = LEVELS[myLevelIdx];
  const nextLevel = LEVELS[myLevelIdx + 1] || null;
  const spanForLevel = nextLevel ? nextLevel.min - myLevel.min : 1;
  const progressPct = nextLevel
    ? Math.min(100, Math.round(((myPoints - myLevel.min) / spanForLevel) * 100))
    : 100;
  const pointsToNext = nextLevel ? nextLevel.min - myPoints : 0;

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown className="w-5 h-5 text-yellow-500 fill-yellow-200 animate-bounce" />;
    if (index === 1) return <Award className="w-5 h-5 text-gray-400 fill-gray-100 dark:fill-gray-700" />;
    if (index === 2) return <Award className="w-5 h-5 text-amber-600 fill-amber-50 dark:fill-amber-900/30" />;
    return <span className="font-mono text-xs font-bold text-gray-400 dark:text-gray-500">#{index + 1}</span>;
  };

  return (
    <div className="bg-white dark:bg-[#16181c] border border-gray-200 dark:border-gray-800/80 rounded-3xl p-5 text-right flex flex-col gap-7 shadow-sm dark:shadow-none mb-20 md:mb-0">
      {/* بطاقة اللقب الملكي - المستوى الحالي وتقدمك للي بعده */}
      <div className="relative overflow-hidden rounded-2xl p-5 text-white bg-[#0c1220] border border-[#caa24a]/30">
        {/* نقشة هيروغليفية خفيفة في الخلفية - إحساس نقش على حجر */}
        <div className="absolute inset-0 opacity-[0.07] text-6xl leading-none tracking-widest select-none pointer-events-none flex flex-wrap gap-4 p-2 overflow-hidden">
          <span>𓂀</span><span>𓆣</span><span>𓅓</span><span>𓁹</span><span>𓊪</span><span>𓋹</span>
        </div>

        <div className="relative z-10">
          <span className="bg-[#caa24a]/15 text-[#e8c468] px-3 py-1 rounded-full text-[10px] font-black tracking-wider mb-3 inline-block border border-[#caa24a]/30">
            لقبك الحالي
          </span>

          <div className="flex items-center justify-between gap-4">
            <div className="w-16 h-16 shrink-0 rounded-2xl bg-[#caa24a]/10 border border-[#caa24a]/40 flex items-center justify-center text-3xl">
              {myLevel.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-extrabold text-xl leading-snug text-[#f1d98f]">{myLevel.name}</h2>
              <div className="flex items-center justify-end gap-1.5 mt-1 text-gray-300">
                <span className="font-mono text-sm font-black">{formatCompactNumber(myPoints)}</span>
                <Flame className="w-3.5 h-3.5 text-orange-400 fill-orange-400" />
                <span className="text-[11px] font-bold text-gray-400">نقطة تفاعل</span>
              </div>
            </div>
          </div>

          {/* شريط التقدم للمستوى الجاي */}
          <div className="mt-4">
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-l from-[#f1d98f] to-[#caa24a] transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-[11px] font-bold text-gray-400 mt-1.5">
              {nextLevel ? (
                <>
                  محتاج <span className="text-[#e8c468] font-mono">{formatCompactNumber(pointsToNext)}</span> نقطة
                  كمان عشان توصل لـ "{nextLevel.name} {nextLevel.emoji}"
                </>
              ) : (
                "وصلت لأعلى لقب في مم - أسطورة فعلاً 𓂀"
              )}
            </p>
          </div>
        </div>
      </div>

      {/* دليل مصادر النقاط - الأرقام دي حرفيًا نفسها في الداتابيز */}
      <div>
        <h3 className="font-extrabold text-xs text-gray-700 dark:text-gray-300 flex items-center justify-end gap-1.5 mb-3">
          <span>إزاي تكسب نقاط</span>
          <Sparkles className="w-4 h-4 text-[#caa24a]" />
        </h3>

        <div className="grid grid-cols-2 gap-2">
          {POINT_RULES.map((rule, i) => (
            <div
              key={i}
              className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 p-3 rounded-xl flex items-center justify-end gap-2 shadow-sm dark:shadow-none"
            >
              <div className="text-right">
                <p className="text-xs font-black text-[#b8862e] dark:text-[#e8c468] font-mono leading-none">
                  +{rule.points}
                </p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-extrabold mt-1">{rule.label}</p>
              </div>
              <rule.icon className="w-5 h-5 text-[#caa24a] shrink-0" />
            </div>
          ))}
        </div>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold mt-2 text-center">
          لو اللايك أو التعليق أو المتابعة اتشالوا، نفس عدد النقاط بينزل تاني
        </p>
      </div>

      {/* مسار الصعود - كل الـ13 لقب من الأول للآخر، ومطرح ما وصلت أنت */}
      <div>
        <h3 className="font-extrabold text-sm text-gray-900 dark:text-white mb-4">مسار الصعود الإمبراطوري</h3>

        <div className="relative pr-5">
          {/* الخط العمودي: دهبي للي فات + وصلت له، رمادي للي لسه جاي */}
          <div className="absolute right-[9px] top-2 bottom-2 w-0.5 bg-gray-200 dark:bg-gray-800 rounded-full" />
          <div
            className="absolute right-[9px] top-2 w-0.5 bg-gradient-to-b from-[#e8c468] to-[#caa24a] rounded-full transition-all duration-700"
            style={{ height: `${(myLevelIdx / (LEVELS.length - 1)) * 100}%` }}
          />

          <div className="flex flex-col gap-4">
            {LEVELS.map((lvl, i) => {
              const reached = i <= myLevelIdx;
              const isCurrent = i === myLevelIdx;
              return (
                <div key={lvl.name} className="relative flex items-center gap-3">
                  {/* نقطة المسار */}
                  <div
                    className={`absolute right-0 translate-x-1/2 w-[19px] h-[19px] rounded-full border-2 flex items-center justify-center shrink-0 z-10 ${
                      isCurrent
                        ? "bg-[#caa24a] border-[#f1d98f] shadow-[0_0_0_4px_rgba(202,162,74,0.2)]"
                        : reached
                        ? "bg-[#caa24a] border-[#caa24a]"
                        : "bg-white dark:bg-[#16181c] border-gray-300 dark:border-gray-700"
                    }`}
                  >
                    {!reached && <Lock className="w-2.5 h-2.5 text-gray-400" />}
                  </div>

                  <div
                    className={`flex-1 flex items-center justify-between gap-2 pr-8 py-2 pl-3 rounded-xl transition-colors ${
                      isCurrent
                        ? "bg-[#caa24a]/10 border border-[#caa24a]/40"
                        : reached
                        ? ""
                        : "opacity-50"
                    }`}
                  >
                    <span className="text-[11px] font-mono font-bold text-gray-400 dark:text-gray-500 shrink-0">
                      {formatCompactNumber(lvl.min)}+
                    </span>
                    <div className="flex items-center gap-2 min-w-0">
                      {isCurrent && (
                        <span className="bg-[#caa24a] text-[#1a1305] font-black text-[8px] px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                          أنت هنا
                        </span>
                      )}
                      <span
                        className={`text-sm font-extrabold truncate ${
                          isCurrent
                            ? "text-[#b8862e] dark:text-[#e8c468]"
                            : "text-gray-800 dark:text-gray-200"
                        }`}
                      >
                        {lvl.name}
                      </span>
                      <span className="text-base shrink-0">{lvl.emoji}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* سجل التتويج التاريخي - ترتيب كل المستخدمين */}
      <div className="flex flex-col gap-3">
        <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">سجل التتويج التاريخي</h3>

        <div className="flex flex-col gap-2">
          {sortedProfiles.map((prof, index) => {
            const isMe = prof.id === currentUser.id;
            const isFollowing = followingIds.includes(prof.id);
            return (
              <div
                key={prof.id}
                className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                  isMe
                    ? "bg-[#caa24a]/10 border-[#caa24a]/40 shadow-sm dark:shadow-none"
                    : "bg-white dark:bg-transparent border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-sm dark:hover:shadow-none"
                }`}
              >
                {/* بيانات المستخدم والترتيب */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0 border border-gray-200 dark:border-gray-700">
                    {getRankIcon(index)}
                  </div>

                  {prof.avatar_url ? (
                    <img loading="lazy" decoding="async"
                      src={prof.avatar_url}
                      alt={prof.username}
                      onClick={() => onNavigate(isMe ? "profile" : "user-profile", { profileId: prof.id })}
                      className="w-10 h-10 rounded-xl object-cover border border-gray-200 dark:border-gray-700 shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div
                      onClick={() => onNavigate(isMe ? "profile" : "user-profile", { profileId: prof.id })}
                      className="w-10 h-10 rounded-xl bg-[#caa24a]/10 text-[#b8862e] dark:text-[#e8c468] font-extrabold flex items-center justify-center text-xs shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      U
                    </div>
                  )}

                  <div className="text-right">
                    <div className="flex items-center gap-1.5">
                      <span
                        onClick={() => onNavigate(isMe ? "profile" : "user-profile", { profileId: prof.id })}
                        className="font-extrabold text-sm text-gray-900 dark:text-white truncate max-w-[120px] cursor-pointer hover:underline"
                      >
                        {prof.username}
                      </span>
                      {isMe && (
                        <span className="bg-[#caa24a] text-[#1a1305] font-black text-[8px] px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                          أنت
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-[#b8862e] dark:text-[#e8c468] font-bold leading-tight mt-0.5">
                      {prof.meme_level}
                    </p>
                  </div>
                </div>

                {/* النقاط والأكشنز */}
                <div className="flex items-center gap-4">
                  <div className="text-center shrink-0">
                    <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-xl border border-gray-300 dark:border-gray-700 shadow-sm dark:shadow-none">
                      <Flame className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400 fill-orange-500 dark:fill-orange-400" />
                      <span className="text-xs font-black text-gray-900 dark:text-white font-mono tracking-tight">
                        {formatCompactNumber(prof.total_points)}
                      </span>
                    </div>
                    <span className="text-[8px] text-gray-400 dark:text-gray-500 font-bold block mt-0.5">نقاط التفاعل</span>
                  </div>

                  {!isMe && (
                    <button
                      onClick={() => onFollowToggle(currentUser.id, prof.id)}
                      disabled={isFollowing}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                        isFollowing
                          ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border border-gray-100 dark:border-gray-800 cursor-not-allowed"
                          : "bg-[#caa24a] text-[#1a1305] hover:bg-[#e8c468] shadow-sm hover:scale-105"
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

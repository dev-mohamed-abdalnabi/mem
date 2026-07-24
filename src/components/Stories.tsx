import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, X, ChevronLeft, ChevronRight, Type, Video, Eye, MoreVertical, Trash2, EyeOff, Volume2, VolumeX } from "lucide-react";
import { Story, Profile } from "../types";
import { dataService } from "../services/dataService";
import { socialService } from "../services/socialService";

interface StoriesProps {
  currentUser: Profile;
  // بتتنادى لما عارض الحالة يتفتح/يتقفل، عشان App.tsx يعرف يتحكم في زرار
  // الرجوع في الموبايل صح (يقفل العارض بس، مش يقفز لصفحة تانية)
  onStoryViewerChange?: (isOpen: boolean, closeFn: (() => void) | null) => void;
  // بتتنادى لما حد يدوس على أفاتار في القايمة (مثلاً في قايمة اللي شافوا الحالة)
  // عشان نقفل عارض الحالة وننقله لبروفايل صاحب الأفاتار
  onUserProfileClick?: (userId: string) => void;
}

// أقصى مدة مسموحة لفيديو الحالة (بالثواني)
const MAX_STORY_VIDEO_SECONDS = 60;

// بوستر افتراضي بسيط (بكسل غامق شفاف) - من غير ما نحط poster خالص، المتصفح
// بيرسم شكله الافتراضي (دايرة سودة بسهم تشغيل جواها على خلفية رمادية) لحد
// ما الفيديو يوصل، وده اللي كان بيبان "غريب" وكإنه مش من تصميم التطبيق.
// نفس التقنية المستخدمة في CustomVideoPlayer بالظبط.
const STORY_VIDEO_FALLBACK_POSTER =
  "data:image/svg+xml;base64," +
  btoa('<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><rect width="4" height="4" fill="#000000"/></svg>');

// مدة عرض حالة الصورة/النص الواحدة بستايل واتساب (بالميلي ثانية) قبل ما تتقدم تلقائي
const STORY_IMAGE_DURATION_MS = 5000;

// أقصى عدد مرات مسموح تخفي فيها الحالة الواحدة
const MAX_STORY_HIDES = 2;

// إيموجيهات التفاعل السريع بستايل واتساب
const QUICK_REACTIONS = ["❤️", "😂", "😮", "😢", "👏", "🔥"];

// ألوان تدرج حلقة الحالة (نفس روح انستجرام/واتساب)
const RING_GRADIENT_STOPS: [number, number, number][] = [
  [245, 158, 11], // amber-500
  [236, 72, 153],  // pink-500
  [59, 130, 246],  // blue-500
];

function lerp(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t);
}

// بيرجع لون في نقطة t (من 0 لـ 1) على تدرج متعدد النقط
function colorAt(t: number): string {
  const segs = RING_GRADIENT_STOPS.length - 1;
  const scaled = Math.min(Math.max(t, 0), 1) * segs;
  const idx = Math.min(Math.floor(scaled), segs - 1);
  const localT = scaled - idx;
  const [r1, g1, b1] = RING_GRADIENT_STOPS[idx];
  const [r2, g2, b2] = RING_GRADIENT_STOPS[idx + 1];
  return `rgb(${lerp(r1, r2, localT)}, ${lerp(g1, g2, localT)}, ${lerp(b1, b2, localT)})`;
}

// بيبني خلفية conic-gradient لحلقة الأفاتار مقسّمة على عدد الحالات،
// كل حتة تمثل حالة: ملونة لو لسه ما اتشافتش، ورمادية لو اتشافت خلاص.
// نفس فكرة شريط التقدم المقسّم اللي بيظهر جوه عارض الحالة.
function buildStoryRingBackground(uStories: Story[], viewedStoryIds: Set<string>): string {
  const n = uStories.length;
  if (n <= 1) {
    return "linear-gradient(to top right, rgb(245,158,11), rgb(236,72,153), rgb(59,130,246))";
  }
  const gapDeg = Math.min(8, 360 / n / 4); // فجوة صغيرة بين كل حتة وبعضها
  const segDeg = 360 / n;
  const stops: string[] = [];
  for (let i = 0; i < n; i++) {
    const viewed = viewedStoryIds.has(uStories[i]?.id);
    const color = viewed ? "rgba(209, 213, 219, 0.9)" : colorAt(n === 1 ? 0 : i / (n - 1));
    const start = i * segDeg;
    const end = start + segDeg - gapDeg;
    stops.push(`${color} ${start}deg ${end}deg`);
    stops.push(`transparent ${end}deg ${start + segDeg}deg`);
  }
  return `conic-gradient(from -90deg, ${stops.join(", ")})`;
}

/**
 * توقيت نسبي حقيقي بالعربي بدل ما كانت كل الحالات مكتوب عليها "قبل قليل"
 * بشكل ثابت مهما كان وقتها الفعلي.
 */
function relativeTimeAr(dateStr: string): string {
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return "الآن";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `من ${diffMin} ${diffMin === 1 ? "دقيقة" : "دقايق"}`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `من ${diffHour} ${diffHour === 1 ? "ساعة" : "ساعات"}`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 2) return "امبارح";
  return date.toLocaleDateString("ar-EG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

export default function Stories({ currentUser, onStoryViewerChange, onUserProfileClick }: StoriesProps) {
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploadStage, setUploadStage] = useState<string>("");
  // بستايل واتساب: الحالات اللي اتشافت فعلياً (محفوظة في الداتابيز، مش بترجع تختفي بعد ريفريش)
  const [viewedStoryIds, setViewedStoryIds] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createMode, setCreateMode] = useState<'image' | 'video' | 'text' | null>(null);
  const [textContent, setTextContent] = useState("");
  const [textBgColor, setTextBgColor] = useState("#1877F2");
  const [textFontSize, setTextFontSize] = useState(32);
  const [myReactions, setMyReactions] = useState<Record<string, string>>({});
  const [reactionFeedback, setReactionFeedback] = useState<string | null>(null);
  const [showViewers, setShowViewers] = useState(false);
  const [viewersList, setViewersList] = useState<{ viewer: Profile; emoji: string | null; viewedAt: string }[]>([]);
  const [loadingViewers, setLoadingViewers] = useState(false);
  // فلتر شيت "مين شاف الحالة": كل الناس، أو المتفاعلين بس (اللي حطوا إيموجي)
  const [viewersFilter, setViewersFilter] = useState<"all" | "reacted">("all");
  // متابَعين المستخدم الحالي - مستخدمة في ترتيب شريط الحالات (خوارزمية زي انستجرام)
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  // ترتيب أصحاب الحالات (author_id) زي ما رجعته get_ranked_stories_v2 -
  // بيبقى null لحد ما يوصل الرد، أو لو فشل الطلب (وقتها بنستخدم الترتيب
  // المحلي القديم كـ fallback بدل ما الشريط يفضل واقف من غير ترتيب)
  const [rankedAuthorOrder, setRankedAuthorOrder] = useState<string[] | null>(null);
  // شريط التقدم بستايل واتساب: نسبة التقدم (0-100) للحالة الحالية + هل الوقت متوقف مؤقتاً
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [busyAction, setBusyAction] = useState(false);
  const progressStartRef = useRef<number>(0);
  const progressElapsedRef = useRef<number>(0);
  const isPausedRef = useRef<boolean>(false);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  // بيفضل true لحد ما أول فريم فعلي من فيديو الحالة يوصل - بنستخدمها عشان
  // نعرض سكيلتون بسيط بستايل التطبيق بدل ما نسيب المساحة سودا فاضية أو
  // شكل المتصفح الافتراضي يبان قبل التحميل
  const [isStoryVideoLoading, setIsStoryVideoLoading] = useState(false);
  // بنصفّر الحالة دي لـ true فوراً (قبل أي رسم على الشاشة) أول ما نتنقل
  // لحالة فيديو جديدة - قبل كده كانت بتتصفر بس جوه onLoadStart، وده حدث
  // بيتأخر شوية على النت البطيء، فكان بيفضل فريم أو أكتر يبان فيها عنصر
  // الـ<video> عاري (وشكل التشغيل الافتراضي بتاع المتصفح/النظام بيبان
  // فوقه) قبل ما سكيلتون التطبيق يظهر فوقه.
  useLayoutEffect(() => {
    if (selectedStory?.media_type === 'video') {
      setIsStoryVideoLoading(true);
    }
  }, [selectedStory?.id, selectedStory?.media_type]);
  // فيديو الحالة كان بيحاول يشتغل بالصوت على طول من غير muted، وسياسة
  // الأوتوبلاي في متصفحات الموبايل بترفض تشغيل فيديو بصوت من غير تفاعل
  // مباشر قبلها. الرفض ده كان بيتبلع (catch فاضي) من غير أي fallback،
  // فالفيديو كان بيفضل واقف تماماً وميبقاش بيحمّل حتى، والمتصفح كان بيعرض
  // شكله الافتراضي (دايرة تشغيل رمادية) مكان الحالة بدل تصميمنا. دلوقتي
  // بنكتم ونعيد المحاولة تلقائي لو الرفض بسبب سياسة الأوتوبلاي بالظبط،
  // ونديله زرار كتم/صوت زي باقي فيديوهات التطبيق.
  const [isMuted, setIsMuted] = useState(false);
  const rafRef = useRef<number | null>(null);
  // سحب الحالة لتحت لقفلها (زي فيسبوك وواتساب) - بنتابع مكان بداية اللمس
  // وبنحرك شاشة الحالة كلها مع الإصبع، وبنقفل لو السحب عدى مسافة معينة
  const [storyDragY, setStoryDragY] = useState(0);
  const storyDragStateRef = useRef<{ startX: number; startY: number; dragging: boolean } | null>(null);
  const STORY_CLOSE_DRAG_PX = 120;

  const isRealUser = currentUser?.id && currentUser.id !== "guest-user-temp";

  // 1. تحميل الحالات + الحالات اللي المستخدم شافها فعلياً + تفاعلاته من قبل
  useEffect(() => {
    loadStories();
    if (isRealUser) {
      socialService.getViewedStoryIds(currentUser.id).then(ids => setViewedStoryIds(new Set(ids)));
      socialService.getMyStoryReactions(currentUser.id).then(setMyReactions);
      dataService.getFollowingList(currentUser.id).then(ids => setFollowingIds(new Set(ids)));
      // ترتيب حقيقي من الخوارزمية (get_ranked_stories_v2): affinity-based بدل
      // following-only. لو فشل الاستدعاء (مثلاً مستخدم مش عنده صلاحية أو
      // مشكلة شبكة)، بنسيب الترتيب المحلي القديم (following + unseen + latest)
      // يشتغل عادي كـ fallback، مفيش داعي نكسر عرض الحالات بسبب كده.
      dataService.getRankedStories()
        .then(rows => setRankedAuthorOrder(rows.map(r => r.author_id)))
        .catch(() => setRankedAuthorOrder(null));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.id]);

  const loadStories = async () => {
    try {
      const data = await socialService.getStories();
      setStories(data || []);
    } catch (e) {
      console.error(e);
      setStories([]);
    }
  };

  // 2. تجميع الحالات حسب صاحبها
  const userStories = useMemo(() => {
    return (stories || []).reduce<Record<string, Story[]>>((acc, story) => {
      const uid = story?.user_id;
      if (!uid) return acc;
      if (!acc[uid]) acc[uid] = [];
      acc[uid].push(story);
      return acc;
    }, {} as Record<string, Story[]>);
  }, [stories]);

  const currentUserStories = useMemo(() => {
    return selectedStory ? userStories[selectedStory.user_id] || [] : [];
  }, [selectedStory, userStories]);

  /**
   * ترتيب شريط الحالات زي انستجرام بالظبط: الحالات اللي لسه ماتشافتش الأول
   * (عشان محدش يفوّته حاجة جديدة)، وجوه كل مجموعة (مشافة/مش مشافة) اللي
   * بتتابعهم بيتقدموا على اللي مش بتابعهم، وأخيراً الأحدث تحديثاً. كان
   * الترتيب قبل كده مجرد ترتيب الرد من الداتابيز (بالتاريخ بس) من غير أي
   * منطق حقيقي.
   */
  const sortedUserIds = useMemo(() => {
    const localFallbackSort = (uidA: string, uidB: string) => {
      const storiesA = userStories[uidA];
      const storiesB = userStories[uidB];
      const unseenA = !storiesA.every(s => viewedStoryIds.has(s.id));
      const unseenB = !storiesB.every(s => viewedStoryIds.has(s.id));
      if (unseenA !== unseenB) return unseenA ? -1 : 1;

      const followingA = followingIds.has(uidA);
      const followingB = followingIds.has(uidB);
      if (followingA !== followingB) return followingA ? -1 : 1;

      const latestA = Math.max(...storiesA.map(s => new Date(s.created_at).getTime()));
      const latestB = Math.max(...storiesB.map(s => new Date(s.created_at).getTime()));
      return latestB - latestA;
    };

    // لو الخوارزمية (get_ranked_stories_v2) رجعت ترتيب فعلي، بنستخدمه هو
    // الأساس (بيراعي affinity حقيقي مش following بس)، وأي مستخدم عنده
    // حالات جديدة محلياً لسه ما وصلتش السيرفر بيها بنضيفه في الآخر بالترتيب
    // المحلي القديم عشان محدش يختفي من الشريط.
    if (rankedAuthorOrder) {
      const known = new Set(Object.keys(userStories));
      const fromServer = rankedAuthorOrder.filter(uid => known.has(uid));
      const missing = Object.keys(userStories)
        .filter(uid => !fromServer.includes(uid))
        .sort(localFallbackSort);
      return [...fromServer, ...missing];
    }

    return Object.keys(userStories).sort(localFallbackSort);
  }, [userStories, viewedStoryIds, followingIds, rankedAuthorOrder]);

  // منع تمرير الصفحة الرئيسية لما يكون فيه حالة أو مودال إنشاء مفتوح
  useEffect(() => {
    const shouldLock = !!selectedStory || showCreateModal;
    document.body.style.overflow = shouldLock ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [selectedStory, showCreateModal]);

  /**
   * كان عارض الحالة بيتفتح من غير ما يسجل خطوة في الـ browser history، فزرار
   * الرجوع في أندرويد كان بيتخطى الحالة ويطبق آخر خطوة متسجلة قبلها (زي
   * تبويب بروفايل كان مفتوح قبل كده)، فتحس إنك "قفزت" لصفحة تانية غلط بدل ما
   * الحالة تتقفل بس. دلوقتي أول ما الحالة تتفتح بنسجل خطوة history، وبنبلّغ
   * App.tsx (اللي بيدير زرار الرجوع مركزياً زي باقي المودالز) إن فيه عارض
   * حالة مفتوح ومعاه دالة قفل، عشان زرار الرجوع يقفل العارض بس مهما كان.
   */
  const pushedHistoryRef = useRef(false);
  useEffect(() => {
    if (selectedStory && !pushedHistoryRef.current) {
      pushedHistoryRef.current = true;
      window.history.pushState({ storyViewer: true }, "", window.location.href);
      onStoryViewerChange?.(true, () => setSelectedStory(null));
    } else if (!selectedStory && pushedHistoryRef.current) {
      pushedHistoryRef.current = false;
      onStoryViewerChange?.(false, null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStory]);

  // تسجيل المشاهدة فعلياً في الداتابيز أول ما الحالة تتفتح
  const markViewed = (story: Story) => {
    setViewedStoryIds(prev => new Set(prev).add(story.id));
    if (isRealUser) socialService.markStoryViewed(story.id, currentUser.id);
  };

  /**
   * الإغلاق اليدوي للعارض (زرار X، الضغط على الخلفية، آخر حالة، حذف/إخفاء
   * الحالة...). بما إننا سجلنا خطوة history لما العارض اتفتح، لازم نرجعها
   * (history.back) بدل ما نقفل الـ state على طول - وإلا هتفضل خطوة "زومبي"
   * في الـ history تخلي أول ضغطة رجوع بعد كده حاسس إنها "ملهاش تأثير".
   * الإغلاق الفعلي للـ state بيحصل من جوه معالج popstate المركزي في App.tsx.
   */
  const closeStoryViewer = () => {
    if (pushedHistoryRef.current) {
      window.history.back();
    } else {
      setSelectedStory(null);
    }
  };

  // بداية سحب الحالة - بنسجل مكان اللمس ومنعتبرهاش سحب لتحت غير لو الحركة
  // الرأسية اتأكدت (عشان مايتعارضش مع مناطق التنقل يمين/شمال)
  const handleStoryPointerDown = (e: React.PointerEvent) => {
    storyDragStateRef.current = { startX: e.clientX, startY: e.clientY, dragging: false };
  };
  const handleStoryPointerMove = (e: React.PointerEvent) => {
    const state = storyDragStateRef.current;
    if (!state) return;
    const deltaY = e.clientY - state.startY;
    const deltaX = e.clientX - state.startX;
    if (!state.dragging && deltaY > 10 && deltaY > Math.abs(deltaX)) {
      state.dragging = true;
      setIsPaused(true);
    }
    if (state.dragging) setStoryDragY(Math.max(0, deltaY));
  };
  const handleStoryPointerUp = () => {
    const state = storyDragStateRef.current;
    if (state?.dragging) {
      if (storyDragY > STORY_CLOSE_DRAG_PX) {
        closeStoryViewer();
      } else {
        setIsPaused(false);
      }
    }
    storyDragStateRef.current = null;
    setStoryDragY(0);
  };

  const openStory = (story: Story, index: number) => {
    setSelectedStory(story);
    setSelectedStoryIndex(index);
    setProgress(0);
    setStoryDragY(0);
    markViewed(story);
  };

  const goToIndex = (nextIndex: number) => {
    if (nextIndex < 0) return;
    if (nextIndex >= currentUserStories.length) {
      // خلصت حالات الشخص ده، نقفل العارض زي واتساب
      closeStoryViewer();
      return;
    }
    const next = currentUserStories[nextIndex];
    setSelectedStory(next);
    setSelectedStoryIndex(nextIndex);
    setProgress(0);
    markViewed(next);
  };

  // 3. التنقل بالكيبورد
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedStory) return;
      if (e.key === "Escape") closeStoryViewer();
      if (e.key === "ArrowLeft") goToIndex(selectedStoryIndex - 1);
      if (e.key === "ArrowRight") goToIndex(selectedStoryIndex + 1);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStory, selectedStoryIndex, currentUserStories]);

  // بنشغّل فيديو الحالة يدوياً (بدل ما نعتمد على خاصية autoPlay) عشان نقدر
  // نمسك رفض المتصفح (NotAllowedError) لما يحاول يشغّل بصوت من غير كتم -
  // وقتها بنكتم ونعيد المحاولة، بدل ما نسيب الفيديو واقف والمتصفح يعرض
  // شكله الافتراضي (دايرة تشغيل رمادية) مكانه.
  useEffect(() => {
    if (selectedStory?.media_type !== "video") return;
    const v = videoElRef.current;
    if (!v) return;
    v.muted = isMuted;
    v.play().catch((err) => {
      if (err?.name === "NotAllowedError" && !v.muted) {
        v.muted = true;
        setIsMuted(true);
        v.play().catch(() => {});
      }
    });
  }, [selectedStory?.id, selectedStory?.media_type, isMuted]);

  // بنحدّث الـ ref بس لما isPaused يتغيّر، من غير ما نعيد تشغيل عداد
  // التقدم؛ لو سبناه dependency في الـ effect اللي تحت، كل دوسة/تطة
  // كانت بترجّع الشريط لصفر وتبوّظ التقدم (المشكلة الأصلية).
  useEffect(() => {
    isPausedRef.current = isPaused;
    // لو المستخدم مسك (pause)، نثبّت لحظة البداية عشان لما يسيب يكمل من نفس النقطة
    progressStartRef.current = performance.now() - progressElapsedRef.current;

    // لما تكون الحالة فيديو، مسك الشاشة كان بيوقف حساب شريط التقدم بس، من غير
    // ما يوقف الفيديو الفعلي نفسه - فالفيديو كان فاضل شغال (بصوت وصورة) في
    // الخلفية وكأن حد ماسكش حاجة أصلاً. دلوقتي بنوقف/نشغّل عنصر الـ<video>
    // نفسه مع نفس حركة الإمساك، بالظبط زي واتساب/انستجرام.
    const v = videoElRef.current;
    if (v && selectedStory?.media_type === "video") {
      if (isPaused) v.pause();
      else v.play().catch(() => {});
    }
  }, [isPaused, selectedStory]);

  // شريط التقدم بستايل واتساب/انستجرام: بيتعبى تلقائي مع الوقت وبيتنقل
  // للحالة اللي بعدها لوحده. للصور بنستخدم مدة ثابتة (5 ثواني)، وللفيديو
  // بنتبع تقدم الفيديو نفسه (currentTime/duration) عشان يتزامنوا مع بعض.
  useEffect(() => {
    if (!selectedStory) return;
    setProgress(0);
    progressElapsedRef.current = 0;
    progressStartRef.current = performance.now();

    const isVideo = selectedStory.media_type === "video";
    setIsStoryVideoLoading(isVideo);

    const tick = (now: number) => {
      if (isPausedRef.current) {
        progressStartRef.current = now - progressElapsedRef.current;
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      if (isVideo) {
        const v = videoElRef.current;
        if (v && v.duration) {
          setProgress(Math.min(100, (v.currentTime / v.duration) * 100));
        }
      } else {
        const elapsed = now - progressStartRef.current;
        progressElapsedRef.current = elapsed;
        const pct = Math.min(100, (elapsed / STORY_IMAGE_DURATION_MS) * 100);
        setProgress(pct);
        if (pct >= 100) {
          goToIndex(selectedStoryIndex + 1);
          return;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStory?.id]);

  // الفيديو بيوصل لآخره: ننتقل للحالة اللي بعدها
  const handleVideoEnded = () => goToIndex(selectedStoryIndex + 1);

  // زرار الإخفاء لمدة ساعة (بحد أقصى مرتين للحالة الواحدة)
  const handleHideStory = async () => {
    if (!selectedStory || busyAction) return;
    setBusyAction(true);
    try {
      await socialService.hideStoryForHour(selectedStory.id);
      setShowOptionsMenu(false);
      closeStoryViewer();
      await loadStories();
    } catch (e: any) {
      alert(e?.message || "مقدرناش نخفي الحالة، حاول تاني.");
    } finally {
      setBusyAction(false);
    }
  };

  // زرار الحذف النهائي للحالة
  const handleDeleteStory = async () => {
    if (!selectedStory || busyAction) return;
    if (!confirm("متأكد إنك عايز تمسح الحالة دي نهائياً؟")) return;
    setBusyAction(true);
    try {
      await socialService.deleteStory(selectedStory.id);
      setShowOptionsMenu(false);
      closeStoryViewer();
      await loadStories();
    } catch (e: any) {
      alert(e?.message || "مقدرناش نمسح الحالة، حاول تاني.");
    } finally {
      setBusyAction(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isRealUser) {
      alert("سجل دخول الأول يا بطل عشان ترفع حالة!");
      return;
    }

    // فحص مدة الفيديو للحالات - أقصى دقيقة واحدة (طلب صريح، الحالات بس مش المنشورات)
    if (file.type.startsWith("video/")) {
      const durationOk = await new Promise<boolean>((resolve) => {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.onloadedmetadata = () => {
          window.URL.revokeObjectURL(video.src);
          resolve(video.duration <= MAX_STORY_VIDEO_SECONDS);
        };
        video.onerror = () => resolve(false);
        video.src = URL.createObjectURL(file);
      });
      if (!durationOk) {
        alert("فيديو الحالة لازم يكون دقيقة أو أقل.");
        return;
      }
    }

    setLoading(true);
    setUploadStage("جاري رفع الملف...");
    try {
      const url = await dataService.uploadMemeFile(file);
      const type = file.type.startsWith('video/') ? 'video' : 'image';
      setUploadStage("جاري نشر الحالة...");
      await socialService.createStory(currentUser.id, url, type);
      await loadStories();
      setShowCreateModal(false);
      setCreateMode(null);
    } catch (e) {
      console.error("Story upload error:", e);
      alert("فشل رفع الحالة، اتأكد إنك عامل تسجيل دخول حقيقي.");
    } finally {
      setLoading(false);
      setUploadStage("");
    }
  };

  const handleTextStory = async () => {
    if (!textContent.trim()) {
      alert("اكتب نص الحالة الأول!");
      return;
    }
    if (!isRealUser) {
      alert("سجل دخول الأول يا بطل عشان ترفع حالة!");
      return;
    }

    setLoading(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.fillStyle = textBgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${textFontSize * 2}px Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const words = textContent.split(' ');
        let line = '';
        const lines: string[] = [];
        const maxWidth = canvas.width - 160;

        words.forEach(word => {
          const testLine = line + word + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && line) {
            lines.push(line);
            line = word + ' ';
          } else {
            line = testLine;
          }
        });
        lines.push(line);

        const lineHeight = textFontSize * 2 + 20;
        let y = canvas.height / 2 - ((lines.length - 1) * lineHeight) / 2;
        lines.forEach(l => {
          ctx.fillText(l.trim(), canvas.width / 2, y);
          y += lineHeight;
        });
      }

      canvas.toBlob(async (blob) => {
        if (blob) {
          const file = new File([blob], 'text-story.png', { type: 'image/png' });
          const url = await dataService.uploadMemeFile(file);
          await socialService.createStory(currentUser.id, url, 'image');
          await loadStories();
          setShowCreateModal(false);
          setCreateMode(null);
          setTextContent("");
        }
        setLoading(false);
      });
    } catch (e) {
      console.error("Text story error:", e);
      alert("فشل إنشاء حالة النص");
      setLoading(false);
    }
  };

  const handleReact = async (emoji: string) => {
    if (!selectedStory) return;
    if (!isRealUser) {
      alert("سجل دخول الأول عشان تتفاعل مع الحالة!");
      return;
    }
    setMyReactions(prev => ({ ...prev, [selectedStory.id]: emoji }));
    setReactionFeedback(emoji);
    setTimeout(() => setReactionFeedback(null), 900);
    try {
      await socialService.reactToStory(selectedStory.id, currentUser.id, emoji);
    } catch (e) {
      console.error("Story reaction error:", e);
    }
  };

  // إغلاق قائمة المشاهدين وقائمة الخيارات تلقائياً لما تتنقل بين الحالات
  useEffect(() => { setShowViewers(false); setShowOptionsMenu(false); }, [selectedStory?.id]);

  const openViewersPanel = async () => {
    if (!selectedStory) return;
    setShowViewers(true);
    setLoadingViewers(true);
    try {
      const list = await socialService.getStoryViewersWithReactions(selectedStory.id);
      setViewersList(list);
    } catch (e) {
      console.error("Error loading story viewers:", e);
    } finally {
      setLoadingViewers(false);
    }
  };

  return (
    <>
      <div className="flex gap-3 overflow-x-auto p-4 bg-white border border-gray-100 rounded-3xl shadow-sm m-3 no-scrollbar">
        {/* Add Story */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <button
            onClick={() => setShowCreateModal(true)}
            className="relative cursor-pointer group"
          >
            <img loading="lazy" decoding="async"
              src={currentUser?.avatar_url || ""}
              className="w-14 h-14 rounded-full border-2 border-gray-200 object-cover group-hover:border-blue-500 transition-colors"
              alt="قصتك"
            />
            <div className="absolute bottom-0 right-0 bg-blue-500 text-white rounded-full p-0.5 border-2 border-white group-hover:bg-blue-600 transition-colors">
              <Plus className="w-3 h-3" />
            </div>
          </button>
          <span className="text-[10px] text-gray-500">قصتك</span>
        </div>

        {/* User Stories */}
        {sortedUserIds.map((uid) => {
          const uStories = userStories[uid];
          const isFullyViewed = uStories.every(s => viewedStoryIds.has(s.id));
          return (
            <div
              key={uid}
              className="flex flex-col items-center gap-1 shrink-0 cursor-pointer group"
              onClick={() => openStory(uStories[0], 0)}
            >
              <div
                className={
                  isFullyViewed
                    ? "p-0.5 rounded-full border-2 border-gray-300 group-hover:border-gray-400 transition-colors relative"
                    : "p-[3px] rounded-full group-hover:opacity-90 transition-opacity relative"
                }
                style={isFullyViewed ? undefined : { background: buildStoryRingBackground(uStories, viewedStoryIds) }}
              >
                <img loading="lazy" decoding="async"
                  src={uStories[0]?.profiles?.avatar_url || ""}
                  className="w-14 h-14 rounded-full border-2 border-white object-cover group-hover:scale-105 transition-transform"
                  alt={uStories[0]?.profiles?.username || "مستخدم"}
                />
                {/* شارة عدد الحالات لما يكون عند الشخص أكتر من حالة واحدة */}
                {uStories.length > 1 && (
                  <span className="absolute -bottom-0.5 -left-0.5 bg-blue-500 text-white text-[9px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center border-2 border-white px-1">
                    {uStories.length}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-gray-900 truncate w-14 text-center group-hover:text-blue-600 transition-colors">
                {uStories[0]?.profiles?.username || "مستخدم"}
              </span>
            </div>
          );
        })}
      </div>

      {/* عارض الحالات - شاشة كاملة زي فيسبوك/واتساب */}
      {selectedStory && (
        <div
          data-story-viewer
          className="fixed inset-0 z-[100] bg-black flex flex-col select-none"
          onClick={() => closeStoryViewer()}
          onPointerDown={handleStoryPointerDown}
          onPointerMove={handleStoryPointerMove}
          onPointerUp={handleStoryPointerUp}
          onPointerCancel={handleStoryPointerUp}
          style={{
            transform: storyDragY ? `translateY(${storyDragY}px)` : undefined,
            opacity: storyDragY ? Math.max(1 - storyDragY / 400, 0.4) : 1,
            transition: storyDragY ? "none" : "transform 0.2s ease-out, opacity 0.2s ease-out",
          }}
        >
          {/* شريط التقدم المقسّم بستايل واتساب/انستجرام - بيتعبى تلقائي مع الوقت */}
          {/* z-30 عشان يبان فوق خلفية الهيدر المتدرجة (z-20) اللي كانت بتغطيه بالكامل */}
          {/* dir="ltr" ثابتة: الصفحة كلها rtl، فمن غيرها ترتيب القطاعات وحركة
              التعبئة كانوا بيتقلبوا (يمشوا من اليمين للشمال). شريط الحالات
              لازم يفضل يمشي شمال-لليمين زي واتساب/انستجرام أياً كانت لغة الجهاز */}
          {/* شكل أخف وأحدث: خط رفيع (3px) بحواف مدورة تماماً، مع ظل خفيف على
              الصف الخارجي الثابت نفسه (مش على العنصر المتغيّر العرض جوه
              overflow-hidden - ده كان سبب "المسح" البصري القديم) عشان يفضل
              باين على أي خلفية من غير ما يبان تقيل/بلوكي */}
          <div
            dir="ltr"
            className="absolute top-0 left-0 right-0 z-30 flex gap-1.5 px-3 pt-2.5"
            style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.6))" }}
          >
            {currentUserStories.map((_, i) => (
              <div
                key={i}
                className="h-[3px] flex-1 rounded-full overflow-hidden"
                style={{ backgroundColor: "rgba(255,255,255,0.35)" }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: i < selectedStoryIndex ? "100%" : i === selectedStoryIndex ? `${progress}%` : "0%",
                    transition: i === selectedStoryIndex ? "width 0.1s linear" : undefined,
                    // لازم لون ثابت أبيض صريح جوه inline style، مش كلاس "bg-white" -
                    // عندنا قاعدة CSS عامة في index.css بتحول أي حاجة كلاسها
                    // "bg-white" للون --card (اللي بيبقى غامق في الوضع الداكن)،
                    // وده كان سبب اختفاء شريط التقدم فوق خلفية الحالة السودة.
                    backgroundColor: "#ffffff",
                  }}
                />
              </div>
            ))}
          </div>

          {/* هيدر الحالة بستايل واتساب: أفاتار + اسم + وقت حقيقي + خيارات + إغلاق */}
          <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/70 via-black/30 to-transparent pt-7 pb-6 px-3 flex items-center gap-3">
            <img loading="lazy" decoding="async"
              src={selectedStory?.profiles?.avatar_url || ""}
              className="w-9 h-9 rounded-full border-2 border-white object-cover"
              alt="الملف الشخصي"
            />
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-bold truncate">{selectedStory?.profiles?.username || "مستخدم"}</p>
              <p className="text-white/70 text-xs">{relativeTimeAr(selectedStory.created_at)}</p>
            </div>

            {/* لصاحب الحالة بس: قائمة الثلاث نقط (حذف / إخفاء لمدة ساعة) */}
            {selectedStory.user_id === currentUser.id && (
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowOptionsMenu(v => !v); }}
                  className="text-white bg-white/10 hover:bg-white/20 p-2.5 rounded-full transition-all"
                  title="خيارات الحالة"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
                {showOptionsMenu && (
                  <div
                    className="absolute top-12 left-0 z-30 bg-white dark:bg-gray-900 rounded-2xl shadow-lg overflow-hidden w-56 text-sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={handleDeleteStory}
                      disabled={busyAction}
                      className="w-full flex items-center gap-2 px-4 py-3 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>حذف الحالة</span>
                    </button>
                    <button
                      onClick={handleHideStory}
                      disabled={busyAction || (selectedStory.hide_count || 0) >= MAX_STORY_HIDES}
                      className="w-full flex items-center gap-2 px-4 py-3 text-gray-800 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-40 border-t border-gray-100 dark:border-gray-800"
                    >
                      <EyeOff className="w-4 h-4" />
                      <span>
                        إخفاء لمدة ساعة
                        {" "}({MAX_STORY_HIDES - (selectedStory.hide_count || 0)} متبقية)
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* كتم/تشغيل الصوت - بيظهر بس لو الحالة فيديو */}
            {selectedStory?.media_type === "video" && (
              <button
                onClick={(e) => { e.stopPropagation(); setIsMuted(v => !v); }}
                className="text-white bg-white/10 hover:bg-white/20 p-2.5 rounded-full transition-all"
                title={isMuted ? "تشغيل الصوت" : "كتم الصوت"}
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
            )}

            <button
              onClick={(e) => { e.stopPropagation(); closeStoryViewer(); }}
              className="text-white bg-white/10 hover:bg-white/20 p-2.5 rounded-full transition-all"
              title="إغلاق (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* منطقة عرض الميديا - شاشة كاملة فعلياً */}
          <div
            className="relative flex-1 flex items-center justify-center overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={() => setIsPaused(true)}
            onPointerUp={() => setIsPaused(false)}
            onPointerLeave={() => setIsPaused(false)}
          >
            <AnimatePresence mode="wait">
              {selectedStory?.media_type === 'video' ? (
                <motion.video
                  key={selectedStory.id}
                  ref={(el) => { videoElRef.current = el; }}
                  src={selectedStory?.media_url}
                  poster={STORY_VIDEO_FALLBACK_POSTER}
                  muted={isMuted}
                  autoPlay
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="w-full h-full object-contain"
                  playsInline
                  onEnded={handleVideoEnded}
                  onLoadStart={() => setIsStoryVideoLoading(true)}
                  onLoadedData={() => setIsStoryVideoLoading(false)}
                  onPlaying={() => setIsStoryVideoLoading(false)}
                />
              ) : (
                <motion.img
                  key={selectedStory.id}
                  src={selectedStory?.media_url}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="w-full h-full object-contain"
                  alt="قصة"
                />
              )}
            </AnimatePresence>

            {/* سكيلتون تحميل فيديو الحالة - بنفس ستايل سبينر باقي الفيديوهات
                في التطبيق، بدل ما نسيب شكل المتصفح الافتراضي (دايرة سودة
                وسهم تشغيل جواها) يبان لحد ما الفيديو يوصل */}
            {selectedStory?.media_type === 'video' && isStoryVideoLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black pointer-events-none">
                <div className="w-10 h-10 border-[3px] border-white/15 border-t-white/70 rounded-full animate-spin" />
              </div>
            )}

            {/* منطقة لمس شفافة للتنقل - يمين/شمال زي واتساب وفيسبوك */}
            <button
              onClick={(e) => { e.stopPropagation(); goToIndex(selectedStoryIndex - 1); }}
              className="absolute left-0 top-0 bottom-0 w-1/3 flex items-center justify-start pl-2 opacity-0 hover:opacity-100 transition-opacity"
              disabled={selectedStoryIndex === 0}
            >
              {selectedStoryIndex > 0 && (
                <span className="bg-white/20 text-white p-2 rounded-full"><ChevronLeft className="w-5 h-5" /></span>
              )}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); goToIndex(selectedStoryIndex + 1); }}
              className="absolute right-0 top-0 bottom-0 w-1/3 flex items-center justify-end pr-2 opacity-0 hover:opacity-100 transition-opacity"
            >
              <span className="bg-white/20 text-white p-2 rounded-full"><ChevronRight className="w-5 h-5" /></span>
            </button>

            {/* تفاعل طائر بستايل واتساب لما تدوس على إيموجي */}
            {reactionFeedback && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-7xl animate-ping-once">{reactionFeedback}</span>
              </div>
            )}
          </div>

          {/* لصاحب الحالة بس: زرار يشوف بيه مين شافها ومين تفاعل معاها */}
          {selectedStory.user_id === currentUser.id && (
            <button
              onClick={(e) => { e.stopPropagation(); openViewersPanel(); }}
              className="relative z-20 flex items-center justify-center gap-2 text-white/90 text-xs font-bold px-4 pb-2 pt-3 bg-gradient-to-t from-black/70 to-transparent"
            >
              <Eye className="w-4 h-4" />
              <span>مين شاف الحالة دي</span>
            </button>
          )}

          {/* شريط التفاعلات السريعة بستايل واتساب في الأسفل */}
          <div
            className="relative z-20 flex items-center justify-center gap-3 px-4 pb-6 pt-3 bg-gradient-to-t from-black/70 via-black/30 to-transparent"
            onClick={(e) => e.stopPropagation()}
          >
            {QUICK_REACTIONS.map(emoji => (
              <button
                key={emoji}
                onClick={() => handleReact(emoji)}
                className={`text-2xl w-11 h-11 flex items-center justify-center rounded-full transition-all active:scale-90 ${
                  myReactions[selectedStory.id] === emoji ? "bg-white/30 scale-110" : "bg-white/10 hover:bg-white/20"
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* قائمة مين شاف الحالة وتفاعل معاها - لصاحب الحالة بس */}
          {showViewers && (
            <div
              className="absolute inset-0 z-30 bg-black/70 flex items-end"
              onClick={(e) => { e.stopPropagation(); setShowViewers(false); }}
            >
              <div
                className="w-full bg-white dark:bg-gray-900 rounded-t-3xl max-h-[70vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
                  <h3 className="font-bold text-gray-900 dark:text-white">مشاهدات الحالة ({viewersList.length})</h3>
                  <button onClick={() => setShowViewers(false)} className="text-gray-500 p-1">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                {/* ملخص الإيموجيز اللي اتحطت - نظرة سريعة على التفاعلات من غير ما تفتح الليستة */}
                {(() => {
                  const reactedCount = viewersList.filter(v => v.emoji).length;
                  if (reactedCount === 0) return null;
                  const counts: Record<string, number> = {};
                  viewersList.forEach(v => { if (v.emoji) counts[v.emoji] = (counts[v.emoji] || 0) + 1; });
                  return (
                    <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 dark:border-gray-800 overflow-x-auto">
                      {Object.entries(counts).map(([emoji, count]) => (
                        <span key={emoji} className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-full px-2.5 py-1 text-sm shrink-0">
                          <span>{emoji}</span><span className="font-bold text-gray-700 dark:text-gray-300">{count}</span>
                        </span>
                      ))}
                    </div>
                  );
                })()}
                {/* تبويب: الكل / اللي اتفاعلوا بس - عشان تقدر تشوف مين تفاعل مش شاف بس */}
                <div className="flex border-b border-gray-200 dark:border-gray-800">
                  <button
                    onClick={() => setViewersFilter("all")}
                    className={`flex-1 py-2.5 text-sm font-bold ${viewersFilter === "all" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"}`}
                  >
                    الكل ({viewersList.length})
                  </button>
                  <button
                    onClick={() => setViewersFilter("reacted")}
                    className={`flex-1 py-2.5 text-sm font-bold ${viewersFilter === "reacted" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"}`}
                  >
                    اتفاعلوا ({viewersList.filter(v => v.emoji).length})
                  </button>
                </div>
                <div className="overflow-y-auto flex-1">
                  {loadingViewers ? (
                    <div className="p-8 flex justify-center">
                      <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                    </div>
                  ) : viewersList.length === 0 ? (
                    <p className="text-center text-sm text-gray-500 p-8">لسه محدش شاف الحالة دي</p>
                  ) : (
                    (() => {
                      // بنرتب المتفاعلين الأول عشان يبانوا فوق مباشرة، وبعدين فلترة
                      // حسب التبويب المختار (الكل / اللي اتفاعلوا بس)
                      const sorted = [...viewersList].sort((a, b) => (b.emoji ? 1 : 0) - (a.emoji ? 1 : 0));
                      const filtered = viewersFilter === "reacted" ? sorted.filter(v => v.emoji) : sorted;
                      if (filtered.length === 0) {
                        return <p className="text-center text-sm text-gray-500 p-8">لسه محدش تفاعل مع الحالة دي</p>;
                      }
                      return filtered.map((v, i) => (
                        <div
                          key={i}
                          className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0 ${onUserProfileClick && v.viewer?.id ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50" : ""}`}
                          onClick={() => {
                            if (v.viewer?.id && onUserProfileClick) {
                              onUserProfileClick(v.viewer.id);
                              closeStoryViewer();
                            }
                          }}
                        >
                          <img loading="lazy" decoding="async" src={v.viewer?.avatar_url || ""} className="w-10 h-10 rounded-full object-cover" alt="" />
                          <span className="flex-1 font-bold text-sm text-gray-900 dark:text-white">{v.viewer?.username || "مستخدم"}</span>
                          {v.emoji && <span className="text-xl">{v.emoji}</span>}
                        </div>
                      ));
                    })()
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* مودال إنشاء حالة جديدة */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
          {loading && createMode !== 'text' && (
            <div className="absolute inset-0 z-10 bg-black/80 flex flex-col items-center justify-center gap-3">
              <div className="w-10 h-10 border-4 border-white/20 border-t-blue-400 rounded-full animate-spin" />
              <p className="text-sm font-bold text-white">{uploadStage || "جاري الرفع..."}</p>
            </div>
          )}
          {!createMode ? (
            <div className="bg-white dark:bg-gray-900 w-full h-full flex flex-col">
              <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">إنشاء حالة جديدة</h2>
                <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-gray-900 dark:hover:text-white p-2">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-3 flex-1">
                <label className="block">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { setCreateMode('image'); handleFileUpload(e); }}
                    disabled={loading}
                  />
                  <div className="flex items-center gap-4 p-4 border-2 border-dashed border-blue-300 rounded-xl cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                      <img loading="lazy" decoding="async" className="w-6 h-6" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%231877F2'%3E%3Crect x='3' y='3' width='18' height='18' rx='2'/%3E%3Ccircle cx='9' cy='9' r='2' fill='white'/%3E%3Cpath d='M3 15l6-6 9 9' stroke='white' stroke-width='2' fill='none'/%3E%3C/svg%3E" alt="صورة" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">صورة</p>
                      <p className="text-xs text-gray-500">اختر صورة من جهازك</p>
                    </div>
                  </div>
                </label>

                <label className="block">
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => { setCreateMode('video'); handleFileUpload(e); }}
                    disabled={loading}
                  />
                  <div className="flex items-center gap-4 p-4 border-2 border-dashed border-purple-300 rounded-xl cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-950 transition-colors">
                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                      <Video className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">فيديو</p>
                      <p className="text-xs text-gray-500">أقصى مدة دقيقة واحدة</p>
                    </div>
                  </div>
                </label>

                <button
                  onClick={() => setCreateMode('text')}
                  className="flex items-center gap-4 p-4 border-2 border-dashed border-green-300 rounded-xl cursor-pointer hover:bg-green-50 dark:hover:bg-green-950 transition-colors w-full"
                >
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                    <Type className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">نص</p>
                    <p className="text-xs text-gray-500">اكتب نص ملون بخلفية من اختيارك</p>
                  </div>
                </button>
              </div>
            </div>
          ) : createMode === 'text' ? (
            // محرر نص بستايل واتساب: شاشة كاملة، الخلفية اللونية تملأ الشاشة، الكتابة فوقها مباشرة
            <div className="w-full h-full flex flex-col relative" style={{ backgroundColor: textBgColor }}>
              <div className="relative z-10 flex items-center justify-between p-4">
                <button onClick={() => setCreateMode(null)} className="text-white bg-black/20 hover:bg-black/30 p-2.5 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
                <div className="flex gap-2">
                  {['#1877F2', '#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181', '#111827'].map(color => (
                    <button
                      key={color}
                      onClick={() => setTextBgColor(color)}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${textBgColor === color ? 'border-white scale-110' : 'border-white/40'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex-1 flex items-center justify-center px-8">
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="اكتب نصك هنا"
                  autoFocus
                  className="w-full bg-transparent border-none outline-none resize-none text-white font-bold text-center placeholder-white/60"
                  style={{ fontSize: `${textFontSize}px`, minHeight: "40%" }}
                />
              </div>

              <div className="relative z-10 p-4 flex items-center gap-3">
                <span className="text-white text-sm">حجم الخط</span>
                <input
                  type="range"
                  min="16"
                  max="64"
                  value={textFontSize}
                  onChange={(e) => setTextFontSize(Number(e.target.value))}
                  className="flex-1"
                />
                <button
                  onClick={handleTextStory}
                  disabled={loading || !textContent.trim()}
                  className="bg-white text-gray-900 disabled:bg-white/40 disabled:text-white font-bold px-6 py-2.5 rounded-full transition-colors shrink-0"
                >
                  {loading ? "..." : "نشر"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </>
  );
}

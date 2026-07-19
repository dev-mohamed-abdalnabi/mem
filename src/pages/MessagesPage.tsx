import React, { useState, useEffect, useRef, useCallback } from "react";
import { ArrowRight, Send, Image as ImageIcon, Search, MessageCircle, Loader2, X, Check, CheckCheck } from "lucide-react";
import { Profile, ConversationListItem, DBMessage } from "../types";
import { messagesService } from "../services/messagesService";

interface MessagesPageProps {
  currentUser: Profile;
  profiles: Profile[];
  onUserProfileClick: (userId: string) => void;
  onUnreadCountChange: (count: number) => void;
  /** لو الصفحة اتفتحت من زرار "راسلني" في بروفايل حد معين، بنفتح شاته على طول */
  initialOtherUserId?: string | null;
  onInitialConversationConsumed?: () => void;
}

function formatMessageTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit" });
  }
  return date.toLocaleDateString("ar-EG", { day: "numeric", month: "short" });
}

export default function MessagesPage({
  currentUser,
  profiles,
  onUserProfileClick,
  onUnreadCountChange,
  initialOtherUserId,
  onInitialConversationConsumed,
}: MessagesPageProps) {
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [activeConversation, setActiveConversation] = useState<ConversationListItem | null>(null);
  const [showMobileChat, setShowMobileChat] = useState(false);

  const [messages, setMessages] = useState<DBMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [attachedImage, setAttachedImage] = useState<File | null>(null);
  const [attachedPreview, setAttachedPreview] = useState<string | null>(null);

  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeConversationRef = useRef<ConversationListItem | null>(null);
  activeConversationRef.current = activeConversation;

  const refreshConversations = useCallback(async () => {
    try {
      const list = await messagesService.getConversations(currentUser.id);
      setConversations(list);
      onUnreadCountChange(list.reduce((sum, c) => sum + c.unread_count, 0));
    } catch (e) {
      console.error("خطأ في تحميل المحادثات:", e);
    }
  }, [currentUser.id, onUnreadCountChange]);

  // تحميل قايمة المحادثات أول ما الصفحة تفتح
  useEffect(() => {
    setLoadingConversations(true);
    refreshConversations().finally(() => setLoadingConversations(false));
  }, [refreshConversations]);

  // الاشتراك اللايف في أي رسالة جديدة (حتى لو شاتها مش مفتوح) عشان
  // قايمة المحادثات والبادج يتحدثوا فوراً
  useEffect(() => {
    const unsubscribe = messagesService.subscribeToInbox(() => {
      refreshConversations();
      // لو المحادثة النشطة استقبلت رسالة، هنضيفها في الشات المفتوح كمان
      // (الاشتراك التاني بيغطي ده أصلاً، السطر ده مجرد أمان إضافي)
    });
    return unsubscribe;
  }, [refreshConversations]);

  const openConversation = useCallback(async (conv: ConversationListItem) => {
    setActiveConversation(conv);
    setShowMobileChat(true);
    setLoadingMessages(true);
    setMessages([]);
    try {
      const msgs = await messagesService.getMessages(conv.id);
      setMessages(msgs);
      if (conv.unread_count > 0) {
        await messagesService.markConversationRead(conv.id);
        setConversations((prev) => prev.map((c) => (c.id === conv.id ? { ...c, unread_count: 0 } : c)));
        // كانت هنا بتستخدم متغير conversations القديم (اللقطة الفاضية وقت أول
        // تحميل للكومبوننت) بسبب الـ useCallback بمصفوفة deps فاضية، فكان
        // البادج بيتحسب غلط. refreshConversations() بيجيب الرقم الصح من
        // الداتابيز على طول بدل ما نحسبه محلياً من بيانات ممكن تكون قديمة.
        refreshConversations();
      }
    } catch (e) {
      console.error("خطأ في تحميل الرسايل:", e);
    } finally {
      setLoadingMessages(false);
    }
  }, [refreshConversations]);

  // لو جاي من بروفايل حد بضغطة "راسلني"، افتح/أنشئ المحادثة على طول
  useEffect(() => {
    if (!initialOtherUserId) return;
    (async () => {
      try {
        const convId = await messagesService.getOrCreateConversation(initialOtherUserId);
        const otherUser = profiles.find((p) => p.id === initialOtherUserId);
        const existing = conversations.find((c) => c.id === convId);
        const conv: ConversationListItem =
          existing || {
            id: convId,
            otherUser: otherUser || ({ id: initialOtherUserId, username: "مستخدم" } as Profile),
            last_message: null,
            last_message_at: null,
            unread_count: 0,
          };
        await openConversation(conv);
        await refreshConversations();
      } catch (e) {
        console.error("خطأ في فتح المحادثة:", e);
      } finally {
        onInitialConversationConsumed?.();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialOtherUserId]);

  // الاشتراك اللايف برسايل المحادثة المفتوحة حالياً بس
  useEffect(() => {
    if (!activeConversation) return;
    const unsubscribe = messagesService.subscribeToConversationMessages(activeConversation.id, (msg) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      if (msg.sender_id !== currentUser.id) {
        messagesService.markConversationRead(activeConversation.id).catch(() => {});
      }
    });
    return unsubscribe;
  }, [activeConversation, currentUser.id]);

  // نزول تلقائي لآخر رسالة
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleAttachImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachedImage(file);
    setAttachedPreview(URL.createObjectURL(file));
  };

  const clearAttachment = () => {
    setAttachedImage(null);
    setAttachedPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSend = async () => {
    if (!activeConversation || sending) return;
    const trimmed = messageText.trim();
    if (!trimmed && !attachedImage) return;

    setSending(true);
    try {
      let imageUrl: string | null = null;
      if (attachedImage) {
        imageUrl = await messagesService.uploadMessageImage(attachedImage);
      }
      const sent = await messagesService.sendMessage(activeConversation.id, currentUser.id, trimmed || null, imageUrl);
      setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]));
      setMessageText("");
      clearAttachment();
      refreshConversations();
    } catch (e) {
      console.error("خطأ في إرسال الرسالة:", e);
      alert("حصل خطأ في إرسال الرسالة، حاول تاني.");
    } finally {
      setSending(false);
    }
  };

  const handleStartNewChat = async (otherUser: Profile) => {
    setShowNewChat(false);
    setNewChatSearch("");
    try {
      const convId = await messagesService.getOrCreateConversation(otherUser.id);
      const existing = conversations.find((c) => c.id === convId);
      const conv: ConversationListItem =
        existing || { id: convId, otherUser, last_message: null, last_message_at: null, unread_count: 0 };
      await openConversation(conv);
      refreshConversations();
    } catch (e: any) {
      console.error("خطأ في بدء المحادثة:", e);
      alert(e?.message || "حصل خطأ، حاول تاني.");
    }
  };

  const searchResults = profiles.filter(
    (p) =>
      p.id !== currentUser.id &&
      p.username.toLowerCase().includes(newChatSearch.trim().toLowerCase()) &&
      newChatSearch.trim().length > 0
  );

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm h-[calc(100vh-140px)] min-h-[500px] flex">
      {/* ==================== قايمة المحادثات ==================== */}
      <div
        className={`w-full md:w-[340px] shrink-0 border-l border-gray-100 dark:border-gray-800 flex flex-col ${
          showMobileChat ? "hidden md:flex" : "flex"
        }`}
      >
        <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h2 className="font-black text-lg text-gray-900 dark:text-white">الرسايل</h2>
          <button
            onClick={() => setShowNewChat(true)}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
          >
            رسالة جديدة
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingConversations ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center px-6 py-12">
              <MessageCircle className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-400 font-bold">مفيش رسايل لسه</p>
              <p className="text-xs text-gray-400 mt-1">دوس على "رسالة جديدة" وابدأ أول محادثة</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => openConversation(conv)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-right transition-colors ${
                  activeConversation?.id === conv.id
                    ? "bg-blue-50 dark:bg-blue-900/20"
                    : "hover:bg-gray-50 dark:hover:bg-gray-800/60"
                }`}
              >
                {conv.otherUser.avatar_url ? (
                  <img src={conv.otherUser.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 font-black flex items-center justify-center shrink-0">
                    {conv.otherUser.username?.[0] || "؟"}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${conv.unread_count > 0 ? "font-black text-gray-900 dark:text-white" : "font-bold text-gray-700 dark:text-gray-300"}`}>
                    {conv.otherUser.username}
                  </p>
                  <p className={`text-xs truncate mt-0.5 ${conv.unread_count > 0 ? "text-gray-900 dark:text-white font-bold" : "text-gray-400"}`}>
                    {conv.last_message || "ابدأوا المحادثة"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {conv.last_message_at && (
                    <span className="text-[10px] text-gray-400">{formatMessageTime(conv.last_message_at)}</span>
                  )}
                  {conv.unread_count > 0 && (
                    <span className="bg-blue-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">
                      {conv.unread_count > 9 ? "9+" : conv.unread_count}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ==================== نافذة الشات ==================== */}
      <div className={`flex-1 flex flex-col min-w-0 ${showMobileChat ? "flex" : "hidden md:flex"}`}>
        {!activeConversation ? (
          <div className="flex-1 hidden md:flex items-center justify-center text-center px-6">
            <div>
              <MessageCircle className="w-14 h-14 mx-auto mb-4 text-gray-200 dark:text-gray-700" />
              <p className="text-gray-400 font-bold">اختار محادثة من الشمال عشان تبدأ الدردشة</p>
            </div>
          </div>
        ) : (
          <>
            {/* هيدر الشات */}
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
              <button onClick={() => setShowMobileChat(false)} className="md:hidden p-1 -mr-1 text-gray-500">
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => onUserProfileClick(activeConversation.otherUser.id)}
                className="flex items-center gap-3 text-right flex-1 min-w-0"
              >
                {activeConversation.otherUser.avatar_url ? (
                  <img src={activeConversation.otherUser.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 font-black flex items-center justify-center">
                    {activeConversation.otherUser.username?.[0] || "؟"}
                  </div>
                )}
                <p className="font-black text-sm text-gray-900 dark:text-white truncate">{activeConversation.otherUser.username}</p>
              </button>
            </div>

            {/* رسايل الشات */}
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2 bg-gray-50/50 dark:bg-black/20">
              {loadingMessages ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : messages.length === 0 ? (
                <p className="text-center text-xs text-gray-400 py-8">مفيش رسايل لسه، ابعت أول رسالة! 👋</p>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.sender_id === currentUser.id;
                  return (
                    <div key={msg.id} className={`flex w-full ${isMine ? "justify-start" : "justify-end"}`}>
                      <div
                        className={`max-w-[75%] rounded-2xl px-3.5 py-2 ${
                          isMine
                            ? "bg-blue-600 text-white rounded-bl-sm"
                            : "bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white rounded-br-sm"
                        }`}
                      >
                        {msg.image_url && (
                          <img src={msg.image_url} alt="" className="rounded-xl mb-1 max-h-64 object-cover" />
                        )}
                        {msg.content && <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>}
                        <div className={`flex items-center gap-1 mt-1 ${isMine ? "justify-start" : "justify-end"}`}>
                          <span className={`text-[9px] ${isMine ? "text-blue-100" : "text-gray-400"}`}>
                            {formatMessageTime(msg.created_at)}
                          </span>
                          {isMine && (msg.read_at ? <CheckCheck className="w-3 h-3 text-blue-100" /> : <Check className="w-3 h-3 text-blue-200" />)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* معاينة الصورة المرفقة */}
            {attachedPreview && (
              <div className="px-4 pt-2 border-t border-gray-100 dark:border-gray-800">
                <div className="relative inline-block">
                  <img src={attachedPreview} alt="" className="h-20 rounded-lg object-cover" />
                  <button
                    onClick={clearAttachment}
                    className="absolute -top-2 -left-2 bg-gray-900 text-white rounded-full w-5 h-5 flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {/* صندوق الكتابة */}
            <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAttachImage}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-9 h-9 shrink-0 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="اكتب رسالة..."
                className="flex-1 h-10 bg-gray-100 dark:bg-gray-800 rounded-full px-4 text-sm outline-none text-gray-900 dark:text-white placeholder:text-gray-400"
              />
              <button
                onClick={handleSend}
                disabled={sending || (!messageText.trim() && !attachedImage)}
                className="w-9 h-9 shrink-0 rounded-full bg-blue-600 text-white flex items-center justify-center disabled:opacity-40 hover:bg-blue-700 transition-colors"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </>
        )}
      </div>

      {/* ==================== مودال بدء محادثة جديدة ==================== */}
      {showNewChat && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowNewChat(false)}>
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm max-h-[70vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h3 className="font-black text-gray-900 dark:text-white">رسالة جديدة</h3>
              <button onClick={() => setShowNewChat(false)} className="text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <div className="relative">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  autoFocus
                  value={newChatSearch}
                  onChange={(e) => setNewChatSearch(e.target.value)}
                  placeholder="دور باسم المستخدم..."
                  className="w-full h-10 bg-gray-100 dark:bg-gray-800 rounded-full pr-9 pl-4 text-sm outline-none text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              {newChatSearch.trim().length === 0 ? (
                <p className="text-center text-xs text-gray-400 py-8">اكتب اسم المستخدم اللي عايز تراسله</p>
              ) : searchResults.length === 0 ? (
                <p className="text-center text-xs text-gray-400 py-8">مفيش نتايج</p>
              ) : (
                searchResults.slice(0, 20).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleStartNewChat(p)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 text-right"
                  >
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 font-black flex items-center justify-center">
                        {p.username?.[0] || "؟"}
                      </div>
                    )}
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{p.username}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

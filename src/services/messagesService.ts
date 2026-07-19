import { supabase } from "../supabaseClient";
import { Profile, DBMessage, ConversationListItem } from "../types";
import { ensureUUID, dataService } from "./dataService";

/**
 * خدمة نظام الرسايل الخاصة (Direct Messages) - زي شات الماسنجر بالظبط:
 * قايمة محادثات، شات لايف مع الطرف التاني، صور، وعداد رسايل مش مقروءة.
 */
export const messagesService = {
  /**
   * جلب قايمة المحادثات الخاصة بالمستخدم الحالي، مرتبة بآخر رسالة، مع ضم
   * بروفايل الطرف التاني وعدد الرسايل الغير مقروءة في كل محادثة.
   */
  getConversations: async (userId: string): Promise<ConversationListItem[]> => {
    if (!userId || userId === "guest-user-temp") return [];
    const uid = ensureUUID(userId);

    const { data: conversations, error } = await supabase
      .from("conversations")
      .select("*")
      .or(`user_one.eq.${uid},user_two.eq.${uid}`)
      .order("last_message_at", { ascending: false, nullsFirst: false });

    if (error) throw error;
    if (!conversations || conversations.length === 0) return [];

    const otherIds = conversations.map((c) => (c.user_one === uid ? c.user_two : c.user_one));
    const uniqueOtherIds = Array.from(new Set(otherIds));

    const { data: otherProfiles, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .in("id", uniqueOtherIds);
    if (profilesError) throw profilesError;

    const profileById = new Map<string, Profile>((otherProfiles || []).map((p) => [p.id, p as Profile]));

    const { data: unreadRows } = await supabase.rpc("get_unread_message_counts");
    const unreadByConversation = new Map<string, number>(
      (unreadRows || []).map((r: { conversation_id: string; unread_count: number }) => [r.conversation_id, Number(r.unread_count)])
    );

    return conversations
      .map((c) => {
        const otherId = c.user_one === uid ? c.user_two : c.user_one;
        const otherUser = profileById.get(otherId);
        if (!otherUser) return null;
        return {
          id: c.id,
          otherUser,
          last_message: c.last_message,
          last_message_at: c.last_message_at,
          unread_count: unreadByConversation.get(c.id) || 0,
        } as ConversationListItem;
      })
      .filter((item): item is ConversationListItem => item !== null);
  },

  /** الحصول على محادثة موجودة مع شخص معين، أو إنشاء واحدة جديدة لو مفيش */
  getOrCreateConversation: async (otherUserId: string): Promise<string> => {
    const { data, error } = await supabase.rpc("get_or_create_conversation", {
      other_user_id: ensureUUID(otherUserId),
    });
    if (error) throw error;
    return data as string;
  },

  /** جلب رسايل محادثة معينة (أحدث الرسايل الأول، وبتترتب في الواجهة) */
  getMessages: async (conversationId: string, beforeCreatedAt?: string, limit = 30): Promise<DBMessage[]> => {
    let query = supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (beforeCreatedAt) {
      query = query.lt("created_at", beforeCreatedAt);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data as DBMessage[]).reverse();
  },

  /** إرسال رسالة (نص و/أو صورة) */
  sendMessage: async (
    conversationId: string,
    senderId: string,
    content: string | null,
    imageUrl: string | null = null
  ): Promise<DBMessage> => {
    const trimmed = content?.trim() || null;
    if (!trimmed && !imageUrl) throw new Error("الرسالة فاضية");

    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: ensureUUID(senderId),
        content: trimmed,
        image_url: imageUrl,
      })
      .select("*")
      .single();

    if (error) throw error;
    return data as DBMessage;
  },

  /** رفع صورة مرفقة مع رسالة (بيستخدم نفس bucket الميمز) */
  uploadMessageImage: async (file: File): Promise<string> => {
    return dataService.uploadMemeFile(file, "memes");
  },

  /** تعليم كل رسايل محادثة معينة كمقروءة */
  markConversationRead: async (conversationId: string): Promise<void> => {
    const { error } = await supabase.rpc("mark_conversation_read", { p_conversation_id: conversationId });
    if (error) throw error;
  },

  /** إجمالي عدد الرسايل الغير مقروءة (للبادج جنب زرار الرسايل) */
  getTotalUnreadCount: async (): Promise<number> => {
    const { data, error } = await supabase.rpc("get_total_unread_messages");
    if (error) return 0;
    return Number(data) || 0;
  },

  /**
   * الاشتراك اللايف في الرسايل الجديدة لمحادثة مفتوحة حالياً على الشاشة.
   * بيرجع دالة unsubscribe.
   */
  subscribeToConversationMessages: (conversationId: string, onInsert: (message: DBMessage) => void) => {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => onInsert(payload.new as DBMessage)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  /**
   * الاشتراك اللايف في أي رسالة جديدة تخص المستخدم (حتى لو المحادثة مش
   * مفتوحة حالياً)، عشان نحدّث قايمة المحادثات وعداد الرسايل الغير مقروءة
   * فوراً زي ما بيحصل في تطبيقات الشات الحقيقية.
   */
  subscribeToInbox: (onChange: () => void) => {
    const channel = supabase
      .channel("messages-inbox")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => onChange())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};

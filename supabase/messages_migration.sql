-- ============================================================================
-- نظام الرسايل الخاصة (Direct Messages) - زي شات الماسنجر
-- شغّل السكريبت ده كامل مرة واحدة من SQL Editor بتاع مشروع Supabase بتاعك
-- ============================================================================

-- 1) جدول المحادثات: محادثة واحدة بس بين كل شخصين (1-to-1 زي الماسنجر)
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_one uuid not null references public.profiles(id) on delete cascade,
  user_two uuid not null references public.profiles(id) on delete cascade,
  last_message text,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  constraint conversations_no_self_chat check (user_one <> user_two),
  constraint conversations_unique_pair unique (user_one, user_two)
);

create index if not exists idx_conversations_user_one on public.conversations(user_one);
create index if not exists idx_conversations_user_two on public.conversations(user_two);

-- 2) جدول الرسايل
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text,
  image_url text,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint messages_has_content check (content is not null or image_url is not null)
);

create index if not exists idx_messages_conversation_id on public.messages(conversation_id, created_at);
create index if not exists idx_messages_unread on public.messages(conversation_id, sender_id, read_at);

-- 3) تفعيل RLS
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

drop policy if exists "select_own_conversations" on public.conversations;
create policy "select_own_conversations" on public.conversations
  for select using (auth.uid() = user_one or auth.uid() = user_two);

drop policy if exists "insert_own_conversations" on public.conversations;
create policy "insert_own_conversations" on public.conversations
  for insert with check (auth.uid() = user_one or auth.uid() = user_two);

drop policy if exists "select_messages_of_my_conversations" on public.messages;
create policy "select_messages_of_my_conversations" on public.messages
  for select using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.user_one = auth.uid() or c.user_two = auth.uid())
    )
  );

drop policy if exists "insert_messages_in_my_conversations" on public.messages;
create policy "insert_messages_in_my_conversations" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.user_one = auth.uid() or c.user_two = auth.uid())
    )
  );

drop policy if exists "update_messages_read_status" on public.messages;
create policy "update_messages_read_status" on public.messages
  for update using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.user_one = auth.uid() or c.user_two = auth.uid())
    )
  );

-- 4) لما حد يبدأ محادثة جديدة، بندور على المحادثة الموجودة بينه وبين الطرف
--    التاني، ولو مفيش بننشئها. الأصغر UUID دايماً user_one عشان الـ unique
--    constraint يمنع تكرار نفس المحادثة مرتين بترتيب مختلف.
create or replace function public.get_or_create_conversation(other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  conv_id uuid;
  u1 uuid;
  u2 uuid;
begin
  if me is null then
    raise exception 'يجب تسجيل الدخول أولاً';
  end if;
  if me = other_user_id then
    raise exception 'مينفعش تبعت رسالة لنفسك';
  end if;

  if me < other_user_id then
    u1 := me; u2 := other_user_id;
  else
    u1 := other_user_id; u2 := me;
  end if;

  select id into conv_id from public.conversations where user_one = u1 and user_two = u2;

  if conv_id is null then
    insert into public.conversations (user_one, user_two) values (u1, u2)
    returning id into conv_id;
  end if;

  return conv_id;
end;
$$;

-- 5) تحديث آخر رسالة في المحادثة تلقائياً بعد كل إرسال
create or replace function public.handle_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
    set last_message = coalesce(new.content, '📷 صورة'),
        last_message_at = new.created_at
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists trg_handle_new_message on public.messages;
create trigger trg_handle_new_message
  after insert on public.messages
  for each row execute function public.handle_new_message();

-- 6) عدد الرسايل اللي لسه ما اتقرتش لكل محادثة (للمستخدم الحالي)
create or replace function public.get_unread_message_counts()
returns table(conversation_id uuid, unread_count bigint)
language sql
security definer
set search_path = public
as $$
  select m.conversation_id, count(*)::bigint as unread_count
  from public.messages m
  join public.conversations c on c.id = m.conversation_id
  where m.sender_id <> auth.uid()
    and m.read_at is null
    and (c.user_one = auth.uid() or c.user_two = auth.uid())
  group by m.conversation_id;
$$;

-- 7) إجمالي عدد الرسايل الغير مقروءة (للبادج جنب زرار الرسايل)
create or replace function public.get_total_unread_messages()
returns bigint
language sql
security definer
set search_path = public
as $$
  select coalesce(count(*), 0)::bigint
  from public.messages m
  join public.conversations c on c.id = m.conversation_id
  where m.sender_id <> auth.uid()
    and m.read_at is null
    and (c.user_one = auth.uid() or c.user_two = auth.uid());
$$;

-- 8) تعليم كل رسايل محادثة معينة كمقروءة
create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.messages
    set read_at = now()
  where conversation_id = p_conversation_id
    and sender_id <> auth.uid()
    and read_at is null;
$$;

-- 9) تفعيل الـ Realtime على جدول الرسايل والمحادثات عشان الشات يشتغل لايف
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;

-- ملحوظة: صور المحادثات بتترفع على نفس الـ storage bucket المستخدم في
-- الميمز ("memes")، فمفيش حاجة إضافية مطلوبة هنا لو الـ bucket ده موجود
-- وسياساته public read متظبطة زي ما هي مستخدمة في باقي المشروع.

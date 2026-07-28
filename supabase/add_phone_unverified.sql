-- إضافة رقم الموبايل لجدول profiles - بيتسجل وقت التسجيل من غير أي تحقق
-- (phone_verified = false دايماً في البداية). التحقق الفعلي هيتم لاحقاً بس
-- وقت أي عملية حساسة (استرجاع حساب مثلاً) مش عند كل تسجيل جديد.

alter table public.profiles
  add column if not exists phone text,
  add column if not exists phone_verified boolean not null default false;

-- فهرس عشان أي بحث/تحقق بالرقم يبقى سريع لاحقاً
create index if not exists idx_profiles_phone on public.profiles (phone) where phone is not null;

-- ملحوظة أمان: الرقم مش متحقق منه، فمينفعش يتستخدم كوسيلة تحقق هوية وحيدة
-- (زي "انسيت الباسورد" باستخدام الرقم بس) لحد ما phone_verified = true.

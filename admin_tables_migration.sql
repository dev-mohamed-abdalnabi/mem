-- ============================================
-- جداول نظام الإدارة والمراقبة
-- ============================================

-- 7. جدول البلاغات (Reports)
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meme_id UUID NOT NULL REFERENCES memes(id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
    resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    resolution_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT reports_unique_report UNIQUE(meme_id, reporter_id)
);

-- 8. جدول الحسابات المحظورة (Banned Accounts)
CREATE TABLE IF NOT EXISTS banned_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    banned_by UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    ban_type TEXT DEFAULT 'permanent' CHECK (ban_type IN ('temporary', 'permanent')),
    banned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    
    CONSTRAINT banned_accounts_unique_user UNIQUE(user_id)
);

-- 9. جدول سجل الأنشطة (Admin Activity Log)
CREATE TABLE IF NOT EXISTS admin_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL CHECK (target_type IN ('meme', 'user', 'report', 'comment')),
    target_id UUID NOT NULL,
    details JSONB,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. جدول المنشورات المثبتة والمعززة (Pinned & Boosted Memes)
CREATE TABLE IF NOT EXISTS meme_moderation (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meme_id UUID NOT NULL REFERENCES memes(id) ON DELETE CASCADE,
    is_pinned BOOLEAN DEFAULT FALSE,
    is_boosted BOOLEAN DEFAULT FALSE,
    is_hidden BOOLEAN DEFAULT FALSE,
    boost_level INTEGER DEFAULT 0,
    pinned_at TIMESTAMP WITH TIME ZONE,
    boosted_at TIMESTAMP WITH TIME ZONE,
    hidden_at TIMESTAMP WITH TIME ZONE,
    hidden_reason TEXT,
    
    CONSTRAINT meme_moderation_unique_meme UNIQUE(meme_id)
);

-- 11. جدول صلاحيات المستخدمين (User Permissions)
CREATE TABLE IF NOT EXISTS user_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    permission_type TEXT NOT NULL CHECK (permission_type IN ('admin', 'moderator', 'user')),
    granted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT user_permissions_unique_user_type UNIQUE(user_id, permission_type)
);

-- ============================================
-- تفعيل RLS (Row Level Security)
-- ============================================

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE banned_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE meme_moderation ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- سياسات الأمان (Security Policies)
-- ============================================

-- سياسات جدول البلاغات
CREATE POLICY "المستخدمون يمكنهم رؤية بلاغاتهم الخاصة" ON reports
    FOR SELECT USING (auth.uid() = reporter_id OR auth.uid() IN (SELECT user_id FROM user_permissions WHERE permission_type IN ('admin', 'moderator')));

CREATE POLICY "المستخدمون يمكنهم إنشاء بلاغات" ON reports
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "المشرفون فقط يمكنهم تحديث البلاغات" ON reports
    FOR UPDATE USING (auth.uid() IN (SELECT user_id FROM user_permissions WHERE permission_type IN ('admin', 'moderator')));

-- سياسات جدول الحسابات المحظورة
CREATE POLICY "المشرفون فقط يمكنهم رؤية الحسابات المحظورة" ON banned_accounts
    FOR SELECT USING (auth.uid() IN (SELECT user_id FROM user_permissions WHERE permission_type IN ('admin', 'moderator')));

CREATE POLICY "المشرفون فقط يمكنهم إنشاء حظر" ON banned_accounts
    FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM user_permissions WHERE permission_type IN ('admin', 'moderator')));

-- سياسات سجل الأنشطة
CREATE POLICY "المشرفون فقط يمكنهم رؤية السجلات" ON admin_logs
    FOR SELECT USING (auth.uid() IN (SELECT user_id FROM user_permissions WHERE permission_type IN ('admin', 'moderator')));

CREATE POLICY "المشرفون فقط يمكنهم إنشاء سجلات" ON admin_logs
    FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM user_permissions WHERE permission_type IN ('admin', 'moderator')));

-- سياسات جدول تعديل المنشورات
CREATE POLICY "الجميع يمكنهم رؤية حالة المنشورات" ON meme_moderation
    FOR SELECT USING (NOT is_hidden OR auth.uid() IN (SELECT user_id FROM user_permissions WHERE permission_type IN ('admin', 'moderator')));

CREATE POLICY "المشرفون فقط يمكنهم تعديل المنشورات" ON meme_moderation
    FOR UPDATE USING (auth.uid() IN (SELECT user_id FROM user_permissions WHERE permission_type IN ('admin', 'moderator')));

-- سياسات جدول صلاحيات المستخدمين
CREATE POLICY "المشرفون فقط يمكنهم رؤية الصلاحيات" ON user_permissions
    FOR SELECT USING (auth.uid() IN (SELECT user_id FROM user_permissions WHERE permission_type = 'admin'));

CREATE POLICY "المشرفون فقط يمكنهم تعديل الصلاحيات" ON user_permissions
    FOR ALL USING (auth.uid() IN (SELECT user_id FROM user_permissions WHERE permission_type = 'admin'));

-- ============================================
-- منح الصلاحيات
-- ============================================

GRANT ALL ON reports TO authenticated;
GRANT ALL ON banned_accounts TO authenticated;
GRANT ALL ON admin_logs TO authenticated;
GRANT ALL ON meme_moderation TO authenticated;
GRANT ALL ON user_permissions TO authenticated;

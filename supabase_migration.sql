-- 0. Add cover_url column to profiles table for profile covers
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cover_url TEXT;

-- 1. Fix null image_url constraint in memes table
ALTER TABLE memes ALTER COLUMN image_url DROP NOT NULL;

-- 2. Add new columns to memes table for video and multi-image support
ALTER TABLE memes ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE memes ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';
ALTER TABLE memes ADD COLUMN IF NOT EXISTS post_type TEXT DEFAULT 'image' CHECK (post_type IN ('image', 'video', 'text', 'multi-image'));

-- 3. Create stories table for the new status system
CREATE TABLE IF NOT EXISTS stories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    CONSTRAINT stories_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id)
);

-- 4. Enable RLS on stories table
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

-- 5. Policies for stories
CREATE POLICY "Stories are viewable by everyone" ON stories
    FOR SELECT USING (expires_at > NOW());

CREATE POLICY "Users can create their own stories" ON stories
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stories" ON stories
    FOR DELETE USING (auth.uid() = user_id);

-- 6. Grant access to authenticated users
GRANT ALL ON stories TO authenticated;
GRANT SELECT ON stories TO anon;

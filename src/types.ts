export type UserRole = 'user' | 'moderator' | 'admin';
export type MemeStatus = 'pending' | 'approved' | 'rejected' | 'deleted';
export type ReportStatus = 'open' | 'resolved' | 'dismissed';
export type NotificationType = 'like' | 'comment' | 'follow' | 'system' | 'achievement';

export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  cover_url?: string | null;
  bio: string | null;
  website: string | null;
  role: UserRole;
  meme_level: string;
  total_points: number;
  followers_count: number;
  following_count: number;
  created_at: string;
  updated_at: string;
}

export interface Meme {
  id: string;
  user_id: string;
  image_url: string;
  caption: string | null;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  saves_count: number;
  views_count: number;
  status: MemeStatus;
  width?: number;
  height?: number;
  file_size?: number;
  created_at: string;
  updated_at: string;
  // Joins
  profiles?: Profile;
  liked_by_me?: boolean;
  saved_by_me?: boolean;
  tags?: string[];
}

export interface Comment {
  id: string;
  meme_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  // Joins
  profiles?: Profile;
}

export interface Follow {
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface Tag {
  id: string;
  name: string;
  created_at: string;
}

export interface Notification {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  type: NotificationType;
  meme_id: string | null;
  content: string | null;
  is_read: boolean;
  created_at: string;
  // Joins
  actor?: Profile;
  meme?: Meme;
}

export interface Report {
  id: string;
  meme_id: string;
  reporter_id: string;
  reason: string;
  status: ReportStatus;
  resolved_by: string | null;
  resolution_note: string | null;
  created_at: string;
}

// Preset popular Arabic meme templates for the Meme Maker
export interface MemeTemplate {
  id: string;
  name: string;
  image_url: string;
  default_top?: string;
  default_bottom?: string;
}

export const MEME_TEMPLATES: MemeTemplate[] = [
  {
    id: 'el-lemby',
    name: 'اللمبي مصدوم',
    image_url: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?auto=format&fit=crop&q=80&w=400', // We can style these or use stable memes
    default_top: 'لما تلاقي الجروب كله بيحل',
    default_bottom: 'وأنت فاكر الامتحان الأسبوع الجاي'
  },
  {
    id: 'adel-imam',
    name: 'عادل إمام مبتسم',
    image_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400',
    default_top: 'لما تسأل صاحبك عملت إيه في الامتحان؟',
    default_bottom: 'يقولك كتبنا اسامينا وخرجنا يا فنان'
  },
  {
    id: 'hany-ramzy',
    name: 'غبي منه فيه',
    image_url: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&q=80&w=400',
    default_top: 'لما تحاول تفهم المحاضر',
    default_bottom: 'وهو بيتكلم هندي مسرّع'
  },
  {
    id: 'henedy',
    name: 'محمد هنيدي يصرخ',
    image_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400',
    default_top: 'يا جماعة الكود اشتغل!',
    default_bottom: 'بس مش عارف اشتغل إزاي!'
  }
];

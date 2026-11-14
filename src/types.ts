export type SocialPlatform =
  | 'instagram'
  | 'tiktok'
  | 'github'
  | 'linkedin'
  | 'twitter'
  | 'youtube'
  | 'bluesky'
  | 'threads'
  | 'twitch'
  | 'gitlab'
  | 'devto'
  | 'website';

export interface SocialLinks {
  instagram?: string;
  tiktok?: string;
  github?: string;
  linkedin?: string;
  twitter?: string;
  youtube?: string;
  bluesky?: string;
  threads?: string;
  twitch?: string;
  gitlab?: string;
  devto?: string;
  website?: string;
}

export interface DevBuddy {
  id: string;
  name: string;
  role: string;
  companyOrProject?: string;
  bio: string;
  avatarUrl: string;
  tags: string[];
  socials: SocialLinks;
  isOwnerCard?: boolean;
  /** Number of community connections this member has already followed */
  communityFollowsDone: number;
  joinedAt: string;
  ownerGithubId?: number;
  tools?: CommunityToolData;
}

export type ToolCategory = 'ides' | 'agents' | 'automation' | 'design' | 'cloud';
export type ToolReview = { status: 'good' | 'mixed' | 'bad' | ''; comment: string };
export type CommunityToolData = Partial<Record<ToolCategory, string[]>> & { reviews?: Record<string, ToolReview> };

export type FollowStatusFilter = 'all' | 'pending' | 'completed';

export interface FollowedMap {
  // key format: `${buddyId}:${platform}` -> boolean
  [key: string]: boolean;
}

export type ThemeMode = 'dark' | 'light';

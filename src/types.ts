export type SocialPlatform =
  | 'instagram'
  | 'tiktok'
  | 'github'
  | 'linkedin'
  | 'twitter'
  | 'youtube'
  | 'bluesky'
  | 'website';

export interface SocialLinks {
  instagram?: string;
  tiktok?: string;
  github?: string;
  linkedin?: string;
  twitter?: string;
  youtube?: string;
  bluesky?: string;
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
  tools?: { ides: string[]; agents: string[] };
}

export type FollowStatusFilter = 'all' | 'pending' | 'completed';

export interface FollowedMap {
  // key format: `${buddyId}:${platform}` -> boolean
  [key: string]: boolean;
}

export type ThemeMode = 'dark' | 'light';

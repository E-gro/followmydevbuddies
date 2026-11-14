interface SocialLinks {
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
  communityFollowsDone: number;
  joinedAt: string;
  tools?: { ides?: string[]; agents?: string[]; automation?: string[]; design?: string[]; cloud?: string[]; reviews?: Record<string, { status: string; comment: string }> };
}

interface KvNamespaceLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

interface VerifiedGitHubUser {
  id: number;
  login: string;
}

const KV_STORAGE_KEY = "fmdb:community:buddies:v2_clean";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

const globalStore = globalThis as unknown as {
  __fmdbBuddiesCleanFallback?: DevBuddy[];
  [key: symbol]: { kv?: KvNamespaceLike; loadedHandler?: { kv?: KvNamespaceLike } } | undefined;
};

async function getKvNamespace(): Promise<KvNamespaceLike | null> {
  try {
    const handler =
      globalStore[Symbol.for("vinext.configuredCacheHandler")] ??
      globalStore[Symbol.for("vinext.cacheHandler")];
    const kvFromHandler = handler?.kv ?? handler?.loadedHandler?.kv;
    if (kvFromHandler && typeof kvFromHandler.get === "function") {
      return kvFromHandler;
    }
  } catch {
    // ignore
  }
  return null;
}

async function readBuddies(): Promise<DevBuddy[]> {
  const kv = await getKvNamespace();
  if (kv) {
    try {
      const raw = await kv.get(KV_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed as DevBuddy[];
        }
      }
      return [];
    } catch {
      // fallback to memory
    }
  }

  if (!globalStore.__fmdbBuddiesCleanFallback) {
    globalStore.__fmdbBuddiesCleanFallback = [];
  }
  return globalStore.__fmdbBuddiesCleanFallback;
}

async function writeBuddies(buddies: DevBuddy[]): Promise<void> {
  globalStore.__fmdbBuddiesCleanFallback = buddies;
  const kv = await getKvNamespace();
  if (kv) {
    try {
      await kv.put(KV_STORAGE_KEY, JSON.stringify(buddies));
    } catch {
      // ignore
    }
  }
}

/**
 * Verifies the caller's GitHub Access Token directly against GitHub's official API
 * so no user can ever spoof or modify another person's GitHub card.
 */
export async function verifyGitHubToken(request: Request): Promise<VerifiedGitHubUser | null> {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  try {
    const res = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "FollowMyDevBuddies-Server",
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { id?: number; login?: string };
    if (typeof data.id === "number" && typeof data.login === "string" && data.login) {
      return { id: data.id, login: data.login };
    }
    return null;
  } catch {
    return null;
  }
}

export function sanitizeHandle(raw: unknown): string | undefined {
  if (typeof raw !== "string" || !raw.trim()) return undefined;
  const clean = raw
    .trim()
    .split("?")[0]
    .split("#")[0]
    .replace(/\/+$/, "")
    .split("/")
    .pop()
    ?.replace(/^@+/, "")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .slice(0, 60);
  return clean || undefined;
}

export function sanitizeBuddy(
  input: Partial<DevBuddy>,
  verifiedUser: VerifiedGitHubUser
): DevBuddy | null {
  if (!input || typeof input.name !== "string" || !input.name.trim()) {
    return null;
  }

  const rawSocials = input.socials || {};
  let safeWebsite: string | undefined;
  if (typeof rawSocials.website === "string" && rawSocials.website.trim()) {
    try {
      const url = new URL(
        rawSocials.website.startsWith("http")
          ? rawSocials.website.replace(/^http:\/\//i, "https://")
          : `https://${rawSocials.website}`
      );
      const host = url.hostname.toLowerCase().replace(/^www\./, '');
      const shorteners = new Set(['bit.ly', 'tinyurl.com', 't.co', 'cutt.ly', 'is.gd', 'shorturl.at', 'rb.gy', 'ow.ly', 'tiny.cc', 'rebrand.ly', 'bl.ink']);
      if (url.protocol === "https:" && !url.username && !url.password && !url.port && host.includes('.') && !host.startsWith('[') && !/^\d+(\.\d+){3}$/.test(host) && !host.endsWith('.localhost') && !host.endsWith('.local') && !shorteners.has(host)) {
        safeWebsite = url.toString();
      }
    } catch {
      safeWebsite = undefined;
    }
  }

  const sanitizeTools = (values: unknown): string[] => Array.isArray(values)
    ? [...new Set(values.filter((value): value is string => typeof value === "string").map(value => value.trim().slice(0, 40)).filter(Boolean))].slice(0, 30)
    : [];
  const categories = ["ides", "agents", "automation", "design", "cloud"] as const;
  const tools = input.tools ? Object.fromEntries(categories.map(category => [category, sanitizeTools(input.tools?.[category])])) as Record<(typeof categories)[number], string[]> : undefined;
  const reviews: Record<string, { status: string; comment: string }> = {};
  if (tools && input.tools?.reviews && typeof input.tools.reviews === 'object') {
    for (const category of categories) for (const name of tools[category]) {
      const key = `${category}:${name.trim().toLocaleLowerCase('pt-BR')}`;
      const review = input.tools.reviews[key];
      if (!review || typeof review !== 'object') continue;
      reviews[key] = { status: ['good', 'mixed', 'bad'].includes(review.status) ? review.status : '', comment: typeof review.comment === 'string' ? review.comment.trim().slice(0, 400) : '' };
    }
  }

  return {
    // Cryptographically bound to the verified GitHub account ID and login
    id: `gh-${verifiedUser.id}`,
    name: input.name.trim().slice(0, 60),
    role: String(input.role || "Developer").trim().slice(0, 60),
    companyOrProject: String(input.companyOrProject || "Amigos do Mag")
      .trim()
      .slice(0, 60),
    bio: String(input.bio || "").trim().slice(0, 240),
    avatarUrl: String(input.avatarUrl || "").trim().slice(0, 80000),
    tags: Array.isArray(input.tags)
      ? input.tags.map((t) => String(t).trim().slice(0, 24)).filter(Boolean).slice(0, 6)
      : ["Dev", "AmigosDoMag"],
    socials: {
      instagram: sanitizeHandle(rawSocials.instagram),
      tiktok: sanitizeHandle(rawSocials.tiktok),
      github: verifiedUser.login,
      linkedin: sanitizeHandle(rawSocials.linkedin),
      twitter: sanitizeHandle(rawSocials.twitter),
      youtube: sanitizeHandle(rawSocials.youtube),
      bluesky: sanitizeHandle(rawSocials.bluesky),
      threads: sanitizeHandle(rawSocials.threads),
      twitch: sanitizeHandle(rawSocials.twitch),
      gitlab: sanitizeHandle(rawSocials.gitlab),
      devto: sanitizeHandle(rawSocials.devto),
      website: safeWebsite,
    },
    communityFollowsDone: Math.max(
      0,
      Math.min(5000, Number(input.communityFollowsDone) || 0)
    ),
    joinedAt: String(input.joinedAt || new Date().toISOString().slice(0, 10)).slice(0, 12),
    ...(tools ? { tools: { ...tools, reviews } } : {}),
  };
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET() {
  const buddies = await readBuddies();
  return new Response(JSON.stringify({ ok: true, buddies }), {
    status: 200,
    headers: CORS_HEADERS,
  });
}

export async function POST(request: Request) {
  try {
    const verifiedUser = await verifyGitHubToken(request);
    if (!verifiedUser) {
      return new Response(
        JSON.stringify({
          ok: false,
          error:
            "Autenticação GitHub obrigatória. Faça login com um token válido do GitHub.",
        }),
        { status: 401, headers: CORS_HEADERS }
      );
    }

    const body = (await request.json()) as {
      action?: string;
      buddy?: Partial<DevBuddy>;
      buddyId?: string;
      communityFollowsDone?: number;
    };

    const current = await readBuddies();
    const expectedId = `gh-${verifiedUser.id}`;

    if (body.action === "upsert" && body.buddy) {
      const clean = sanitizeBuddy(body.buddy, verifiedUser);
      if (!clean) {
        return new Response(
          JSON.stringify({ ok: false, error: "Dados de perfil inválidos." }),
          { status: 400, headers: CORS_HEADERS }
        );
      }

      const existingIdx = current.findIndex(
        (b) =>
          b.id === expectedId ||
          b.socials.github?.toLowerCase() === verifiedUser.login.toLowerCase()
      );

      let updated: DevBuddy[];
      if (existingIdx >= 0) {
        updated = [...current];
        if (!clean.tools && current[existingIdx].tools) clean.tools = current[existingIdx].tools;
        updated[existingIdx] = clean;
      } else {
        updated = [clean, ...current];
      }

      await writeBuddies(updated);
      return new Response(JSON.stringify({ ok: true, buddies: updated }), {
        status: 200,
        headers: CORS_HEADERS,
      });
    }

    if (body.action === "updateScore") {
      const score = Math.max(
        0,
        Math.min(5000, Number(body.communityFollowsDone) || 0)
      );
      const updated = current.map((b) =>
        b.id === expectedId ||
        b.socials.github?.toLowerCase() === verifiedUser.login.toLowerCase()
          ? { ...b, communityFollowsDone: score }
          : b
      );
      await writeBuddies(updated);
      return new Response(JSON.stringify({ ok: true, buddies: updated }), {
        status: 200,
        headers: CORS_HEADERS,
      });
    }

    return new Response(
      JSON.stringify({ ok: false, error: "Ação não reconhecida." }),
      { status: 400, headers: CORS_HEADERS }
    );
  } catch {
    return new Response(
      JSON.stringify({ ok: false, error: "Erro ao processar requisição." }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

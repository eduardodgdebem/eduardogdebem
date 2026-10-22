import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

// Rendered on request by the Cloudflare worker so the Jellyfin API key stays server-side.
export const prerender = false;

const CACHE_SECONDS = 60;

type Kind = 'listening' | 'watching';

export interface MediaEntry {
  kind: Kind;
  title: string;
  subtitle: string;
  image: string | null;
  /** True while a Jellyfin session is playing (or paused on) this item. */
  live: boolean;
  paused: boolean;
  lastPlayed: string | null;
}

export interface NowPlaying {
  listening: MediaEntry | null;
  watching: MediaEntry | null;
}

interface JellyfinItem {
  Id: string;
  Name: string;
  Type: string;
  SeriesName?: string;
  SeriesId?: string;
  ParentIndexNumber?: number;
  IndexNumber?: number;
  ProductionYear?: number;
  AlbumArtist?: string;
  Artists?: string[];
  AlbumId?: string;
  ImageTags?: Record<string, string>;
  UserData?: { LastPlayedDate?: string };
}

interface JellyfinSession {
  UserId?: string;
  NowPlayingItem?: JellyfinItem;
  PlayState?: { IsPaused?: boolean };
}

const kindOf = (item: JellyfinItem): Kind | null =>
  item.Type === 'Audio' ? 'listening' : item.Type === 'Episode' || item.Type === 'Movie' ? 'watching' : null;

function toEntry(base: string, item: JellyfinItem, live = false, paused = false): MediaEntry | null {
  const kind = kindOf(item);
  if (!kind) return null;

  const image = (id: string) => `${base}/Items/${id}/Images/Primary?fillWidth=120&fillHeight=120&quality=80`;

  if (item.Type === 'Audio') {
    const artist = item.AlbumArtist || item.Artists?.join(', ') || '';
    const art = item.ImageTags?.Primary ? item.Id : item.AlbumId;
    return { kind, title: item.Name, subtitle: artist, image: art ? image(art) : null, live, paused, lastPlayed: item.UserData?.LastPlayedDate ?? null };
  }

  if (item.Type === 'Episode') {
    const code = item.ParentIndexNumber != null && item.IndexNumber != null ? `S${item.ParentIndexNumber}E${item.IndexNumber}` : '';
    return {
      kind,
      title: item.SeriesName ?? item.Name,
      subtitle: [code, item.Name].filter(Boolean).join(' · '),
      image: image(item.SeriesId ?? item.Id),
      live,
      paused,
      lastPlayed: item.UserData?.LastPlayedDate ?? null,
    };
  }

  return {
    kind,
    title: item.Name,
    subtitle: item.ProductionYear ? String(item.ProductionYear) : 'Film',
    image: image(item.Id),
    live,
    paused,
    lastPlayed: item.UserData?.LastPlayedDate ?? null,
  };
}

async function load(base: string, key: string, userId: string): Promise<NowPlaying> {
  const get = async <T>(path: string): Promise<T> => {
    const res = await fetch(`${base}${path}`, {
      headers: { Authorization: `MediaBrowser Token="${key}"` },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) throw new Error(`Jellyfin ${res.status} on ${path}`);
    return res.json() as Promise<T>;
  };

  const recent = (types: string) =>
    get<{ Items: JellyfinItem[] }>(
      `/Users/${userId}/Items?SortBy=DatePlayed&SortOrder=Descending&Recursive=true&IncludeItemTypes=${types}&Limit=1&EnableUserData=true`,
    ).then((r) => r.Items.find((i) => i.UserData?.LastPlayedDate));

  const [sessions, lastAudio, lastVideo] = await Promise.all([
    get<JellyfinSession[]>('/Sessions?activeWithinSeconds=600'),
    recent('Audio'),
    recent('Movie,Episode'),
  ]);

  const result: NowPlaying = {
    listening: lastAudio ? toEntry(base, lastAudio) : null,
    watching: lastVideo ? toEntry(base, lastVideo) : null,
  };

  // Something playing right now wins over history.
  for (const s of sessions) {
    if (s.UserId !== userId || !s.NowPlayingItem) continue;
    const entry = toEntry(base, s.NowPlayingItem, true, Boolean(s.PlayState?.IsPaused));
    if (entry) result[entry.kind] = entry;
  }

  return result;
}

export const GET: APIRoute = async ({ request }) => {
  const { JELLYFIN_URL, JELLYFIN_API_KEY, JELLYFIN_USER_ID } = env as unknown as Record<string, string | undefined>;
  if (!JELLYFIN_URL || !JELLYFIN_API_KEY || !JELLYFIN_USER_ID) {
    return Response.json({ listening: null, watching: null } satisfies NowPlaying, { status: 503 });
  }

  // Edge cache so visitors don't hit the home server on every page view.
  const cache = typeof caches !== 'undefined' ? (caches as unknown as { default?: Cache }).default : undefined;
  const cacheKey = new Request(new URL(request.url).toString(), { method: 'GET' });
  const cached = await cache?.match(cacheKey);
  if (cached) return cached;

  try {
    const data = await load(JELLYFIN_URL.replace(/\/$/, ''), JELLYFIN_API_KEY, JELLYFIN_USER_ID);
    const res = Response.json(data, { headers: { 'Cache-Control': `public, max-age=${CACHE_SECONDS}` } });
    await cache?.put(cacheKey, res.clone());
    return res;
  } catch (err) {
    console.error(err);
    return Response.json({ listening: null, watching: null } satisfies NowPlaying, {
      status: 502,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
};

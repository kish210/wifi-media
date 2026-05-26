import { config } from "../config";

const BASE = config.tvheadend.url;
const AUTH = Buffer.from(`${config.tvheadend.user}:${config.tvheadend.pass}`).toString("base64");

async function tvhFetch(path: string): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Basic ${AUTH}` },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`TVH ${path} → ${res.status}`);
  return res.json();
}

export interface TvhChannel {
  uuid: string;
  name: string;
  number: number;
  icon: string;
  icon_public_url: string;
  tags: string[];
  enabled: boolean;
}

export interface TvhEpgEvent {
  eventId: number;
  channelUuid: string;
  channelName: string;
  title: string;
  subtitle: string;
  description: string;
  start: number;
  stop: number;
  genre: number[];
  image: string;
}

export async function getChannels(): Promise<TvhChannel[]> {
  try {
    const data = await tvhFetch("/api/channel/grid?limit=1000&all=1") as {
      entries: TvhChannel[];
    };
    return (data.entries ?? []).filter((c) => c.enabled !== false);
  } catch {
    return [];
  }
}

export async function getChannelTags(): Promise<{ key: string; val: string }[]> {
  try {
    const data = await tvhFetch("/api/channeltag/grid?limit=500") as {
      entries: { uuid: string; name: string }[];
    };
    return (data.entries ?? []).map((t) => ({ key: t.uuid, val: t.name }));
  } catch {
    return [];
  }
}

export async function getEpg(params: {
  channelUuid?: string;
  start?: number;
  end?: number;
  limit?: number;
}): Promise<TvhEpgEvent[]> {
  try {
    const qs = new URLSearchParams({
      limit: String(params.limit ?? 200),
      ...(params.channelUuid ? { channel: params.channelUuid } : {}),
      ...(params.start ? { start: String(params.start) } : {}),
      ...(params.end ? { end: String(params.end) } : {}),
    });
    const data = await tvhFetch(`/api/epg/events/grid?${qs}`) as {
      entries: TvhEpgEvent[];
    };
    return data.entries ?? [];
  } catch {
    return [];
  }
}

export async function getEpgNow(): Promise<TvhEpgEvent[]> {
  const now = Math.floor(Date.now() / 1000);
  return getEpg({ start: now - 60, end: now + 3600, limit: 500 });
}

export function getStreamUrl(channelUuid: string): string {
  return `${BASE}/stream/channel/${channelUuid}?profile=pass&auth=${AUTH}`;
}

export function getHlsStreamUrl(channelUuid: string): string {
  return `${BASE}/stream/channel/${channelUuid}?profile=hls&auth=${AUTH}`;
}

export async function getServerStatus(): Promise<{
  online: boolean;
  connections: number;
  subscriptions: number;
}> {
  try {
    const data = await tvhFetch("/api/status/subscriptions") as {
      totalCount: number;
      entries: unknown[];
    };
    return {
      online: true,
      connections: data.totalCount ?? 0,
      subscriptions: (data.entries ?? []).length,
    };
  } catch {
    return { online: false, connections: 0, subscriptions: 0 };
  }
}

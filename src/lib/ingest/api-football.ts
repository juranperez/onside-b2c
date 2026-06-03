import type { RawPlayer } from "./normalize";

const API_BASE = "https://v3.football.api-sports.io";
// Conservative ceilings under the Pro plan (7,500/day). Leaves headroom.
const MINUTE_LIMIT = 300;
const DAY_LIMIT = 7000;

let minuteCount = 0;
let minuteStart = Date.now();
let dayCount = 0;
let dayStamp = new Date().toDateString();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function apiKey(): string {
  const k = process.env.API_FOOTBALL_KEY;
  if (!k) throw new Error("API_FOOTBALL_KEY is not set");
  return k;
}

async function rateGate(): Promise<void> {
  const now = Date.now();
  const today = new Date().toDateString();
  if (today !== dayStamp) {
    dayCount = 0;
    dayStamp = today;
  }
  if (now - minuteStart >= 60_000) {
    minuteCount = 0;
    minuteStart = now;
  }
  if (dayCount >= DAY_LIMIT) throw new Error("API-Football daily budget exhausted");
  if (minuteCount >= MINUTE_LIMIT) {
    await sleep(60_000 - (now - minuteStart) + 500);
    minuteCount = 0;
    minuteStart = Date.now();
  }
}

export interface ApiResult<T> {
  response: T[];
  paging: { current: number; total: number };
}

async function apiFetch<T>(
  endpoint: string,
  params: Record<string, string | number>,
  attempt = 0,
): Promise<ApiResult<T>> {
  await rateGate();
  const url = new URL(`${API_BASE}/${endpoint}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  minuteCount++;
  dayCount++;
  let res: Response;
  try {
    res = await fetch(url.toString(), { headers: { "x-apisports-key": apiKey() } });
  } catch (e) {
    if (attempt < 3) {
      await sleep(1500 * (attempt + 1));
      return apiFetch(endpoint, params, attempt + 1);
    }
    throw e;
  }
  if (res.status === 429 || res.status >= 500) {
    if (attempt < 3) {
      await sleep(2000 * (attempt + 1));
      return apiFetch(endpoint, params, attempt + 1);
    }
    throw new Error(`API-Football ${res.status} after retries`);
  }
  if (!res.ok) throw new Error(`API-Football ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as { response?: T[]; paging?: { current: number; total: number } };
  return { response: json.response ?? [], paging: json.paging ?? { current: 1, total: 1 } };
}

export function fetchPlayersPage(
  leagueId: number,
  season: number,
  page: number,
): Promise<ApiResult<RawPlayer>> {
  return apiFetch<RawPlayer>("players", { league: leagueId, season, page });
}

/** Page through every player in a league/season. */
export async function fetchAllPlayers(
  leagueId: number,
  season: number,
  onPage?: (page: number, total: number, count: number) => void,
): Promise<RawPlayer[]> {
  const all: RawPlayer[] = [];
  let page = 1;
  let total = 1;
  do {
    const { response, paging } = await fetchPlayersPage(leagueId, season, page);
    all.push(...response);
    total = paging.total || 1;
    onPage?.(page, total, response.length);
    page++;
  } while (page <= total);
  return all;
}

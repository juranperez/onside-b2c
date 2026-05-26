export interface Player {
  id: string;
  slug: string;
  name: string;
  first: string;
  last: string;
  pos: string;
  age: number;
  nationality: string;
  natCode: string;
  flag: string;
  club: string;
  clubSlug: string;
  clubShort: string;
  clubBg: string;
  clubColor: string;
  league: string;
  leagueSlug: string;
  foot: string;
  val: number;
  peak: number;
  dWeek: number;
  dMonth: number;
  contractEnd: string;
  salary: string;
  tier: "Free" | "Plus" | "Pro";
  series: { m: string; v: number }[];
  form: { opp: string; result: string; rating: number }[];
  attrs: { label: string; value: number }[];
  annotations?: { month: string; text: string }[];
  bio?: string;
  tags?: string[];
  shirtNumber?: number;
  height?: string;
  weight?: string;
}

export interface Club {
  id: string;
  slug: string;
  name: string;
  short: string;
  league: string;
  leagueSlug: string;
  country: string;
  countryCode: string;
  flag: string;
  bg: string;
  color: string;
  stadium: string;
  stadiumCapacity: number;
  manager: string;
  founded: number;
  squadValue: number;
  squadValueDelta: number;
  avgAge: number;
  avgValue: number;
  squadSize: number;
  rank: number;
  leaguePosition: number;
  valueSeries: { m: string; v: number }[];
  transfersIn: Transfer[];
  transfersOut: Transfer[];
  netSpend: number;
}

export interface League {
  id: string;
  slug: string;
  name: string;
  country: string;
  countryCode: string;
  flag: string;
  clubCount: number;
  totalValue: number;
  avgClubValue: number;
  topScorer: { name: string; goals: number; club: string };
  topAssist: { name: string; assists: number; club: string };
  clubs: string[];
}

export interface NationalTeam {
  id: string;
  slug: string;
  name: string;
  code: string;
  flag: string;
  confederation: string;
  fifaRanking: number;
  manager: string;
  squadValue: number;
  group: string;
  starPlayers: string[];
  squad: string[];
}

export interface Transfer {
  id: string;
  player: string;
  playerSlug: string;
  fromClub: string;
  toClub: string;
  fee: number;
  date: string;
  type: "confirmed" | "rumor";
  confidence?: number;
}

export interface Thread {
  id: string;
  title: string;
  author: string;
  authorAvatar: string;
  timestamp: string;
  replies: number;
  upvotes: number;
  tags: string[];
  preview: string;
  pinned?: boolean;
}

export interface ThreadComment {
  id: string;
  threadId: string;
  author: string;
  authorAvatar: string;
  content: string;
  timestamp: string;
  upvotes: number;
}

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  timestamp: string;
  category: string;
  playerSlug?: string;
  clubSlug?: string;
  preview: string;
  image?: string;
}

export interface Manager {
  id: string;
  name: string;
  nationality: string;
  flag: string;
  age: number;
  club: string;
  clubSlug: string;
  tenureStart: string;
  squadValue: number;
}

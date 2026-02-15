const BASE = "http://localhost:8000";

let adminKey = "";
export const setAdminKey = (key: string) => { adminKey = key; };

async function request<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, opts);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || res.statusText);
  }
  return res.json();
}

function adminHeaders(): HeadersInit {
  return { "Content-Type": "application/json", "X-Admin-Key": adminKey };
}

// --- Game ---

export interface GameChallenge { challenge_id: number; lines: string[]; }
export interface GuessResponse { correct: boolean; message: string; near_match: boolean; suggestion: string | null; }
export interface HintResponse { challenge_id: number; before: string[]; after: string[]; }
export interface RevealResponse { title: string; artist: string; album: string | null; thumbnail_url: string | null; platform_links: Record<string, string>; }

// --- Admin ---

export interface SongSearchResult { video_id: string; title: string; artist: string; album: string | null; thumbnail_url: string | null; }
export interface SongOut { id: number; title: string; artist: string; album: string | null; thumbnail_url: string | null; language: string | null; }
export interface LyricLine { line_number: number; text: string; }
export interface ChallengeOut { id: number; song_id: number; song_title: string; song_artist: string; start_line: number; end_line: number; is_active: boolean; preview: string; }

export interface UserOut { id: number; username: string; first_name: string; last_name: string; avatar_url?: string | null; }
export interface LeaderboardEntry { user_id: number; username: string; first_name: string; last_name: string; avatar_url: string | null; total_points: number; games_played: number; }
export interface IssueOut { id: number; user_id: number; username: string; subject: string; message: string; status: string; created_at: string; }
export interface BulkImportJob { id: number; source: string; language: string | null; requested_count: number; challenges_per_song: number; year_from: number | null; year_to: number | null; status: string; total_found: number; imported: number; skipped: number; failed: number; challenges_created: number; log: string | null; created_at: string; }

export const api = {
  // Game
  getChallenge: (language?: string) => request<GameChallenge>(`/game/challenge${language ? `?language=${language}` : ""}`),
  guess: (challenge_id: number, guess: string, user_id?: number) =>
    request<GuessResponse>("/game/guess", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ challenge_id, guess, user_id }) }),
  getHint: (id: number, user_id?: number) => request<HintResponse>(`/game/hint/${id}${user_id ? `?user_id=${user_id}` : ""}`),
  getReveal: (id: number, user_id?: number) => request<RevealResponse>(`/game/reveal/${id}${user_id ? `?user_id=${user_id}` : ""}`),

  // Admin
  searchSongs: (q: string) => request<{ results: SongSearchResult[] }>(`/admin/songs/search?q=${encodeURIComponent(q)}`, { method: "POST", headers: adminHeaders() }),
  importSong: (video_id: string, language?: string) => request<{ id: number; title: string; artist: string; lyric_count: number }>("/admin/songs/import", { method: "POST", headers: adminHeaders(), body: JSON.stringify({ video_id, language }) }),
  listSongs: () => request<SongOut[]>("/admin/songs", { headers: adminHeaders() }),
  getSongLyrics: (id: number) => request<LyricLine[]>(`/admin/songs/${id}/lyrics`, { headers: adminHeaders() }),
  listChallenges: () => request<ChallengeOut[]>("/admin/challenges", { headers: adminHeaders() }),
  createChallenge: (song_id: number, start_line: number, end_line: number) =>
    request<ChallengeOut>("/admin/challenges", { method: "POST", headers: adminHeaders(), body: JSON.stringify({ song_id, start_line, end_line }) }),
  updateChallenge: (id: number, data: { is_active?: boolean; start_line?: number; end_line?: number }) =>
    request<ChallengeOut>(`/admin/challenges/${id}`, { method: "PUT", headers: adminHeaders(), body: JSON.stringify(data) }),
  deleteChallenge: (id: number) => request<{ ok: boolean }>(`/admin/challenges/${id}`, { method: "DELETE", headers: adminHeaders() }),
  setSongLanguage: (id: number, language: string) =>
    request<{ ok: boolean }>(`/admin/songs/${id}/language?language=${language}`, { method: "PUT", headers: adminHeaders() }),

  // Users
  register: (username: string, first_name: string, last_name: string) =>
    request<UserOut>("/users/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, first_name, last_name }) }),
  checkUsername: (username: string) => request<{ available: boolean }>(`/users/check/${encodeURIComponent(username)}`),

  // Auth
  googleLogin: (credential: string) =>
    request<UserOut>("/auth/google", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ credential }) }),

  // Leaderboard
  getLeaderboard: () => request<LeaderboardEntry[]>("/leaderboard"),

  // Languages
  getLanguages: () => request<string[]>("/game/languages"),

  // Issues
  submitIssue: (user_id: number, username: string, subject: string, message: string) =>
    request<IssueOut>("/issues", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id, username, subject, message }) }),
  getIssues: () => request<IssueOut[]>("/admin/issues", { headers: adminHeaders() }),

  // Bulk Import
  startBulkImport: (source: string, count: number, challenges_per_song: number, language?: string, year_from?: number, year_to?: number) =>
    request<BulkImportJob>("/admin/bulk-import", { method: "POST", headers: adminHeaders(), body: JSON.stringify({ source, count, challenges_per_song, language: language || null, year_from: year_from || null, year_to: year_to || null }) }),
  getBulkImportJobs: () => request<BulkImportJob[]>("/admin/bulk-import/jobs", { headers: adminHeaders() }),
  getBulkImportJob: (id: number) => request<BulkImportJob>(`/admin/bulk-import/jobs/${id}`, { headers: adminHeaders() }),
};

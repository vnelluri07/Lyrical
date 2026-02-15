import { useState, useEffect } from "react";
import { api, type LeaderboardEntry } from "../api/client";

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.getLeaderboard().then(setEntries).finally(() => setLoading(false)); }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-2 border-bdr border-t-accent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="px-4 py-10">
      <div className="max-w-xl mx-auto space-y-6">
        <h1 className="text-xl font-semibold text-txt text-center">🏆 Leaderboard</h1>
        {entries.length === 0 ? (
          <p className="text-muted text-center">No scores yet. Be the first to play!</p>
        ) : (
          <div className="bg-card rounded-2xl shadow-sm border border-bdr divide-y divide-bdr transition-colors">
            {entries.map((e, i) => (
              <div key={e.user_id} className="flex items-center gap-3 px-5 py-4">
                <span className={`w-7 text-center font-bold text-lg ${i === 0 ? "text-yellow-500" : i === 1 ? "text-gray-400" : i === 2 ? "text-amber-600" : "text-muted"}`}>
                  {i + 1}
                </span>
                {e.avatar_url ? (
                  <img src={e.avatar_url} className="w-9 h-9 rounded-full" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center text-sm font-medium text-accent">
                    {e.first_name[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-txt text-sm font-medium truncate">{e.first_name} {e.last_name}</p>
                  <p className="text-muted text-xs">@{e.username} · {e.games_played} games</p>
                </div>
                <div className="text-right">
                  <span className="text-txt font-semibold">{e.total_points}</span>
                  <span className="text-muted text-xs ml-1">pts</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

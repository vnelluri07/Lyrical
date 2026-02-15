import { useState, useEffect } from "react";
import { api, type ChallengeOut } from "../api/client";

export default function ChallengeList() {
  const [challenges, setChallenges] = useState<ChallengeOut[]>([]);
  const load = async () => { setChallenges(await api.listChallenges()); };
  useEffect(() => { load(); }, []);

  const toggle = async (c: ChallengeOut) => { await api.updateChallenge(c.id, { is_active: !c.is_active }); load(); };
  const remove = async (id: number) => { await api.deleteChallenge(id); load(); };

  if (!challenges.length) return <p className="text-muted text-center py-8">No challenges yet. Import songs and select lyric lines.</p>;

  return (
    <div className="bg-card rounded-xl border border-bdr divide-y divide-bdr transition-colors">
      {challenges.map(c => (
        <div key={c.id} className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => toggle(c)} className={`w-3 h-3 rounded-full shrink-0 transition-colors ${c.is_active ? "bg-emerald-500" : "bg-muted"}`}
            title={c.is_active ? "Active" : "Inactive"} />
          <div className="min-w-0 flex-1">
            <p className="text-txt text-sm font-medium truncate">{c.song_title} — {c.song_artist}</p>
            <p className="text-muted text-xs truncate">Lines {c.start_line}–{c.end_line}: {c.preview}</p>
          </div>
          <button onClick={() => remove(c.id)} className="text-muted hover:text-red-500 text-sm transition-colors">✕</button>
        </div>
      ))}
    </div>
  );
}

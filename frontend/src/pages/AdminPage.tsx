import { useState, useEffect } from "react";
import { api, setAdminKey, type SongOut, type IssueOut } from "../api/client";
import SongSearch from "../components/SongSearch";
import LyricSelector from "../components/LyricSelector";
import ChallengeList from "../components/ChallengeList";
import BulkImportTab from "../components/BulkImportTab";

type Tab = "songs" | "challenges" | "issues" | "import";

function IssuesTab() {
  const [issues, setIssues] = useState<IssueOut[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.getIssues().then(setIssues).catch(() => {}).finally(() => setLoading(false)); }, []);

  if (loading) return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-bdr border-t-accent rounded-full animate-spin" /></div>;
  if (!issues.length) return <p className="text-muted text-center py-8">No issues reported yet.</p>;

  return (
    <div className="bg-card rounded-xl border border-bdr divide-y divide-bdr transition-colors">
      {issues.map(i => (
        <div key={i.id} className="px-4 py-3 space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-txt text-sm font-medium">{i.subject}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full ${i.status === "open" ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-600"}`}>{i.status}</span>
          </div>
          <p className="text-txt2 text-sm">{i.message}</p>
          <p className="text-muted text-xs">@{i.username} · {new Date(i.created_at).toLocaleDateString()}</p>
        </div>
      ))}
    </div>
  );
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [key, setKey] = useState("");
  const [tab, setTab] = useState<Tab>("songs");
  const [selectedSong, setSelectedSong] = useState<SongOut | null>(null);
  const [challengeKey, setChallengeKey] = useState(0);

  const login = (e: React.FormEvent) => { e.preventDefault(); setAdminKey(key); setAuthed(true); };

  if (!authed) return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="bg-card rounded-2xl shadow-sm border border-bdr p-8 w-full max-w-sm space-y-4 transition-colors">
        <h1 className="text-xl font-semibold text-txt text-center">Admin Login</h1>
        <form onSubmit={login} className="space-y-4">
          <input value={key} onChange={e => setKey(e.target.value)} type="password" placeholder="Admin API Key"
            className="w-full px-4 py-2.5 border border-input-bdr rounded-lg bg-card text-txt placeholder-muted outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors" />
          <button type="submit" className="w-full py-2.5 bg-accent text-white rounded-lg font-medium hover:bg-accent-hover transition-colors">Enter</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex gap-1 bg-card rounded-xl border border-bdr p-1 transition-colors">
          {(["songs", "challenges", "import", "issues"] as Tab[]).map(t => (
            <button key={t} onClick={() => { setTab(t); if (t === "challenges") setChallengeKey(k => k + 1); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                tab === t ? "bg-accent text-white shadow-sm" : "text-txt2 hover:text-txt"
              }`}>{t}</button>
          ))}
        </div>
        {tab === "songs" ? (
          selectedSong ? <LyricSelector song={selectedSong} onDone={() => setSelectedSong(null)} />
            : <SongSearch onSongSelect={setSelectedSong} />
        ) : tab === "challenges" ? <ChallengeList key={challengeKey} /> : tab === "import" ? <BulkImportTab /> : <IssuesTab />}
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import { api, type BulkImportJob } from "../api/client";

const SOURCES = [
  { value: "ytmusic", label: "YouTube Music", info: "Searches by popularity — top results are the most played/trending songs for your query." },
  { value: "spotify", label: "Spotify (coming soon)", disabled: true, info: "" },
  { value: "apple_music", label: "Apple Music (coming soon)", disabled: true, info: "" },
];

const LANGUAGES = [
  { value: "", label: "Any language" },
  { value: "en", label: "English" }, { value: "es", label: "Spanish" },
  { value: "hi", label: "Hindi" }, { value: "ko", label: "Korean" },
  { value: "ja", label: "Japanese" }, { value: "pt", label: "Portuguese" },
  { value: "fr", label: "French" }, { value: "de", label: "German" },
  { value: "it", label: "Italian" }, { value: "te", label: "Telugu" },
  { value: "ta", label: "Tamil" },
];

export default function BulkImportTab() {
  const [source, setSource] = useState("ytmusic");
  const [language, setLanguage] = useState("");
  const [count, setCount] = useState("50");
  const [challengesPerSong, setChallengesPerSong] = useState("1");
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [jobs, setJobs] = useState<BulkImportJob[]>([]);
  const [activeJob, setActiveJob] = useState<BulkImportJob | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logRef = useRef<HTMLPreElement>(null);

  useEffect(() => { loadJobs(); }, []);

  useEffect(() => {
    if (activeJob && (activeJob.status === "pending" || activeJob.status === "running")) {
      pollRef.current = setInterval(async () => {
        const j = await api.getBulkImportJob(activeJob.id);
        setActiveJob(j);
        if (j.status === "completed" || j.status === "failed") {
          clearInterval(pollRef.current!);
          loadJobs();
        }
      }, 3000);
      return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }
  }, [activeJob?.id, activeJob?.status]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [activeJob?.log]);

  const loadJobs = async () => {
    try { setJobs(await api.getBulkImportJobs()); } catch {}
  };

  const numOnly = (v: string) => v.replace(/\D/g, "");

  const start = async () => {
    const c = parseInt(count) || 50;
    const cps = Math.min(Math.max(parseInt(challengesPerSong) || 1, 1), 5);
    if (c < 1 || c > 500) { setError("Count must be 1–500"); return; }
    setError("");
    setLoading(true);
    try {
      const job = await api.startBulkImport(
        source, c, cps,
        language || undefined,
        yearFrom ? parseInt(yearFrom) : undefined,
        yearTo ? parseInt(yearTo) : undefined,
        searchQuery || undefined,
      );
      setActiveJob(job);
      loadJobs();
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const sourceInfo = SOURCES.find(s => s.value === source)?.info;
  const progress = activeJob ? activeJob.imported + activeJob.skipped + activeJob.failed : 0;
  const total = activeJob?.total_found || parseInt(count) || 1;
  const pct = activeJob?.status === "completed" ? 100 : Math.round((progress / total) * 100);

  const sel = "w-full px-3 py-2 rounded-lg border border-bdr bg-card text-txt text-sm focus:outline-none focus:ring-2 focus:ring-accent";
  const btn = "px-4 py-2 rounded-lg text-sm font-medium text-white bg-accent hover:bg-accent-hover disabled:opacity-50 transition";

  return (
    <div className="space-y-6">
      <div className="bg-card border border-bdr rounded-xl p-5 space-y-4">
        <h3 className="text-txt font-semibold">New Bulk Import</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-muted block mb-1">Source</label>
            <select className={sel} value={source} onChange={e => setSource(e.target.value)}>
              {SOURCES.map(s => <option key={s.value} value={s.value} disabled={s.disabled}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">Language</label>
            <select className={sel} value={language} onChange={e => setLanguage(e.target.value)}>
              {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">Songs to import</label>
            <input type="text" inputMode="numeric" className={sel} value={count} placeholder="50" onChange={e => setCount(numOnly(e.target.value))} />
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">Challenges per song</label>
            <input type="text" inputMode="numeric" className={sel} value={challengesPerSong} placeholder="1" onChange={e => setChallengesPerSong(numOnly(e.target.value))} />
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">From year</label>
            <input type="text" inputMode="numeric" className={sel} placeholder="e.g. 2020" maxLength={4} value={yearFrom} onChange={e => setYearFrom(numOnly(e.target.value))} />
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">To year</label>
            <input type="text" inputMode="numeric" className={sel} placeholder="e.g. 2024" maxLength={4} value={yearTo} onChange={e => setYearTo(numOnly(e.target.value))} />
          </div>
        </div>
        <div>
          <label className="text-xs text-muted block mb-1">Custom search query (optional)</label>
          <input type="text" className={sel} placeholder="e.g. arijit singh romantic" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        {sourceInfo && <p className="text-xs text-muted italic">ℹ️ {sourceInfo}</p>}
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button className={btn} onClick={start} disabled={loading || activeJob?.status === "running"}>
          {loading ? "Starting..." : activeJob?.status === "running" ? "Import running..." : "Start Import"}
        </button>
      </div>

      {activeJob && (
        <div className="bg-card border border-bdr rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-txt font-semibold">Job #{activeJob.id}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              activeJob.status === "completed" ? "bg-green-100 text-green-700" :
              activeJob.status === "running" ? "bg-blue-100 text-blue-700" :
              activeJob.status === "failed" ? "bg-red-100 text-red-700" :
              "bg-gray-100 text-gray-600"
            }`}>{activeJob.status}</span>
          </div>
          <div className="w-full bg-bg rounded-full h-2.5">
            <div className="bg-accent h-2.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-muted">
            <span>✅ {activeJob.imported} imported</span>
            <span>⏭️ {activeJob.skipped} skipped</span>
            <span>❌ {activeJob.failed} failed</span>
            <span>🎯 {activeJob.challenges_created} challenges</span>
          </div>
          {activeJob.log && (
            <pre ref={logRef} className="bg-bg text-txt2 text-xs p-3 rounded-lg max-h-60 overflow-y-auto whitespace-pre-wrap font-mono">
              {activeJob.log}
            </pre>
          )}
        </div>
      )}

      {jobs.length > 0 && (
        <div className="bg-card border border-bdr rounded-xl p-5">
          <h3 className="text-txt font-semibold mb-3">Import History</h3>
          <div className="space-y-2">
            {jobs.map(j => (
              <div key={j.id} className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-card-hover cursor-pointer" onClick={() => setActiveJob(j)}>
                <div className="text-txt">
                  #{j.id} — {j.source} {j.language || "any"} × {j.requested_count}
                  {j.search_query && ` "${j.search_query}"`}
                  {j.year_from && ` (${j.year_from}–${j.year_to || "now"})`}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-muted text-xs">{j.imported} songs, {j.challenges_created} challenges</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    j.status === "completed" ? "bg-green-100 text-green-700" :
                    j.status === "running" ? "bg-blue-100 text-blue-700" :
                    j.status === "failed" ? "bg-red-100 text-red-700" :
                    "bg-gray-100 text-gray-600"
                  }`}>{j.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

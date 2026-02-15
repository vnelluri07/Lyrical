import { useState, useEffect } from "react";
import { api, type LyricLine, type SongOut } from "../api/client";

export default function LyricSelector({ song, onDone }: { song: SongOut; onDone: () => void }) {
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [start, setStart] = useState<number | null>(null);
  const [end, setEnd] = useState<number | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => { api.getSongLyrics(song.id).then(setLyrics); }, [song.id]);

  const handleClick = (n: number) => {
    if (start === null) { setStart(n); setEnd(null); }
    else if (end === null) { setEnd(n < start ? (setStart(n), start) : n); }
    else { setStart(n); setEnd(null); }
  };

  const isSelected = (n: number) => start !== null && end !== null && n >= start && n <= end;
  const isStart = (n: number) => n === start && end === null;

  const create = async () => {
    if (start === null || end === null) return;
    setMsg("");
    try { await api.createChallenge(song.id, start, end); setMsg("✅ Challenge created!"); setStart(null); setEnd(null); }
    catch (e: any) { setMsg(`❌ ${e.message}`); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-txt font-medium">{song.title}</h3>
          <p className="text-muted text-sm">{song.artist} — tap first & last line</p>
        </div>
        <button onClick={onDone} className="text-sm text-muted hover:text-txt2">← Back</button>
      </div>
      {msg && <p className="text-sm text-txt2">{msg}</p>}
      <div className="bg-card rounded-xl border border-bdr divide-y divide-bdr max-h-96 overflow-y-auto transition-colors">
        {lyrics.map(l => (
          <button key={l.line_number} onClick={() => handleClick(l.line_number)}
            className={`w-full text-left px-4 py-2 text-sm transition-colors ${
              isSelected(l.line_number) ? "bg-accent/10 text-accent" :
              isStart(l.line_number) ? "bg-accent/20 text-accent" :
              "text-txt2 hover:bg-card-hover"
            }`}>
            <span className="text-muted mr-2 text-xs">{l.line_number}</span>{l.text}
          </button>
        ))}
      </div>
      {start !== null && end !== null && (
        <button onClick={create} className="w-full py-2.5 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors">
          Create Challenge (lines {start}–{end})
        </button>
      )}
    </div>
  );
}

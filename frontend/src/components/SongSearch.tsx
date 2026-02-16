import { useState, useEffect } from "react";
import { api, type SongSearchResult, type SongOut } from "../api/client";

const LANGS = [
  ["en", "English"], ["es", "Spanish"], ["fr", "French"], ["de", "German"], ["pt", "Portuguese"],
  ["ko", "Korean"], ["ja", "Japanese"], ["zh", "Chinese"], ["hi", "Hindi"], ["te", "Telugu"],
  ["ta", "Tamil"], ["kn", "Kannada"], ["ml", "Malayalam"], ["ar", "Arabic"], ["ru", "Russian"],
  ["tr", "Turkish"], ["it", "Italian"], ["nl", "Dutch"], ["sv", "Swedish"], ["pl", "Polish"],
];

export default function SongSearch({ onSongSelect }: { onSongSelect: (song: SongOut) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SongSearchResult[]>([]);
  const [songs, setSongs] = useState<SongOut[]>([]);
  const [importing, setImporting] = useState<string | null>(null);
  const [importLang, setImportLang] = useState<Record<string, string>>({});
  const [editingLang, setEditingLang] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [msg, setMsg] = useState("");

  const search = async (e: React.FormEvent) => { e.preventDefault(); if (!query.trim()) return; setMsg(""); setResults((await api.searchSongs(query)).results); };
  const importSong = async (r: SongSearchResult) => {
    setImporting(r.video_id); setMsg("");
    try { const res = await api.importSong(r.video_id, importLang[r.video_id] || undefined); setMsg(`✅ Imported "${res.title}" (${res.lyric_count} lines)`); loadSongs(); }
    catch (e: any) { setMsg(`❌ ${e.message}`); }
    setImporting(null);
  };
  const updateLang = async (songId: number, lang: string) => { await api.setSongLanguage(songId, lang); setEditingLang(null); loadSongs(); };
  const removeSong = async (id: number) => {
    if (!confirm("Delete this song and all its challenges?")) return;
    setDeleting(id);
    try { await api.deleteSong(id); setMsg("🗑️ Song deleted"); loadSongs(); }
    catch (e: any) { setMsg(`❌ ${e.message}`); }
    setDeleting(null);
  };
  const loadSongs = async () => { setSongs(await api.listSongs()); };
  useEffect(() => { loadSongs(); }, []);

  return (
    <div className="space-y-6">
      <form onSubmit={search} className="flex gap-2">
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search YouTube Music..."
          className="flex-1 px-4 py-2.5 border border-input-bdr rounded-lg bg-card text-txt placeholder-muted outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors" />
        <button type="submit" className="px-5 py-2.5 bg-accent text-white rounded-lg font-medium hover:bg-accent-hover transition-colors">Search</button>
      </form>

      {msg && <p className="text-sm text-txt2">{msg}</p>}

      {results.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-txt2 text-sm font-medium">Search Results</h3>
          {results.map(r => (
            <div key={r.video_id} className="flex items-center justify-between gap-2 p-3 bg-card rounded-xl border border-bdr transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                {r.thumbnail_url && <img src={r.thumbnail_url} className="w-10 h-10 rounded-lg object-cover" />}
                <div className="min-w-0">
                  <p className="text-txt text-sm font-medium truncate">{r.title}</p>
                  <p className="text-muted text-xs truncate">{r.artist}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <select value={importLang[r.video_id] || ""} onChange={e => setImportLang(p => ({ ...p, [r.video_id]: e.target.value }))}
                  className="px-2 py-1 border border-bdr bg-card text-txt2 rounded-lg text-xs outline-none">
                  <option value="">Auto</option>
                  {LANGS.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
                </select>
                <button onClick={() => importSong(r)} disabled={importing === r.video_id}
                  className="px-3 py-1.5 text-sm bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition-colors">
                  {importing === r.video_id ? "..." : "Import"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {songs.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-txt2 text-sm font-medium">Imported Songs</h3>
          {songs.map(s => (
            <div key={s.id} className="flex items-center gap-3 p-3 bg-card rounded-xl border border-bdr transition-colors">
              <button onClick={() => onSongSelect(s)} className="flex items-center gap-3 min-w-0 flex-1 text-left">
                {s.thumbnail_url && <img src={s.thumbnail_url} className="w-10 h-10 rounded-lg object-cover" />}
                <div className="min-w-0">
                  <p className="text-txt text-sm font-medium truncate">{s.title}</p>
                  <p className="text-muted text-xs truncate">{s.artist}</p>
                </div>
              </button>
              {editingLang === s.id ? (
                <select autoFocus value={s.language || ""} onChange={e => updateLang(s.id, e.target.value)} onBlur={() => setEditingLang(null)}
                  className="px-2 py-1 border border-bdr bg-card text-txt2 rounded-lg text-xs outline-none">
                  {LANGS.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
                </select>
              ) : (
                <button onClick={() => setEditingLang(s.id)} className="text-muted text-xs uppercase hover:text-accent transition-colors">{s.language || "??"}</button>
              )}
              <button onClick={() => removeSong(s.id)} disabled={deleting === s.id}
                className="text-red-400 hover:text-red-500 disabled:opacity-50 transition-colors text-xs" title="Delete song">
                {deleting === s.id ? "..." : "✕"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

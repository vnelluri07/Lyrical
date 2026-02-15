import type { RevealResponse } from "../api/client";

const YTMusic = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="12" fill="#FF0000" />
    <path d="M9.5 7.5v9l7-4.5-7-4.5z" fill="white" />
  </svg>
);
const Spotify = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="12" fill="#1DB954" />
    <path d="M16.5 16.2c-.2 0-.3-.1-.5-.2-1.5-.9-3.4-1.4-5.4-1.4-.9 0-1.9.1-2.8.3-.3.1-.5-.1-.6-.4-.1-.3.1-.5.4-.6 1-.2 2-.3 3-.3 2.2 0 4.2.5 5.9 1.5.2.1.3.4.2.7-.1.2-.2.4-.4.4zm1.2-2.7c-.2 0-.3-.1-.5-.2-1.8-1.1-4.2-1.7-6.6-1.7-1.1 0-2.1.1-3.1.4-.3.1-.6-.1-.7-.4-.1-.3.1-.6.4-.7 1.1-.3 2.2-.4 3.4-.4 2.6 0 5.2.7 7.2 1.9.3.2.4.5.2.8-.1.2-.3.3-.5.3zm1.3-3.1c-.2 0-.3-.1-.4-.1C16.4 9 13.6 8.3 10.8 8.3c-1.3 0-2.5.1-3.7.4-.3.1-.7-.1-.8-.5-.1-.3.1-.7.5-.8 1.3-.3 2.6-.5 4-.5 3 0 6 .7 8.5 2.1.3.2.4.6.2.9-.1.3-.3.4-.5.4z" fill="white" />
  </svg>
);
const AppleMusic = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <rect width="24" height="24" rx="5" fill="#FC3C44" />
    <path d="M16.5 6.2c0-.3-.2-.5-.4-.6l-6-2.5c-.1 0-.2-.1-.3-.1-.4 0-.6.3-.6.6v10.8c-.5-.3-1.1-.4-1.7-.4-1.7 0-3 1.1-3 2.5s1.3 2.5 3 2.5 3-1.1 3-2.5V9.8l4.5 1.9v4.7c-.5-.3-1.1-.4-1.7-.4-1.7 0-3 1.1-3 2.5s1.3 2.5 3 2.5 3-1.1 3-2.5V6.2z" fill="white" />
  </svg>
);

const ICONS: Record<string, React.FC> = { youtube_music: YTMusic, spotify: Spotify, apple_music: AppleMusic };
const LABELS: Record<string, string> = { youtube_music: "YouTube Music", spotify: "Spotify", apple_music: "Apple Music" };

export default function SongReveal({ data }: { data: RevealResponse }) {
  return (
    <div className="bg-card rounded-2xl shadow-sm border border-bdr p-8 text-center space-y-5 animate-[fadeIn_0.5s_ease] transition-colors">
      {data.thumbnail_url && (
        <img src={data.thumbnail_url} alt={data.title} className="w-28 h-28 rounded-2xl mx-auto shadow-md" />
      )}
      <div>
        <h2 className="text-2xl font-semibold text-txt">{data.title}</h2>
        <p className="text-lg text-txt2 mt-1">{data.artist}</p>
        {data.album && <p className="text-sm text-muted mt-1">{data.album}</p>}
      </div>
      <div className="flex justify-center gap-3 pt-1">
        {Object.entries(data.platform_links).map(([key, url]) => {
          const Icon = ICONS[key];
          return (
            <a key={key} href={url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-bdr text-txt2 hover:bg-card-hover hover:border-input-bdr transition-all text-sm">
              {Icon && <Icon />}
              <span>{LABELS[key]}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}

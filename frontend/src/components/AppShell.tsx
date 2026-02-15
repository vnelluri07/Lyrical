import { Link, useLocation } from "react-router-dom";
import { useTheme } from "../ThemeContext";

const Logo = () => (
  <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
    <rect width="32" height="32" rx="10" fill="var(--c-accent)"/>
    <line x1="6" y1="9" x2="15" y2="9" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
    <line x1="6" y1="13" x2="13" y2="13" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.75"/>
    <line x1="6" y1="17" x2="11" y2="17" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.5"/>
    <path d="M21 7v14" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    <ellipse cx="18.5" cy="21" rx="3" ry="2" fill="white"/>
    <path d="M21 7c3 1 5 3 4 6" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
  </svg>
);

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const { theme, toggle } = useTheme();
  const link = (to: string, label: string) => (
    <Link to={to} className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
      pathname === to ? "bg-accent-soft text-accent font-medium" : "text-txt2 hover:bg-card-hover"
    }`}>{label}</Link>
  );
  return (
    <div className="min-h-screen bg-bg transition-colors">
      <header className="bg-card border-b border-bdr sticky top-0 z-40 transition-colors">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-5 py-3">
          <Link to="/" className="flex items-center gap-2 text-xl font-semibold text-txt tracking-tight"><Logo />Lyricle</Link>
          <nav className="flex items-center gap-1">
            {link("/", "Play")}
            {link("/leaderboard", "Leaderboard")}
            {link("/contact", "Contact")}
            {link("/admin", "Admin")}
            <button onClick={toggle} className="ml-2 p-2 rounded-full text-txt2 hover:bg-card-hover transition-colors" title="Toggle theme">
              {theme === "light" ? "🌙" : "☀️"}
            </button>
          </nav>
        </div>
      </header>
      <main className="max-w-5xl mx-auto">{children}</main>
    </div>
  );
}

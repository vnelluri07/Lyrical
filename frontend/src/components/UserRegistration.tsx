import { useState, useEffect, useRef, useCallback } from "react";
import { api, type UserOut } from "../api/client";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "938071398673-rdq3pg1c3ruef26lc3f7jlm0qdkd9pf4.apps.googleusercontent.com";

declare global { interface Window { google?: any; } }

export default function UserRegistration({ onComplete }: { onComplete: (user: UserOut) => void }) {
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [available, setAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"choose" | "manual">("choose");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const googleDiv = useRef<HTMLDivElement>(null);

  const handleGoogleResponse = useCallback(async (response: any) => {
    setError("");
    try {
      const user = await api.googleLogin(response.credential);
      localStorage.setItem("lyricle_user", JSON.stringify(user));
      onComplete(user);
    } catch (e: any) { setError(e.message); }
  }, [onComplete]);

  useEffect(() => {
    if (document.getElementById("google-gsi")) return;
    const script = document.createElement("script");
    script.id = "google-gsi";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => {
      window.google?.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleGoogleResponse });
      if (googleDiv.current) window.google?.accounts.id.renderButton(googleDiv.current, { theme: "outline", size: "large", width: 320, text: "signin_with" });
    };
    document.head.appendChild(script);
  }, [handleGoogleResponse]);

  useEffect(() => {
    if (mode === "choose" && googleDiv.current && window.google)
      window.google.accounts.id.renderButton(googleDiv.current, { theme: "outline", size: "large", width: 320, text: "signin_with" });
  }, [mode]);

  useEffect(() => {
    if (username.length < 3) { setAvailable(null); return; }
    setChecking(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try { const { available: a } = await api.checkUsername(username); setAvailable(a); }
      catch { setAvailable(null); }
      setChecking(false);
    }, 400);
    return () => clearTimeout(timer.current);
  }, [username]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username || !firstName || !lastName) return;
    try {
      const user = await api.register(username, firstName, lastName);
      localStorage.setItem("lyricle_user", JSON.stringify(user));
      onComplete(user);
    } catch (e: any) { setError(e.message); }
  };

  const inputCls = "w-full px-4 py-2.5 border border-input-bdr rounded-lg bg-card text-txt placeholder-muted outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all";

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl shadow-sm border border-bdr p-8 space-y-6 transition-colors">
          <div className="text-center">
            <div className="text-4xl mb-3">
              <svg width="48" height="48" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="10" fill="var(--c-accent)"/><line x1="6" y1="9" x2="15" y2="9" stroke="white" strokeWidth="1.8" strokeLinecap="round"/><line x1="6" y1="13" x2="13" y2="13" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.75"/><line x1="6" y1="17" x2="11" y2="17" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.5"/><path d="M21 7v14" stroke="white" strokeWidth="2" strokeLinecap="round"/><ellipse cx="18.5" cy="21" rx="3" ry="2" fill="white"/><path d="M21 7c3 1 5 3 4 6" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none"/></svg>
            </div>
            <h1 className="text-2xl font-semibold text-txt">Welcome to Lyricle</h1>
            <p className="text-txt2 text-sm mt-2">Sign in to track your scores and compete</p>
          </div>

          {error && <p className="text-red-500 text-sm text-center bg-red-500/10 rounded-lg py-2">{error}</p>}

          {mode === "choose" ? (
            <div className="space-y-4">
              <div className="flex justify-center"><div ref={googleDiv} /></div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-bdr" />
                <span className="text-muted text-xs">or</span>
                <div className="flex-1 h-px bg-bdr" />
              </div>
              <button onClick={() => setMode("manual")}
                className="w-full py-2.5 border border-input-bdr text-txt2 rounded-lg text-sm font-medium hover:bg-card-hover transition-colors">
                Continue with username
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <div className="relative">
                  <input value={username} onChange={e => setUsername(e.target.value.replace(/\s/g, ""))}
                    placeholder="Username" maxLength={32} className={inputCls} />
                  {username.length >= 3 && (
                    <span className="absolute right-3 top-3 text-sm">
                      {checking ? "⏳" : available ? "✅" : available === false ? "❌" : ""}
                    </span>
                  )}
                </div>
                {available === false && <p className="text-red-500 text-xs mt-1">Username taken</p>}
              </div>
              <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First name" maxLength={64} className={inputCls} />
              <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last name" maxLength={64} className={inputCls} />
              <button type="submit" disabled={!username || !firstName || !lastName || available === false}
                className="w-full py-2.5 bg-accent text-white rounded-lg font-medium hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                Start Playing
              </button>
              <button type="button" onClick={() => setMode("choose")}
                className="w-full text-sm text-txt2 hover:text-txt transition-colors">← Back</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

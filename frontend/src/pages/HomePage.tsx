import { useState, useEffect } from "react";
import { api, type UserOut } from "../api/client";
import UserRegistration from "../components/UserRegistration";
import GamePage from "./GamePage";

const LANG_NAMES: Record<string, string> = {
  en: "English", hi: "Hindi", te: "Telugu",
  // TODO: Add more languages later
  // es: "Spanish", fr: "French", de: "German", it: "Italian", pt: "Portuguese",
  // ko: "Korean", ja: "Japanese", zh: "Chinese", ta: "Tamil",
  // ar: "Arabic", ru: "Russian", tr: "Turkish", nl: "Dutch", sv: "Swedish", pl: "Polish",
};

export default function HomePage() {
  const [user, setUser] = useState<UserOut | null>(() => {
    const saved = localStorage.getItem("lyricle_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [languages, setLanguages] = useState<string[]>([]);
  const [language, setLanguage] = useState<string>("");

  useEffect(() => { api.getLanguages().then(setLanguages).catch(() => {}); }, []);

  if (!user) return <UserRegistration onComplete={setUser} />;

  return (
    <div>
      <div className="flex items-center justify-center gap-4 pt-6">
        <p className="text-txt2 text-sm">Hey <span className="text-txt font-medium">{user.first_name}</span> 👋</p>
        {languages.length > 1 && (
          <select value={language} onChange={e => setLanguage(e.target.value)}
            className="px-3 py-1.5 bg-card text-txt2 rounded-lg text-sm outline-none border border-bdr focus:border-accent transition-colors">
            <option value="">All Languages</option>
            {languages.filter(l => l in LANG_NAMES).map(l => <option key={l} value={l}>{LANG_NAMES[l]}</option>)}
          </select>
        )}
      </div>
      <GamePage key={language} userId={user.id} language={language || undefined} />
    </div>
  );
}

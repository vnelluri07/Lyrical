import { useState, useEffect, useCallback } from "react";
import { api, type GameChallenge, type GuessResponse, type HintResponse, type RevealResponse } from "../api/client";
import LyricDisplay from "../components/LyricDisplay";
import GuessInput from "../components/GuessInput";
import HintLines from "../components/HintLines";
import SongReveal from "../components/SongReveal";
import Snackbar from "../components/Snackbar";

type State = "loading" | "playing" | "hinted" | "revealed" | "no-challenges";

export default function GamePage({ userId, language }: { userId?: number; language?: string }) {
  const [state, setState] = useState<State>("loading");
  const [challenge, setChallenge] = useState<GameChallenge | null>(null);
  const [hint, setHint] = useState<HintResponse | null>(null);
  const [reveal, setReveal] = useState<RevealResponse | null>(null);
  const [snack, setSnack] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [suggestion, setSuggestion] = useState<GuessResponse | null>(null);

  const loadChallenge = useCallback(async () => {
    setState("loading"); setSnack(null); setHint(null); setReveal(null); setSuggestion(null);
    try { const c = await api.getChallenge(language); setChallenge(c); setState("playing"); }
    catch { setState("no-challenges"); }
  }, [language]);

  useEffect(() => { loadChallenge(); }, [loadChallenge]);

  const handleCorrect = async () => {
    if (!challenge) return;
    const r = await api.getReveal(challenge.challenge_id, userId);
    setReveal(r); setState("revealed");
  };

  const handleGuess = async (guess: string) => {
    if (!challenge) return;
    setSuggestion(null);
    try {
      const res = await api.guess(challenge.challenge_id, guess, userId);
      if (res.correct) { setSnack({ message: "Correct! 🎉", type: "success" }); handleCorrect(); }
      else if (res.near_match) { setSuggestion(res); setSnack(null); }
      else { setSnack({ message: res.message, type: "error" }); }
    } catch { setSnack({ message: "Something went wrong", type: "error" }); }
  };

  const acceptSuggestion = () => { setSnack({ message: "Correct! 🎉", type: "success" }); setSuggestion(null); handleCorrect(); };
  const rejectSuggestion = () => { setSuggestion(null); setSnack({ message: "Not quite — try again!", type: "error" }); };

  const handleHint = async () => {
    if (!challenge) return;
    try { const h = await api.getHint(challenge.challenge_id, userId); setHint(h); setState("hinted"); }
    catch { /* ignore */ }
  };

  const handleReveal = async () => {
    if (!challenge) return;
    const r = await api.getReveal(challenge.challenge_id, userId);
    setReveal(r); setState("revealed");
  };

  if (state === "loading") return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-2 border-bdr border-t-accent rounded-full animate-spin" />
    </div>
  );

  if (state === "no-challenges") return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <p className="text-2xl text-muted">No songs available yet</p>
        <p className="text-muted text-sm mt-2">Check back soon!</p>
      </div>
    </div>
  );

  return (
    <>
      {snack && <Snackbar message={snack.message} type={snack.type} onClose={() => setSnack(null)} />}
      <div className="flex items-center justify-center min-h-[60vh] px-4 py-10">
        <div className="w-full max-w-xl space-y-6">
          <p className="text-center text-muted text-sm font-medium tracking-widest uppercase">Guess the Song</p>

          {challenge && <LyricDisplay lines={challenge.lines} />}
          {hint && <HintLines before={hint.before} after={hint.after} />}

          {suggestion && (
            <div className="text-center space-y-3 p-5 bg-amber-500/10 border border-amber-500/30 rounded-xl animate-[fadeIn_0.3s_ease]">
              <p className="text-amber-600 font-medium">{suggestion.message}</p>
              <div className="flex justify-center gap-3">
                <button onClick={acceptSuggestion} className="px-5 py-2 bg-emerald-500 rounded-lg text-white text-sm font-medium hover:bg-emerald-600 transition-colors">Yes!</button>
                <button onClick={rejectSuggestion} className="px-5 py-2 border border-input-bdr rounded-lg text-txt2 text-sm font-medium hover:bg-card-hover transition-colors">No</button>
              </div>
            </div>
          )}

          {state !== "revealed" ? (
            <div className="space-y-4">
              <GuessInput onSubmit={handleGuess} />
              <div className="flex justify-center gap-4">
                {state === "playing" && (
                  <button onClick={handleHint} className="text-sm text-muted hover:text-txt2 transition-colors">Need a hint?</button>
                )}
                <button onClick={handleReveal} className="text-sm text-muted hover:text-txt2 transition-colors">Reveal song</button>
                <button onClick={loadChallenge} className="text-sm text-muted hover:text-txt2 transition-colors">Skip →</button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {reveal && <SongReveal data={reveal} />}
              <div className="text-center">
                <button onClick={loadChallenge} className="px-8 py-3 bg-accent text-white rounded-xl font-medium hover:bg-accent-hover transition-colors shadow-sm">
                  Next Song →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

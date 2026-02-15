import { useState } from "react";

export default function GuessInput({ onSubmit }: { onSubmit: (guess: string) => void }) {
  const [value, setValue] = useState("");
  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    onSubmit(value.trim());
    setValue("");
  };
  return (
    <form onSubmit={handle} className="flex gap-2">
      <input value={value} onChange={e => setValue(e.target.value)} placeholder="Type your guess..."
        className="flex-1 px-4 py-3 border border-input-bdr rounded-xl bg-card text-txt placeholder-muted outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all text-base" />
      <button type="submit" className="px-6 py-3 bg-accent text-white rounded-xl font-medium hover:bg-accent-hover transition-colors">
        Guess
      </button>
    </form>
  );
}

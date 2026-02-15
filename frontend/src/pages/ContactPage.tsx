import { useState } from "react";
import { api, type UserOut } from "../api/client";

export default function ContactPage() {
  const user: UserOut | null = (() => {
    const saved = localStorage.getItem("lyricle_user");
    return saved ? JSON.parse(saved) : null;
  })();

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !subject.trim() || !message.trim()) return;
    setStatus("sending");
    try {
      await api.submitIssue(user.id, user.username, subject.trim(), message.trim());
      setStatus("sent"); setSubject(""); setMessage("");
    } catch { setStatus("error"); }
  };

  if (!user) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <p className="text-muted">Please sign in first to submit feedback.</p>
    </div>
  );

  return (
    <div className="px-4 py-10">
      <div className="max-w-lg mx-auto">
        <div className="bg-card rounded-2xl shadow-sm border border-bdr p-8 space-y-6 transition-colors">
          <div className="text-center">
            <h1 className="text-xl font-semibold text-txt">Contact / Report a Bug</h1>
            <p className="text-txt2 text-sm mt-1">Submitting as <span className="font-medium text-txt">@{user.username}</span></p>
          </div>

          {status === "sent" ? (
            <div className="text-center py-6">
              <p className="text-emerald-500 text-lg font-medium">✅ Submitted!</p>
              <p className="text-muted text-sm mt-2">Thanks for your feedback.</p>
              <button onClick={() => setStatus("idle")} className="mt-4 text-sm text-accent hover:text-accent-hover transition-colors">Submit another</button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject" maxLength={200}
                className="w-full px-4 py-2.5 border border-input-bdr rounded-lg bg-card text-txt placeholder-muted outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all" />
              <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Describe the issue or share your feedback..." rows={5}
                className="w-full px-4 py-2.5 border border-input-bdr rounded-lg bg-card text-txt placeholder-muted outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all resize-none" />
              <button type="submit" disabled={!subject.trim() || !message.trim() || status === "sending"}
                className="w-full py-2.5 bg-accent text-white rounded-lg font-medium hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                {status === "sending" ? "Sending..." : "Submit"}
              </button>
              {status === "error" && <p className="text-red-500 text-sm text-center">Something went wrong. Try again.</p>}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

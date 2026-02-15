import { useEffect } from "react";

export default function Snackbar({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [message, onClose]);

  return (
    <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium animate-[fadeIn_0.3s_ease] ${
      type === "success" ? "bg-emerald-500" : "bg-red-500"
    }`}>
      {message}
    </div>
  );
}

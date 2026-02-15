export default function GameFeedback({ message, correct }: { message: string; correct: boolean }) {
  return (
    <p className={`text-center text-lg py-2 ${correct ? "text-emerald-400" : "text-red-400 animate-[shake_0.3s_ease-in-out]"}`}>
      {message}
    </p>
  );
}

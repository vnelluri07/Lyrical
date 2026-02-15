export default function HintLines({ before, after }: { before: string[]; after: string[] }) {
  return (
    <div className="space-y-2 animate-[fadeIn_0.4s_ease]">
      {before.map((l, i) => (
        <p key={`b${i}`} className="text-center text-muted italic text-base">"{l}"</p>
      ))}
      {after.map((l, i) => (
        <p key={`a${i}`} className="text-center text-muted italic text-base">"{l}"</p>
      ))}
    </div>
  );
}

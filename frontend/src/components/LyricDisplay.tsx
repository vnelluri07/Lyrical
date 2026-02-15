export default function LyricDisplay({ lines }: { lines: string[] }) {
  return (
    <div className="bg-card rounded-2xl shadow-sm border border-bdr p-8 text-center space-y-2 transition-colors">
      {lines.map((line, i) => (
        <p key={i} className="text-xl md:text-2xl font-medium text-txt leading-relaxed italic">"{line}"</p>
      ))}
    </div>
  );
}

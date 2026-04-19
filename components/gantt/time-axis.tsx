export function TimeAxis({ hourWidth }: { hourWidth: number }) {
  return (
    <div className="sticky top-0 z-10 flex h-8 border-b border-border/50 bg-background/80 backdrop-blur">
      {Array.from({ length: 24 }).map((_, h) => (
        <div
          key={h}
          className="flex-shrink-0 border-r border-border/30 text-[10px] text-muted-foreground"
          style={{ width: hourWidth }}
        >
          <span className="ml-1">{String(h).padStart(2, "0")}:00</span>
        </div>
      ))}
    </div>
  );
}

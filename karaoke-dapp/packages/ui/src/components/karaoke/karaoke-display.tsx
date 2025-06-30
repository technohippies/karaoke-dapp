import * as React from 'react';
import { cn } from '../../lib/utils';

export interface KaraokeLyricLine {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  score?: number; // 0-1, higher is better
}

interface KaraokeDisplayProps {
  lines: KaraokeLyricLine[];
  currentTime: number;
  className?: string;
}

export function KaraokeDisplay({
  lines,
  currentTime,
  className,
}: KaraokeDisplayProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const activeLineRef = React.useRef<HTMLDivElement>(null);

  // Find active line
  const activeIndex = lines.findIndex(
    (line) => currentTime >= line.startTime && currentTime < line.endTime
  );

  // Smooth scroll to active line
  React.useEffect(() => {
    if (activeLineRef.current && containerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeIndex]);

  // Calculate red intensity based on score (0-1 → 0-255)
  const getScoreColor = (score?: number) => {
    if (score === undefined) return 'text-neutral-400';
    const intensity = Math.round(score * 255);
    return `text-[rgb(${intensity},0,0)]`;
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'h-full overflow-y-auto scrollbar-none',
        'flex flex-col items-center justify-center',
        'py-32',
        className
      )}
    >
      <div className="max-w-4xl w-full space-y-8">
        {lines.map((line, index) => {
          const isActive = index === activeIndex;
          const isPast = index < activeIndex;

          return (
            <div
              key={line.id}
              ref={isActive ? activeLineRef : null}
              className={cn(
                'text-center px-8 transition-all duration-300',
                isActive && 'scale-110',
                !isActive && !isPast && 'opacity-30'
              )}
            >
              <p
                className={cn(
                  'text-2xl md:text-4xl font-medium leading-relaxed',
                  isActive && 'text-neutral-50',
                  isPast && getScoreColor(line.score),
                  !isActive && !isPast && 'text-neutral-500'
                )}
              >
                {line.text}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

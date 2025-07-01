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
  countdown?: number; // Optional countdown value (3, 2, 1, 0)
  lineColors?: Map<number, number>; // Map of line ID to similarity score (0-1)
  className?: string;
}

export function KaraokeDisplay({
  lines,
  currentTime,
  countdown,
  lineColors,
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

  // Get color based on similarity score
  const getScoreColor = (lineId: string, isPast: boolean) => {
    if (!isPast || !lineColors) return 'text-neutral-400';
    
    const score = lineColors.get(parseInt(lineId));
    if (score === undefined) return 'text-neutral-400';
    
    // Use the grading service color logic
    if (score >= 0.8) return 'text-green-500';
    if (score >= 0.6) return 'text-yellow-500';
    if (score >= 0.3) return 'text-orange-500';
    return 'text-red-500';
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
        {/* Show countdown above first line if countdown is active */}
        {countdown !== undefined && countdown > 0 && (
          <div className="text-center px-8 transition-all duration-300">
            <p className="text-2xl md:text-4xl font-medium leading-relaxed text-neutral-50 animate-pulse">
              {countdown}
            </p>
          </div>
        )}
        
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
                  isPast && getScoreColor(line.id, isPast),
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

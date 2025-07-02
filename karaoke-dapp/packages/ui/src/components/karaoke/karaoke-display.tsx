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

  // Get color based on similarity score (gradient system)
  const getScoreColor = (lineId: string, isPast: boolean) => {
    if (!isPast || !lineColors) return undefined; // Default color for unsung lines
    
    const score = lineColors.get(parseInt(lineId));
    if (score === undefined) return undefined;
    
    // Interpolate from red (0) to green (1)
    const red = Math.round(255 * (1 - score));
    const green = Math.round(255 * score);
    return `rgb(${red}, ${green}, 0)`;
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
                // Remove opacity-30 since we're controlling opacity with style prop
              )}
            >
              <p
                className={cn(
                  'text-2xl md:text-4xl font-medium leading-relaxed transition-all duration-500',
                  isActive && 'text-neutral-50',
                  !isActive && !isPast && 'text-neutral-300'
                )}
                style={{
                  color: isPast ? getScoreColor(line.id, isPast) : undefined,
                  opacity: isActive ? 1 : (isPast ? 0.8 : 0.4)
                }}
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

import { cn } from "@/lib/utils";

interface DotGrid404Props {
  className?: string;
}

export function DotGrid404({ className }: DotGrid404Props) {
  // Grid configuration
  const dotSize = 4;
  const spacing = 14;
  const cols = 45;
  const rows = 15;

  // Define "404" pattern (each digit is 9x7 grid for better visibility)
  const digit4Pattern = [
    [1, 0, 0, 0, 1, 0, 0],
    [1, 0, 0, 0, 1, 0, 0],
    [1, 0, 0, 0, 1, 0, 0],
    [1, 0, 0, 0, 1, 0, 0],
    [1, 1, 1, 1, 1, 1, 1],
    [0, 0, 0, 0, 1, 0, 0],
    [0, 0, 0, 0, 1, 0, 0],
    [0, 0, 0, 0, 1, 0, 0],
    [0, 0, 0, 0, 1, 0, 0],
  ];

  const digit0Pattern = [
    [0, 1, 1, 1, 1, 1, 0],
    [1, 1, 0, 0, 0, 1, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 1, 0, 0, 0, 1, 1],
    [0, 1, 1, 1, 1, 1, 0],
  ];

  // Calculate center position for "404"
  const digitWidth = 7;
  const digitHeight = 9;
  const gap = 2;
  const totalWidth = digitWidth * 3 + gap * 2;
  const startCol = Math.floor((cols - totalWidth) / 2);
  const startRow = Math.floor((rows - digitHeight) / 2);

  // Generate dots
  const dots = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      let isActive = false;

      // Check if this dot is part of "404"
      if (row >= startRow && row < startRow + digitHeight) {
        const patternRow = row - startRow;

        // First "4"
        if (col >= startCol && col < startCol + digitWidth) {
          const patternCol = col - startCol;
          isActive = digit4Pattern[patternRow][patternCol] === 1;
        }
        // "0"
        else if (
          col >= startCol + digitWidth + gap &&
          col < startCol + digitWidth + gap + digitWidth
        ) {
          const patternCol = col - (startCol + digitWidth + gap);
          isActive = digit0Pattern[patternRow][patternCol] === 1;
        }
        // Second "4"
        else if (
          col >= startCol + digitWidth * 2 + gap * 2 &&
          col < startCol + digitWidth * 3 + gap * 2
        ) {
          const patternCol = col - (startCol + digitWidth * 2 + gap * 2);
          isActive = digit4Pattern[patternRow][patternCol] === 1;
        }
      }

      dots.push({
        x: col * spacing,
        y: row * spacing,
        isActive,
        fadeDelay: Math.random() * 0.8,
        pulseDelay: Math.random() * 3,
        pulseDuration: 1.5 + Math.random() * 1.5,
      });
    }
  }

  const width = cols * spacing;
  const height = rows * spacing;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("w-full max-w-4xl mx-auto", className)}
      style={{ height: "auto" }}
    >
      {dots.map((dot, i) => (
        <circle
          key={i}
          cx={dot.x + dotSize}
          cy={dot.y + dotSize}
          r={dotSize}
          className={cn(
            `animate-pulse delay-(--pulse-delay) fill-primary origin-center`,
            dot.isActive ? "opacity-100" : "opacity-10",
          )}
          style={{
            '--pulse-delay': `${dot.pulseDelay}s`,
            // animation: `pulse ${dot.pulseDuration}s ease-in-out ${dot.pulseDelay}s infinite`,
            // transformOrigin: `${dot.x}px ${dot.y}px`,
          }}
        />
      ))}
    </svg>
  );
}

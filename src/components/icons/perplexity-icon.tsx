import React from "react";

export const PerplexityIcon = ({
  size = undefined,
  color = "#000000",
  strokeWidth = 0,
  background = "transparent",
  opacity = 1,
  rotation = 0,
  shadow = 0,
  flipHorizontal = false,
  flipVertical = false,
  padding = 0,
}: {
  size?: number;
  color?: string;
  strokeWidth?: number;
  background?: string;
  opacity?: number;
  rotation?: number;
  shadow?: number;
  flipHorizontal?: boolean;
  flipVertical?: boolean;
  padding?: number;
}) => {
  const transforms = [];
  if (rotation !== 0) transforms.push(`rotate(${rotation}deg)`);
  if (flipHorizontal) transforms.push("scaleX(-1)");
  if (flipVertical) transforms.push("scaleY(-1)");

  const viewBoxSize = 24 + padding * 2;
  const viewBoxOffset = -padding;
  const viewBox = `${viewBoxOffset} ${viewBoxOffset} ${viewBoxSize} ${viewBoxSize}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={viewBox}
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        opacity,
        transform: transforms.join(" ") || undefined,
        filter:
          shadow > 0
            ? `drop-shadow(0 ${shadow}px ${shadow * 2}px rgba(0,0,0,0.3))`
            : undefined,
        backgroundColor: background !== "transparent" ? background : undefined,
      }}
    >
      <path
        fill="currentColor"
        d="M7.173 3.26L5.5 1.74V7.5H3V17h2.5v5.26l1.673-1.52L11 17.26V22h2v-4.74l3.827 3.48l1.673 1.52V17H21V7.5h-2.5V1.74l-1.673 1.52L13 6.74V2h-2v4.74zM16.5 7.5h-1.363L16.5 6.26zm-7.637 0H7.5V6.26zm1.1 2l-4.136 3.76l-.327.298V15H5V9.5zm4.074 0H19V15h-.5v-1.442l-.327-.298zM7.5 14.442l3.5-3.181v3.297L7.5 17.74zm5.5-3.181l3.5 3.181v3.297L13 14.558z"
      />
    </svg>
  );
};

import React from "react";

// All 8 axes — every normalised attribute available in decade_songs.json
const AXES = [
  { key: "valence", label: "Happiness", color: "#f4a261" },
  { key: "danceability", label: "Dance", color: "#1db954" },
  { key: "energy", label: "Energy", color: "#e63946" },
  { key: "loudness_norm", label: "Loudness", color: "#e9c46a" },
  { key: "acousticness", label: "Acoustic", color: "#5b9ec9" },
  { key: "instrumentalness", label: "Instrumental", color: "#8B5CF6" },
  { key: "speechiness", label: "Speechiness", color: "#FB7185" },
  { key: "liveness", label: "Liveness", color: "#34D399" },
];

const N = AXES.length;

// Polar → cartesian helper
function polar(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

// Build SVG polygon points string from values array
function buildPolygon(cx, cy, maxR, values) {
  return values
    .map((v, i) => {
      const angle = (360 / N) * i;
      const pt = polar(cx, cy, maxR * Math.max(0, Math.min(1, v ?? 0)), angle);
      return `${pt.x},${pt.y}`;
    })
    .join(" ");
}

/**
 * TrackRadar - dual-layer radar chart.
 * Background shape = decade mean (faint, for reference).
 * Foreground shape = individual track.
 *
 * Props:
 *   track - rack object from decade_songs.json
 *   decadeMean - mean object from the same decade entry
 *   size - overall SVG size (default 220)
 */
export default function TrackRadar({
  track = {},
  decadeMean = {},
  size = 220,
}) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.32; // slightly tighter to leave room for 8 labels
  const labelR = maxR + 20; // label ring

  // Axis grid rings (25%, 50%, 75%, 100%)
  const rings = [0.25, 0.5, 0.75, 1].map((pct, ri) => {
    const pts = AXES.map((_, i) => {
      const pt = polar(cx, cy, maxR * pct, (360 / N) * i);
      return `${pt.x},${pt.y}`;
    }).join(" ");
    return (
      <polygon
        key={ri}
        points={pts}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={0.8}
      />
    );
  });

  // Axis spokes
  const spokes = AXES.map((ax, i) => {
    const angle = (360 / N) * i;
    const end = polar(cx, cy, maxR, angle);
    return (
      <line
        key={ax.key}
        x1={cx}
        y1={cy}
        x2={end.x}
        y2={end.y}
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={0.8}
      />
    );
  });

  // Axis labels
  const labels = AXES.map((ax, i) => {
    const angle = (360 / N) * i;
    const pt = polar(cx, cy, labelR, angle);
    return (
      <text
        key={ax.key}
        x={pt.x}
        y={pt.y}
        textAnchor="middle"
        dominantBaseline="central"
        fill={ax.color}
        fontSize="9"
        fontFamily="DM Sans, sans-serif"
        fontWeight="500"
        opacity={0.85}
      >
        {ax.label}
      </text>
    );
  });

  // Mean polygon (background reference)
  const meanVals = AXES.map((ax) => decadeMean[ax.key] ?? 0);
  const meanPoints = buildPolygon(cx, cy, maxR, meanVals);

  // Track polygon (foreground)
  const trackVals = AXES.map((ax) => track[ax.key] ?? 0);
  const trackPoints = buildPolygon(cx, cy, maxR, trackVals);

  // Dot on each axis for track values
  const dots = AXES.map((ax, i) => {
    const val = Math.max(0, Math.min(1, track[ax.key] ?? 0));
    const pt = polar(cx, cy, maxR * val, (360 / N) * i);
    return (
      <circle
        key={ax.key}
        cx={pt.x}
        cy={pt.y}
        r={3}
        fill={ax.color}
        stroke="#0a0a0f"
        strokeWidth={1}
      />
    );
  });

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ overflow: "visible" }}
    >
      {/* Grid rings */}
      {rings}

      {/* Spokes */}
      {spokes}

      {/* Mean shape — faint background reference */}
      <polygon
        points={meanPoints}
        fill="rgba(255,255,255,0.04)"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth={1}
        strokeDasharray="3 2"
      />

      {/* Track shape */}
      <polygon
        points={trackPoints}
        fill="rgba(244,162,97,0.15)"
        stroke="rgba(244,162,97,0.7)"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />

      {/* Dots */}
      {dots}

      {/* Labels */}
      {labels}

      {/* Axis lines */}
      {spokes}
    </svg>
  );
}

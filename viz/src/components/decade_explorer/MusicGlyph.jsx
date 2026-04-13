import React from "react";

const ATTRS = [
  {
    key: "valence",
    label: "Valence",
    color: "#f4a261",
    glow: "rgba(244,162,97,0.45)",
  },
  {
    key: "loudness_norm",
    label: "Loudness",
    color: "#e9c46a",
    glow: "rgba(233,196,106,0.45)",
  },
  {
    key: "acousticness",
    label: "Acoustic",
    color: "#5b9ec9",
    glow: "rgba(91,158,201,0.45)",
  },
  {
    key: "danceability",
    label: "Danceability",
    color: "#1db954",
    glow: "rgba(29,185,84,0.45)",
  },
];

export default function MusicGlyph({
  attributes = {},
  width = 120,
  height = 100,
  showLabels = false,
  opacity = 1,
}) {
  const staffTop = showLabels ? 16 : 14;
  const staffBottom = height - (showLabels ? 26 : 12);
  const staffHeight = staffBottom - staffTop;
  const numLines = 5;
  const noteCount = ATTRS.length;

  // Horizontal padding so notes don't clip the edges
  const padL = 10;
  const padR = 10;
  const usableW = width - padL - padR;
  const noteSpacing = usableW / noteCount; // evenly spaced

  const rx = noteSpacing * 0.28; // notehead horizontal radius
  const ry = rx * 0.62; // notehead vertical radius
  const tilt = -14; // rotation degrees

  const beamY = staffTop - 4;
  const beamH = 5;

  // Unique prefix per instance so gradients don't clash
  //   const uid = React.useId ? React.useId().replace(/:/g, "") : Math.random().toString(36).slice(2, 6);
  const reactId = React.useId();
  const fallbackId = React.useRef(Math.random().toString(36).slice(2, 6));

  const uid = reactId ? reactId.replace(/:/g, "") : fallbackId.current;

  // Pre-compute each note's cx, cy, and stem-x so beam aligns perfectly
  const noteData = ATTRS.map((attr, i) => {
    const val = Math.max(0, Math.min(1, attributes[attr.key] ?? 0.5));
    const cx = padL + (i + 0.5) * noteSpacing; // centred in each slot
    const cy = staffBottom - val * staffHeight;
    // Stem attaches at the right edge of the tilted ellipse
    // For a -14° tilt the right-most point shifts slightly; approximate:
    const stemX = cx + rx * 0.88;
    return { attr, cx, cy, stemX, val };
  });

  // Beam spans from first stem-x to last stem-x
  const beamX1 = noteData[0].stemX - 1;
  const beamX2 = noteData[noteData.length - 1].stemX + 1;

  // Staff lines span full usable width
  const staffLines = Array.from({ length: numLines }, (_, i) => {
    const y = staffTop + (i / (numLines - 1)) * staffHeight;
    return (
      <line
        key={i}
        x1={padL - 2}
        x2={width - padR + 2}
        y1={y}
        y2={y}
        stroke="rgba(255,255,255,0.1)"
        strokeWidth={i === 2 ? 0.9 : 0.55}
      />
    );
  });

  const notes = noteData.map(({ attr, cx, cy, stemX }, i) => {
    const gradId = `ng-${uid}-${i}`;
    return (
      <g key={attr.key}>
        <defs>
          {/* Glossy radial fill */}
          <radialGradient id={gradId} cx="36%" cy="30%" r="68%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.6)" />
            <stop offset="38%" stopColor={attr.color} />
            <stop offset="100%" stopColor={attr.color} stopOpacity="0.72" />
          </radialGradient>
        </defs>

        {/* Glow halo */}
        <ellipse
          cx={cx}
          cy={cy}
          rx={rx * 1.7}
          ry={ry * 1.7}
          fill={attr.glow}
          opacity={0.2}
          transform={`rotate(${tilt}, ${cx}, ${cy})`}
        />

        {/* Notehead */}
        <ellipse
          cx={cx}
          cy={cy}
          rx={rx}
          ry={ry}
          fill={`url(#${gradId})`}
          transform={`rotate(${tilt}, ${cx}, ${cy})`}
        />

        {/* Specular shine */}
        <ellipse
          cx={cx - rx * 0.2}
          cy={cy - ry * 0.3}
          rx={rx * 0.28}
          ry={ry * 0.25}
          fill="rgba(255,255,255,0.38)"
          transform={`rotate(${tilt}, ${cx - rx * 0.2}, ${cy - ry * 0.3})`}
          style={{ pointerEvents: "none" }}
        />

        {/* Stem — right edge up to beam */}
        <line
          x1={stemX}
          y1={cy - ry * 0.2}
          x2={stemX}
          y2={beamY + beamH}
          stroke={attr.color}
          strokeWidth={1.5}
          strokeLinecap="round"
          opacity={0.88}
        />

        {showLabels && (
          <text
            x={cx}
            y={height - 3}
            textAnchor="middle"
            fill={attr.color}
            fontSize="7.5"
            fontFamily="DM Sans, sans-serif"
            opacity={0.65}
            letterSpacing="0.04em"
          >
            {attr.label}
          </text>
        )}
      </g>
    );
  });

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      opacity={opacity}
      style={{ overflow: "visible" }}
    >
      <defs>
        <linearGradient id={`beam-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.72)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.32)" />
        </linearGradient>
      </defs>

      {/* Subtle staff background */}
      <rect
        x={padL - 2}
        y={staffTop - 5}
        width={usableW + 4}
        height={staffHeight + 10}
        fill="rgba(255,255,255,0.018)"
        rx={3}
      />

      {staffLines}

      {/* Beam — exactly aligned to stem positions */}
      <rect
        x={beamX1}
        y={beamY}
        width={beamX2 - beamX1}
        height={beamH}
        fill={`url(#beam-${uid})`}
        rx={1.5}
      />
      {/* Beam highlight stripe */}
      <rect
        x={beamX1 + 2}
        y={beamY + 0.6}
        width={beamX2 - beamX1 - 4}
        height={1}
        fill="rgba(255,255,255,0.38)"
        rx={0.5}
      />

      {notes}
    </svg>
  );
}
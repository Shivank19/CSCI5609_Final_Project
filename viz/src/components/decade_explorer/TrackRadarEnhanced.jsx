import React, { useState } from "react";
import { normalizeLoudness } from "../../utils/dataUtils";

const AXES = [
  { key: "valence", label: "Happiness", color: "#f4a261" },
  { key: "danceability", label: "Dance", color: "#1db954" },
  { key: "energy", label: "Energy", color: "#e63946" },
  { key: "loudness_norm", label: "Loudness", color: "#e9c46a" },
  { key: "acousticness", label: "Acoustic", color: "#5b9ec9" },
  { key: "speechiness", label: "Speechiness", color: "#FB7185" },
  { key: "liveness", label: "Liveness", color: "#34D399" },
];

const N = AXES.length;

function polar(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function buildPolygon(cx, cy, maxR, values) {
  return values
    .map((v, i) => {
      const angle = (360 / N) * i;
      const pt = polar(cx, cy, maxR * Math.max(0, Math.min(1, v ?? 0)), angle);
      return `${pt.x},${pt.y}`;
    })
    .join(" ");
}

function getAxisValue(item, key) {
  if (key === "loudness_norm") {
    if (item?.loudness_norm != null) return item.loudness_norm;
    if (item?.loudness != null) return normalizeLoudness(item.loudness);
    return 0;
  }
  return item?.[key] ?? 0;
}

function formatAxisValue(axis, item) {
  if (axis.key === "loudness_norm") {
    const normalized = getAxisValue(item, axis.key);
    if (item?.loudness != null) {
      return `${Math.round(normalized * 100)}% (${item.loudness.toFixed(1)} dB)`;
    }
    return `${Math.round(normalized * 100)}%`;
  }

  return `${Math.round(getAxisValue(item, axis.key) * 100)}%`;
}

export default function TrackRadarEnhanced({
  track = {},
  decadeMean = {},
  size = 220,
}) {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.32;
  const labelR = maxR + 20;

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

  const meanVals = AXES.map((ax) => getAxisValue(decadeMean, ax.key));
  const trackVals = AXES.map((ax) => getAxisValue(track, ax.key));
  const meanPoints = buildPolygon(cx, cy, maxR, meanVals);
  const trackPoints = buildPolygon(cx, cy, maxR, trackVals);

  const meanDots = AXES.map((ax, i) => {
    const val = Math.max(0, Math.min(1, getAxisValue(decadeMean, ax.key)));
    const pt = polar(cx, cy, maxR * val, (360 / N) * i);

    return (
      <circle
        key={`mean-${ax.key}`}
        cx={pt.x}
        cy={pt.y}
        r={4}
        fill="rgba(255,255,255,0.85)"
        stroke="#0a0a0f"
        strokeWidth={1}
        opacity={0.75}
        style={{ cursor: "pointer" }}
        onMouseEnter={() =>
          setHoveredPoint({
            x: pt.x,
            y: pt.y,
            color: ax.color,
            title: `${ax.label} · Decade Avg`,
            value: formatAxisValue(ax, decadeMean),
          })
        }
        onMouseLeave={() => setHoveredPoint(null)}
      />
    );
  });

  const trackDots = AXES.map((ax, i) => {
    const val = Math.max(0, Math.min(1, getAxisValue(track, ax.key)));
    const pt = polar(cx, cy, maxR * val, (360 / N) * i);

    return (
      <circle
        key={`track-${ax.key}`}
        cx={pt.x}
        cy={pt.y}
        r={3}
        fill={ax.color}
        stroke="#0a0a0f"
        strokeWidth={1}
        style={{ cursor: "pointer" }}
        onMouseEnter={() =>
          setHoveredPoint({
            x: pt.x,
            y: pt.y,
            color: ax.color,
            title: `${ax.label} · Selected Track`,
            value: formatAxisValue(ax, track),
          })
        }
        onMouseLeave={() => setHoveredPoint(null)}
      />
    );
  });

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ overflow: "visible" }}
      >
        {rings}
        {spokes}

        <polygon
          points={meanPoints}
          fill="rgba(255,255,255,0.04)"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={1}
          strokeDasharray="3 2"
        />

        <polygon
          points={trackPoints}
          fill="rgba(244,162,97,0.15)"
          stroke="rgba(244,162,97,0.7)"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />

        {meanDots}
        {trackDots}
        {labels}
        {spokes}
      </svg>

      {hoveredPoint && (
        <div
          style={{
            position: "absolute",
            left: Math.min(hoveredPoint.x + 10, size - 124),
            top: Math.max(hoveredPoint.y - 12, 8),
            pointerEvents: "none",
            background: "rgba(9,9,14,0.94)",
            border: `1px solid ${hoveredPoint.color}`,
            borderRadius: 8,
            padding: "6px 8px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
            minWidth: 116,
          }}
        >
          <div
            style={{
              color: hoveredPoint.color,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            {hoveredPoint.title}
          </div>
          <div
            style={{
              color: "rgba(232,232,240,0.82)",
              fontSize: 11,
              marginTop: 2,
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            {hoveredPoint.value}
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useMemo } from "react";

export default function VinylDisc({
  mean = {},
  size = 260,
  isSpinning = true,
}) {
  const r = size / 2;
  const cx = r;
  const cy = r;

  const hasValence = mean.valence != null;
  const valence = Math.max(0, Math.min(1, mean.valence ?? 0.55));
  const loudness = Math.max(0, Math.min(1, mean.loudness_norm ?? 0.4));
  const danceability = Math.max(0, Math.min(1, mean.danceability ?? 0.55));
  const acousticness = Math.max(0, Math.min(1, mean.acousticness ?? 0.3));

  // ── Valence colour — wide range for obvious visual shift ─────────────────
  // Low  (0.0) → deep indigo  rgb(15, 30, 200)
  // Mid  (0.5) → neutral grey-blue
  // High (1.0) → warm amber   rgb(255, 165, 10)
  const valenceNormalized = Math.max(0, Math.min(1, (valence - 0.44) / 0.16));
  const valenceEmphasis =
    valenceNormalized * valenceNormalized * (3 - 2 * valenceNormalized);
  const mixRgb = (from, to, t) =>
    from.map((channel, i) => Math.round(channel + (to[i] - channel) * t));
  const rgbToCss = ([rCh, gCh, bCh]) => `rgb(${rCh},${gCh},${bCh})`;

  const lowTone = [92, 132, 255];
  const midTone = [150, 102, 232];
  const highTone = [255, 210, 108];
  const labelLow = [58, 70, 138];
  const labelMid = [98, 66, 156];
  const labelHigh = [142, 98, 42];

  const discRgb = !hasValence
    ? [184, 115, 51]
    : valenceEmphasis < 0.5
      ? mixRgb(lowTone, midTone, valenceEmphasis / 0.5)
      : mixRgb(midTone, highTone, (valenceEmphasis - 0.5) / 0.5);
  const labelRgb = !hasValence
    ? [116, 70, 34]
    : valenceEmphasis < 0.5
      ? mixRgb(labelLow, labelMid, valenceEmphasis / 0.5)
      : mixRgb(labelMid, labelHigh, (valenceEmphasis - 0.5) / 0.5);

  const [valR, valG, valB] = discRgb;
  const vRGB = `${valR},${valG},${valB}`;
  const vCol = rgbToCss(discRgb);
  const vGlow = rgbToCss(discRgb);
  const lCol = rgbToCss(labelRgb);

  // ── Groove mapping — remapped to actual data range (0.32–0.72) ──────────
  // Real data spans ~0.38–0.67 loudness. Mapping full 0-1 range wastes
  // visual range on values that never appear. Remapping + exponential curve
  // makes the 1990s→2000s loudness war jump visually dramatic.
  const LOUD_MIN = 0.32,
    LOUD_MAX = 0.72;
  const loudnessScaled = Math.max(
    0,
    Math.min(1, (loudness - LOUD_MIN) / (LOUD_MAX - LOUD_MIN)),
  );
  // Exponential curve: slow change at low end, fast at high end
  const loudnessCurved = Math.pow(loudnessScaled, 0.6);

  // Groove count: 7 (wide/dynamic) → 34 (dense/brick-wall compression)
  const grooveCount = Math.round(7 + loudnessCurved * 27);
  // Stroke: thick+visible when few, hairline when many
  const grooveStroke = Math.max(0.25, 2.6 - loudnessCurved * 2.2);
  // Compression tint: 0 for quiet eras, red-orange fill for loud eras
  // This is the surprise — past ~65% loudness the disc starts looking
  // like a brick wall of sound rather than just "more lines"
  const compressionFill = Math.max(0, loudnessCurved - 0.45) * 0.22;

  // Spin speed
  const spinDuration = (7 - danceability * 4.5).toFixed(2);

  const outerR = r * 0.97;
  const labelR = r * 0.3;
  const innerR = r * 0.27;
  const spindleR = r * 0.028;
  const grooveBand = outerR - innerR;
  const grooveGap = grooveBand / Math.max(grooveCount, 1);

  // ── CRITICAL FIX: include valence bucket in UID so gradient defs ──────────
  // re-render when the decade changes. Without this, the SVG gradient ID
  // stays the same and the browser uses the cached gradient definition.
  const valBucket = Math.round(valence * 20); // 0-20 buckets
  const uid = useMemo(() => Math.random().toString(36).slice(2, 7), []);
  const gid = `${uid}-v${valBucket}`; // changes with valence

  const grooves = useMemo(() => {
    const elements = [];

    // Compression fill — for loud eras (2000s+) fill the groove band
    // with a warm red-orange tint so it reads as "brick wall of sound"
    if (compressionFill > 0) {
      elements.push(
        <circle
          key="comp-fill"
          cx={cx}
          cy={cy}
          r={(innerR + outerR) / 2}
          fill="none"
          stroke={`rgba(220,80,40,${compressionFill})`}
          strokeWidth={grooveBand * 0.85}
        />,
      );
    }

    // Individual grooves
    Array.from({ length: grooveCount }, (_, i) => {
      const gr = innerR + (i + 0.5) * grooveGap;
      const dark = i % 2 === 0;
      elements.push(
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={gr}
          fill="none"
          stroke={dark ? "rgba(0,0,0,0.78)" : "rgba(255,255,255,0.07)"}
          strokeWidth={dark ? grooveStroke : grooveStroke * 0.4}
        />,
      );
    });

    return elements;
  }, [
    grooveCount,
    cx,
    cy,
    innerR,
    grooveGap,
    grooveStroke,
    grooveBand,
    compressionFill,
  ]);

  const shimmer =
    acousticness > 0.25
      ? Array.from({ length: 3 }, (_, i) => {
          const gr = innerR + ((i + 1.5) / 5) * grooveBand;
          return (
            <circle
              key={`sh${i}`}
              cx={cx}
              cy={cy}
              r={gr}
              fill="none"
              stroke={`rgba(255,200,120,${acousticness * 0.055})`}
              strokeWidth={gr * 0.055}
            />
          );
        })
      : null;

  const glowSize = hasValence ? 34 + valenceEmphasis * 54 : 36;
  const glowOpacity = (
    hasValence ? 0.16 + valenceEmphasis * 0.3 : 0.18
  ).toFixed(3);

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <style>{`
        @keyframes disc-spin-${uid} {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .vd-${uid} {
          animation: disc-spin-${uid} ${spinDuration}s linear infinite;
          transform-origin: ${cx}px ${cy}px;
          will-change: transform;
        }
      `}</style>

      {/* Drop shadow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          boxShadow:
            "0 36px 90px rgba(0,0,0,0.9), 0 14px 36px rgba(0,0,0,0.65), 0 4px 12px rgba(0,0,0,0.5)",
          pointerEvents: "none",
        }}
      />

      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className={isSpinning ? `vd-${uid}` : ""}
        style={{ display: "block", borderRadius: "50%" }}
      >
        <defs>
          <radialGradient id={`base-${uid}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0c0c0c" />
            <stop offset="55%" stopColor="#111111" />
            <stop offset="85%" stopColor="#161616" />
            <stop offset="100%" stopColor="#0a0a0a" />
          </radialGradient>

          {/* ── Valence-reactive glare — gid changes so browser re-renders ── */}
          <radialGradient id={`glare-${gid}`} cx="33%" cy="26%" r="52%">
            <stop offset="0%" stopColor={vGlow} stopOpacity="0.42" />
            <stop offset="22%" stopColor={vCol} stopOpacity="0.15" />
            <stop offset="55%" stopColor="rgba(255,255,255,0.03)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>

          <radialGradient id={`fill-${uid}`} cx="70%" cy="74%" r="36%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.05)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>

          <radialGradient id={`rim-${uid}`} cx="50%" cy="50%" r="50%">
            <stop offset="87%" stopColor="rgba(255,255,255,0)" />
            <stop offset="94%" stopColor="rgba(255,255,255,0.13)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.04)" />
          </radialGradient>

          <linearGradient
            id={`sheen-${uid}`}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="rgba(255,255,255,0.00)" />
            <stop offset="35%" stopColor="rgba(255,255,255,0.07)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.11)" />
            <stop offset="65%" stopColor="rgba(255,255,255,0.04)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.00)" />
          </linearGradient>

          {/* Label tint also updates with valence */}
          <radialGradient id={`label-${gid}`} cx="40%" cy="34%" r="68%">
            <stop offset="0%" stopColor={lCol} stopOpacity="0.55" />
            <stop offset="45%" stopColor="#181818" stopOpacity="1" />
            <stop offset="100%" stopColor="#0c0c0c" stopOpacity="1" />
          </radialGradient>

          <radialGradient id={`spindle-${uid}`} cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#383838" />
            <stop offset="100%" stopColor="#050505" />
          </radialGradient>

          <clipPath id={`clip-${uid}`}>
            <circle cx={cx} cy={cy} r={outerR} />
          </clipPath>
        </defs>

        <circle cx={cx} cy={cy} r={outerR} fill={`url(#base-${uid})`} />
        <g clipPath={`url(#clip-${uid})`}>{shimmer}</g>
        <g clipPath={`url(#clip-${uid})`}>{grooves}</g>
        <circle
          cx={cx}
          cy={cy}
          r={outerR}
          fill={`url(#sheen-${uid})`}
          clipPath={`url(#clip-${uid})`}
          opacity={0.7}
        />
        <circle cx={cx} cy={cy} r={outerR} fill={`url(#rim-${uid})`} />
        <circle cx={cx} cy={cy} r={labelR} fill={`url(#label-${gid})`} />
        <circle
          cx={cx}
          cy={cy}
          r={labelR * 0.94}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={0.8}
        />
        <circle
          cx={cx}
          cy={cy}
          r={labelR * 0.7}
          fill="none"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth={0.5}
        />
        {/* Valence glare — uses gid so it definitely updates */}
        <circle cx={cx} cy={cy} r={outerR} fill={`url(#glare-${gid})`} />
        <circle cx={cx} cy={cy} r={outerR} fill={`url(#fill-${uid})`} />
        <circle cx={cx} cy={cy} r={spindleR * 1.5} fill="#040404" />
        <circle cx={cx} cy={cy} r={spindleR} fill={`url(#spindle-${uid})`} />
        <circle
          cx={cx - spindleR * 0.32}
          cy={cy - spindleR * 0.32}
          r={spindleR * 0.38}
          fill="rgba(255,255,255,0.18)"
        />
      </svg>

      {/* Static overlay — valence colour, does NOT rotate */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background: `radial-gradient(ellipse 54% 40% at 30% 20%,
          rgba(${vRGB},0.32) 0%,
          rgba(${vRGB},0.12) 30%,
          transparent 68%)`,
          pointerEvents: "none",
          transition: "background 0.65s ease",
        }}
      />

      {/* Outer glow — fully valence-reactive */}
      <div
        style={{
          position: "absolute",
          inset: -8,
          borderRadius: "50%",
          boxShadow: `0 0 ${glowSize}px rgba(${vRGB},${glowOpacity}), 0 0 ${glowSize * 0.4}px rgba(${vRGB},${(+glowOpacity * 0.5).toFixed(3)})`,
          pointerEvents: "none",
          transition: "box-shadow 0.65s ease",
        }}
      />
    </div>
  );
}

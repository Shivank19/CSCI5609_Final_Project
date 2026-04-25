import React, { useState, useEffect, useMemo } from "react";
import MusicGlyph from "./decade_explorer/MusicGlyph";
import VinylDisc from "./decade_explorer/VinylDisc";
import TrackRadar from "./decade_explorer/TrackRadarEnhanced";
import { useInView } from "../hooks/useScrollProgress";
import { normalizeLoudness } from "../utils/dataUtils";

const DECADE_COLORS = {
  1960: "#F59E0B",
  1970: "#FBBF24",
  1980: "#C084FC",
  1990: "#818CF8",
  2000: "#60A5FA",
  2010: "#38BDF8",
  2020: "#22D3EE",
};
const KEY_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];
const DISC_SIZE = 280;
const ORBIT_R = 290;
const GLYPH_W = 88;
const GLYPH_H = 104;
const CARD_WIDTH = 340;
const CARD_HEIGHT = 610;
const ORBIT_CARD_GAP = 34;
const CARD_GAP = 18;
const CONT = (ORBIT_R + GLYPH_W * 0.6 + 8) * 2;
const CARD_OPEN_SHIFT = Math.round((CARD_WIDTH + ORBIT_CARD_GAP) / 2);
const CARD_COMPARE_SHIFT = Math.round((CARD_WIDTH * 2 + ORBIT_CARD_GAP + CARD_GAP) / 2);
const CARD_RIGHT_OFFSET = -CARD_OPEN_SHIFT + CONT / 2 + ORBIT_CARD_GAP;
const CARD_COMPARE_PRIMARY_OFFSET = -CARD_COMPARE_SHIFT + CONT / 2 + ORBIT_CARD_GAP;
const CARD_COMPARE_OFFSET = CARD_COMPARE_PRIMARY_OFFSET + CARD_WIDTH + CARD_GAP;
const ORBIT_TOP_OFFSET = 118;
const STAGE_HEIGHT = CONT + ORBIT_TOP_OFFSET + 28;
const CX = CONT / 2;
const CY = CONT / 2;

function orbitPos(angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CX + ORBIT_R * Math.cos(rad), y: CY + ORBIT_R * Math.sin(rad) };
}

function hexToRgb(hex) {
  return [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16)).join(",");
}

function formatDuration(ms) {
  if (!ms) return "--:--";
  const seconds = Math.round(ms / 1000);
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`;
}

function withNormalizedLoudness(item = {}) {
  if (item.loudness == null) return item;
  return {
    ...item,
    loudness_norm: normalizeLoudness(item.loudness),
  };
}

function normalizeDecadeEntry(entry = {}) {
  return {
    ...entry,
    mean: withNormalizedLoudness(entry.mean ?? {}),
    representative_tracks: (entry.representative_tracks ?? []).map(withNormalizedLoudness),
  };
}

function CompactAttributeLegend() {
  const noteItems = [
    { color: "#f4a261", label: "Happiness" },
    { color: "#e9c46a", label: "Loudness" },
    { color: "#5b9ec9", label: "Acoustic" },
    { color: "#1db954", label: "Dance" },
  ];
  const vinylItems = [
    {
      label: "Color: cooler = sadder, warmer = happier",
      icon: <span style={discColorIcon} />,
    },
    {
      label: "Grooves: sparse = quieter, dense = louder",
      icon: <span style={grooveIcon} />,
    },
    {
      label: "Spin: slower = less danceable, faster = more danceable",
      icon: <span style={spinIcon}>speed</span>,
    },
  ];

  return (
    <div style={compactLegend}>
      <div style={compactLegendRow}>
        <span style={compactLegendHint}>Note height = value</span>
        {noteItems.map((item) => (
          <span key={item.label} style={compactLegendItem}>
            <span style={{ ...compactLegendDot, background: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
      <div style={compactLegendRow}>
        <span style={compactLegendHint}>Vinyl</span>
        {vinylItems.map((item) => (
          <span key={item.label} style={compactLegendItem}>
            {item.icon}
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function DecadeTrackCard({
  decade,
  track,
  trackIdx,
  setTrackIdx,
  onClose,
  onCompare,
  compareLabel,
  comparePicking,
  isComparison = false,
}) {
  if (!decade || !track) return null;

  const color = DECADE_COLORS[decade.decade] ?? "#f4a261";
  const tracks = decade.representative_tracks ?? [];
  const statItems = [
    {
      label: "Happiness",
      value: `${(track.valence * 100).toFixed(0)}%`,
      color: "#f4a261",
    },
    {
      label: "Danceability",
      value: `${(track.danceability * 100).toFixed(0)}%`,
      color: "#1db954",
    },
    {
      label: "Energy",
      value: `${(track.energy * 100).toFixed(0)}%`,
      color: "#e63946",
    },
    {
      label: "Acoustic",
      value: `${(track.acousticness * 100).toFixed(0)}%`,
      color: "#5b9ec9",
    },
  ];

  return (
    <>
      <div style={cardHeader}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color,
              marginBottom: 6,
            }}
          >
            {isComparison ? `${decade.label} comparison` : decade.label}
          </p>
          <p style={trackName}>{track.name}</p>
          <p style={artist}>{track.artist}</p>
          <p style={meta}>
            {track.year}
            {track.duration_ms ? ` - ${formatDuration(track.duration_ms)}` : ""}
            {track.key != null
              ? ` - ${KEY_NAMES[track.key]}${track.mode === 1 ? " maj" : " min"}`
              : ""}
          </p>
        </div>
        <button type="button" onClick={onClose} style={closeBtn} aria-label="Close card">
          x
        </button>
      </div>

      {track.genres?.length > 0 && (
        <div style={genreWrap}>
          {track.genres.slice(0, 5).map((genre) => (
            <span key={genre} style={genrePill}>
              {genre}
            </span>
          ))}
        </div>
      )}

      <div style={radarWrap}>
        <TrackRadar track={track} decadeMean={decade.mean} size={196} />
        <p style={radarCaption}>Solid = this track - Dashed = {decade.label} average</p>
      </div>

      <div style={statsGrid}>
        {statItems.map((stat) => (
          <div key={stat.label} style={statCell}>
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: stat.color,
                fontFamily: "DM Sans,sans-serif",
              }}
            >
              {stat.value}
            </span>
            <span style={statLabel}>{stat.label}</span>
          </div>
        ))}
      </div>

      <div style={trackNav}>
        <button
          type="button"
          onClick={() => setTrackIdx((index) => Math.max(0, index - 1))}
          disabled={trackIdx === 0}
          style={navBtn(trackIdx === 0)}
        >
          &lt;
        </button>
        <div style={trackDots}>
          {tracks.map((_, index) => (
            <button
              type="button"
              aria-label={`Show track ${index + 1}`}
              key={index}
              onClick={() => setTrackIdx(index)}
              style={{
                width: index === trackIdx ? 20 : 6,
                height: 6,
                borderRadius: 3,
                padding: 0,
                border: "none",
                cursor: "pointer",
                background: index === trackIdx ? color : "rgba(255,255,255,0.2)",
                transition: "all 0.2s ease",
              }}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => setTrackIdx((index) => Math.min(tracks.length - 1, index + 1))}
          disabled={trackIdx === tracks.length - 1}
          style={navBtn(trackIdx === tracks.length - 1)}
        >
          &gt;
        </button>
      </div>

      <p style={trackCount}>
        Track {trackIdx + 1} of {tracks.length} - Representative of the {decade.label} sound
      </p>

      {!isComparison && (
        <div style={compareRow}>
          <button
            type="button"
            onClick={onCompare}
            style={{
              ...compareBtn,
              borderColor: comparePicking ? color : "rgba(255,255,255,0.12)",
              color: comparePicking ? color : "rgba(232,232,240,0.72)",
              background: comparePicking
                ? `rgba(${hexToRgb(color)},0.12)`
                : "rgba(255,255,255,0.04)",
            }}
          >
            {compareLabel}
          </button>
          {comparePicking && <span style={compareHint}>Choose another note</span>}
        </div>
      )}
    </>
  );
}

export default function DecadeExplorer() {
  const [ref, inView] = useInView({ threshold: 0.05 });
  const [decadeData, setData] = useState([]);
  const [selected, setSelected] = useState(null);
  const [trackIdx, setTrackIdx] = useState(0);
  const [compareSelected, setCompareSelected] = useState(null);
  const [compareTrackIdx, setCompareTrackIdx] = useState(0);
  const [comparePicking, setComparePicking] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`${process.env.PUBLIC_URL}/decade_songs.json`)
      .then((response) => response.json())
      .then((data) => {
        setData([...data].map(normalizeDecadeEntry).sort((a, b) => a.decade - b.decade));
        setLoaded(true);
      })
      .catch((error) => console.error("decade_songs.json load error:", error));
  }, []);

  const selectedDecade = selected !== null ? decadeData[selected] : null;
  const comparisonDecade = compareSelected !== null ? decadeData[compareSelected] : null;
  const currentTrack = selectedDecade?.representative_tracks?.[trackIdx] ?? null;
  const comparisonTrack = comparisonDecade?.representative_tracks?.[compareTrackIdx] ?? null;
  const discMean = selectedDecade?.mean ?? {};
  const cardOpen = !!selectedDecade;
  const comparisonOpen = !!comparisonDecade;
  const noteCount = decadeData.length;

  const swayCSS = useMemo(
    () =>
      decadeData
        .map(
          (_, index) => `
      @keyframes sway-de-${index} {
        0%   { transform: translate(0px,0px) scale(1); }
        25%  { transform: translate(${((index % 3) - 1) * 3}px,${-4 - (index % 4) * 1.5}px) scale(1.01); }
        50%  { transform: translate(${(index % 2) * 4 - 2}px,${2 + (index % 3) * 1.5}px) scale(0.99); }
        75%  { transform: translate(${(1 - (index % 3)) * 3}px,${-2 - (index % 2) * 2.5}px) scale(1.01); }
        100% { transform: translate(0px,0px) scale(1); }
      }
    `,
        )
        .join(""),
    [decadeData],
  );

  const closePrimaryCard = () => {
    setSelected(null);
    setCompareSelected(null);
    setCompareTrackIdx(0);
    setComparePicking(false);
  };

  const handleGlyphClick = (index) => {
    if (comparePicking) {
      if (index !== selected) {
        setCompareSelected(index);
        setCompareTrackIdx(0);
        setComparePicking(false);
      }
      return;
    }

    setSelected((previous) => {
      const next = previous === index ? null : index;
      if (next === null || next !== previous) {
        setCompareSelected(null);
        setCompareTrackIdx(0);
        setComparePicking(false);
      }
      return next;
    });
    setTrackIdx(0);
  };

  return (
    <section ref={ref} style={sectionStyle}>
      <div className="container">
        <style>{swayCSS}</style>

        <p className="section-label" style={{ color: "#f4a261" }}>
          Your Era
        </p>
        <h2 className="section-title" style={{ color: "#e8e8f0", marginBottom: "20px" }}>
          What Did Your Decade
          <br />
          <em>Sound Like?</em>
        </h2>
        <p className="section-body" style={{ marginBottom: "56px" }}>
          Each floating note represents a decade. The position of its colored heads on the
          staff encodes that decade's average happiness, loudness, acousticness, and
          danceability. Click any note and the disc transforms to that era's sound.
        </p>

        <div style={explorerWrap}>
          <div style={explorerStage}>
            <div
              style={{
                position: "absolute",
                top: ORBIT_TOP_OFFSET,
                left: "50%",
                width: CONT,
                height: CONT,
                flexShrink: 0,
                transform: cardOpen
                  ? `translate(-50%, 0) translateX(-${comparisonOpen ? CARD_COMPARE_SHIFT : CARD_OPEN_SHIFT}px)`
                  : "translate(-50%, 0)",
                transition: "transform 0.55s cubic-bezier(0.34,1.15,0.64,1)",
              }}
            >
              {loaded ? (
                <div style={{ position: "relative", width: CONT, height: CONT }}>
                  <svg
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      pointerEvents: "none",
                    }}
                    width={CONT}
                    height={CONT}
                  >
                    <circle
                      cx={CX}
                      cy={CY}
                      r={ORBIT_R}
                      fill="none"
                      stroke="rgba(255,255,255,0.04)"
                      strokeWidth={1}
                      strokeDasharray="3 8"
                    />
                  </svg>

                  <div
                    style={{
                      position: "absolute",
                      top: CY - DISC_SIZE / 2,
                      left: CX - DISC_SIZE / 2,
                    }}
                  >
                    <VinylDisc mean={discMean} size={DISC_SIZE} isSpinning={inView} />
                  </div>

                  <CompactAttributeLegend />

                  {decadeData.map((decade, index) => {
                    const angleDeg = (360 / noteCount) * index;
                    const pos = orbitPos(angleDeg);
                    const isActive = selected === index;
                    const isCompared = compareSelected === index;
                    const isCompareCandidate =
                      comparePicking && selected !== index && compareSelected !== index;
                    const color = DECADE_COLORS[decade.decade] ?? "#f4a261";
                    const swayDur = 3.5 + index * 0.38;
                    const swayDelay = -(index * 0.55);
                    const highlighted = isActive || isCompared;

                    return (
                      <button
                        key={decade.decade}
                        type="button"
                        onClick={() => handleGlyphClick(index)}
                        style={{
                          position: "absolute",
                          left: pos.x - GLYPH_W / 2,
                          top: pos.y - GLYPH_H / 2,
                          width: GLYPH_W,
                          height: GLYPH_H,
                          background: highlighted
                            ? `rgba(${hexToRgb(color)},0.14)`
                            : isCompareCandidate
                              ? "rgba(255,255,255,0.075)"
                              : "rgba(10,10,15,0.6)",
                          border: `1px solid ${
                            highlighted || isCompareCandidate ? color : "rgba(255,255,255,0.08)"
                          }`,
                          borderRadius: 10,
                          cursor: "pointer",
                          padding: 4,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 2,
                          boxShadow: highlighted
                            ? `0 0 26px rgba(${hexToRgb(color)},0.45), 0 0 8px rgba(${hexToRgb(color)},0.2), inset 0 1px 0 rgba(255,255,255,0.08)`
                            : isCompareCandidate
                              ? `0 0 18px rgba(${hexToRgb(color)},0.22), inset 0 1px 0 rgba(255,255,255,0.06)`
                              : "0 4px 20px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)",
                          backdropFilter: "blur(6px)",
                          zIndex: highlighted ? 10 : 2,
                          transform: highlighted
                            ? "scale(1.13)"
                            : isCompareCandidate
                              ? "scale(1.06)"
                              : undefined,
                          animation: !highlighted && !isCompareCandidate
                            ? `sway-de-${index} ${swayDur}s ease-in-out ${swayDelay}s infinite`
                            : "none",
                          transition:
                            "transform 0.3s cubic-bezier(0.34,1.3,0.64,1), border 0.3s ease, box-shadow 0.3s ease, background 0.3s ease",
                        }}
                        aria-label={`Select ${decade.label}`}
                      >
                        <MusicGlyph attributes={decade.mean} width={76} height={64} showLabels={false} />
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color,
                            letterSpacing: "0.06em",
                            fontFamily: "DM Sans,sans-serif",
                            textShadow: highlighted
                              ? `0 0 10px rgba(${hexToRgb(color)},0.6)`
                              : "none",
                            transition: "text-shadow 0.3s ease",
                          }}
                        >
                          {decade.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div style={loadingBox}>
                  <div style={spinner} />
                  <p style={loadingText}>Loading decades...</p>
                </div>
              )}
            </div>

          <div
            style={{
              ...cardPanel,
              position: "absolute",
              top: "50%",
              left: "50%",
              opacity: cardOpen ? 1 : 0,
              transform: cardOpen
                ? `translate(${comparisonOpen ? CARD_COMPARE_PRIMARY_OFFSET : CARD_RIGHT_OFFSET}px, -50%)`
                : `translate(${CARD_RIGHT_OFFSET + 50}px, -50%)`,
              pointerEvents: cardOpen ? "auto" : "none",
              transition:
                "opacity 0.4s ease, transform 0.55s cubic-bezier(0.34,1.1,0.64,1)",
            }}
          >
            {selectedDecade && currentTrack && (
              <DecadeTrackCard
                decade={selectedDecade}
                track={currentTrack}
                trackIdx={trackIdx}
                setTrackIdx={setTrackIdx}
                onClose={closePrimaryCard}
                onCompare={() => setComparePicking((isPicking) => !isPicking)}
                compareLabel={comparisonOpen ? "Change compare" : "Compare decade"}
                comparePicking={comparePicking}
              />
            )}
          </div>

          <div
            style={{
              ...cardPanel,
              position: "absolute",
              top: "50%",
              left: "50%",
              opacity: comparisonOpen ? 1 : 0,
              transform: comparisonOpen
                ? `translate(${CARD_COMPARE_OFFSET}px, -50%)`
                : `translate(${CARD_COMPARE_OFFSET + 44}px, -50%)`,
              pointerEvents: comparisonOpen ? "auto" : "none",
              transition:
                "opacity 0.4s ease, transform 0.55s cubic-bezier(0.34,1.1,0.64,1)",
            }}
          >
            {comparisonDecade && comparisonTrack && (
              <DecadeTrackCard
                decade={comparisonDecade}
                track={comparisonTrack}
                trackIdx={compareTrackIdx}
                setTrackIdx={setCompareTrackIdx}
                onClose={() => {
                  setCompareSelected(null);
                  setComparePicking(false);
                }}
                isComparison
              />
            )}
          </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const sectionStyle = {
  padding: "100px 0",
  background: "linear-gradient(180deg, var(--bg) 0%, var(--bg2) 100%)",
};
const explorerWrap = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
  minHeight: STAGE_HEIGHT,
  padding: "6px 0",
};
const explorerStage = {
  position: "relative",
  height: STAGE_HEIGHT,
  width: "100%",
  margin: "0 auto",
};
const cardPanel = {
  width: CARD_WIDTH,
  height: CARD_HEIGHT,
  background: "rgba(255,255,255,0.035)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  padding: "22px 20px",
  zIndex: 20,
  boxShadow: "0 18px 60px rgba(0,0,0,0.24)",
  backdropFilter: "blur(10px)",
  display: "flex",
  flexDirection: "column",
};
const cardHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: 12,
};
const trackName = {
  fontSize: 17,
  fontWeight: 600,
  color: "#e8e8f0",
  fontFamily: "DM Serif Display,serif",
  lineHeight: 1.2,
  marginBottom: 4,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};
const artist = {
  fontSize: 13,
  color: "rgba(232,232,240,0.55)",
  marginBottom: 2,
};
const meta = {
  fontSize: 11,
  color: "rgba(232,232,240,0.3)",
  letterSpacing: "0.03em",
};
const closeBtn = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 6,
  color: "rgba(232,232,240,0.48)",
  cursor: "pointer",
  fontSize: 12,
  lineHeight: 1,
  padding: "5px 8px",
  flexShrink: 0,
  marginLeft: 8,
};
const compareRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  margin: "auto 0 0",
};
const compareBtn = {
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 999,
  cursor: "pointer",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.09em",
  padding: "6px 10px",
  textTransform: "uppercase",
  transition: "all 0.2s ease",
};
const compareHint = {
  color: "rgba(232,232,240,0.38)",
  fontSize: 10,
  fontStyle: "italic",
};
const genreWrap = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  marginBottom: 12,
};
const genrePill = {
  fontSize: 10,
  padding: "2px 8px",
  borderRadius: 20,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "rgba(232,232,240,0.5)",
  fontFamily: "DM Sans,sans-serif",
};
const radarWrap = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  margin: "8px 0 14px",
};
const radarCaption = {
  fontSize: 10,
  color: "rgba(232,232,240,0.25)",
  textAlign: "center",
  fontStyle: "italic",
  marginTop: 6,
};
const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(4,1fr)",
  gap: 8,
  marginBottom: 14,
  padding: "10px 0",
  borderTop: "1px solid rgba(255,255,255,0.06)",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
};
const statCell = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 2,
};
const statLabel = {
  fontSize: 9,
  color: "rgba(232,232,240,0.3)",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};
const trackNav = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 8,
};
const trackDots = {
  display: "flex",
  gap: 6,
  alignItems: "center",
};
const navBtn = (disabled) => ({
  background: "none",
  border: `1px solid ${disabled ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.15)"}`,
  borderRadius: 8,
  color: disabled ? "rgba(232,232,240,0.2)" : "rgba(232,232,240,0.7)",
  cursor: disabled ? "default" : "pointer",
  fontSize: 16,
  padding: "6px 14px",
  transition: "all 0.15s ease",
});
const trackCount = {
  fontSize: 10,
  color: "rgba(232,232,240,0.25)",
  textAlign: "center",
  fontStyle: "italic",
};
const compactLegend = {
  position: "absolute",
  top: -96,
  left: "50%",
  transform: "translateX(-50%)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  width: 500,
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(8,8,13,0.56)",
  boxShadow: "0 12px 34px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.04)",
  backdropFilter: "blur(8px)",
  zIndex: 4,
  pointerEvents: "none",
};
const compactLegendRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexWrap: "wrap",
  gap: "7px 10px",
  width: "100%",
};
const compactLegendHint = {
  color: "rgba(232,232,240,0.44)",
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};
const compactLegendItem = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  color: "rgba(232,232,240,0.56)",
  fontSize: 9.5,
  lineHeight: 1,
};
const compactLegendDot = {
  width: 7,
  height: 7,
  borderRadius: "50%",
  display: "inline-block",
  boxShadow: "0 0 10px currentColor",
};
const discColorIcon = {
  width: 10,
  height: 10,
  borderRadius: "50%",
  display: "inline-block",
  background: "linear-gradient(135deg, #5c84ff 0%, #9666e8 45%, #ffd26c 100%)",
  boxShadow: "0 0 10px rgba(255,210,108,0.28)",
};
const grooveIcon = {
  width: 14,
  height: 10,
  display: "inline-block",
  borderRadius: "50%",
  border: "1px solid rgba(233,196,106,0.7)",
  boxShadow:
    "inset 0 0 0 2px rgba(233,196,106,0.18), inset 0 0 0 4px rgba(233,196,106,0.1)",
};
const spinIcon = {
  color: "#1db954",
  fontSize: 8,
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  lineHeight: 1,
  display: "inline-block",
  transform: "translateY(-0.5px)",
};
const loadingBox = {
  width: CONT,
  height: CONT,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
};
const spinner = {
  width: 32,
  height: 32,
  border: "2px solid rgba(29,185,84,0.15)",
  borderTop: "2px solid #1db954",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
};
const loadingText = {
  color: "rgba(232,232,240,0.3)",
  fontSize: 12,
  marginTop: 12,
};

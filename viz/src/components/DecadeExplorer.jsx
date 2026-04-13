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
const CARD_OPEN_SHIFT = 190;
const CARD_RIGHT_OFFSET = 185;
// Container must fit the orbit plus half-glyph on every side
const CONT = (ORBIT_R + GLYPH_W * 0.6 + 8) * 2; // ≈ 683
const CX = CONT / 2;
const CY = CONT / 2;

function orbitPos(angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CX + ORBIT_R * Math.cos(rad), y: CY + ORBIT_R * Math.sin(rad) };
}
function hexToRgb(hex) {
  return [1, 3, 5].map((o) => parseInt(hex.slice(o, o + 2), 16)).join(",");
}
function formatDuration(ms) {
  if (!ms) return "--:--";
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
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
    representative_tracks: (entry.representative_tracks ?? []).map(
      withNormalizedLoudness,
    ),
  };
}

export default function DecadeExplorer() {
  const [ref, inView] = useInView({ threshold: 0.05 });
  const [decadeData, setData] = useState([]);
  const [selected, setSelected] = useState(null);
  const [trackIdx, setTrackIdx] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`${process.env.PUBLIC_URL}/decade_songs.json`)
      .then((r) => r.json())
      .then((data) => {
        setData(
          [...data]
            .map(normalizeDecadeEntry)
            .sort((a, b) => a.decade - b.decade),
        );
        setLoaded(true);
      })
      .catch((err) => console.error("decade_songs.json load error:", err));
  }, []);

  const selectedDecade = selected !== null ? decadeData[selected] : null;
  const currentTrack =
    selectedDecade?.representative_tracks?.[trackIdx] ?? null;
  const discMean = selectedDecade?.mean ?? {};
  const cardOpen = !!selectedDecade;
  const noteCount = decadeData.length;

  const swayCSS = useMemo(
    () =>
      decadeData
        .map(
          (_, i) => `
      @keyframes sway-de-${i} {
        0%   { transform: translate(0px,0px) scale(1); }
        25%  { transform: translate(${((i % 3) - 1) * 3}px,${-4 - (i % 4) * 1.5}px) scale(1.01); }
        50%  { transform: translate(${(i % 2) * 4 - 2}px,${2 + (i % 3) * 1.5}px) scale(0.99); }
        75%  { transform: translate(${(1 - (i % 3)) * 3}px,${-2 - (i % 2) * 2.5}px) scale(1.01); }
        100% { transform: translate(0px,0px) scale(1); }
      }
    `,
        )
        .join(""),
    [decadeData],
  ); // eslint-disable-line

  return (
    <section ref={ref} style={sectionStyle}>
      <div className="container">
        <style>{swayCSS}</style>

        <p className="section-label" style={{ color: "#f4a261" }}>
          Your Era
        </p>
        <h2
          className="section-title"
          style={{ color: "#e8e8f0", marginBottom: "20px" }}
        >
          What Did Your Decade
          <br />
          <em>Sound Like?</em>
        </h2>
        <p className="section-body" style={{ marginBottom: "56px" }}>
          Each floating note represents a decade. The position of its coloured
          heads on the staff encodes that decade's average happiness, loudness,
          acousticness, and danceability. Click any note — the disc transforms
          to that era's sound and a track card slides in. Use the arrows to
          cycle through five representative songs.
        </p>

        <div style={explorerWrap}>
          {/* Orbit + disc — shifts left when card opens */}
          <div
            style={{
              position: "relative",
              width: CONT,
              height: CONT,
              flexShrink: 0,
              transform: cardOpen
                ? `translateX(-${CARD_OPEN_SHIFT}px)`
                : "translateX(0)",
              transition: "transform 0.55s cubic-bezier(0.34,1.15,0.64,1)",
            }}
          >
            {loaded ? (
              <div style={{ position: "relative", width: CONT, height: CONT }}>
                {/* Orbit ring */}
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

                {/* Disc — perfectly centred */}
                <div
                  style={{
                    position: "absolute",
                    top: CY - DISC_SIZE / 2,
                    left: CX - DISC_SIZE / 2,
                  }}
                >
                  <VinylDisc
                    mean={discMean}
                    size={DISC_SIZE}
                    isSpinning={inView}
                  />
                </div>

                {/* Orbiting glyphs */}
                {decadeData.map((dec, i) => {
                  const angleDeg = (360 / noteCount) * i;
                  const pos = orbitPos(angleDeg);
                  const isActive = selected === i;
                  const color = DECADE_COLORS[dec.decade] ?? "#f4a261";
                  const swayDur = 3.5 + i * 0.38;
                  const swayDelay = -(i * 0.55);

                  return (
                    <button
                      key={dec.decade}
                      onClick={() => {
                        setSelected((p) => (p === i ? null : i));
                        setTrackIdx(0);
                      }}
                      style={{
                        position: "absolute",
                        left: pos.x - GLYPH_W / 2,
                        top: pos.y - GLYPH_H / 2,
                        width: GLYPH_W,
                        height: GLYPH_H,
                        background: isActive
                          ? `rgba(${hexToRgb(color)},0.14)`
                          : "rgba(10,10,15,0.6)",
                        border: `1px solid ${isActive ? color : "rgba(255,255,255,0.08)"}`,
                        borderRadius: 10,
                        cursor: "pointer",
                        padding: 4,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 2,
                        boxShadow: isActive
                          ? `0 0 26px rgba(${hexToRgb(color)},0.45), 0 0 8px rgba(${hexToRgb(color)},0.2), inset 0 1px 0 rgba(255,255,255,0.08)`
                          : "0 4px 20px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)",
                        backdropFilter: "blur(6px)",
                        zIndex: isActive ? 10 : 2,
                        transform: isActive ? "scale(1.13)" : undefined,
                        animation: !isActive
                          ? `sway-de-${i} ${swayDur}s ease-in-out ${swayDelay}s infinite`
                          : "none",
                        transition:
                          "transform 0.3s cubic-bezier(0.34,1.3,0.64,1), border 0.3s ease, box-shadow 0.3s ease, background 0.3s ease",
                      }}
                      aria-label={`Select ${dec.label}`}
                    >
                      <MusicGlyph
                        attributes={dec.mean}
                        width={76}
                        height={64}
                        showLabels={false}
                      />
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color,
                          letterSpacing: "0.06em",
                          fontFamily: "DM Sans,sans-serif",
                          textShadow: isActive
                            ? `0 0 10px rgba(${hexToRgb(color)},0.6)`
                            : "none",
                          transition: "text-shadow 0.3s ease",
                        }}
                      >
                        {dec.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div
                style={{
                  width: CONT,
                  height: CONT,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    border: "2px solid rgba(29,185,84,0.15)",
                    borderTop: "2px solid #1db954",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
                <p
                  style={{
                    color: "rgba(232,232,240,0.3)",
                    fontSize: 12,
                    marginTop: 12,
                  }}
                >
                  Loading decades…
                </p>
              </div>
            )}
          </div>

          {/* Song card */}
          <div
            style={{
              ...cardPanel,
              position: "absolute",
              top: "50%",
              left: "50%",
              opacity: cardOpen ? 1 : 0,
              transform: cardOpen
                ? `translate(${CARD_RIGHT_OFFSET}px, -50%)`
                : `translate(${CARD_RIGHT_OFFSET + 50}px, -50%)`,
              pointerEvents: cardOpen ? "auto" : "none",
              transition:
                "opacity 0.4s ease, transform 0.55s cubic-bezier(0.34,1.1,0.64,1)",
            }}
          >
            {selectedDecade && currentTrack && (
              <>
                <div style={cardHeader}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.15em",
                        textTransform: "uppercase",
                        color:
                          DECADE_COLORS[selectedDecade.decade] ?? "#f4a261",
                        marginBottom: 6,
                      }}
                    >
                      {selectedDecade.label}
                    </p>
                    <p style={trackName}>{currentTrack.name}</p>
                    <p style={artist}>{currentTrack.artist}</p>
                    <p style={meta}>
                      {currentTrack.year}
                      {currentTrack.duration_ms
                        ? ` · ${formatDuration(currentTrack.duration_ms)}`
                        : ""}
                      {currentTrack.key != null
                        ? ` · ${KEY_NAMES[currentTrack.key]}${currentTrack.mode === 1 ? " maj" : " min"}`
                        : ""}
                    </p>
                  </div>
                  <button onClick={() => setSelected(null)} style={closeBtn}>
                    ✕
                  </button>
                </div>

                {currentTrack.genres?.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 6,
                      marginBottom: 12,
                    }}
                  >
                    {currentTrack.genres.slice(0, 5).map((g) => (
                      <span key={g} style={genrePill}>
                        {g}
                      </span>
                    ))}
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    margin: "8px 0 14px",
                  }}
                >
                  <TrackRadar
                    track={currentTrack}
                    decadeMean={selectedDecade.mean}
                    size={196}
                  />
                  <p
                    style={{
                      fontSize: 10,
                      color: "rgba(232,232,240,0.25)",
                      textAlign: "center",
                      fontStyle: "italic",
                      marginTop: 6,
                    }}
                  >
                    Solid = this track · Dashed = {selectedDecade.label} average
                  </p>
                </div>

                <div style={statsGrid}>
                  {[
                    {
                      l: "Happiness",
                      v: `${(currentTrack.valence * 100).toFixed(0)}%`,
                      c: "#f4a261",
                    },
                    {
                      l: "Danceability",
                      v: `${(currentTrack.danceability * 100).toFixed(0)}%`,
                      c: "#1db954",
                    },
                    {
                      l: "Energy",
                      v: `${(currentTrack.energy * 100).toFixed(0)}%`,
                      c: "#e63946",
                    },
                    {
                      l: "Acoustic",
                      v: `${(currentTrack.acousticness * 100).toFixed(0)}%`,
                      c: "#5b9ec9",
                    },
                  ].map((s) => (
                    <div
                      key={s.l}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 2,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: s.c,
                          fontFamily: "DM Sans,sans-serif",
                        }}
                      >
                        {s.v}
                      </span>
                      <span
                        style={{
                          fontSize: 9,
                          color: "rgba(232,232,240,0.3)",
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                        }}
                      >
                        {s.l}
                      </span>
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    marginBottom: 8,
                  }}
                >
                  <button
                    onClick={() => setTrackIdx((i) => Math.max(0, i - 1))}
                    disabled={trackIdx === 0}
                    style={navBtn(trackIdx === 0)}
                  >
                    ←
                  </button>
                  <div
                    style={{ display: "flex", gap: 6, alignItems: "center" }}
                  >
                    {selectedDecade.representative_tracks.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setTrackIdx(i)}
                        style={{
                          width: i === trackIdx ? 20 : 6,
                          height: 6,
                          borderRadius: 3,
                          padding: 0,
                          border: "none",
                          cursor: "pointer",
                          background:
                            i === trackIdx
                              ? (DECADE_COLORS[selectedDecade.decade] ??
                                "#f4a261")
                              : "rgba(255,255,255,0.2)",
                          transition: "all 0.2s ease",
                        }}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() =>
                      setTrackIdx((i) =>
                        Math.min(
                          selectedDecade.representative_tracks.length - 1,
                          i + 1,
                        ),
                      )
                    }
                    disabled={
                      trackIdx ===
                      selectedDecade.representative_tracks.length - 1
                    }
                    style={navBtn(
                      trackIdx ===
                        selectedDecade.representative_tracks.length - 1,
                    )}
                  >
                    →
                  </button>
                </div>
                <p
                  style={{
                    fontSize: 10,
                    color: "rgba(232,232,240,0.25)",
                    textAlign: "center",
                    fontStyle: "italic",
                  }}
                >
                  Track {trackIdx + 1} of{" "}
                  {selectedDecade.representative_tracks.length} · Representative
                  of the {selectedDecade.label} sound
                </p>
              </>
            )}
          </div>
        </div>

        {/* Attribute legend */}
        <div style={legendRow}>
          {[
            { color: "#f4a261", label: "Happiness (valence)" },
            { color: "#e9c46a", label: "Loudness" },
            { color: "#5b9ec9", label: "Acousticness" },
            { color: "#1db954", label: "Danceability" },
          ].map((l) => (
            <span
              key={l.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: l.color,
                  display: "inline-block",
                  flexShrink: 0,
                }}
              />
              <span style={{ color: "rgba(232,232,240,0.45)" }}>{l.label}</span>
            </span>
          ))}
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
            }}
          >
            <span
              style={{
                width: 16,
                height: 1,
                background: "rgba(255,255,255,0.25)",
                display: "inline-block",
              }}
            />
            <span style={{ color: "rgba(232,232,240,0.3)" }}>
              Note height = attribute value
            </span>
          </span>
        </div>
      </div>
    </section>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
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
  minHeight: CONT + 40,
};
const cardPanel = {
  width: CARD_WIDTH,
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 16,
  padding: "22px 20px",
  zIndex: 20,
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
  background: "none",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 6,
  color: "rgba(232,232,240,0.4)",
  cursor: "pointer",
  fontSize: 12,
  padding: "4px 8px",
  flexShrink: 0,
  marginLeft: 8,
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
const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(4,1fr)",
  gap: 8,
  marginBottom: 14,
  padding: "10px 0",
  borderTop: "1px solid rgba(255,255,255,0.06)",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
};
const navBtn = (d) => ({
  background: "none",
  border: `1px solid ${d ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.15)"}`,
  borderRadius: 8,
  color: d ? "rgba(232,232,240,0.2)" : "rgba(232,232,240,0.7)",
  cursor: d ? "default" : "pointer",
  fontSize: 16,
  padding: "6px 14px",
  transition: "all 0.15s ease",
});
const legendRow = {
  display: "flex",
  gap: 20,
  flexWrap: "wrap",
  marginTop: 56,
  paddingTop: 16,
  borderTop: "1px solid rgba(255,255,255,0.07)",
};
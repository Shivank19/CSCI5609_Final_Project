import React, { useEffect, useMemo, useRef, useState } from "react";
import { normalizeLoudness } from "../utils/dataUtils";

const ATTRS = [
  {
    key: "valence",
    label: "Valence",
    color: "#f4a261",
    family: "story",
    what:
      "Valence is a mood signal. High valence songs feel bright, playful, or emotionally open. Low valence songs feel heavier, sadder, or more tense.",
    high:
      "High valence often shows up in celebration songs, disco, sunny pop, and tracks that feel socially expansive.",
    low:
      "Low valence tends to sit closer to heartbreak, introspection, menace, or emotional ambiguity.",
    insight:
      "This matters because it tells us whether hit music has grown more uplifting or more emotionally dark over time.",
    default: 0.62,
    unit: "%",
  },
  {
    key: "loudness",
    label: "Loudness",
    color: "#e9c46a",
    family: "story",
    what:
      "Loudness tracks how hard a song is mastered. It is not just volume on your speakers. It is the pressure and density built into the recording itself.",
    high:
      "High loudness feels punchy, compressed, and relentless. Think songs that sound full even on tiny speakers.",
    low:
      "Low loudness leaves more breathing room. Quiet moments stay quiet, and the song keeps more of its natural dynamic range.",
    insight:
      "This matters because louder production changes how songs hit your body, not just how loud they seem.",
    default: 0.4,
    unit: "%",
  },
  {
    key: "acousticness",
    label: "Acousticness",
    color: "#457b9d",
    family: "story",
    what:
      "Acousticness estimates how much of a track sounds grounded in live, organic instrumentation rather than synthetic or heavily processed production.",
    high:
      "High acousticness suggests strings, piano, live drums, room tone, and the sense that real instruments are doing the work.",
    low:
      "Low acousticness points toward synth layers, programmed percussion, processed textures, and studio-built surfaces.",
    insight:
      "This matters because it lets us track the disappearing fingerprint of physical instruments in mainstream music.",
    default: 0.45,
    unit: "%",
  },
  {
    key: "danceability",
    label: "Danceability",
    color: "#ff6b6b",
    family: "expanded",
    what:
      "Danceability is Spotify's estimate of how physically easy a song is to move to. It blends groove, stability, and rhythmic clarity.",
    high:
      "High danceability usually means a strong pulse, clean structure, and movement that feels intuitive in the body.",
    low:
      "Low danceability often means looser rhythm, more drag, or a song that asks you to listen rather than move.",
    insight:
      "This matters because music can get darker emotionally while still becoming more bodily immediate.",
    default: 0.68,
    unit: "%",
  },
  {
    key: "energy",
    label: "Energy",
    color: "#e63946",
    family: "expanded",
    what:
      "Energy captures perceived intensity. It reflects how forceful, busy, and high-pressure a track feels.",
    high:
      "High energy sounds urgent, active, and full of momentum, like tracks that arrive already in motion.",
    low:
      "Low energy feels softer, calmer, or more suspended, with less impact per second.",
    insight:
      "This matters because emotional darkness does not necessarily mean songs became quieter or less intense.",
    default: 0.58,
    unit: "%",
  },
  {
    key: "speechiness",
    label: "Speechiness",
    color: "#9b5de5",
    family: "expanded",
    what:
      "Speechiness estimates how much the vocal delivery resembles spoken language rather than sustained melody.",
    high:
      "High speechiness leans toward rap, talk-singing, or highly articulated delivery.",
    low:
      "Low speechiness usually means melody carries the vocal line more than conversational cadence does.",
    insight:
      "This matters because changing vocal style is one way popular music can shift without changing genre labels.",
    default: 0.24,
    unit: "%",
  },
  {
    key: "instrumentalness",
    label: "Instrumentalness",
    color: "#43aa8b",
    family: "expanded",
    what:
      "Instrumentalness estimates how likely a track is to have little or no vocal content.",
    high:
      "High instrumentalness points toward ambient, classical, cinematic, or producer-led tracks where voices are absent or minimal.",
    low:
      "Low instrumentalness means the track is built around a vocal lead, which is the mainstream default.",
    insight:
      "This matters because it separates changes in production texture from the question of whether songs are still built around voices.",
    default: 0.12,
    unit: "%",
  },
  {
    key: "popularity",
    label: "Popularity",
    color: "#1db954",
    family: "expanded",
    what:
      "Popularity is Spotify's 0 to 100 signal for how widely played and culturally active a track is on the platform.",
    high:
      "High popularity means the song is still circulating heavily in listening habits, playlists, and algorithmic surfaces.",
    low:
      "Low popularity does not mean unimportant. It often means older catalog tracks or niche songs with less current platform activity.",
    insight:
      "This matters because filtering by popularity lets us ask whether the biggest songs tell the same story as the full archive.",
    default: 0.7,
    unit: "%",
  },
];

function cleanArtistName(artist) {
  return String(artist || "")
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .replace(/'/g, "");
}

function getTrackMetric(track, attr) {
  if (attr.key === "loudness") return normalizeLoudness(track.loudness ?? -20);
  if (attr.key === "popularity") return (track.popularity ?? 0) / 100;
  return track[attr.key];
}

function formatTrackValue(track, attr) {
  if (attr.key === "loudness") return `${track.loudness.toFixed(1)} dB`;
  if (attr.key === "popularity") return `${Math.round(track.popularity)} / 100`;
  return `${Math.round((track[attr.key] ?? 0) * 100)}%`;
}

function FeaturePreview({ attrKey, color, value }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");

    const draw = () => {
      const ratio = window.devicePixelRatio || 1;
      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, width, height);

      ctx.fillStyle = "rgba(7,7,12,0.72)";
      ctx.fillRect(0, 0, width, height);

      if (attrKey === "valence") {
        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, "rgba(244,162,97,0.12)");
        gradient.addColorStop(0.5, `${color}66`);
        gradient.addColorStop(1, "rgba(244,162,97,0.12)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, height * 0.2, width, height * 0.6);

        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let x = 0; x <= width; x += 3) {
          const base = height * (0.74 - value * 0.42);
          const wave =
            Math.sin(x * 0.022) * 10 +
            Math.sin(x * 0.051 + 0.7) * (8 + value * 12);
          const y = base + wave;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      } else if (attrKey === "loudness") {
        const barCount = 18;
        const activeBars = Math.round(4 + value * 14);
        for (let i = 0; i < barCount; i += 1) {
          const x = 18 + i * ((width - 36) / barCount);
          const barHeight = 20 + (i / barCount) * 50 + value * 28;
          ctx.fillStyle =
            i < activeBars ? `${color}${i > 12 ? "ff" : "bb"}` : "rgba(255,255,255,0.08)";
          ctx.fillRect(x, height - 18 - barHeight, 10, barHeight);
        }
      } else if (attrKey === "acousticness") {
        const stringCount = 6;
        for (let i = 0; i < stringCount; i += 1) {
          const y = 22 + i * 16;
          ctx.strokeStyle = `${color}${i % 2 === 0 ? "cc" : "88"}`;
          ctx.lineWidth = i < 2 ? 2 : 1.2;
          ctx.beginPath();
          for (let x = 0; x <= width; x += 4) {
            const wobble =
              Math.sin(x * 0.018 + i) * (value * 10 + 2) +
              Math.sin(x * 0.046 + i * 1.4) * (value * 3 + 1);
            const currentY = y + wobble;
            x === 0 ? ctx.moveTo(x, currentY) : ctx.lineTo(x, currentY);
          }
          ctx.stroke();
        }
      } else if (attrKey === "danceability") {
        const beats = 12;
        for (let i = 0; i < beats; i += 1) {
          const radius = 8 + value * 12 + (i % 3) * 2;
          const x = 28 + i * ((width - 56) / (beats - 1));
          const y = height * (0.65 - ((i % 2 === 0 ? 1 : -1) * value * 0.12));
          ctx.fillStyle = `${color}${i < beats * value ? "dd" : "33"}`;
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (attrKey === "energy") {
        const peakCount = 10;
        ctx.beginPath();
        ctx.moveTo(16, height - 22);
        for (let i = 0; i < peakCount; i += 1) {
          const x = 16 + i * ((width - 32) / (peakCount - 1));
          const y = height - 18 - ((i % 2 === 0 ? 1 : 0.5) * value * 84 + 10);
          ctx.lineTo(x, y);
        }
        ctx.lineTo(width - 16, height - 22);
        ctx.closePath();
        ctx.fillStyle = `${color}44`;
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      } else if (attrKey === "speechiness") {
        const bubbleCount = 6;
        for (let i = 0; i < bubbleCount; i += 1) {
          const bubbleWidth = 26 + value * 28 + i * 6;
          const x = 18 + i * 26;
          const y = 20 + i * 14;
          ctx.fillStyle = `${color}${i < value * 8 ? "cc" : "30"}`;
          ctx.fillRect(x, y, Math.min(bubbleWidth, width - x - 16), 12);
        }
      } else if (attrKey === "instrumentalness") {
        const noteCount = 7;
        for (let i = 0; i < noteCount; i += 1) {
          const x = 28 + i * 34;
          const y = height * (0.72 - value * 0.42) + ((i % 2) * 10 - 5);
          ctx.strokeStyle = `${color}${i < value * 9 ? "cc" : "33"}`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y - 24);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(x - 5, y, 6, 0, Math.PI * 2);
          ctx.fillStyle = `${color}${i < value * 9 ? "dd" : "33"}`;
          ctx.fill();
        }
      } else if (attrKey === "popularity") {
        const count = 9;
        for (let i = 0; i < count; i += 1) {
          const x = 24 + (i % 3) * 46;
          const y = 24 + Math.floor(i / 3) * 38;
          const active = i < Math.round(value * count);
          ctx.beginPath();
          ctx.arc(x, y, 12, 0, Math.PI * 2);
          ctx.fillStyle = active ? `${color}dd` : "rgba(255,255,255,0.08)";
          ctx.fill();
        }
      }

      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      ctx.strokeRect(12, 12, width - 24, height - 24);
    };

    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [attrKey, color, value]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        height: "140px",
        display: "block",
        borderRadius: "10px",
        background: "rgba(0,0,0,0.28)",
      }}
    />
  );
}

function TrackExamples({ attr, examples }) {
  if (!examples) return null;

  return (
    <div style={{ marginTop: 16 }}>
      <p style={exampleHeader}>Track examples</p>
      <div style={exampleGrid}>
        {[
          { label: "Higher end", item: examples.high },
          { label: "Lower end", item: examples.low },
        ].map(({ label, item }) => (
          <div key={`${attr.key}-${label}`} style={trackCard(attr.color)}>
            <span style={{ ...trackPill, color: attr.color }}>{label}</span>
            <p style={trackTitle}>{item.name}</p>
            <p style={trackMeta}>
              {cleanArtistName(item.artist)} · {item.year}
            </p>
            <p style={trackValue}>
              {attr.label}:{" "}
              <span style={{ color: attr.color }}>{formatTrackValue(item, attr)}</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function AttrCard({ attr, isActive, onActivate, onCollapse, examples }) {
  const [sliderVal, setSliderVal] = useState(attr.default);

  return (
    <div
      onClick={onActivate}
      style={{
        ...attrCard,
        borderColor: isActive ? `${attr.color}66` : "rgba(255,255,255,0.07)",
        background: isActive ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)",
        cursor: isActive ? "default" : "pointer",
        transform: isActive ? "translateY(-2px)" : "translateY(0)",
        boxShadow: isActive ? `0 18px 42px ${attr.color}12` : "none",
        transition:
          "border-color 220ms ease, background 220ms ease, transform 220ms ease, box-shadow 220ms ease",
      }}
    >
      <div style={cardHeader}>
        <span style={{ ...headerDot, background: attr.color }} />
        <span style={{ ...headerLabel, color: attr.color }}>{attr.label}</span>
        {isActive ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onCollapse();
            }}
            style={collapseButton}
          >
            Collapse
          </button>
        ) : (
          <span style={headerAction}>Open card</span>
        )}
      </div>

      <p style={cardWhat}>{attr.what}</p>

      {isActive && (
        <>
          <div style={{ marginBottom: 16 }}>
            <FeaturePreview attrKey={attr.key} color={attr.color} value={sliderVal} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={sliderHeader}>
              <span style={sliderLabel}>{attr.label} level</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: attr.color }}>
                {Math.round(sliderVal * 100)}
                {attr.unit}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round(sliderVal * 100)}
              onChange={(event) => setSliderVal(+event.target.value / 100)}
              style={{
                width: "100%",
                accentColor: attr.color,
                cursor: "pointer",
              }}
            />
            <div style={sliderFooter}>
              <span style={sliderEdge}>Lower</span>
              <span style={sliderEdge}>Higher</span>
            </div>
          </div>

          <div style={explainGrid}>
            {[
              { side: "Higher", text: attr.high, active: sliderVal >= 0.5 },
              { side: "Lower", text: attr.low, active: sliderVal < 0.5 },
            ].map(({ side, text, active }) => (
              <div
                key={`${attr.key}-${side}`}
                style={{
                  padding: "12px 14px",
                  background: `${attr.color}12`,
                  border: `1px solid ${attr.color}${active ? "44" : "18"}`,
                  borderRadius: "10px",
                  opacity: active ? 1 : 0.52,
                  transition: "opacity 220ms ease, border-color 220ms ease",
                }}
              >
                <p style={{ ...sideLabel, color: attr.color }}>{side}</p>
                <p style={sideText}>{text}</p>
              </div>
            ))}
          </div>

          <div style={insightBox(attr.color)}>
            <span style={{ ...insightLabel, color: attr.color }}>Why this matters</span>
            <p style={insightText}>{attr.insight}</p>
          </div>

          <TrackExamples attr={attr} examples={examples} />
        </>
      )}
    </div>
  );
}

export default function AttributeOnboarding() {
  const [active, setActive] = useState(null);
  const [examples, setExamples] = useState({});

  useEffect(() => {
    let mounted = true;

    fetch(`${process.env.PUBLIC_URL}/decade_songs.json`)
      .then((response) => response.json())
      .then((decades) => {
        if (!mounted) return;

        const tracks = decades.flatMap((decade) =>
          (decade.representative_tracks || []).map((track) => ({
            ...track,
            loudness_norm:
              track.loudness_norm ?? normalizeLoudness(track.loudness ?? -20),
          })),
        );

        const nextExamples = ATTRS.reduce((acc, attr) => {
          const sorted = [...tracks]
            .filter((track) => getTrackMetric(track, attr) != null)
            .sort((a, b) => getTrackMetric(a, attr) - getTrackMetric(b, attr));

          if (!sorted.length) return acc;

          acc[attr.key] = {
            low: sorted[0],
            high: sorted[sorted.length - 1],
          };
          return acc;
        }, {});

        setExamples(nextExamples);
      })
      .catch(() => {
        if (mounted) setExamples({});
      });

    return () => {
      mounted = false;
    };
  }, []);

  const activeAttr = active == null ? null : ATTRS[active];
  const storyNote = useMemo(() => {
    if (!activeAttr) {
      return "Open any card when you want the fuller explanation, examples, and mini preview.";
    }
    if (activeAttr.key === "valence") {
      return "Start here if you want the emotional part of the story first.";
    }
    if (activeAttr.key === "loudness") {
      return "This is where production choices start to change the feeling of a song.";
    }
    if (activeAttr.key === "popularity") {
      return "Popularity helps separate the broad cultural center from the long tail of the dataset.";
    }
    return "These extra attributes help round out the listening picture around the main story.";
  }, [activeAttr]);

  return (
    <section style={sectionStyle}>
      <div className="container">
        <p className="section-label" style={{ color: "var(--accent)" }}>
          Before the Story Starts
        </p>
        <h2 className="section-title" style={{ color: "#e8e8f0", marginBottom: "16px" }}>
          Learn the audio attributes
          <br />
          that shape the century.
        </h2>
        <p className="section-body" style={{ marginBottom: "18px" }}>
          The scrollytelling section will focus on three headline shifts, but the
          dataset contains more than three ideas. Think of this as your field guide:
          a quick way to learn what each metric is actually measuring before the
          larger narrative begins.
        </p>
        <p style={storyNoteStyle}>{storyNote}</p>

        <div style={toolbar}>
          <div style={chipRow}>
            {ATTRS.map((attr, index) => (
              <button
                key={attr.key}
                type="button"
                onClick={() => {
                  setActive((current) => (current === index ? null : index));
                }}
                style={{
                  ...attrChip,
                  borderColor: active === index ? `${attr.color}66` : "rgba(255,255,255,0.08)",
                  color: active === index ? "#f5f5fb" : "rgba(232,232,240,0.62)",
                  background: active === index ? `${attr.color}1a` : "rgba(255,255,255,0.03)",
                }}
              >
                <span style={{ ...chipDot, background: attr.color }} />
                {attr.label}
              </button>
            ))}
          </div>
        </div>

        <div style={cardsGrid}>
          {ATTRS.map((attr, index) => (
            <AttrCard
              key={attr.key}
              attr={attr}
              isActive={active === index}
              onActivate={() => setActive((current) => (current === index ? null : index))}
              onCollapse={() => setActive(null)}
              examples={examples[attr.key]}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

const sectionStyle = {
  padding: "100px 0",
  background: "linear-gradient(180deg, var(--bg2) 0%, var(--bg) 100%)",
};

const storyNoteStyle = {
  marginBottom: "24px",
  color: "rgba(232,232,240,0.62)",
  fontSize: "0.98rem",
  lineHeight: 1.7,
};

const toolbar = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  marginBottom: "28px",
};

const chipRow = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
};

const attrChip = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  padding: "8px 12px",
  borderRadius: "999px",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.03)",
  cursor: "pointer",
  fontSize: 12,
};

const chipDot = {
  width: 8,
  height: 8,
  borderRadius: "50%",
};

const cardsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
  gap: "20px",
  alignItems: "start",
};

const attrCard = {
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: "16px",
  padding: "22px",
};

const cardHeader = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginBottom: 14,
};

const headerDot = {
  width: 10,
  height: 10,
  borderRadius: "50%",
  flexShrink: 0,
};

const headerLabel = {
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};

const headerAction = {
  fontSize: 11,
  color: "rgba(232,232,240,0.34)",
  marginLeft: "auto",
};

const collapseButton = {
  marginLeft: "auto",
  padding: "6px 10px",
  borderRadius: "999px",
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.04)",
  color: "rgba(232,232,240,0.72)",
  cursor: "pointer",
  fontSize: 11,
};

const cardWhat = {
  fontSize: 13,
  color: "rgba(232,232,240,0.78)",
  lineHeight: 1.68,
  marginBottom: 14,
};

const sliderHeader = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: 6,
};

const sliderLabel = {
  fontSize: 10,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "rgba(232,232,240,0.38)",
};

const sliderFooter = {
  display: "flex",
  justifyContent: "space-between",
  marginTop: 4,
};

const sliderEdge = {
  fontSize: 10,
  color: "rgba(232,232,240,0.34)",
};

const explainGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
  marginBottom: 14,
};

const sideLabel = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.1em",
  marginBottom: 4,
};

const sideText = {
  fontSize: 11,
  color: "rgba(232,232,240,0.68)",
  lineHeight: 1.55,
};

const insightBox = (color) => ({
  padding: "12px 14px",
  background: `${color}10`,
  border: `1px solid ${color}22`,
  borderRadius: "10px",
  borderLeft: `3px solid ${color}`,
  marginTop: 2,
});

const insightLabel = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.1em",
};

const insightText = {
  fontSize: 12,
  color: "rgba(232,232,240,0.82)",
  lineHeight: 1.6,
  marginTop: 4,
};

const exampleHeader = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "rgba(232,232,240,0.4)",
  marginBottom: 10,
};

const exampleGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
};

const trackCard = (color) => ({
  padding: "12px 14px",
  borderRadius: "10px",
  border: `1px solid ${color}22`,
  background: `${color}0d`,
});

const trackPill = {
  display: "inline-block",
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  marginBottom: 8,
};

const trackTitle = {
  fontSize: 13,
  color: "#f4f4f8",
  lineHeight: 1.4,
  marginBottom: 4,
};

const trackMeta = {
  fontSize: 11,
  color: "rgba(232,232,240,0.56)",
  lineHeight: 1.5,
  marginBottom: 8,
};

const trackValue = {
  fontSize: 11,
  color: "rgba(232,232,240,0.7)",
};

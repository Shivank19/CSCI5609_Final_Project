import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { normalizeLoudness } from "../utils/dataUtils";

const ATTRS = [
  {
    key: "valence",
    label: "Valence",
    color: "#f4a261",
    kicker: "EMOTIONAL TONE",
    title: "How emotionally bright or heavy a song feels.",
    body:
      "Valence is the closest thing in this dataset to mood. Higher values usually feel more open, playful, or buoyant. Lower values tend to feel sadder, darker, or emotionally tighter.",
    why:
      "It matters because one of the clearest shifts in popular music is not just sound, but emotional register.",
    highText:
      "High valence often lands in songs that feel socially expansive: celebration, relief, romance, swagger, release.",
    lowText:
      "Low valence tends to sound more internal: heartbreak, anxiety, menace, grief, or unresolved tension.",
  },
  {
    key: "loudness",
    label: "Loudness",
    color: "#e9c46a",
    kicker: "PRODUCTION PRESSURE",
    title: "How forcefully the recording itself is pushed.",
    body:
      "Loudness is not your speaker volume. It is how aggressively the track has been mastered. Higher loudness often feels denser, more compressed, and less willing to breathe.",
    why:
      "It matters because production style changes how music hits the body, even when the melody or lyrics stay familiar.",
    highText:
      "High loudness usually feels urgent and immediate, with less dynamic range and more constant intensity.",
    lowText:
      "Low loudness leaves space for contrast, which can make quiet moments feel more natural and dramatic.",
  },
  {
    key: "acousticness",
    label: "Acousticness",
    color: "#457b9d",
    kicker: "MATERIAL OF SOUND",
    title: "How much the track still sounds physically played.",
    body:
      "Acousticness estimates whether a song feels rooted in live instruments and room sound rather than synthetic or heavily processed textures.",
    why:
      "It matters because it helps us track whether popular music is still built from wood, strings, skins, and air or from software-shaped surfaces.",
    highText:
      "Higher acousticness suggests guitars, pianos, live drums, room tone, and more audible physical performance.",
    lowText:
      "Lower acousticness points toward synth layers, programmed rhythm, processed vocals, and studio-built texture.",
  },
  {
    key: "danceability",
    label: "Danceability",
    color: "#ff6b6b",
    kicker: "BODY MOVEMENT",
    title: "How easy the song is to physically move with.",
    body:
      "Danceability is Spotify's estimate of how naturally a song supports movement. It blends pulse, regularity, rhythmic clarity, and how stable the groove feels.",
    why:
      "It matters because songs can grow darker in mood while becoming more physically compelling at the same time.",
    highText:
      "High danceability usually means a clear groove, strong rhythmic footing, and movement that feels intuitive.",
    lowText:
      "Low danceability often means a looser structure, less steady pulse, or a song that asks you to listen more than move.",
  },
  {
    key: "energy",
    label: "Energy",
    color: "#e63946",
    kicker: "INTENSITY",
    title: "How charged, forceful, and high-pressure the song feels.",
    body:
      "Energy is Spotify's proxy for perceived intensity. Higher energy tracks tend to sound more active, louder in spirit, and less reserved.",
    why:
      "It matters because a song can be emotionally bleak and still arrive with enormous force.",
    highText:
      "High energy usually sounds urgent, busy, fast-moving, and physically insistent.",
    lowText:
      "Low energy feels calmer, softer, or more suspended, with less impact happening each second.",
  },
  {
    key: "speechiness",
    label: "Speechiness",
    color: "#9b5de5",
    kicker: "VOCAL DELIVERY",
    title: "How much the vocal behaves like speech instead of melody.",
    body:
      "Speechiness estimates how close the vocal delivery is to spoken cadence. It tends to rise when a track leans toward rap, talk-singing, or highly articulated phrasing.",
    why:
      "It matters because vocal style can shift the feel of mainstream music even when genre labels stay broad and messy.",
    highText:
      "Higher speechiness often means more conversational cadence, sharper articulation, and less sustained melodic singing.",
    lowText:
      "Lower speechiness usually means melody carries the vocal line more than spoken rhythm does.",
  },
  {
    key: "instrumentalness",
    label: "Instrumentalness",
    color: "#43aa8b",
    kicker: "VOICE PRESENCE",
    title: "How likely the track is to work without a lead vocal.",
    body:
      "Instrumentalness estimates whether a song is largely non-vocal. It helps separate changes in production texture from the basic question of whether voices still dominate the track.",
    why:
      "It matters because not every sonic shift is about mood or production. Some are about whether the human voice stays central at all.",
    highText:
      "Higher instrumentalness points toward cinematic, ambient, classical, or producer-led tracks with little vocal presence.",
    lowText:
      "Lower instrumentalness means the song is still built around a vocal lead, which remains the mainstream norm.",
  },
  {
    key: "popularity",
    label: "Popularity",
    color: "#1db954",
    kicker: "CULTURAL REACH",
    title: "How present the song still is in platform listening.",
    body:
      "Popularity is Spotify's 0 to 100 measure of how active a track is in listening behavior on the platform. It is not the same as artistic importance, but it is useful for finding the center of attention.",
    why:
      "It matters because the story told by the biggest songs is not always identical to the story told by the full archive.",
    highText:
      "Higher popularity usually means the track still circulates heavily in playlists, recommendations, and repeated listening.",
    lowText:
      "Lower popularity often means older catalog tracks, niche songs, or music with less current platform momentum.",
  },
];

const IMAGE_EXTENSIONS = ["jpg", "png", "jpeg", "webp"];
const AUDIO_CONFIG_PATH = `${process.env.PUBLIC_URL}/attribute_audio.json`;
const EXAMPLES_CONFIG_PATH = `${process.env.PUBLIC_URL}/attribute_examples.json`;
const TRACKS_CSV_PATH = `${process.env.PUBLIC_URL}/spotify_clean.csv`;

function cleanArtistName(artist) {
  return String(artist || "")
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .replace(/'/g, "");
}

function pickConfiguredTrack(tracks, config) {
  if (!config?.name) return null;

  return (
    tracks.find((track) => {
      const sameName = String(track.name || "").toLowerCase() === config.name.toLowerCase();
      const sameArtist = config.artistIncludes
        ? cleanArtistName(track.artist)
            .toLowerCase()
            .includes(String(config.artistIncludes).toLowerCase())
        : true;
      const sameYear = config.year ? Number(track.year) === Number(config.year) : true;
      return sameName && sameArtist && sameYear;
    }) || null
  );
}

function getTrackMetric(track, attr) {
  if (attr.key === "loudness") return normalizeLoudness(track.loudness ?? -20);
  if (attr.key === "popularity") return (track.popularity ?? 0) / 100;
  return track[attr.key];
}

function normalizeTrackRecord(track) {
  return {
    ...track,
    year: Number(track.year),
    valence: Number(track.valence),
    acousticness: Number(track.acousticness),
    danceability: Number(track.danceability),
    energy: Number(track.energy),
    instrumentalness: Number(track.instrumentalness),
    loudness: Number(track.loudness),
    popularity: Number(track.popularity),
    speechiness: Number(track.speechiness),
    artist: track.artist || track.artists,
  };
}

function formatTrackValue(track, attr) {
  if (attr.key === "loudness") return `${track.loudness.toFixed(1)} dB`;
  if (attr.key === "popularity") return `${Math.round(track.popularity)} / 100`;
  return `${Math.round((track[attr.key] ?? 0) * 100)}%`;
}

function getYouTubeSearchUrl(track) {
  if (!track?.name) return null;
  const query = `${track.name} ${cleanArtistName(track.artist)} audio`;
  return `https://www.youtube-nocookie.com/embed?listType=search&list=${encodeURIComponent(query)}`;
}

function normalizeEmbedUrl(value) {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;

  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return `https://www.youtube-nocookie.com/embed/${trimmed}?rel=0`;
  }

  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const videoId = url.pathname.replace("/", "").slice(0, 11);
      if (videoId) {
        return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`;
      }
    }

    if (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "youtube-nocookie.com"
    ) {
      const watchId = url.searchParams.get("v");
      if (watchId) {
        return `https://www.youtube-nocookie.com/embed/${watchId}?rel=0`;
      }

      if (url.pathname.startsWith("/embed/")) {
        const videoId = url.pathname.split("/embed/")[1]?.split("/")[0];
        if (videoId) {
          return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`;
        }
      }

      if (url.pathname.startsWith("/shorts/")) {
        const videoId = url.pathname.split("/shorts/")[1]?.split("/")[0];
        if (videoId) {
          return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`;
        }
      }
    }
  } catch (_error) {
    return null;
  }

  return null;
}

function CoverArt({ attrKey, variant, songName }) {
  const [extIndex, setExtIndex] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setExtIndex(0);
    setFailed(false);
  }, [attrKey, variant]);

  const src = failed
    ? null
    : `${process.env.PUBLIC_URL}/covers/${attrKey}_${variant}.${IMAGE_EXTENSIONS[extIndex]}`;

  const alt = `${songName || attrKey}_${variant}_${attrKey}`;

  return src ? (
    <img
      src={src}
      alt={alt}
      onError={() => {
        if (extIndex < IMAGE_EXTENSIONS.length - 1) {
          setExtIndex((current) => current + 1);
        } else {
          setFailed(true);
        }
      }}
      style={coverImage}
    />
  ) : (
    <div style={coverFallback}>
      <span style={coverFallbackText}>{attrKey}_{variant}</span>
    </div>
  );
}

function AudioModal({ openItem, onClose }) {
  if (!openItem) return null;

  return (
    <div style={modalOverlay} onClick={onClose}>
      <div style={modalCard} onClick={(event) => event.stopPropagation()}>
        <div style={modalHeader}>
          <div>
            <p style={modalEyebrow}>Listening sample</p>
            <h4 style={modalTitle}>{openItem.songName}</h4>
            <p style={modalMeta}>{openItem.label}</p>
          </div>
          <button type="button" onClick={onClose} style={modalCloseButton}>
            Close
          </button>
        </div>

        <div style={modalPlayerWrap}>
          <iframe
            src={openItem.embedUrl}
            title={`${openItem.songName} sample player`}
            style={modalEmbed}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen={false}
          />
        </div>
      </div>
    </div>
  );
}

function ExampleCard({ attr, variant, track, audioConfig, onOpenAudio }) {
  const variantLabel = variant === "high" ? `High ${attr.label}` : `Low ${attr.label}`;
  const songName = track?.name || `${attr.label} ${variant}`;
  const embedUrl =
    normalizeEmbedUrl(audioConfig?.embedUrl || audioConfig?.videoId) ||
    getYouTubeSearchUrl(track);

  return (
    <div
      style={{
        ...exampleCard,
        borderColor: `${attr.color}2e`,
        background: `${attr.color}12`,
      }}
    >
      <div style={coverWrap}>
        <CoverArt attrKey={attr.key} variant={variant} songName={songName} />
      </div>
      <div style={exampleMeta}>
        <span style={{ ...examplePill, color: attr.color }}>{variantLabel}</span>
        <p style={exampleSong}>{songName}</p>
        <p style={exampleArtist}>
          {track ? `${cleanArtistName(track.artist)} · ${track.year}` : "Awaiting cover asset"}
        </p>
        <p style={exampleValue}>
          {track ? formatTrackValue(track, attr) : `${attr.key}_${variant}`}
        </p>
        {embedUrl && (
          <div style={audioBox}>
            <p style={audioLabel}>Listen to the texture</p>
            <button
              type="button"
              onClick={() =>
                onOpenAudio({
                  embedUrl,
                  songName,
                  label: variantLabel,
                })
              }
              style={audioButton}
            >
              Listen to a sample
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AttributeOnboarding() {
  const [activeIndex, setActiveIndex] = useState(null);
  const [examples, setExamples] = useState({});
  const [audioConfig, setAudioConfig] = useState({});
  const [openAudio, setOpenAudio] = useState(null);
  const introRef = useRef(null);
  const stepRefs = useRef([]);

  useEffect(() => {
    let mounted = true;

    Promise.all([
      fetch(`${process.env.PUBLIC_URL}/decade_songs.json`).then((response) => response.json()),
      fetch(EXAMPLES_CONFIG_PATH)
        .then((response) => {
          if (!response.ok) throw new Error("attribute_examples.json not found");
          return response.json();
        })
        .catch(() => ({})),
      d3.csv(TRACKS_CSV_PATH).catch(() => []),
    ])
      .then(([decades, configuredExamples, csvTracks]) => {
        if (!mounted) return;

        const decadeTracks = decades.flatMap((decade) =>
          (decade.representative_tracks || []).map((track) => ({
            ...normalizeTrackRecord(track),
            loudness_norm:
              track.loudness_norm ?? normalizeLoudness(track.loudness ?? -20),
          })),
        );

        const fullDatasetTracks = (csvTracks || []).map((track) =>
          normalizeTrackRecord(track),
        );
        const tracks = [...decadeTracks, ...fullDatasetTracks];

        const nextExamples = ATTRS.reduce((acc, attr) => {
          const sorted = [...tracks]
            .filter((track) => getTrackMetric(track, attr) != null)
            .sort((a, b) => getTrackMetric(a, attr) - getTrackMetric(b, attr));

          if (!sorted.length) return acc;

          const configured = configuredExamples?.[attr.key] || {};
          const lowOverride = pickConfiguredTrack(tracks, configured.low);
          const highOverride = pickConfiguredTrack(tracks, configured.high);

          acc[attr.key] = {
            low: lowOverride || sorted[0],
            high: highOverride || sorted[sorted.length - 1],
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

  useEffect(() => {
    let mounted = true;

    fetch(AUDIO_CONFIG_PATH)
      .then((response) => {
        if (!response.ok) throw new Error("attribute_audio.json not found");
        return response.json();
      })
      .then((json) => {
        if (mounted) setAudioConfig(json || {});
      })
      .catch(() => {
        if (mounted) setAudioConfig({});
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const observers = [];

    if (introRef.current) {
      const introObserver = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveIndex(null);
        },
        {
          rootMargin: "-18% 0px -42% 0px",
          threshold: 0.18,
        },
      );
      introObserver.observe(introRef.current);
      observers.push(introObserver);
    }

    stepRefs.current.forEach((element, index) => {
      if (!element) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveIndex(index);
        },
        {
          rootMargin: "-24% 0px -38% 0px",
          threshold: 0.2,
        },
      );
      observer.observe(element);
      observers.push(observer);
    });

    return () => observers.forEach((observer) => observer.disconnect());
  }, []);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") setOpenAudio(null);
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  const activeAttr = activeIndex == null ? null : ATTRS[activeIndex];
  const activeExamples = activeAttr ? examples[activeAttr.key] || {} : {};

  return (
    <>
      <section style={sectionStyle}>
        <div style={scrollInner}>
          <div style={textRail}>
            <div ref={introRef} style={introBlock}>
              <p className="section-label" style={{ color: "var(--accent)" }}>
                Before the Story Starts
              </p>
              <h2 className="section-title" style={{ color: "#e8e8f0", marginBottom: "16px" }}>
                Learn the attributes
                <br />
                the story will keep returning to.
              </h2>
              <p className="section-body" style={{ marginBottom: "16px" }}>
                This project explores roughly 170,000 songs released between the
                1920s and 2020s, using eight audio attributes measured by
                Spotify&rsquo;s audio analysis engine. Together they let us trace
                a counterintuitive trend: over the past sixty years, popular music
                has grown measurably sadder in emotional tone while simultaneously
                becoming louder, more danceable, and less acoustic. We call this
                the <em>sadness paradox</em>.
              </p>
              <p className="section-body" style={{ marginBottom: "12px" }}>
                As you scroll, each attribute takes a turn in the spotlight. The
                left side explains what it measures and why it matters to the story.
                The right side pairs it with two real songs at the high and low
                ends so you can hear the difference before the data makes the
                argument.
              </p>
            </div>

            {ATTRS.map((attr, index) => (
              <article
                key={attr.key}
                ref={(element) => {
                  stepRefs.current[index] = element;
                }}
                style={{
                  ...stepBlock,
                  opacity: activeIndex === index ? 1 : 0.28,
                  transform: activeIndex === index ? "translateY(0)" : "translateY(14px)",
                  transition: "opacity 320ms ease, transform 320ms ease",
                }}
              >
                <div
                  style={{
                    ...kickerPill,
                    background: `${attr.color}18`,
                    borderColor: `${attr.color}38`,
                    color: attr.color,
                  }}
                >
                  <span style={{ ...kickerDot, background: attr.color }} />
                  {attr.kicker}
                </div>

                <h3 style={{ ...stepTitle, color: attr.color }}>{attr.label}</h3>
                <p style={stepLead}>{attr.title}</p>
                <p style={stepBody}>{attr.body}</p>

                <div style={detailGrid}>
                  <div style={detailCard(attr.color)}>
                    <p style={detailLabel}>Higher</p>
                    <p style={detailText}>{attr.highText}</p>
                  </div>
                  <div style={detailCard(attr.color)}>
                    <p style={detailLabel}>Lower</p>
                    <p style={detailText}>{attr.lowText}</p>
                  </div>
                </div>

                <p style={whyText}>{attr.why}</p>
              </article>
            ))}
          </div>

          <div style={visualRail}>
            {activeAttr && (
              <div style={stickyPanel}>
                <div style={stickyHeader}>
                  <p style={stickyLabel}>Now viewing</p>
                  <h3 style={{ ...stickyTitle, color: activeAttr.color }}>{activeAttr.label}</h3>
                  <p style={stickyBody}>{activeAttr.title}</p>
                </div>

                <div style={coversStack}>
                  <ExampleCard
                    attr={activeAttr}
                    variant="high"
                    track={activeExamples.high}
                    audioConfig={audioConfig?.[activeAttr.key]?.high}
                    onOpenAudio={setOpenAudio}
                  />
                  <ExampleCard
                    attr={activeAttr}
                    variant="low"
                    track={activeExamples.low}
                    audioConfig={audioConfig?.[activeAttr.key]?.low}
                    onOpenAudio={setOpenAudio}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <AudioModal openItem={openAudio} onClose={() => setOpenAudio(null)} />
    </>
  );
}

const sectionStyle = {
  padding: "100px 0 120px",
  background: "linear-gradient(180deg, var(--bg2) 0%, var(--bg) 100%)",
};

const scrollInner = {
  maxWidth: "1200px",
  margin: "0 auto",
  padding: "0 32px",
  display: "grid",
  gridTemplateColumns: "0.95fr 1.05fr",
  gap: "52px",
  alignItems: "start",
};

const textRail = {
  display: "flex",
  flexDirection: "column",
  gap: "72vh",
};

const introBlock = {
  paddingTop: "10vh",
};

const introNote = {
  color: "rgba(232,232,240,0.45)",
  fontSize: "0.9rem",
  lineHeight: 1.6,
};

const stepBlock = {
  minHeight: "68vh",
};

const kickerPill = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  padding: "5px 12px",
  borderRadius: "999px",
  border: "1px solid",
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.12em",
  marginBottom: "18px",
};

const kickerDot = {
  width: 7,
  height: 7,
  borderRadius: "50%",
};

const stepTitle = {
  fontFamily: "'DM Serif Display', serif",
  fontSize: "clamp(1.7rem, 3.2vw, 2.55rem)",
  lineHeight: 1.06,
  marginBottom: "10px",
};

const stepLead = {
  color: "#f4f4f8",
  fontSize: "1.06rem",
  lineHeight: 1.6,
  marginBottom: "14px",
};

const stepBody = {
  color: "rgba(232,232,240,0.72)",
  fontSize: "0.98rem",
  lineHeight: 1.8,
  marginBottom: "22px",
};

const detailGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "12px",
  marginBottom: "18px",
};

const detailCard = (color) => ({
  padding: "14px 16px",
  borderRadius: "14px",
  border: `1px solid ${color}26`,
  background: `${color}10`,
});

const detailLabel = {
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "rgba(255,255,255,0.54)",
  marginBottom: "6px",
};

const detailText = {
  color: "rgba(232,232,240,0.78)",
  fontSize: "0.92rem",
  lineHeight: 1.65,
};

const whyText = {
  color: "rgba(255,255,255,0.92)",
  fontSize: "0.98rem",
  lineHeight: 1.7,
};

const visualRail = {
  position: "sticky",
  top: "10vh",
  height: "auto",
};

const stickyPanel = {
  minHeight: "auto",
  borderRadius: "24px",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.03)",
  padding: "18px",
  display: "flex",
  flexDirection: "column",
  gap: "14px",
};

const stickyHeader = {
  paddingBottom: "8px",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
};

const stickyLabel = {
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "rgba(232,232,240,0.36)",
  marginBottom: "8px",
};

const stickyTitle = {
  fontFamily: "'DM Serif Display', serif",
  fontSize: "clamp(1.55rem, 2.4vw, 2.2rem)",
  marginBottom: "8px",
};

const stickyBody = {
  color: "rgba(232,232,240,0.64)",
  fontSize: "0.92rem",
  lineHeight: 1.58,
};

const coversStack = {
  display: "grid",
  gridTemplateRows: "repeat(2, auto)",
  gap: "12px",
  minHeight: 0,
  flex: "0 0 auto",
};

const exampleCard = {
  display: "grid",
  gridTemplateColumns: "92px 1fr",
  gap: "12px",
  alignItems: "start",
  borderRadius: "14px",
  border: "1px solid rgba(255,255,255,0.08)",
  padding: "10px",
  minHeight: 0,
};

const coverWrap = {
  width: 92,
  height: 92,
  overflow: "hidden",
  borderRadius: "10px",
  border: "1px solid rgba(255,255,255,0.07)",
  background: "rgba(255,255,255,0.04)",
};

const coverImage = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};

const coverFallback = {
  width: "100%",
  height: "100%",
  minHeight: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background:
    "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)",
};

const coverFallbackText = {
  color: "rgba(232,232,240,0.42)",
  fontSize: "0.85rem",
  letterSpacing: "0.04em",
};

const exampleMeta = {
  padding: "4px 4px 4px 0",
  display: "flex",
  flexDirection: "column",
  justifyContent: "flex-start",
  minWidth: 0,
};

const examplePill = {
  fontSize: "9px",
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  marginBottom: "6px",
};

const exampleSong = {
  color: "#f4f4f8",
  fontSize: "0.9rem",
  lineHeight: 1.36,
  marginBottom: "3px",
};

const exampleArtist = {
  color: "rgba(232,232,240,0.56)",
  fontSize: "0.78rem",
  lineHeight: 1.45,
  marginBottom: "6px",
};

const exampleValue = {
  color: "rgba(255,255,255,0.86)",
  fontSize: "0.8rem",
  marginBottom: "6px",
};

const audioBox = {
  marginTop: "4px",
  paddingTop: "4px",
};

const audioLabel = {
  fontSize: "9px",
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "rgba(232,232,240,0.42)",
  marginBottom: "5px",
};

const audioButton = {
  width: "fit-content",
  padding: "6px 10px",
  borderRadius: "999px",
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.05)",
  color: "#f4f4f8",
  cursor: "pointer",
  fontSize: "11px",
};

const modalOverlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.58)",
  backdropFilter: "blur(8px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px",
  zIndex: 1000,
};

const modalCard = {
  width: "min(560px, 92vw)",
  borderRadius: "20px",
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(18,18,28,0.96)",
  padding: "20px",
  boxShadow: "0 24px 80px rgba(0,0,0,0.4)",
};

const modalHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  marginBottom: "18px",
};

const modalEyebrow = {
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "rgba(232,232,240,0.42)",
  marginBottom: "6px",
};

const modalTitle = {
  color: "#f4f4f8",
  fontSize: "1.15rem",
  lineHeight: 1.35,
  marginBottom: "4px",
};

const modalMeta = {
  color: "rgba(232,232,240,0.6)",
  fontSize: "0.9rem",
};

const modalCloseButton = {
  alignSelf: "flex-start",
  padding: "8px 12px",
  borderRadius: "999px",
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.04)",
  color: "rgba(232,232,240,0.82)",
  cursor: "pointer",
  fontSize: "12px",
};

const modalPlayerWrap = {
  display: "flex",
  justifyContent: "center",
};

const modalEmbed = {
  width: "min(420px, 78vw)",
  height: "min(315px, 58vw)",
  border: 0,
  borderRadius: "12px",
  background: "rgba(0,0,0,0.24)",
};

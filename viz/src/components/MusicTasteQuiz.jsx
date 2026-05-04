import React, { useMemo, useState } from "react";
import * as d3 from "d3";
import { normalizeLoudness } from "../utils/dataUtils";

const FEATURES = [
  { key: "valence", label: "Mood", color: "#f4a261" },
  { key: "loudness", label: "Volume", color: "#e9c46a" },
  { key: "danceability", label: "Movement", color: "#1db954" },
  { key: "acousticness", label: "Instrumentation", color: "#457b9d" },
  { key: "instrumentalness", label: "Vocals", color: "#8B5CF6" },
  { key: "energy", label: "Intensity", color: "#e63946" },
];

const DECADES = [
  { decade: 1960, label: "1960s", color: "#f4a261" },
  { decade: 1970, label: "1970s", color: "#e9c46a" },
  { decade: 1980, label: "1980s", color: "#e63946" },
  { decade: 1990, label: "1990s", color: "#457b9d" },
  { decade: 2000, label: "2000s", color: "#1db954" },
  { decade: 2010, label: "2010s", color: "#8B5CF6" },
];

const QUESTIONS = [
  {
    id: "mood",
    feature: "valence",
    question: "What mood do you prefer for your playlists?",
    options: [
      { label: "Melancholic and introspective", value: 0.25 },
      { label: "Mellow and reflective", value: 0.4 },
      { label: "Balanced/depends on my mood", value: 0.55 },
      { label: "Upbeat and feel-good", value: 0.7 },
      { label: "Euphoric and joyful", value: 0.85 },
    ],
  },
  {
    id: "volume",
    feature: "loudness",
    question: "How loud do you like your music?",
    options: [
      { label: "Quiet, intimate, room-filling", value: 0.2 },
      { label: "Moderate, easy on the ears", value: 0.35 },
      { label: "Medium-loud, noticeable presence", value: 0.5 },
      { label: "Loud, I want to feel it", value: 0.65 },
      { label: "As loud as possible, maxed out", value: 0.8 },
    ],
  },
  {
    id: "movement",
    feature: "danceability",
    question: "How much do you move when you listen to music?",
    options: [
      { label: "Sitting still, eyes closed", value: 0.2 },
      { label: "Head nodding at most", value: 0.35 },
      { label: "Tapping my foot, feeling the groove", value: 0.5 },
      { label: "Moving around, maybe dancing", value: 0.65 },
      { label: "Full dance floor energy", value: 0.8 },
    ],
  },
  {
    id: "instrumentation",
    feature: "acousticness",
    question: "What type of sound do you prefer?",
    options: [
      { label: "Synths, beats, electronic production", value: 0.15 },
      { label: "A mix of electronic and organic", value: 0.35 },
      { label: "I don't have a strong preference", value: 0.5 },
      { label: "Real instruments, live feel", value: 0.7 },
      { label: "Raw, acoustic, unplugged energy", value: 0.85 },
    ],
  },
  {
    id: "vocals",
    feature: "instrumentalness",
    question: "How important are lyrics to you?",
    options: [
      { label: "I prefer no vocals at all", value: 0.8 },
      { label: "Mostly instrumental, occasional vocals", value: 0.6 },
      { label: "I don't mind either way", value: 0.4 },
      { label: "I want lyrics in most songs", value: 0.2 },
      { label: "The singer is everything", value: 0.05 },
    ],
  },
  {
    id: "energy",
    feature: "energy",
    question: "Pick a concert you'd time-travel to:",
    options: [
      { label: "A candlelit jazz lounge", value: 0.2 },
      { label: "An acoustic campfire set", value: 0.35 },
      { label: "A mid-tempo indie show", value: 0.5 },
      { label: "A high-energy rock gig", value: 0.7 },
      { label: "A stadium rave with massive bass", value: 0.85 },
    ],
  },
];

const DECADE_DESCRIPTIONS = {
  1960: {
    tagline: "The Golden Age of Melody",
    body: "Your taste aligns with the 1960s: live instrumentation, and emotional sincerity. The music of this decade was built on real instruments playing in real rooms. Valence sat high, acousticness was the default, and songs carried warm acoustic production.",
  },
  1970: {
    tagline: "Peak Warmth, Peak Groove",
    body: "Your sound is the 1970s: the decade where popular music hit an emotional peak. Soul, disco, funk, and singer-songwriter traditions dominated. The data shows this era had the highest average valence of any decade. Songs were danceable, loud, and still deeply rooted in organic instrumentation.",
  },
  1980: {
    tagline: "The Electronic Turning Point",
    body: "You belong in the 1980s: the decade where synthesizers went mainstream and the sound of popular music changed forever. Energy was high, danceability peaked, and electronic production started replacing acoustic instruments. ",
  },
  1990: {
    tagline: "The Great Rewiring",
    body: "Your taste matches the 1990s: the most disruptive decade in the dataset. Valence dropped sharply as alternative rock and grunge moved from the margins to the center. Loudness surged as digital production tools allowed engineers to push tracks harder. Acousticness began its steep decline. ",
  },
  2000: {
    tagline: "Loudness at Its Peak",
    body: "Your sound is the 2000s: the era of maximum volume. The loudness war reached its climax as tracks were mastered hotter than ever before. Hip-hop, pop-punk, and R&B dominated. Danceability stayed strong, but the emotional warmth of the acousticness of earlier decades began to fade. ",
  },
  2010: {
    tagline: "The Streaming Era Sound",
    body: "Your taste aligns with the 2010s: the streaming era. Songs became less acoustic, less emotionally bright, and more compressed. But they also became more diverse in style. Hip-hop and electronic production became the new default. Loudness plateaued as streaming normalization changed the incentive, but the dense, synthetic sound stayed.",
  },
};

// ─── Quiz Radar Chart ─────────────────────────────────────────────────────────
// Spider / radar chart showing all 6 attributes at once.
// Filled polygon = matched decade real averages (colored).
// Dashed polygon = user's answers across the same axes.
// Pure React SVG — no D3 needed.

const RADAR_ATTRS = [
  { key: "valence", label: "Mood", qFeature: "valence" },
  { key: "energy", label: "Intensity", qFeature: "energy" },
  { key: "danceability", label: "Movement", qFeature: "danceability" },
  { key: "loudness", label: "Volume", qFeature: "loudness" },
  { key: "acousticness", label: "Vocals", qFeature: "acousticness" },
  { key: "instrumentalness", label: "Instrumental", qFeature: "instrumentalness" },
];

function radarPoint(angleDeg, value, R, cx, cy) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + Math.cos(rad) * R * value, y: cy + Math.sin(rad) * R * value };
}

function toPolygonPoints(values, R, cx, cy) {
  const n = values.length;
  return values
    .map((v, i) => radarPoint((i / n) * 360, v, R, cx, cy))
    .map((p) => `${p.x},${p.y}`)
    .join(" ");
}

function QuizRadarChart({ decadeAverages, winningDecade, answers }) {
  const SIZE = 300;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const R = 108;
  const n = RADAR_ATTRS.length;

  const decadeColor =
    DECADES.find((d) => d.decade === winningDecade)?.color || "#1db954";
  const decadeData = decadeAverages[winningDecade] || {};

  // Decade values (real data)
  const decadeVals = RADAR_ATTRS.map((attr) => decadeData[attr.key] ?? 0);

  // User values (from quiz answers)
  const userVals = RADAR_ATTRS.map((attr) => {
    const qIdx = QUESTIONS.findIndex((q) => q.feature === attr.qFeature);
    const ans = answers.find((a) => a?.questionIndex === qIdx);
    return ans?.value ?? 0;
  });

  const gridRings = [0.25, 0.5, 0.75, 1.0];

  return (
    <div style={chartWrap}>
      <div style={chartHeading}>
        <span style={chartKicker}>Your sound profile vs the {winningDecade}s</span>
        <p style={chartSub}>
          All six attributes on one chart.{" "}
          <span style={{ color: decadeColor, fontWeight: 600 }}>Filled polygon</span>
          {" = real decade averages · "}
          <span style={{ color: "rgba(232,232,240,0.8)", fontWeight: 600 }}>
            Dashed outline
          </span>{" "}
          = your answers. Where they overlap is why you matched.
        </p>
      </div>

      <div style={{ display: "flex", justifyContent: "center" }}>
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          style={{ overflow: "visible" }}
        >
          {/* Grid rings */}
          {gridRings.map((r) => (
            <polygon
              key={r}
              points={toPolygonPoints(Array(n).fill(r), R, cx, cy)}
              fill="none"
              stroke={r === 0.5 ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.05)"}
              strokeWidth={r === 0.5 ? 1.5 : 1}
            />
          ))}

          {/* Ring labels (25%, 50%, 75%) */}
          {[0.25, 0.5, 0.75].map((r) => {
            const p = radarPoint(0, r, R, cx, cy);
            return (
              <text
                key={r}
                x={p.x + 4}
                y={p.y}
                fill="rgba(232,232,240,0.22)"
                fontSize={8}
                dominantBaseline="middle"
              >
                {Math.round(r * 100)}%
              </text>
            );
          })}

          {/* Axis spokes */}
          {RADAR_ATTRS.map((attr, i) => {
            const end = radarPoint((i / n) * 360, 1, R, cx, cy);
            return (
              <line
                key={attr.key}
                x1={cx}
                y1={cy}
                x2={end.x}
                y2={end.y}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={1}
              />
            );
          })}

          {/* Decade polygon (filled) */}
          <polygon
            points={toPolygonPoints(decadeVals, R, cx, cy)}
            fill={`${decadeColor}28`}
            stroke={decadeColor}
            strokeWidth={2}
            strokeLinejoin="round"
          />

          {/* Decade dots on each axis */}
          {decadeVals.map((v, i) => {
            const p = radarPoint((i / n) * 360, v, R, cx, cy);
            return (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={3.5}
                fill={decadeColor}
                stroke="#0a0a0f"
                strokeWidth={1}
              />
            );
          })}

          {/* User polygon (dashed outline) */}
          <polygon
            points={toPolygonPoints(userVals, R, cx, cy)}
            fill="rgba(255,255,255,0.06)"
            stroke="rgba(255,255,255,0.8)"
            strokeWidth={1.5}
            strokeDasharray="5 3"
            strokeLinejoin="round"
          />

          {/* User dots on each axis */}
          {userVals.map((v, i) => {
            const p = radarPoint((i / n) * 360, v, R, cx, cy);
            return (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={3}
                fill="white"
                stroke="#0a0a0f"
                strokeWidth={1}
              />
            );
          })}

          {/* Axis labels */}
          {RADAR_ATTRS.map((attr, i) => {
            const labelR = R + 20;
            const p = radarPoint((i / n) * 360, 1, labelR, cx, cy);
            const anchorAngle = (i / n) * 360;
            const textAnchor =
              anchorAngle < 10 || anchorAngle > 350
                ? "middle"
                : anchorAngle < 180
                  ? "start"
                  : anchorAngle === 180
                    ? "middle"
                    : "end";
            return (
              <text
                key={attr.key}
                x={p.x}
                y={p.y}
                textAnchor={textAnchor}
                dominantBaseline="middle"
                fill="rgba(232,232,240,0.65)"
                fontSize={10}
                fontWeight={600}
                letterSpacing="0.06em"
              >
                {attr.label}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div style={chartLegend}>
        <span style={legendDecade(decadeColor)}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              background: `${decadeColor}28`,
              border: `2px solid ${decadeColor}`,
              display: "inline-block",
              flexShrink: 0,
            }}
          />
          {winningDecade}s real average
        </span>
        <span style={legendYou}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              background: "rgba(255,255,255,0.1)",
              border: "2px dashed rgba(255,255,255,0.8)",
              display: "inline-block",
              flexShrink: 0,
            }}
          />
          Your picks
        </span>
      </div>
    </div>
  );
}

const chartWrap = {
  marginBottom: "36px",
  padding: "24px",
  borderRadius: "18px",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.02)",
};

const chartHeading = {
  marginBottom: "16px",
};

const chartKicker = {
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "rgba(232,232,240,0.5)",
};

const chartSub = {
  color: "rgba(232,232,240,0.42)",
  fontSize: "0.78rem",
  lineHeight: 1.6,
  marginTop: "6px",
};

const chartLegend = {
  display: "flex",
  flexWrap: "wrap",
  gap: "16px",
  marginTop: "12px",
  justifyContent: "center",
  alignItems: "center",
};

const legendDecade = (color) => ({
  display: "flex",
  alignItems: "center",
  gap: "7px",
  color,
  fontSize: 11,
  fontWeight: 600,
});

const legendYou = {
  display: "flex",
  alignItems: "center",
  gap: "7px",
  color: "rgba(232,232,240,0.75)",
  fontSize: 11,
  fontWeight: 600,
};




function computeDecadeScores(answers, decadeAverages) {
  const scores = {};
  DECADES.forEach((dec) => {
    scores[dec.decade] = 0;
  });


  answers.forEach((answer) => {
    if (answer === null) return;
    const question = QUESTIONS[answer.questionIndex];
    const feature = question.feature;
    const userValue = answer.value;

    DECADES.forEach((dec) => {
      const decadeValue = decadeAverages[dec.decade]?.[feature] ?? 0.5;
      const distance = Math.abs(userValue - decadeValue);
      scores[dec.decade] += 1 / (1 + distance * 5);
    });
  });

  return scores;
}

function getWinningDecade(scores) {
  let maxScore = -1;
  let winner = DECADES[0].decade;
  DECADES.forEach((dec) => {
    if (scores[dec.decade] > maxScore) {
      maxScore = scores[dec.decade];
      winner = dec.decade;
    }
  });
  return winner;
}

export default function MusicTasteQuiz({ data }) {
  const [answers, setAnswers] = useState(() => Array(QUESTIONS.length).fill(null));
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [showResult, setShowResult] = useState(false);

  const decadeAverages = useMemo(() => {
    if (!data?.length) return {};
    const byDecade = d3.rollup(
      data.filter((d) => d.year >= 1960 && d.year <= 2020),
      (rows) => ({
        valence: d3.mean(rows, (r) => r.valence),
        loudness: d3.mean(rows, (r) => normalizeLoudness(r.loudness)),
        danceability: d3.mean(rows, (r) => r.danceability),
        acousticness: d3.mean(rows, (r) => r.acousticness),
        instrumentalness: d3.mean(rows, (r) => r.instrumentalness),
        energy: d3.mean(rows, (r) => r.energy),
        count: rows.length,
      }),
      (d) => d.decade,
    );
    const result = {};
    byDecade.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }, [data]);

  const scores = useMemo(() => {
    if (answers.some((a) => a === null)) return null;
    return computeDecadeScores(answers, decadeAverages);
  }, [answers, decadeAverages]);

  const winningDecade = useMemo(() => {
    if (!scores) return null;
    return getWinningDecade(scores);
  }, [scores]);

  const handleAnswer = (value) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = { questionIndex: currentQuestion, value };
    setAnswers(newAnswers);

    if (currentQuestion < QUESTIONS.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setShowResult(true);
    }
  };

  const handleReset = () => {
    setAnswers(Array(QUESTIONS.length).fill(null));
    setCurrentQuestion(0);
    setShowResult(false);
  };

  const handleGoBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  if (!data?.length) return null;

  if (showResult && winningDecade) {
    const decadeInfo = DECADE_DESCRIPTIONS[winningDecade];
    const decadeData = decadeAverages[winningDecade];
    const decadeObj = DECADES.find((d) => d.decade === winningDecade);

    return (
      <section style={sectionStyle}>
        <div className="container" style={{ maxWidth: "720px" }}>
          <p className="section-label" style={{ color: decadeObj.color, marginBottom: 12 }}>
            Your Sound
          </p>
          <h2 className="section-title" style={{ marginBottom: "8px" }}>
            Your taste is the <span style={{ color: decadeObj.color }}>{decadeObj.label}</span>
          </h2>
          <p style={{ ...subtitle, color: decadeObj.color }}>{decadeInfo.tagline}</p>
          <p className="section-body" style={{ marginBottom: "32px" }}>
            {decadeInfo.body}
          </p>
          <QuizRadarChart
            decadeAverages={decadeAverages}
            winningDecade={winningDecade}
            answers={answers}
          />

          <div style={statsGrid}>
            {FEATURES.map((feat) => {
              const userVal = answers.find((a) => a?.questionIndex === QUESTIONS.findIndex((q) => q.feature === feat.key))?.value ?? 0;
              const decadeVal = decadeData?.[feat.key] ?? 0;
              return (
                <div key={feat.key} style={statCard}>
                  <div style={statHeader}>
                    <span style={{ ...statDot, background: feat.color }} />
                    <span style={statLabel}>{feat.label}</span>
                  </div>
                  <div style={statBarWrap}>
                    <div style={statBarBg}>
                      <div
                        style={{
                          ...statBarFill,
                          width: `${decadeVal * 100}%`,
                          background: feat.color,
                        }}
                      />
                    </div>
                    <span style={statBarLabel}>Decade avg: {Math.round(decadeVal * 100)}%</span>
                  </div>
                  <div style={statBarWrap}>
                    <div style={statBarBg}>
                      <div
                        style={{
                          ...statBarFill,
                          width: `${userVal * 100}%`,
                          background: `${feat.color}88`,
                        }}
                      />
                    </div>
                    <span style={statBarLabel}>Your pick: {Math.round(userVal * 100)}%</span>
                  </div>
                </div>
              );
            })}
          </div>

          <p style={methodologyNote}>
            Each answer maps to a feature value (0–100%) for one of the six audio attributes. Your answers are compared against the real average values for each decade in the dataset, and the decade whose averages are closest to your picks across all six features wins.
          </p>

          <button onClick={handleReset} style={resetButton}>
            Take the quiz again
          </button>
        </div>
      </section>
    );
  }

  const question = QUESTIONS[currentQuestion];
  const progress = ((currentQuestion + (answers[currentQuestion] !== null ? 1 : 0)) / QUESTIONS.length) * 100;

  return (
    <section style={sectionStyle}>
      <div className="container" style={{ maxWidth: "640px" }}>
        <p className="section-label" style={{ color: "#1db954", marginBottom: 12 }}>
          Music Taste Quiz
        </p>
        <h2 className="section-title" style={{ marginBottom: "8px" }}>
          Which decade matches your sound?
        </h2>
        <p className="section-body" style={{ marginBottom: "32px" }}>
          Answer {QUESTIONS.length} quick questions about how you listen. We'll compare your picks against the actual data from each decade and tell you which era your taste belongs to.
        </p>

        <div style={progressWrap}>
          <div style={progressBg}>
            <div style={{ ...progressFill, width: `${progress}%` }} />
          </div>
          <span style={progressText}>
            {currentQuestion + 1} of {QUESTIONS.length}
          </span>
        </div>

        <div style={questionCard}>
          <div style={questionFeature}>
            <span style={{ ...featureDot, background: question.color || FEATURES.find((f) => f.key === question.feature)?.color }} />
            <span style={featureLabel}>{FEATURES.find((f) => f.key === question.feature)?.label}</span>
          </div>
          <h3 style={questionText}>{question.question}</h3>
          <div style={optionsGrid}>
            {question.options.map((option, idx) => {
              const isSelected = answers[currentQuestion]?.value === option.value;
              return (
                <button
                  key={idx}
                  onClick={() => handleAnswer(option.value)}
                  style={{
                    ...optionButton,
                    ...(isSelected ? optionButtonSelected : {}),
                    borderColor: isSelected ? (FEATURES.find((f) => f.key === question.feature)?.color || "#1db954") : "rgba(255,255,255,0.1)",
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        {currentQuestion > 0 && (
          <button onClick={handleGoBack} style={backButton}>
            ← Back
          </button>
        )}
      </div>
    </section>
  );
}

const sectionStyle = {
  padding: "100px 0",
  background: "linear-gradient(180deg, var(--bg) 0%, var(--bg2) 100%)",
};

const subtitle = {
  fontSize: "clamp(1rem, 2vw, 1.3rem)",
  fontWeight: 600,
  marginBottom: "16px",
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
  gap: "16px",
  marginBottom: "32px",
};

const statCard = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: "14px",
  padding: "20px",
};

const statHeader = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  marginBottom: "14px",
};

const statDot = {
  width: 8,
  height: 8,
  borderRadius: "50%",
  flexShrink: 0,
};

const statLabel = {
  fontSize: "12px",
  fontWeight: 600,
  color: "rgba(232,232,240,0.7)",
};

const statBarWrap = {
  marginBottom: "8px",
};

const statBarBg = {
  height: 6,
  background: "rgba(255,255,255,0.06)",
  borderRadius: 3,
  overflow: "hidden",
  marginBottom: 4,
};

const statBarFill = {
  height: "100%",
  borderRadius: 3,
  transition: "width 400ms ease",
};

const statBarLabel = {
  fontSize: "10px",
  color: "rgba(232,232,240,0.4)",
};


const resetButton = {
  padding: "12px 28px",
  fontSize: "14px",
  fontWeight: 600,
  color: "#1db954",
  background: "transparent",
  border: "1px solid rgba(29,185,84,0.3)",
  borderRadius: "10px",
  cursor: "pointer",
  transition: "all 200ms ease",
};

const progressWrap = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  marginBottom: "24px",
};

const progressBg = {
  flex: 1,
  height: 4,
  background: "rgba(255,255,255,0.08)",
  borderRadius: 2,
  overflow: "hidden",
};

const progressFill = {
  height: "100%",
  background: "#1db954",
  borderRadius: 2,
  transition: "width 300ms ease",
};

const progressText = {
  fontSize: "11px",
  color: "rgba(232,232,240,0.4)",
  whiteSpace: "nowrap",
};

const questionCard = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: "18px",
  padding: "32px",
  marginBottom: "20px",
};

const questionFeature = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  padding: "5px 12px",
  background: "rgba(29,185,84,0.1)",
  border: "1px solid rgba(29,185,84,0.2)",
  borderRadius: 999,
  marginBottom: "18px",
};

const featureDot = {
  width: 7,
  height: 7,
  borderRadius: "50%",
};

const featureLabel = {
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.12em",
  color: "#1db954",
};

const questionText = {
  fontFamily: "'DM Serif Display', serif",
  fontSize: "clamp(1.2rem, 2.5vw, 1.6rem)",
  lineHeight: 1.2,
  color: "#e8e8f0",
  marginBottom: "24px",
};

const optionsGrid = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};

const optionButton = {
  padding: "14px 18px",
  fontSize: "14px",
  color: "rgba(232,232,240,0.75)",
  background: "rgba(255,255,255,0.02)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "12px",
  cursor: "pointer",
  textAlign: "left",
  transition: "all 150ms ease",
  fontFamily: "'DM Sans', sans-serif",
};

const optionButtonSelected = {
  background: "rgba(29,185,84,0.08)",
  color: "#e8e8f0",
};

const backButton = {
  padding: "8px 16px",
  fontSize: "13px",
  color: "rgba(232,232,240,0.5)",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  fontFamily: "'DM Sans', sans-serif",
};

const methodologyNote = {
  fontSize: "12px",
  color: "rgba(232,232,240,0.38)",
  lineHeight: 1.65,
  marginBottom: "20px",
  borderTop: "1px solid rgba(255,255,255,0.06)",
  paddingTop: "16px",
};

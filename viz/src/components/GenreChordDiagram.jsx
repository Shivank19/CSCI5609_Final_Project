import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { normalizeLoudness } from "../utils/dataUtils";

const GENRE_NAMES = [
  "Pop",
  "Hip Hop / Rap",
  "Rock",
  "Metal",
  "Electronic",
  "Indie",
  "R&B / Soul",
  "Jazz",
  "Classical",
  "Country",
];

const CHORD_WIDTH = 720;
const CHORD_HEIGHT = 720;
const outerRadius = Math.min(CHORD_WIDTH, CHORD_HEIGHT) * 0.5 - 110;
const innerRadius = outerRadius - 20;
const STORY_CHORD_SIZE = 288;
const storyOuterRadius = STORY_CHORD_SIZE * 0.5 - 34;
const storyInnerRadius = storyOuterRadius - 18;

const color = d3.scaleOrdinal([
  "#f4a261",
  "#e63946",
  "#1db954",
  "#818cf8",
  "#22d3ee",
  "#fbbf24",
  "#f472b6",
  "#a78bfa",
  "#5b9ec9",
  "#34d399",
]);

const GENRE_STORY_PROFILES = {
  Pop: {
    identity: "big-hook pop instincts",
    energy: "polished and immediate",
    texture: "bright studio sheen",
  },
  "Hip Hop / Rap": {
    identity: "hip hop's rhythmic directness",
    energy: "punchy and grounded",
    texture: "beat-first tension",
  },
  Rock: {
    identity: "rock's guitar-led momentum",
    energy: "muscular and open-chested",
    texture: "band-room force",
  },
  Metal: {
    identity: "metal's hard-edged intensity",
    energy: "compressed and aggressive",
    texture: "distorted weight",
  },
  Electronic: {
    identity: "electronic precision",
    energy: "synthetic and driving",
    texture: "machine-shaped pulse",
  },
  Indie: {
    identity: "indie's intimate looseness",
    energy: "restless but reflective",
    texture: "handmade edges",
  },
  "R&B / Soul": {
    identity: "R&B and soul's emotional glide",
    energy: "smooth and bodily",
    texture: "velvet warmth",
  },
  Jazz: {
    identity: "jazz phrasing and elasticity",
    energy: "supple and exploratory",
    texture: "live-room air",
  },
  Classical: {
    identity: "classical structure",
    energy: "measured and spacious",
    texture: "orchestral space",
  },
  Country: {
    identity: "country storytelling",
    energy: "plainspoken and direct",
    texture: "wood-and-string clarity",
  },
};

const parseArrayString = (str) => {
  if (!str) return [];
  try {
    return JSON.parse(str.replace(/'/g, '"'));
  } catch (_error) {
    return [str.replace(/[[\]"']/g, "")];
  }
};

const normalizeName = (name) => {
  if (!name) return "";
  return name.replace(/[[\]"'`]/g, "").trim().toLowerCase();
};

const getMacroGenres = (microGenres) => {
  const macros = new Set();
  microGenres.forEach((genre) => {
    const lower = genre.toLowerCase();
    if (lower.includes("pop")) macros.add("Pop");
    if (lower.includes("hip hop") || lower.includes("rap") || lower.includes("trap")) {
      macros.add("Hip Hop / Rap");
    }
    if (lower.includes("rock")) macros.add("Rock");
    if (lower.includes("metal")) macros.add("Metal");
    if (
      lower.includes("electronic") ||
      lower.includes("edm") ||
      lower.includes("techno") ||
      lower.includes("house") ||
      lower.includes("step")
    ) {
      macros.add("Electronic");
    }
    if (lower.includes("indie")) macros.add("Indie");
    if (lower.includes("r&b") || lower.includes("soul") || lower.includes("blues")) {
      macros.add("R&B / Soul");
    }
    if (lower.includes("jazz")) macros.add("Jazz");
    if (
      lower.includes("classical") ||
      lower.includes("orchestra") ||
      lower.includes("show tunes") ||
      lower.includes("broadway")
    ) {
      macros.add("Classical");
    }
    if (lower.includes("country") || lower.includes("folk")) macros.add("Country");
  });
  return Array.from(macros);
};

function pairKey(a, b) {
  return [a, b].sort().join("|||");
}

function initMetricBucket(label) {
  return {
    label,
    count: 0,
    valence: 0,
    loudness: 0,
    acousticness: 0,
  };
}

function metricFromBucket(bucket) {
  if (!bucket || !bucket.count) {
    return {
      count: 0,
      valence: null,
      loudness: null,
      acousticness: null,
    };
  }

  return {
    count: bucket.count,
    valence: bucket.valence / bucket.count,
    loudness: bucket.loudness / bucket.count,
    acousticness: bucket.acousticness / bucket.count,
  };
}

function formatPct(value) {
  if (value == null || Number.isNaN(value)) return "n/a";
  return `${Math.round(value * 100)}%`;
}

function formatDelta(current, baseline, invert = false) {
  if (current == null || baseline == null) return "No baseline yet";
  const raw = current - baseline;
  const magnitude = Math.abs(Math.round(raw * 100));
  if (magnitude === 0) return "Holding steady";
  const positiveMeans = invert ? raw < 0 : raw > 0;
  return `${positiveMeans ? "+" : "-"}${magnitude} pts vs first decade`;
}

function profileForGenre(name) {
  return (
    GENRE_STORY_PROFILES[name] || {
      identity: `${name}'s musical identity`,
      energy: "distinctive in its own way",
      texture: "recognizable on contact",
    }
  );
}

function describeValence(value) {
  if (value == null) return "hard to read emotionally";
  if (value >= 0.68) return "openly bright";
  if (value >= 0.56) return "light on its feet";
  if (value >= 0.46) return "emotionally balanced";
  if (value >= 0.36) return "noticeably heavier";
  return "deep in the melancholy pocket";
}

function describeLoudness(value) {
  if (value == null) return "hard to place dynamically";
  if (value >= 0.7) return "pressed right to the front";
  if (value >= 0.58) return "firm and present";
  if (value >= 0.46) return "moderately pushed";
  return "surprisingly restrained";
}

function describeAcousticness(value) {
  if (value == null) return "texturally unclear";
  if (value >= 0.62) return "clearly organic";
  if (value >= 0.42) return "still holding some natural texture";
  if (value >= 0.22) return "mostly studio-built";
  return "almost fully synthetic in feel";
}

function describeBridgeStrength(rate) {
  if (rate >= 0.24) return "a real shared lane";
  if (rate >= 0.14) return "an active crossover channel";
  if (rate >= 0.07) return "a visible but selective bridge";
  if (rate > 0) return "more of a passing handshake";
  return "barely connected yet";
}

function compareMetric(shared, a, b, metric, labels) {
  if (shared == null || a == null || b == null) {
    return labels.middle;
  }

  const distA = Math.abs(shared - a);
  const distB = Math.abs(shared - b);
  const diff = Math.abs(distA - distB);

  if (diff < 0.035) return labels.middle;
  return distA < distB ? labels.a : labels.b;
}

function paradoxScore(shared) {
  if (!shared || shared.valence == null || shared.loudness == null || shared.acousticness == null) {
    return 0;
  }

  return (
    Math.max(0, 0.55 - shared.valence) * 2.2 +
    Math.max(0, shared.loudness - 0.56) * 1.8 +
    Math.max(0, 0.32 - shared.acousticness) * 2
  );
}

function describeParadox(shared) {
  const score = paradoxScore(shared);
  if (score >= 0.9) return "the sadness paradox is fully audible";
  if (score >= 0.55) return "the sadness paradox is clearly taking shape";
  if (score >= 0.28) return "the sadness paradox is starting to peek through";
  return "the sadness paradox is still faint here";
}

function makeStoryCopy(stat, previous, genreA, genreB, baseline) {
  const overlapDelta = previous ? stat.overlapCount - previous.overlapCount : 0;
  const sharedValence = stat.shared.valence;
  const sharedLoudness = stat.shared.loudness;
  const sharedAcousticness = stat.shared.acousticness;

  const profileA = profileForGenre(genreA);
  const profileB = profileForGenre(genreB);
  const bridgeStrength = describeBridgeStrength(stat.overlapRate);
  const moodPull = compareMetric(
    sharedValence,
    stat.genreAStats.valence,
    stat.genreBStats.valence,
    "valence",
    {
      a: `${genreA}'s emotional center`,
      b: `${genreB}'s emotional center`,
      middle: "a midpoint between the two moods",
    },
  );
  const loudnessPull = compareMetric(
    sharedLoudness,
    stat.genreAStats.loudness,
    stat.genreBStats.loudness,
    "loudness",
    {
      a: `${genreA}'s punch`,
      b: `${genreB}'s punch`,
      middle: "a shared dynamic level",
    },
  );
  const texturePull = compareMetric(
    sharedAcousticness,
    stat.genreAStats.acousticness,
    stat.genreBStats.acousticness,
    "acousticness",
    {
      a: `${genreA}'s texture`,
      b: `${genreB}'s texture`,
      middle: "a blended texture",
    },
  );

  let title = `${genreA} and ${genreB} are still circling each other.`;
  if (stat.overlapCount > 0 && overlapDelta > 20) {
    title = `${genreA} and ${genreB} suddenly start sharing real musical ground.`;
  } else if (stat.overlapCount > 0 && overlapDelta > 6) {
    title = `${genreA} starts borrowing more openly from ${genreB}, and vice versa.`;
  } else if (stat.overlapCount > 0 && overlapDelta < -12) {
    title = `${genreA} and ${genreB} stay linked, but the crossover cools for a decade.`;
  } else if (stat.overlapCount > 0 && stat.overlapRate >= 0.14) {
    title = `${genreA} and ${genreB} now share a recognizable crossover lane.`;
  } else if (stat.overlapCount > 0) {
    title = `${genreA} and ${genreB} keep trading ideas in selective ways.`;
  }

  const body = stat.overlapCount
    ? `In the ${stat.decade}s, ${genreA}'s ${profileA.identity} meets ${genreB}'s ${profileB.identity}. We found ${stat.overlapCount.toLocaleString()} shared tracks, which makes this connection feel like ${bridgeStrength} rather than a coincidence. The overlap sounds ${describeValence(sharedValence)}, ${describeLoudness(sharedLoudness)}, and ${describeAcousticness(sharedAcousticness)}. Emotionally it leans toward ${moodPull}, dynamically it lands closer to ${loudnessPull}, and texturally it feels nearest to ${texturePull}.`
    : `In the ${stat.decade}s, ${genreA} and ${genreB} are more adjacent than fused. ${genreA} reads as ${profileA.energy} while ${genreB} feels ${profileB.energy}, but the shared catalog is still too thin to form a stable hybrid. That distance matters because it makes any later convergence feel earned instead of automatic.`;

  const paradox = stat.overlapCount
    ? `This is the point where ${describeParadox(stat.shared)}. Compared with the first decade that produced real overlap, the shared tracks are ${formatDelta(sharedValence, baseline.shared.valence)} in valence, ${formatDelta(sharedLoudness, baseline.shared.loudness)} in loudness, and ${formatDelta(sharedAcousticness, baseline.shared.acousticness, true)} in acousticness. In plain terms, the blend is moving ${sharedValence != null && baseline.shared.valence != null && sharedValence < baseline.shared.valence ? "darker" : "lighter"}, ${sharedLoudness != null && baseline.shared.loudness != null && sharedLoudness > baseline.shared.loudness ? "louder" : "softer"}, and ${sharedAcousticness != null && baseline.shared.acousticness != null && sharedAcousticness < baseline.shared.acousticness ? "less acoustic" : "more acoustic"} than its own starting point.`
    : `The sadness paradox is still mostly outside the shared space here. You can already see the ingredients sitting in the separate scenes, but the overlap is too thin for the emotional drop, volume lift, and acoustic fade to register as one combined story yet.`;

  return { title, body, paradox };
}

function buildPairStory(decadeData, genreA, genreB) {
  const key = pairKey(genreA, genreB);
  const decades = Object.keys(decadeData)
    .map(Number)
    .filter((decade) => decade >= 1960 && decade <= 2020)
    .sort((a, b) => a - b);

  const story = decades.map((decade) => {
    const decadeEntry = decadeData[decade] || {
      genres: {},
      pairs: {},
      matrix: Array(10)
        .fill(0)
        .map(() => Array(10).fill(0)),
    };
    const genreAStats = metricFromBucket(decadeEntry.genres[genreA]);
    const genreBStats = metricFromBucket(decadeEntry.genres[genreB]);
    const sharedStats = metricFromBucket(decadeEntry.pairs[key]);
    const overlapRate =
      sharedStats.count && genreAStats.count && genreBStats.count
        ? sharedStats.count /
          Math.max(1, genreAStats.count + genreBStats.count - sharedStats.count)
        : 0;

    return {
      decade,
      genreAStats,
      genreBStats,
      shared: sharedStats,
      overlapCount: sharedStats.count,
      overlapRate,
      matrix: decadeEntry.matrix,
    };
  });

  const baseline = story.find((entry) => entry.shared.count > 0) || story[0];

  return story.map((entry, index) => {
    const copy = makeStoryCopy(entry, story[index - 1], genreA, genreB, baseline);
    return {
      ...entry,
      ...copy,
    };
  });
}

function GenrePairStoryViz({ storyData, activeIndex, genreA, genreB }) {
  const active = storyData[activeIndex];
  const bridgeStrength = Math.max(0.08, active.overlapRate);
  const selectedIndices = [GENRE_NAMES.indexOf(genreA), GENRE_NAMES.indexOf(genreB)];
  const selectedPairKey = pairKey(genreA, genreB);
  const storyChords = d3.chord().padAngle(0.045).sortSubgroups(d3.descending)(active.matrix);
  const storyArc = d3.arc().innerRadius(storyInnerRadius).outerRadius(storyOuterRadius);
  const storyRibbon = d3.ribbon().radius(storyInnerRadius);

  const groupOpacity = (index) => {
    if (selectedIndices.includes(index)) return 0.96;
    const connectedToSelected = storyChords.some(
      (chord) =>
        chord.source.value > 0 &&
        ((selectedIndices.includes(index) &&
          (selectedIndices.includes(chord.source.index) ||
            selectedIndices.includes(chord.target.index))) ||
          ((chord.source.index === index || chord.target.index === index) &&
            (selectedIndices.includes(chord.source.index) ||
              selectedIndices.includes(chord.target.index)))),
    );
    return connectedToSelected ? 0.32 : 0.12;
  };

  const ribbonStyle = (chord) => {
    const sourceName = GENRE_NAMES[chord.source.index];
    const targetName = GENRE_NAMES[chord.target.index];
    const chordKey = pairKey(sourceName, targetName);
    const touchesSelected =
      selectedIndices.includes(chord.source.index) || selectedIndices.includes(chord.target.index);
    const isPrimary = chordKey === selectedPairKey;

    return {
      fill: isPrimary
        ? "#f4a261"
        : touchesSelected
          ? "rgba(244,162,97,0.42)"
          : "rgba(255,255,255,0.06)",
      fillOpacity: isPrimary ? 0.9 : touchesSelected ? 0.52 : 0.16,
      stroke: isPrimary
        ? "#ffd1a8"
        : touchesSelected
          ? "rgba(244,162,97,0.42)"
          : "rgba(255,255,255,0.08)",
      strokeOpacity: isPrimary ? 1 : touchesSelected ? 0.5 : 0.14,
      strokeWidth: isPrimary ? 1.4 : 0.8,
    };
  };

  return (
    <div style={storyCard}>
      <div style={storyHeader}>
        <p style={storyEyebrow}>Selected pair</p>
        <div style={genreRow}>
          <span style={{ ...genreChip, borderColor: `${color(0)}33` }}>{genreA}</span>
          <span style={genreConnector}>×</span>
          <span style={{ ...genreChip, borderColor: `${color(1)}33` }}>{genreB}</span>
        </div>
        <p style={storySubhead}>
          Scroll through the decades to see when these genres start overlapping and how
          their shared songs drift toward the sadness paradox.
        </p>
      </div>

      <div style={storyChordCard}>
        <div style={timelineLabelRow}>
          <span style={timelineLabel}>Chord snapshot in the {active.decade}s</span>
          <span style={timelineValue}>{active.overlapCount.toLocaleString()} shared tracks</span>
        </div>
        <svg
          width={STORY_CHORD_SIZE}
          height={STORY_CHORD_SIZE}
          viewBox={`${-STORY_CHORD_SIZE / 2} ${-STORY_CHORD_SIZE / 2} ${STORY_CHORD_SIZE} ${STORY_CHORD_SIZE}`}
          style={{ alignSelf: "center", overflow: "visible" }}
        >
          <g>
            {storyChords.map((chord) => {
              const style = ribbonStyle(chord);
              const ribbonKey =
                chord.source.index < chord.target.index
                  ? `${chord.source.index}-${chord.target.index}`
                  : `${chord.target.index}-${chord.source.index}`;

              return (
                <path
                  key={`story-ribbon-${ribbonKey}`}
                  d={storyRibbon(chord)}
                  fill={style.fill}
                  fillOpacity={style.fillOpacity}
                  stroke={style.stroke}
                  strokeOpacity={style.strokeOpacity}
                  strokeWidth={style.strokeWidth}
                />
              );
            })}
          </g>
          <g>
            {storyChords.groups.map((group, index) => {
              const labelAngle = (group.startAngle + group.endAngle) / 2;
              const isSelected = selectedIndices.includes(index);
              const labelRadius = storyOuterRadius + 16;
              return (
                <g key={`story-group-${GENRE_NAMES[index]}`}>
                  <path
                    d={storyArc(group)}
                    fill={color(index)}
                    fillOpacity={groupOpacity(index)}
                    stroke={isSelected ? "#f4f4f8" : "rgba(255,255,255,0.18)"}
                    strokeOpacity={isSelected ? 0.72 : 0.2}
                    strokeWidth={isSelected ? 1.6 : 1}
                  />
                  <text
                    transform={`rotate(${(labelAngle * 180) / Math.PI - 90}) translate(${labelRadius}) ${
                      labelAngle > Math.PI ? "rotate(180)" : ""
                    }`}
                    textAnchor={labelAngle > Math.PI ? "end" : "start"}
                    dy="0.35em"
                    fill={isSelected ? "#f4f4f8" : "rgba(232,232,240,0.44)"}
                    fontSize={isSelected ? "11" : "10"}
                    fontWeight={isSelected ? 700 : 500}
                  >
                    {GENRE_NAMES[index]}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
        <p style={storyChordNote}>
          The selected pair stays bright so you can read how it sits inside the broader
          genre network for this decade. Everything else remains visible, but quieter.
        </p>
      </div>

      <div style={bridgeCard}>
        <div style={bridgeNode}>{genreA}</div>
        <div
          style={{
            ...bridgeLine,
            transform: `scaleX(${0.22 + bridgeStrength * 0.95})`,
            opacity: 0.28 + bridgeStrength * 1.25,
          }}
        />
        <div style={bridgeNode}>{genreB}</div>
      </div>

      <div style={metricGrid}>
        {[
          {
            label: "Shared valence",
            value: formatPct(active.shared.valence),
            note: formatDelta(active.shared.valence, storyData[0]?.shared.valence),
            color: "#f4a261",
          },
          {
            label: "Shared loudness",
            value: formatPct(active.shared.loudness),
            note: formatDelta(active.shared.loudness, storyData[0]?.shared.loudness),
            color: "#e9c46a",
          },
          {
            label: "Shared acousticness",
            value: formatPct(active.shared.acousticness),
            note: formatDelta(
              active.shared.acousticness,
              storyData[0]?.shared.acousticness,
              true,
            ),
            color: "#457b9d",
          },
        ].map((item) => (
          <div key={item.label} style={metricCard(item.color)}>
            <p style={metricLabel}>{item.label}</p>
            <p style={{ ...metricValue, color: item.color }}>{item.value}</p>
            <p style={metricNote}>{item.note}</p>
          </div>
        ))}
      </div>

      <div style={genreCompareRow}>
        {[{ label: genreA, stats: active.genreAStats }, { label: genreB, stats: active.genreBStats }].map(
          ({ label, stats }) => (
            <div key={label} style={genreCompareCard}>
              <p style={genreCompareTitle}>{label}</p>
              <p style={genreCompareText}>Valence {formatPct(stats.valence)}</p>
              <p style={genreCompareText}>Loudness {formatPct(stats.loudness)}</p>
              <p style={genreCompareText}>Acousticness {formatPct(stats.acousticness)}</p>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

function LegacyChordExplorer({
  chords,
  currentYear,
  yearRange,
  isPlaying,
  setIsPlaying,
  setCurrentYear,
  hoveredGroupIdx,
  setHoveredGroupIdx,
  hoveredRibbon,
  setHoveredRibbon,
}) {
  const arc = d3.arc().innerRadius(innerRadius).outerRadius(outerRadius);
  const ribbon = d3.ribbon().radius(innerRadius);

  const checkHighlight = (c) => {
    if (hoveredGroupIdx === null && hoveredRibbon === null) return true;
    if (hoveredGroupIdx !== null) {
      return c.source.index === hoveredGroupIdx || c.target.index === hoveredGroupIdx;
    }
    if (hoveredRibbon !== null) {
      return c.source.index === hoveredRibbon.s || c.target.index === hoveredRibbon.s ||
        c.source.index === hoveredRibbon.t || c.target.index === hoveredRibbon.t;
    }
    return false;
  };

  return (
    <>
      <div style={styles.filterBar}>
        <div style={{ ...styles.filterGroup, flex: 1, maxWidth: "600px", margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <label style={styles.label}>Timeline scrubber ({yearRange.min} - {yearRange.max})</label>
            <span style={styles.valueBadge}>{currentYear}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <button
              onClick={() => {
                if (!isPlaying && currentYear >= yearRange.max) {
                  setCurrentYear(yearRange.min);
                }
                setIsPlaying(!isPlaying);
              }}
              style={styles.playButton}
            >
              {isPlaying ? "Pause" : "Play"}
            </button>
            <input
              type="range"
              min={yearRange.min}
              max={yearRange.max}
              step="1"
              value={currentYear}
              onChange={(event) => {
                setIsPlaying(false);
                setCurrentYear(Number(event.target.value));
              }}
              style={styles.range}
            />
          </div>
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.infoPanel}>
          {hoveredRibbon ? (
            <div style={{ ...styles.statCard, borderColor: color(hoveredRibbon.s) }}>
              <span style={styles.genrePair}>
                {GENRE_NAMES[hoveredRibbon.s]} → {GENRE_NAMES[hoveredRibbon.t]}
              </span>
              <span style={styles.value}>
                <strong>{hoveredRibbon.value.toLocaleString()}</strong> crossover tracks
              </span>
            </div>
          ) : hoveredGroupIdx !== null ? (
            <div style={{ ...styles.statCard, borderColor: color(hoveredGroupIdx) }}>
              <span style={styles.genrePair}>
                Total crossovers for {GENRE_NAMES[hoveredGroupIdx]}
              </span>
              <span style={styles.value}>
                <strong>{Math.round(chords.groups[hoveredGroupIdx].value).toLocaleString()}</strong> tracks
              </span>
            </div>
          ) : (
            <div style={styles.instructions}>Hover over a bridge or genre to see overlap counts</div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "center" }}>
          {!chords ? (
            <div style={{ color: "var(--muted)", padding: "100px 0" }}>
              Not enough crossover data around {currentYear}.
            </div>
          ) : (
            <svg
              width={CHORD_WIDTH}
              height={CHORD_HEIGHT}
              viewBox={`${-CHORD_WIDTH / 2} ${-CHORD_HEIGHT / 2} ${CHORD_WIDTH} ${CHORD_HEIGHT}`}
            >
              <g className="ribbons">
                {chords.map((c) => {
                  const ribbonKey =
                    c.source.index < c.target.index
                      ? `${c.source.index}-${c.target.index}`
                      : `${c.target.index}-${c.source.index}`;

                  return (
                    <path
                      key={`ribbon-${ribbonKey}`}
                      d={ribbon(c)}
                      fill={color(c.source.index)}
                      fillOpacity={checkHighlight(c) ? 0.7 : 0.05}
                      stroke={d3.rgb(color(c.source.index)).darker(0.3)}
                      strokeOpacity={checkHighlight(c) ? 1 : 0.05}
                      onMouseEnter={() =>
                        setHoveredRibbon({
                          s: c.source.index,
                          t: c.target.index,
                          value: c.source.value,
                        })
                      }
                      onMouseLeave={() => setHoveredRibbon(null)}
                      style={{
                        transition:
                          "d 0.5s cubic-bezier(0.25, 1, 0.5, 1), fill-opacity 0.2s, stroke-opacity 0.2s",
                        cursor: "pointer",
                      }}
                    />
                  );
                })}
              </g>
              <g className="groups">
                {chords.groups.map((g, i) => (
                  <g key={`group-${i}`}>
                    <path
                      d={arc(g)}
                      fill={color(i)}
                      stroke={d3.rgb(color(i)).darker()}
                      onMouseEnter={() => setHoveredGroupIdx(i)}
                      onMouseLeave={() => setHoveredGroupIdx(null)}
                      style={{
                        cursor: "pointer",
                        transition:
                          "d 0.5s cubic-bezier(0.25, 1, 0.5, 1), filter 0.2s",
                      }}
                    />
                    <text
                      dy=".35em"
                      transform={`rotate(${((g.startAngle + g.endAngle) * 90) / Math.PI - 90}) translate(${outerRadius + 15}) ${
                        (g.startAngle + g.endAngle) / 2 > Math.PI
                          ? "rotate(180) translate(-30)"
                          : ""
                      }`}
                      textAnchor={(g.startAngle + g.endAngle) / 2 > Math.PI ? "end" : "start"}
                      style={{
                        fontSize: 12,
                        fill: hoveredGroupIdx === i ? "var(--text)" : "var(--muted)",
                        fontWeight: hoveredGroupIdx === i ? 800 : 600,
                        pointerEvents: "none",
                        transition:
                          "transform 0.5s cubic-bezier(0.25, 1, 0.5, 1), fill 0.2s",
                      }}
                    >
                      {GENRE_NAMES[i]}
                    </text>
                  </g>
                ))}
              </g>
            </svg>
          )}
        </div>
      </div>
    </>
  );
}

export default function GenreChordDiagram() {
  const [hoveredGroupIdx, setHoveredGroupIdx] = useState(null);
  const [hoveredRibbon, setHoveredRibbon] = useState(null);

  const [dataByYear, setDataByYear] = useState(null);
  const [decadeData, setDecadeData] = useState(null);
  const [yearRange, setYearRange] = useState({ min: 1960, max: 2020 });
  const [currentYear, setCurrentYear] = useState(2020);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

  const [selectedGenreA, setSelectedGenreA] = useState("Pop");
  const [selectedGenreB, setSelectedGenreB] = useState("Hip Hop / Rap");
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const stepRefs = useRef([]);

  useEffect(() => {
    Promise.all([
      d3.csv(`${process.env.PUBLIC_URL || ""}/spotify_clean.csv`),
      d3.csv(`${process.env.PUBLIC_URL || ""}/data_w_genres.csv`),
    ])
      .then(([tracksData, genresData]) => {
        const artistGenresMap = new Map();
        genresData.forEach((row) => {
          const parsedGenres = parseArrayString(row.genres);
          const macros = getMacroGenres(parsedGenres);
          if (macros.length > 0) {
            artistGenresMap.set(normalizeName(row.artists), macros);
          }
        });

        const processedYearData = {};
        const processedDecadeData = {};
        let minYear = Infinity;
        let maxYear = -Infinity;

        tracksData.forEach((track) => {
          const year = Number.parseInt(track.year, 10);
          if (Number.isNaN(year)) return;

          minYear = Math.min(minYear, year);
          maxYear = Math.max(maxYear, year);

          if (!processedYearData[year]) {
            processedYearData[year] = {
              matrix: Array(10)
                .fill(0)
                .map(() => Array(10).fill(0)),
            };
          }

          const decade = Math.floor(year / 10) * 10;
          if (!processedDecadeData[decade]) {
            processedDecadeData[decade] = {
              genres: {},
              pairs: {},
              matrix: Array(10)
                .fill(0)
                .map(() => Array(10).fill(0)),
            };
          }

          const trackArtists = parseArrayString(track.artists);
          const macroGenreSet = new Set();

          trackArtists.forEach((artist) => {
            const macros = artistGenresMap.get(normalizeName(artist));
            if (macros) macros.forEach((macro) => macroGenreSet.add(macro));
          });

          const uniqueMacros = Array.from(macroGenreSet);
          if (!uniqueMacros.length) return;

          uniqueMacros.forEach((macro) => {
            if (!processedDecadeData[decade].genres[macro]) {
              processedDecadeData[decade].genres[macro] = initMetricBucket(macro);
            }
            const bucket = processedDecadeData[decade].genres[macro];
            bucket.count += 1;
            bucket.valence += +track.valence || 0;
            bucket.loudness += normalizeLoudness(+track.loudness);
            bucket.acousticness += +track.acousticness || 0;
          });

          if (uniqueMacros.length > 1) {
            for (let i = 0; i < uniqueMacros.length; i += 1) {
              for (let j = i + 1; j < uniqueMacros.length; j += 1) {
                const genreA = uniqueMacros[i];
                const genreB = uniqueMacros[j];
                const idx1 = GENRE_NAMES.indexOf(genreA);
                const idx2 = GENRE_NAMES.indexOf(genreB);

                if (idx1 !== -1 && idx2 !== -1) {
                  processedYearData[year].matrix[idx1][idx2] += 1;
                  processedYearData[year].matrix[idx2][idx1] += 1;
                  processedDecadeData[decade].matrix[idx1][idx2] += 1;
                  processedDecadeData[decade].matrix[idx2][idx1] += 1;
                }

                const key = pairKey(genreA, genreB);
                if (!processedDecadeData[decade].pairs[key]) {
                  processedDecadeData[decade].pairs[key] = initMetricBucket(key);
                }
                const pairBucket = processedDecadeData[decade].pairs[key];
                pairBucket.count += 1;
                pairBucket.valence += +track.valence || 0;
                pairBucket.loudness += normalizeLoudness(+track.loudness);
                pairBucket.acousticness += +track.acousticness || 0;
              }
            }
          }
        });

        if (minYear === Infinity) minYear = 1960;
        if (maxYear === -Infinity) maxYear = 2020;

        setYearRange({ min: minYear, max: maxYear });
        setCurrentYear(maxYear);
        setDataByYear(processedYearData);
        setDecadeData(processedDecadeData);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error loading CSV data:", error);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentYear((previous) => {
          if (previous >= yearRange.max) return previous;
          return previous + 1;
        });
      }, 400);
    }
    return () => clearInterval(interval);
  }, [isPlaying, yearRange]);

  useEffect(() => {
    if (isPlaying && currentYear >= yearRange.max) {
      setIsPlaying(false);
    }
  }, [currentYear, isPlaying, yearRange.max]);

  const chords = useMemo(() => {
    if (!dataByYear) return null;

    const aggregatedMatrix = Array(10)
      .fill(0)
      .map(() => Array(10).fill(0));
    let hasData = false;

    for (let year = currentYear - 2; year <= currentYear + 2; year += 1) {
      if (dataByYear[year]) {
        for (let i = 0; i < 10; i += 1) {
          for (let j = 0; j < 10; j += 1) {
            aggregatedMatrix[i][j] += dataByYear[year].matrix[i][j];
            if (dataByYear[year].matrix[i][j] > 0) hasData = true;
          }
        }
      }
    }

    if (!hasData) return null;
    return d3.chord().padAngle(0.05).sortSubgroups(d3.descending)(aggregatedMatrix);
  }, [dataByYear, currentYear]);

  const pairStory = useMemo(
    () => (decadeData ? buildPairStory(decadeData, selectedGenreA, selectedGenreB) : []),
    [decadeData, selectedGenreA, selectedGenreB],
  );

  useEffect(() => {
    setActiveStoryIndex(0);
  }, [selectedGenreA, selectedGenreB]);

  useEffect(() => {
    if (!pairStory.length) return undefined;
    const observers = [];
    stepRefs.current.forEach((element, index) => {
      if (!element) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveStoryIndex(index);
        },
        {
          rootMargin: "-18% 0px -38% 0px",
          threshold: 0.18,
        },
      );
      observer.observe(element);
      observers.push(observer);
    });
    return () => observers.forEach((observer) => observer.disconnect());
  }, [pairStory.length]);

  if (loading) {
    return (
      <section style={styles.section}>
        <div className="container" style={{ textAlign: "center", padding: "100px 0" }}>
          <h2 style={{ color: "var(--accent)" }}>Mapping genre relationships...</h2>
          <p style={{ color: "var(--muted)" }}>
            Building crossover data across artists, decades, and emotional traits.
          </p>
        </div>
      </section>
    );
  }

  const handleGenreAChange = (value) => {
    if (value === selectedGenreB) {
      const fallback = GENRE_NAMES.find((name) => name !== value) || selectedGenreB;
      setSelectedGenreB(fallback);
    }
    setSelectedGenreA(value);
  };

  const handleGenreBChange = (value) => {
    if (value === selectedGenreA) {
      const fallback = GENRE_NAMES.find((name) => name !== value) || selectedGenreA;
      setSelectedGenreA(fallback);
    }
    setSelectedGenreB(value);
  };

  return (
    <section style={styles.section}>
      <div className="container">
        <p className="section-label">Genre Connections</p>
        <h2 className="section-title">
          Before the full network,
          <br />
          <em>follow one genre relationship through time.</em>
        </h2>
        <p className="section-body" style={{ marginBottom: "28px" }}>
          Pick two genres and scroll decade by decade. This first view zooms in on
          how one relationship evolves, when the two scenes actually start sharing
          tracks, and how that shared space moves toward the sadness paradox of lower
          valence, higher loudness, and lower acousticness.
        </p>

        <div style={storyControlBar}>
          <div style={storyFilterGroup}>
            <label style={styles.label}>Genre one</label>
            <select
              value={selectedGenreA}
              onChange={(event) => handleGenreAChange(event.target.value)}
              style={storySelect}
            >
              {GENRE_NAMES.map((name) => (
                <option key={`a-${name}`} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div style={storyFilterGroup}>
            <label style={styles.label}>Genre two</label>
            <select
              value={selectedGenreB}
              onChange={(event) => handleGenreBChange(event.target.value)}
              style={storySelect}
            >
              {GENRE_NAMES.map((name) => (
                <option key={`b-${name}`} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {pairStory.length > 0 && (
          <div style={storyScrollWrap}>
            <div style={storyTextPane}>
              {pairStory.map((step, index) => (
                <article
                  key={step.decade}
                  ref={(element) => {
                    stepRefs.current[index] = element;
                  }}
                  style={{
                    ...storyStep,
                    opacity: activeStoryIndex === index ? 1 : 0.28,
                    transform:
                      activeStoryIndex === index ? "translateY(0)" : "translateY(14px)",
                    transition: "opacity 320ms ease, transform 320ms ease",
                  }}
                >
                  <div style={storyStepPill}>
                    {step.decade}s
                  </div>
                  <h3 style={storyStepTitle}>{step.title}</h3>
                  <p style={storyStepBody}>{step.body}</p>
                  <p style={storyStepParadox}>{step.paradox}</p>
                </article>
              ))}
            </div>

            <div style={storyStickyPane}>
              <GenrePairStoryViz
                storyData={pairStory}
                activeIndex={activeStoryIndex}
                genreA={selectedGenreA}
                genreB={selectedGenreB}
              />
            </div>
          </div>
        )}

        <div style={{ marginTop: "110px" }}>
          <p className="section-label" style={{ marginBottom: "12px" }}>
            Full Genre Network
          </p>
          <h2 className="section-title">
            Then zoom back out
            <br />
            <em>to the whole crossover map.</em>
          </h2>
          <p className="section-body" style={{ marginBottom: "40px" }}>
            The focused scrollytelling view above shows one relationship in motion.
            The original chord diagram below keeps the broader network intact so you
            can see how genre boundaries dissolve across the full ecosystem.
          </p>

          <LegacyChordExplorer
            chords={chords}
            currentYear={currentYear}
            yearRange={yearRange}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            setCurrentYear={setCurrentYear}
            hoveredGroupIdx={hoveredGroupIdx}
            setHoveredGroupIdx={setHoveredGroupIdx}
            hoveredRibbon={hoveredRibbon}
            setHoveredRibbon={setHoveredRibbon}
          />
        </div>
      </div>
    </section>
  );
}

const storyControlBar = {
  display: "flex",
  gap: "18px",
  flexWrap: "wrap",
  marginBottom: "28px",
};

const storyFilterGroup = {
  minWidth: "220px",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const storySelect = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "12px",
  color: "var(--text)",
  padding: "12px 14px",
  fontSize: "14px",
};

const storyScrollWrap = {
  display: "grid",
  gridTemplateColumns: "0.9fr 1.1fr",
  gap: "44px",
  alignItems: "start",
};

const storyTextPane = {
  display: "flex",
  flexDirection: "column",
  gap: "74vh",
  paddingTop: "12vh",
  paddingBottom: "28vh",
};

const storyStep = {
  minHeight: "52vh",
};

const storyStepPill = {
  display: "inline-flex",
  alignItems: "center",
  padding: "5px 12px",
  borderRadius: "999px",
  background: "rgba(244,162,97,0.12)",
  border: "1px solid rgba(244,162,97,0.24)",
  color: "#f4a261",
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.12em",
  marginBottom: "16px",
  textTransform: "uppercase",
};

const storyStepTitle = {
  fontFamily: "'DM Serif Display', serif",
  fontSize: "clamp(1.5rem, 2.4vw, 2.2rem)",
  lineHeight: 1.14,
  color: "#f4f4f8",
  marginBottom: "14px",
};

const storyStepBody = {
  color: "rgba(232,232,240,0.74)",
  fontSize: "0.98rem",
  lineHeight: 1.8,
  marginBottom: "16px",
};

const storyStepParadox = {
  color: "rgba(255,255,255,0.92)",
  fontSize: "0.96rem",
  lineHeight: 1.7,
};

const storyStickyPane = {
  position: "sticky",
  top: "12vh",
  height: "74vh",
};

const storyCard = {
  height: "100%",
  borderRadius: "20px",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.03)",
  padding: "18px",
  display: "flex",
  flexDirection: "column",
  gap: "14px",
  overflowY: "auto",
};

const storyHeader = {
  paddingBottom: "12px",
  borderBottom: "1px solid rgba(255,255,255,0.07)",
};

const storyEyebrow = {
  fontSize: "10px",
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "rgba(232,232,240,0.38)",
  fontWeight: 700,
  marginBottom: "8px",
};

const genreRow = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  marginBottom: "10px",
  flexWrap: "wrap",
};

const genreChip = {
  padding: "7px 12px",
  borderRadius: "999px",
  border: "1px solid rgba(255,255,255,0.14)",
  color: "#f4f4f8",
  fontSize: "12px",
  fontWeight: 600,
  background: "rgba(255,255,255,0.03)",
};

const genreConnector = {
  color: "rgba(232,232,240,0.46)",
  fontSize: "14px",
};

const storySubhead = {
  color: "rgba(232,232,240,0.64)",
  fontSize: "0.88rem",
  lineHeight: 1.58,
};

const storyChordCard = {
  padding: "12px",
  borderRadius: "16px",
  background: "rgba(255,255,255,0.025)",
  border: "1px solid rgba(255,255,255,0.06)",
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};

const timelineLabelRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "10px",
};

const timelineLabel = {
  color: "rgba(232,232,240,0.5)",
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const timelineValue = {
  color: "#f4a261",
  fontWeight: 700,
  fontSize: "12px",
};

const storyChordNote = {
  color: "rgba(232,232,240,0.58)",
  fontSize: "0.76rem",
  lineHeight: 1.45,
};

const bridgeCard = {
  display: "grid",
  gridTemplateColumns: "1fr 1.1fr 1fr",
  gap: "10px",
  alignItems: "center",
  padding: "12px 14px",
  borderRadius: "16px",
  border: "1px solid rgba(255,255,255,0.06)",
  background: "rgba(255,255,255,0.025)",
};

const bridgeNode = {
  padding: "10px 8px",
  borderRadius: "14px",
  background: "rgba(255,255,255,0.04)",
  textAlign: "center",
  color: "#f4f4f8",
  fontSize: "11px",
  fontWeight: 600,
};

const bridgeLine = {
  height: "6px",
  borderRadius: "999px",
  background: "linear-gradient(90deg, rgba(244,162,97,0.18), rgba(230,57,70,0.95), rgba(29,185,84,0.18))",
  transformOrigin: "center",
  transition: "transform 320ms ease, opacity 320ms ease",
};

const metricGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "10px",
};

const metricCard = (accent) => ({
  padding: "11px 10px",
  borderRadius: "14px",
  background: `${accent}12`,
  border: `1px solid ${accent}24`,
});

const metricLabel = {
  color: "rgba(232,232,240,0.48)",
  fontSize: "10px",
  lineHeight: 1.4,
  marginBottom: "4px",
};

const metricValue = {
  fontSize: "0.98rem",
  fontWeight: 700,
  marginBottom: "4px",
};

const metricNote = {
  color: "rgba(232,232,240,0.6)",
  fontSize: "0.72rem",
  lineHeight: 1.4,
};

const genreCompareRow = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
  marginTop: "auto",
};

const genreCompareCard = {
  padding: "12px",
  borderRadius: "14px",
  border: "1px solid rgba(255,255,255,0.06)",
  background: "rgba(255,255,255,0.025)",
};

const genreCompareTitle = {
  color: "#f4f4f8",
  fontWeight: 700,
  fontSize: "0.84rem",
  marginBottom: "6px",
};

const genreCompareText = {
  color: "rgba(232,232,240,0.62)",
  fontSize: "0.76rem",
  lineHeight: 1.45,
};

const styles = {
  section: {
    padding: "100px 0",
    background: "linear-gradient(180deg, var(--bg) 0%, var(--bg2) 100%)",
  },
  filterBar: {
    display: "flex",
    gap: "40px",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid var(--border)",
    borderRadius: "12px",
    padding: "24px",
    marginBottom: "24px",
    alignItems: "flex-end",
    flexWrap: "wrap",
  },
  filterGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    minWidth: "200px",
  },
  label: {
    fontSize: "11px",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "var(--muted)",
    fontWeight: 600,
  },
  range: {
    flexGrow: 1,
    accentColor: "var(--accent)",
    cursor: "pointer",
  },
  valueBadge: {
    fontSize: "14px",
    color: "var(--accent)",
    fontWeight: "bold",
  },
  playButton: {
    background: "var(--accent)",
    color: "var(--bg)",
    border: "none",
    padding: "8px 16px",
    borderRadius: "20px",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "background 0.2s",
    minWidth: "95px",
  },
  card: {
    background: "rgba(255,255,255,0.02)",
    border: "1px solid var(--border)",
    borderRadius: "16px",
    padding: "20px",
    position: "relative",
    display: "flex",
    flexDirection: "column",
  },
  infoPanel: {
    height: "90px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    marginBottom: "1rem",
  },
  statCard: {
    background: "rgba(255,255,255,0.03)",
    padding: "1rem 2rem",
    borderRadius: "12px",
    borderTop: "5px solid",
    boxShadow: "0 8px 20px rgba(0,0,0,0.3)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    minWidth: "300px",
    animation: "slideUp 0.2s ease-out",
  },
  genrePair: {
    fontSize: "0.75rem",
    textTransform: "uppercase",
    fontWeight: 700,
    letterSpacing: "1.2px",
    color: "var(--muted)",
    marginBottom: "5px",
  },
  value: {
    fontSize: "1.25rem",
    color: "var(--text)",
  },
  instructions: {
    color: "var(--muted)",
    fontStyle: "italic",
    fontSize: "0.95rem",
  },
};

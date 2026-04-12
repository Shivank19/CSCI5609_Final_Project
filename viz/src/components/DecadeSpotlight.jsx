import React, { useState, useMemo, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useInView } from '../hooks/useScrollProgress';
import { normalizeLoudness } from '../utils/dataUtils';

// ── Per-decade narrative + song data ─────────────────────────────────────────
const DECADE_DATA = {
  1960: {
    note: 'Cultural upheaval. Protest songs and psychedelia pushed valence down, but acoustic richness stayed high.',
    song: 'Respect', artist: 'Aretha Franklin',
    groove: '#c77dff', label: '1960s',
  },
  1970: {
    note: 'Peak warmth decade. Acoustic scores at their highest. Even when valence dipped, music felt embracing.',
    song: 'Superstition', artist: 'Stevie Wonder',
    groove: '#7b2d8b', label: '1970s',
  },
  1980: {
    note: 'Synthesizers arrived. Acousticness collapsed, but loudness rose and danceability surged — energy replaced intimacy.',
    song: 'With or Without You', artist: 'U2',
    groove: '#4361ee', label: '1980s',
  },
  1990: {
    note: 'Grunge and hip-hop pulled valence lower. Electronic production widened the gap between signal sadness and felt intensity.',
    song: 'Smells Like Teen Spirit', artist: 'Nirvana',
    groove: '#457b9d', label: '1990s',
  },
  2000: {
    note: 'The loudness wars peaked. Music was mastered hot and aggressive. The paradox gap widened.',
    song: 'Crazy in Love', artist: 'Beyoncé',
    groove: '#2a9d8f', label: '2000s',
  },
  2010: {
    note: 'Streaming era. Algorithmic promotion favoured mellow-sad aesthetics. Valence hit its modern low, yet streams soared.',
    song: 'Blinding Lights', artist: 'The Weeknd',
    groove: '#1db954', label: '2010s',
  },
  2020: {
    note: 'Pandemic music. A small valence recovery but acoustic warmth remained low. Danceability stayed high — sad but compelling.',
    song: 'Drivers License', artist: 'Olivia Rodrigo',
    groove: '#52b788', label: '2020s',
  },
};

const DECADES = Object.keys(DECADE_DATA).map(Number).sort((a, b) => a - b);

// ── Vinyl record SVG ─────────────────────────────────────────────────────────
function VinylRecord({ decade, isActive, onClick, size = 80 }) {
  const info = DECADE_DATA[decade];
  const groove = info.groove;
  const spinRef = useRef(null);
  const animRef = useRef(null);
  const angleRef = useRef(0);

  useEffect(() => {
    if (!spinRef.current) return;
    if (isActive) {
      const spin = () => {
        angleRef.current += 0.4;
        if (spinRef.current) spinRef.current.style.transform = `rotate(${angleRef.current}deg)`;
        animRef.current = requestAnimationFrame(spin);
      };
      animRef.current = requestAnimationFrame(spin);
    } else {
      cancelAnimationFrame(animRef.current);
    }
    return () => cancelAnimationFrame(animRef.current);
  }, [isActive]);

  const r = size / 2;
  const grooves = [0.88, 0.80, 0.72, 0.64, 0.56, 0.48, 0.40];

  return (
    <div
      onClick={onClick}
      style={{
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        transition: 'transform 0.25s ease',
        transform: isActive ? 'translateY(-8px)' : 'translateY(0)',
      }}
    >
      <svg
        ref={spinRef}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ display: 'block' }}
      >
        {/* Outer record body */}
        <circle cx={r} cy={r} r={r - 1} fill="#111" stroke={groove} strokeWidth={isActive ? 1.5 : 0.5} />

        {/* Groove rings */}
        {grooves.map((ratio, i) => (
          <circle
            key={i}
            cx={r} cy={r}
            r={(r - 2) * ratio}
            fill="none"
            stroke={groove}
            strokeWidth={0.4}
            opacity={0.25 + i * 0.05}
          />
        ))}

        {/* Label area */}
        <circle cx={r} cy={r} r={r * 0.28} fill={groove} opacity={0.9} />
        <circle cx={r} cy={r} r={r * 0.28} fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth={0.5} />

        {/* Center hole */}
        <circle cx={r} cy={r} r={r * 0.06} fill="#0a0a0f" />

        {/* Decade text on label */}
        <text
  x={r} y={r + 1}
  textAnchor="middle"
  dominantBaseline="central"
  fill="#ffffff"
  fontSize={size * 0.13}
  fontWeight="700"
  fontFamily="'DM Sans', sans-serif"
  stroke="rgba(0,0,0,0.3)"
  strokeWidth={0.4}
>
  {decade}s
</text>
      </svg>

      {/* Active indicator dot */}
      <div style={{
        width: 4, height: 4,
        borderRadius: '50%',
        background: isActive ? groove : 'transparent',
        transition: 'background 0.2s',
      }} />
    </div>
  );
}

// ── Stat bar ─────────────────────────────────────────────────────────────────
function StatBar({ label, value, color }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 44px', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 12, color: 'rgba(232,232,240,0.5)', textAlign: 'right' }}>{label}</span>
      <div style={{ height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 3,
          background: color,
          width: `${value * 100}%`,
          transition: 'width 0.6s ease',
        }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color, textAlign: 'right' }}>
        {(value * 100).toFixed(1)}%
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function DecadeSpotlight({ data, popularity, genre }) {
  const [ref, inView] = useInView({ threshold: 0.08 });
  const [activeDecade, setActiveDecade] = useState(1970);

  const decadeStats = useMemo(() => {
    if (!data || !data.length) return {};
    let filtered = data;
    if (popularity > 0) filtered = filtered.filter(d => +d.popularity >= popularity);
    if (genre && genre !== 'All') filtered = filtered.filter(d =>
      d.genre_list && d.genre_list.toLowerCase().includes(genre.toLowerCase())
    );

    const byDecade = d3.rollup(
      filtered,
      rows => ({
        valence: d3.mean(rows, r => r.valence),
        acousticness: d3.mean(rows, r => r.acousticness),
        loudness_norm: d3.mean(rows, r => normalizeLoudness(r.loudness)),
        danceability: d3.mean(rows, r => r.danceability),
        energy: d3.mean(rows, r => r.energy),
        count: rows.length,
      }),
      d => +d.decade
    );

    const result = {};
    byDecade.forEach((v, k) => { result[k] = v; });
    return result;
  }, [data, popularity, genre]);

  const active = decadeStats[activeDecade];
  const info = DECADE_DATA[activeDecade];

  return (
    <section ref={ref} style={styles.section}>
      <div className="container">
        <p className="section-label" style={{ color: '#e9c46a' }}>Decade Spotlight</p>
        <h2 className="section-title" style={{ color: '#e8e8f0', marginBottom: 16 }}>
          Pick a Decade,<br /><em>Hear Its Story</em>
        </h2>
        <p className="section-body" style={{ marginBottom: 40 }}>
          Every era had its own emotional signature. Click a record to spin it open.
        </p>

        {/* Vinyl strip */}
        <div style={styles.vinylStrip}>
          {DECADES.map(d => (
            <VinylRecord
              key={d}
              decade={d}
              isActive={d === activeDecade}
              onClick={() => setActiveDecade(d)}
              size={120}
            />
          ))}
        </div>

        {/* Detail panel */}
        {active && info && (
          <div style={{ ...styles.detailPanel, borderColor: `${info.groove}33` }} key={activeDecade}>
            {/* Left: narrative */}
            <div style={styles.detailLeft}>
              <div style={styles.decadeHeading}>
                <span style={{ ...styles.decadeLabel, color: info.groove }}>{info.label}</span>
              </div>
              <p style={styles.noteText}>{info.note}</p>

              {/* Representative song */}
              <div style={{ ...styles.songCard, borderColor: `${info.groove}33`, background: `${info.groove}10` }}>
                <div style={styles.songDisc}>
                  <svg width={36} height={36} viewBox="0 0 36 36">
                    <circle cx={18} cy={18} r={17} fill="#111" stroke={info.groove} strokeWidth={1} />
                    {[0.82, 0.68, 0.54].map((r, i) => (
                      <circle key={i} cx={18} cy={18} r={17 * r} fill="none"
                        stroke={info.groove} strokeWidth={0.4} opacity={0.3} />
                    ))}
                    <circle cx={18} cy={18} r={6} fill={info.groove} opacity={0.85} />
                    <circle cx={18} cy={18} r={2.5} fill="#0a0a0f" />
                  </svg>
                </div>
                <div>
                  <p style={styles.songTitle}>{info.song}</p>
                  <p style={styles.songArtist}>{info.artist}</p>
                </div>
              </div>
            </div>

            {/* Right: stats */}
            <div style={styles.detailRight}>
              <p style={styles.statsHeading}>Audio profile</p>
              <div style={styles.statsList}>
                <StatBar label="Valence" value={active.valence} color="#f4a261" />
                <StatBar label="Danceability" value={active.danceability} color="#1db954" />
                <StatBar label="Loudness" value={active.loudness_norm} color="#e9c46a" />
                <StatBar label="Acousticness" value={active.acousticness} color="#457b9d" />
                <StatBar label="Energy" value={active.energy} color="#e63946" />
              </div>
              <p style={styles.countNote}>{active.count?.toLocaleString()} tracks analysed</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  section: {
    padding: '100px 0',
    background: 'linear-gradient(180deg, var(--bg) 0%, var(--bg2) 100%)',
  },
  vinylStrip: {
    display: 'flex',
    gap: 16,
    overflowX: 'auto',
    paddingBottom: 16,
    paddingTop: 8,
    marginBottom: 32,
    scrollbarWidth: 'thin',
    scrollbarColor: 'rgba(255,255,255,0.1) transparent',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  detailPanel: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 32,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid',
    borderRadius: 16,
    padding: 32,
    animation: 'fadeUp 0.35s ease both',
  },
  detailLeft: {
    borderRight: '1px solid rgba(255,255,255,0.07)',
    paddingRight: 32,
  },
  decadeHeading: {
    marginBottom: 12,
  },
  decadeLabel: {
    fontFamily: "'DM Serif Display', serif",
    fontSize: '2.4rem',
    lineHeight: 1,
  },
  noteText: {
    fontSize: 13,
    color: 'rgba(232,232,240,0.55)',
    lineHeight: 1.8,
    marginBottom: 20,
  },
  songCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '14px 16px',
    border: '1px solid',
    borderRadius: 12,
  },
  songDisc: {
    flexShrink: 0,
  },
  songTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#e8e8f0',
    marginBottom: 2,
  },
  songArtist: {
    fontSize: 12,
    color: 'rgba(232,232,240,0.45)',
  },
  detailRight: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 14,
  },
  statsHeading: {
    fontSize: 10,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: 'rgba(232,232,240,0.3)',
    fontWeight: 600,
    marginBottom: 4,
  },
  statsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  countNote: {
    fontSize: 11,
    color: 'rgba(232,232,240,0.2)',
    marginTop: 8,
  },
};
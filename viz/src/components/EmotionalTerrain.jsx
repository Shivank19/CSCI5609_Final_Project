import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { useInView } from '../hooks/useScrollProgress';
import { normalizeLoudness } from '../utils/dataUtils';

// ── Decade context ────────────────────────────────────────────────────────────
const DECADE_CONTEXT = {
  1960: 'Cultural upheaval. Protest songs and psychedelia pushed valence down, but acoustic richness stayed high.',
  1970: 'Peak warmth decade. Acoustic scores at their highest. Even when valence dipped, music felt embracing.',
  1980: 'Synthesizers arrived. Acousticness collapsed, loudness rose, danceability surged — energy replaced intimacy.',
  1990: 'Grunge and hip-hop pulled valence lower. Electronic production widened the signal-vs-felt gap.',
  2000: 'The loudness wars peaked. Mastered hot and aggressive. The paradox gap widened.',
  2010: 'Streaming era. Algorithmic promotion favoured mellow-sad aesthetics. Valence hit its modern low.',
  2020: 'Pandemic music. Small valence recovery. Danceability high — sad but still compelling.',
};

const AXES = [
  { key: 'valence',       label: 'Valence',       color: '#f4a261' },
  { key: 'danceability',  label: 'Danceability',  color: '#1db954' },
  { key: 'energy',        label: 'Energy',        color: '#e63946' },
  { key: 'loudness_norm', label: 'Loudness',       color: '#e9c46a' },
  { key: 'acousticness',  label: 'Acousticness',  color: '#457b9d' },
];

const N = AXES.length;
const DECADE_COLORS = {
  1960: '#F59E0B', 1970: '#FBBF24', 1980: '#C084FC',
  1990: '#818CF8', 2000: '#60A5FA', 2010: '#457b9d', 2020: '#22D3EE',
};

// ── Radar draw ────────────────────────────────────────────────────────────────
function drawRadar(svgEl, primary, compare, hoveredAxis) {
  const size   = Math.min(svgEl.clientWidth, 420);
  const cx     = size / 2;
  const cy     = size / 2;
  const radius = size * 0.36;

  d3.select(svgEl).selectAll('*').remove();
  d3.select(svgEl).attr('viewBox', `0 0 ${size} ${size}`);

  const svg = d3.select(svgEl);

  // Angle for each axis (start from top, go clockwise)
  const angle = i => (i / N) * 2 * Math.PI - Math.PI / 2;

  // Point on the radar for a given axis index and value
  const point = (i, val) => ({
    x: cx + radius * val * Math.cos(angle(i)),
    y: cy + radius * val * Math.sin(angle(i)),
  });

  // ── Background rings ──
  [0.25, 0.5, 0.75, 1.0].forEach(r => {
    const pts = AXES.map((_, i) => point(i, r));
    svg.append('polygon')
      .attr('points', pts.map(p => `${p.x},${p.y}`).join(' '))
      .attr('fill', 'none')
      .attr('stroke', r === 1.0 ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)')
      .attr('stroke-width', r === 1.0 ? 1 : 0.5);

    // Ring label at top axis
    if (r < 1.0) {
      svg.append('text')
        .attr('x', cx + 4)
        .attr('y', cy - radius * r - 3)
        .attr('fill', 'rgba(232,232,240,0.2)')
        .attr('font-size', '9px')
        .attr('font-family', "'DM Sans', sans-serif")
        .text(`${Math.round(r * 100)}%`);
    }
  });

  // ── Axis spokes ──
  AXES.forEach((axis, i) => {
    const outer = point(i, 1);
    const isHovered = hoveredAxis === axis.key;

    svg.append('line')
      .attr('x1', cx).attr('y1', cy)
      .attr('x2', outer.x).attr('y2', outer.y)
      .attr('stroke', isHovered ? axis.color : 'rgba(255,255,255,0.08)')
      .attr('stroke-width', isHovered ? 1.5 : 0.5);
  });

  // ── Compare shape (rendered behind primary) ──
  if (compare) {
    const comparePts = AXES.map((axis, i) => point(i, compare[axis.key] ?? 0));
    const compareCol = DECADE_COLORS[compare.decade] ?? '#888';
    svg.append('polygon')
      .attr('points', comparePts.map(p => `${p.x},${p.y}`).join(' '))
      .attr('fill', compareCol)
      .attr('fill-opacity', 0.08)
      .attr('stroke', compareCol)
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.45)
      .attr('stroke-dasharray', '4,3');
  }

  // ── Primary shape ──
  if (primary) {
    const primaryPts = AXES.map((axis, i) => point(i, primary[axis.key] ?? 0));
    const primaryCol = DECADE_COLORS[primary.decade] ?? '#f4a261';

    // Filled area
    svg.append('polygon')
      .attr('points', primaryPts.map(p => `${p.x},${p.y}`).join(' '))
      .attr('fill', primaryCol)
      .attr('fill-opacity', 0.15)
      .attr('stroke', primaryCol)
      .attr('stroke-width', 2)
      .attr('stroke-linejoin', 'round');

    // Vertex dots
    AXES.forEach((axis, i) => {
      const p = point(i, primary[axis.key] ?? 0);
      const isHovered = hoveredAxis === axis.key;
      svg.append('circle')
        .attr('cx', p.x).attr('cy', p.y)
        .attr('r', isHovered ? 6 : 4)
        .attr('fill', isHovered ? axis.color : primaryCol)
        .attr('stroke', '#0a0a0f')
        .attr('stroke-width', 1.5);
    });
  }

  // ── Axis labels ──
  AXES.forEach((axis, i) => {
    const labelRadius = radius * 1.18;
    const lx = cx + labelRadius * Math.cos(angle(i));
    const ly = cy + labelRadius * Math.sin(angle(i));
    const isHovered = hoveredAxis === axis.key;

    // Anchor logic: left side = end, right = start, top/bottom = middle
    const a = angle(i);
    const anchor = Math.abs(Math.cos(a)) < 0.2 ? 'middle'
      : Math.cos(a) > 0 ? 'start' : 'end';

    // Value bubble when hovered
    if (isHovered && primary) {
      const val = primary[axis.key] ?? 0;
      const bx  = cx + (radius * 0.56) * Math.cos(angle(i));
      const by  = cy + (radius * 0.56) * Math.sin(angle(i));
      svg.append('rect')
        .attr('x', bx - 18).attr('y', by - 9)
        .attr('width', 36).attr('height', 18).attr('rx', 4)
        .attr('fill', axis.color).attr('fill-opacity', 0.18)
        .attr('stroke', axis.color).attr('stroke-width', 0.5);
      svg.append('text')
        .attr('x', bx).attr('y', by + 1)
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
        .attr('fill', axis.color).attr('font-size', '10px').attr('font-weight', '600')
        .attr('font-family', "'DM Sans', sans-serif")
        .text(`${(val * 100).toFixed(0)}%`);
    }

    svg.append('text')
      .attr('x', lx).attr('y', ly)
      .attr('text-anchor', anchor)
      .attr('dominant-baseline', 'central')
      .attr('fill', isHovered ? axis.color : 'rgba(232,232,240,0.5)')
      .attr('font-size', isHovered ? '12px' : '11px')
      .attr('font-weight', isHovered ? '600' : '400')
      .attr('font-family', "'DM Sans', sans-serif")
      .text(axis.label);
  });
}

// ── Stat bar ──────────────────────────────────────────────────────────────────
function StatBar({ label, value, color, compareValue }) {
  return (
    <div
      style={{ display: 'grid', gridTemplateColumns: '110px 1fr 44px', alignItems: 'center', gap: 10 }}
    >
      <span style={{ fontSize: 11, color: 'rgba(232,232,240,0.45)', textAlign: 'right' }}>{label}</span>
      <div style={{ height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
        {/* Compare bar (behind) */}
        {compareValue !== undefined && (
          <div style={{
            position: 'absolute', top: 0, left: 0,
            height: '100%', borderRadius: 3,
            background: 'rgba(255,255,255,0.15)',
            width: `${compareValue * 100}%`,
          }} />
        )}
        <div style={{
          height: '100%', borderRadius: 3, background: color,
          width: `${value * 100}%`, transition: 'width 0.6s ease',
          position: 'relative',
        }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color, textAlign: 'right' }}>
        {(value * 100).toFixed(1)}%
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function EmotionalTerrain({ data, popularity = 0, genre = 'All' }) {
  const [ref, inView] = useInView({ threshold: 0.05 });
  const svgRef = useRef(null);

  const [activeDecade, setActiveDecade]   = useState(1970);
  const [compareDecade, setCompareDecade] = useState(null);
  const [hoveredAxis, setHoveredAxis]     = useState(null);

  // ── Aggregate ──────────────────────────────────────────────────────────────
  const decadeData = useMemo(() => {
    if (!data || !data.length) return [];
    let filtered = data;
    if (popularity > 0) filtered = filtered.filter(d => +d.popularity >= popularity);
    if (genre && genre !== 'All') filtered = filtered.filter(d =>
      d.genre_list && d.genre_list.toLowerCase().includes(genre.toLowerCase())
    );
    const byDecade = d3.rollup(
      filtered,
      rows => {
        const valence       = d3.mean(rows, r => r.valence);
        const acousticness  = d3.mean(rows, r => r.acousticness);
        const loudness_norm = d3.mean(rows, r => normalizeLoudness(r.loudness));
        const danceability  = d3.mean(rows, r => r.danceability);
        const energy        = d3.mean(rows, r => r.energy);
        const warmth = acousticness * 0.55 + danceability * 0.45;
        return {
          decade: +rows[0].decade, label: rows[0].decade_label,
          valence, acousticness, loudness_norm, danceability, energy, warmth,
          count: rows.length,
        };
      },
      d => +d.decade
    );
    return Array.from(byDecade.values())
      .filter(d => d.decade >= 1960 && d.decade <= 2020)
      .sort((a, b) => a.decade - b.decade);
  }, [data, popularity, genre]);

  const activeParams  = decadeData.find(d => d.decade === activeDecade)  ?? null;
  const compareParams = decadeData.find(d => d.decade === compareDecade) ?? null;

  // ── Draw radar ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!svgRef.current || !activeParams || !inView) return;
    drawRadar(svgRef.current, activeParams, compareParams, hoveredAxis);
  }, [activeParams, compareParams, hoveredAxis, inView]);

  const paradoxGap = activeParams
    ? Math.max(0, activeParams.warmth - activeParams.valence)
    : 0;

  const decades = decadeData.map(d => d.decade);

  return (
    <section ref={ref} style={styles.section}>
      <div className="container">
        <p className="section-label" style={{ color: '#e63946' }}>Audio Fingerprint</p>
        <h2 className="section-title" style={{ color: '#e8e8f0', marginBottom: 16 }}>
          Each Decade's<br /><em>Sonic Shape</em>
        </h2>
        <p className="section-body" style={{ marginBottom: 32 }}>
          The radar shows five features at once — the shape of a decade's sound.
          The 1970s are wide and round; the 2000s are lopsided toward loudness and energy.
          Click a second decade to overlay and compare directly. Hover any axis label to inspect that feature.
        </p>

        <div style={styles.layout}>

          {/* ── Left: radar SVG ── */}
          <div style={styles.radarWrap}>
            <svg
              ref={svgRef}
              width="100%"
              style={{ display: 'block', maxWidth: 420, margin: '0 auto' }}
            />

            {/* Axis hover hit areas — rendered as invisible overlay buttons */}
            <div style={styles.axisHitWrap}>
              {AXES.map(axis => (
                <button
                  key={axis.key}
                  onMouseEnter={() => setHoveredAxis(axis.key)}
                  onMouseLeave={() => setHoveredAxis(null)}
                  style={{
                    ...styles.axisHitBtn,
                    color: hoveredAxis === axis.key ? axis.color : 'rgba(232,232,240,0.4)',
                    borderColor: hoveredAxis === axis.key ? axis.color : 'rgba(255,255,255,0.08)',
                    background: hoveredAxis === axis.key ? `${axis.color}15` : 'transparent',
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: axis.color, display: 'inline-block', flexShrink: 0 }} />
                  {axis.label}
                  {activeParams && (
                    <span style={{ marginLeft: 'auto', fontWeight: 600, color: axis.color }}>
                      {(activeParams[axis.key] * 100).toFixed(1)}%
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ── Right: controls + drill-down ── */}
          <div style={styles.rightCol}>

            {/* Decade selector — primary */}
            <div style={styles.controlBlock}>
              <p style={styles.controlLabel}>Primary decade</p>
              <div style={styles.decadeGrid}>
                {decades.map(d => {
                  const col = DECADE_COLORS[d] ?? '#888';
                  return (
                    <button
                      key={d}
                      onClick={() => setActiveDecade(d)}
                      style={{
                        ...styles.decadeChip,
                        background:   d === activeDecade ? col : 'rgba(255,255,255,0.04)',
                        borderColor:  d === activeDecade ? col : 'rgba(255,255,255,0.1)',
                        color:        d === activeDecade ? '#0a0a0f' : 'rgba(232,232,240,0.55)',
                        fontWeight:   d === activeDecade ? '700' : '400',
                      }}
                    >
                      {d}s
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Decade selector — compare */}
            <div style={styles.controlBlock}>
              <p style={styles.controlLabel}>
                Compare with
                {compareDecade && (
                  <button
                    onClick={() => setCompareDecade(null)}
                    style={styles.clearBtn}
                  >
                    ✕ clear
                  </button>
                )}
              </p>
              <div style={styles.decadeGrid}>
                {decades.filter(d => d !== activeDecade).map(d => {
                  const col = DECADE_COLORS[d] ?? '#888';
                  return (
                    <button
                      key={d}
                      onClick={() => setCompareDecade(prev => prev === d ? null : d)}
                      style={{
                        ...styles.decadeChip,
                        background:  d === compareDecade ? `${col}22` : 'rgba(255,255,255,0.03)',
                        borderColor: d === compareDecade ? col        : 'rgba(255,255,255,0.08)',
                        color:       d === compareDecade ? col        : 'rgba(232,232,240,0.35)',
                        borderStyle: d === compareDecade ? 'solid'    : 'dashed',
                      }}
                    >
                      {d}s
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Narrative + stats */}
            {activeParams && (
              <>
                <p style={styles.decadeNote}>{DECADE_CONTEXT[activeDecade]}</p>

                {paradoxGap > 0 && (
                  <div style={styles.gapBadge}>
                    <span style={{ color: '#1db954', fontWeight: 700 }}>
                      Paradox gap: +{(paradoxGap * 100).toFixed(1)} pts
                    </span>
                    <span style={{ color: 'rgba(232,232,240,0.35)', fontSize: 11, marginLeft: 6 }}>
                      felt warmth exceeds signal valence
                    </span>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
                  {AXES.map(({ key, label, color }) => (
                    <StatBar
                      key={key}
                      label={label}
                      value={activeParams[key]}
                      color={color}
                      compareValue={compareParams ? compareParams[key] : undefined}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  section: {
    padding: '100px 0',
    background: 'linear-gradient(180deg, var(--bg2) 0%, var(--bg) 50%, var(--bg2) 100%)',
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 40,
    alignItems: 'start',
  },
  radarWrap: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 16,
    padding: '24px 16px 16px',
  },
  axisHitWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    marginTop: 16,
    padding: '0 8px',
  },
  axisHitBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 10px',
    border: '1px solid',
    borderRadius: 6,
    cursor: 'default',
    fontSize: 12,
    fontFamily: "'DM Sans', sans-serif",
    transition: 'all 0.15s ease',
    textAlign: 'left',
    width: '100%',
  },
  rightCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  controlBlock: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 12,
    padding: '14px 16px',
  },
  controlLabel: {
    fontSize: 10,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    color: 'rgba(232,232,240,0.3)',
    fontWeight: 600,
    marginBottom: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clearBtn: {
    fontSize: 11,
    color: 'rgba(232,232,240,0.35)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '2px 6px',
    borderRadius: 4,
    textTransform: 'none',
    letterSpacing: 0,
    fontFamily: "'DM Sans', sans-serif",
  },
  decadeGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
  },
  decadeChip: {
    padding: '5px 12px',
    border: '1px solid',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 12,
    fontFamily: "'DM Sans', sans-serif",
    transition: 'all 0.18s ease',
  },
  decadeNote: {
    fontSize: 13,
    color: 'rgba(232,232,240,0.5)',
    lineHeight: 1.8,
  },
  gapBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    padding: '6px 14px',
    background: 'rgba(29,185,84,0.08)',
    border: '1px solid rgba(29,185,84,0.2)',
    borderRadius: 20,
    fontSize: 12,
  },
};
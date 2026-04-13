import React, { useEffect, useMemo, useRef, useState, memo } from 'react';
import * as d3 from 'd3';
import { useInView } from '../hooks/useScrollProgress';
import { normalizeLoudness } from '../utils/dataUtils';

const TIERS = [
  {
    id: 'hits',
    label: 'Hits',
    sublabel: 'popularity ≥ 80',
    min: 80,
    max: 100,
    color: '#F59E0B',
    accentLight: 'rgba(245,158,11,0.12)',
    accentBorder: 'rgba(245,158,11,0.35)',
  },
  {
    id: 'popular',
    label: 'Popular',
    sublabel: 'popularity 50–79',
    min: 50,
    max: 79,
    color: '#818CF8',
    accentLight: 'rgba(129,140,248,0.12)',
    accentBorder: 'rgba(129,140,248,0.35)',
  },
  {
    id: 'other',
    label: 'Deep Cuts',
    sublabel: 'popularity < 50',
    min: 0,
    max: 49,
    color: '#34D399',
    accentLight: 'rgba(52,211,153,0.12)',
    accentBorder: 'rgba(52,211,153,0.35)',
  },
];

const FEATURES = [
  { key: 'valence', label: 'Happiness', short: 'V' },
  { key: 'danceability', label: 'Danceability', short: 'D' },
  { key: 'loudness_norm', label: 'Loudness', short: 'L' },
  { key: 'acousticness', label: 'Acousticness', short: 'A' },
];

const DECADE_START = 1960;
const DECADE_END = 2020;

function hexToRgba(hex, a) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b},${a}`;
}

function formatPct(v) {
  return `${(v * 100).toFixed(1)}%`;
}

// OPTIMIZATION: Throttled ResizeObserver to prevent state spamming
function useContainerWidth(ref) {
  const [w, setW] = useState(0);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    let animationFrameId;

    const ro = new ResizeObserver((entries) => {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(() => {
        const newW = entries[0].contentRect.width || 0;
        setW(prev => (prev !== newW ? newW : prev));
      });
    });

    ro.observe(el);
    setW(el.clientWidth || 0);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(animationFrameId);
    };
  }, [ref]);

  return w;
}

// OPTIMIZATION: Converted entirely to React SVG. No more DOM destruction.
const Sparkline = memo(({ data, feature, color, hoveredDecade, brushedRange, width = 220, height = 64 }) => {
  const margin = { top: 10, right: 8, bottom: 16, left: 28 };
  const w = width - margin.left - margin.right;
  const h = height - margin.top - margin.bottom;

  // 1. Memoize scales UNCONDITIONALLY
  const xScale = useMemo(() => d3.scaleLinear().domain([DECADE_START, DECADE_END]).range([0, w]), [w]);
  const yScale = useMemo(() => d3.scaleLinear().domain([0, 1]).range([h, 0]), [h]);

  // 2. Memoize paths UNCONDITIONALLY (handle empty data safely inside)
  const { areaPath, linePath } = useMemo(() => {
    if (!data?.length) return { areaPath: '', linePath: '' };

    const area = d3.area()
      .x(d => xScale(d.decade))
      .y0(h)
      .y1(d => yScale(d[feature]))
      .curve(d3.curveMonotoneX)
      .defined(d => d[feature] != null && !isNaN(d[feature]));

    const line = d3.line()
      .x(d => xScale(d.decade))
      .y(d => yScale(d[feature]))
      .curve(d3.curveMonotoneX)
      .defined(d => d[feature] != null && !isNaN(d[feature]));

    return { areaPath: area(data), linePath: line(data) };
  }, [data, feature, xScale, yScale, h]);

  // 3. Early return AFTER all hooks have been called
  if (!data?.length) {
    return <svg width={width} height={height} style={{ display: 'block' }} />;
  }

  const gradId = `grad-${feature}-${color.replace('#', '')}`;
  const hoveredData = hoveredDecade != null ? data.find(x => +x.decade === +hoveredDecade) : null;
  const last = data[data.length - 1];

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity={0.28} />
          <stop offset="100%" stopColor={color} stopOpacity={0.0} />
        </linearGradient>
      </defs>
      <g transform={`translate(${margin.left},${margin.top})`}>
        {/* Brush Rect */}
        {brushedRange && (
          <rect
            x={xScale(brushedRange[0])}
            y={0}
            width={Math.max(1, xScale(brushedRange[1]) - xScale(brushedRange[0]))}
            height={h}
            fill="rgba(255,255,255,0.03)"
          />
        )}
        
        {/* Baseline */}
        <line x1={0} y1={yScale(0.5)} x2={w} y2={yScale(0.5)} stroke="rgba(255,255,255,0.05)" strokeDasharray="2,4" />
        
        {/* Data Paths */}
        <path d={areaPath} fill={`url(#${gradId})`} />
        <path d={linePath} fill="none" stroke={color} strokeWidth={1.8} opacity={hoveredDecade ? 1 : 0.9} />

        {/* Hover State */}
        {hoveredData && hoveredData[feature] != null && (
          <>
            <line x1={xScale(hoveredData.decade)} y1={0} x2={xScale(hoveredData.decade)} y2={h} stroke="rgba(255,255,255,0.12)" strokeDasharray="3,4" />
            <circle cx={xScale(hoveredData.decade)} cy={yScale(hoveredData[feature])} r={4.5} fill={color} stroke="#0a0a0f" strokeWidth={2} />
          </>
        )}

        {/* Text Labels */}
        <text x={xScale(DECADE_START)} y={h + 13} textAnchor="start" fill="rgba(232,232,240,0.2)" fontSize="9px">{DECADE_START}s</text>
        <text x={xScale(DECADE_END)} y={h + 13} textAnchor="end" fill="rgba(232,232,240,0.2)" fontSize="9px">{DECADE_END}s</text>

        {/* End Node */}
        {last?.[feature] != null && (
          <circle cx={xScale(last.decade)} cy={yScale(last[feature])} r={2.8} fill={color} />
        )}
      </g>
    </svg>
  );
});

const DeltaBadge = memo(({ data, feature, color }) => {
  const first = data.find(d => d.decade === DECADE_START);
  const last = data.find(d => d.decade === DECADE_END);
  if (!first || !last || first[feature] == null || last[feature] == null) return null;

  const delta = ((last[feature] - first[feature]) * 100).toFixed(1);
  const up = +delta >= 0;

  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: up ? color : '#FB7185',
        background: up ? `rgba(${hexToRgba(color, 0.10)})` : 'rgba(251,113,133,0.10)',
        border: `1px solid ${up ? `rgba(${hexToRgba(color, 0.25)})` : 'rgba(251,113,133,0.20)'}`,
        borderRadius: 999,
        padding: '2px 8px',
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {up ? '↑' : '↓'} {Math.abs(+delta)}pp
    </span>
  );
});

// OPTIMIZATION: Converted to Pure React SVG
const DivergenceRail = memo(({ allTierData, feature, hoveredDecade, brushedRange }) => {
  const W = 820;
  const H = 130;
  const margin = { top: 16, right: 18, bottom: 24, left: 42 };
  const w = W - margin.left - margin.right;
  const h = H - margin.top - margin.bottom;

  const xScale = useMemo(() => d3.scaleLinear().domain([DECADE_START, DECADE_END]).range([0, w]), [w]);
  const yScale = useMemo(() => d3.scaleLinear().domain([0, 1]).range([h, 0]), [h]);

  const lineDef = useMemo(() => d3.line()
    .x(d => xScale(d.decade))
    .y(d => yScale(d[feature]))
    .curve(d3.curveMonotoneX)
    .defined(d => d[feature] != null && !isNaN(d[feature])), 
  [feature, xScale, yScale]);

  return (
    <svg width="100%" viewBox="0 0 820 130" style={{ display: 'block', overflow: 'visible' }}>
      <g transform={`translate(${margin.left},${margin.top})`}>
        <line x1={0} x2={w} y1={yScale(0.5)} y2={yScale(0.5)} stroke="rgba(255,255,255,0.05)" strokeDasharray="3,4" />

        {brushedRange && (
          <rect
            x={xScale(brushedRange[0])}
            y={0}
            width={Math.max(1, xScale(brushedRange[1]) - xScale(brushedRange[0]))}
            height={h}
            fill="rgba(255,255,255,0.03)"
          />
        )}

        {TIERS.map(tier => {
          const data = allTierData[tier.id] || [];
          if (!data.length) return null;

          const last = [...data].sort((a, b) => b.decade - a.decade)[0];
          const hoveredData = hoveredDecade != null ? data.find(x => +x.decade === +hoveredDecade) : null;

          return (
            <g key={tier.id}>
              <path
                d={lineDef(data)}
                fill="none"
                stroke={tier.color}
                strokeWidth={tier.id === 'hits' ? 2.6 : 2.2}
                opacity={tier.id === 'hits' ? 1 : 0.9}
              />
              
              {last?.[feature] != null && (
                <>
                  <circle cx={xScale(last.decade)} cy={yScale(last[feature])} r={3.2} fill={tier.color} />
                  <text x={xScale(last.decade) + 6} y={yScale(last[feature])} dominantBaseline="middle" fill={tier.color} fontSize="10px" fontWeight={700}>
                    {tier.label}
                  </text>
                </>
              )}

              {hoveredData?.[feature] != null && (
                <circle cx={xScale(hoveredData.decade)} cy={yScale(hoveredData[feature])} r={5.2} fill={tier.color} stroke="#0a0a0f" strokeWidth={2.5} />
              )}
            </g>
          );
        })}

        <text x={xScale(DECADE_START)} y={h + 16} textAnchor="start" fill="rgba(232,232,240,0.22)" fontSize="9px">{DECADE_START}s</text>
        <text x={xScale(DECADE_END)} y={h + 16} textAnchor="end" fill="rgba(232,232,240,0.22)" fontSize="9px">{DECADE_END}s</text>
      </g>
    </svg>
  );
});

const FocusPanel = memo(({ selectedTier, selectedFeature, tierData, onFeatureChange, hoveredDecade, setHoveredDecade, brushedRange, setBrushedRange }) => {
  const tier = TIERS.find(t => t.id === selectedTier) || TIERS[0];
  const data = tierData?.[tier.id] ?? [];
  const focusFeature = selectedFeature;
  const info = data.find(d => +d.decade === +hoveredDecade) || data[data.length - 1];

  return (
    <div
      style={{
        border: `1px solid ${tier.accentBorder}`,
        background: `linear-gradient(180deg, ${tier.accentLight} 0%, rgba(255,255,255,0.02) 100%)`,
        borderRadius: 18,
        padding: 18,
        marginBottom: 18,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 240, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: tier.color, display: 'inline-block' }} />
            <h3 style={{ margin: 0, color: '#e8e8f0', fontSize: 18, fontFamily: "'DM Sans',sans-serif" }}>
              {tier.label} Lens
            </h3>
          </div>
          <p style={{ margin: 0, color: 'rgba(232,232,240,0.55)', fontSize: 13, lineHeight: 1.6 }}>
            Hover a decade to compare, click a tier to lock it, and brush a time range to focus the story.
          </p>

          {info && (
            <div style={{ marginTop: 14, color: 'rgba(232,232,240,0.7)', fontSize: 13, lineHeight: 1.8 }}>
              <div><strong style={{ color: tier.color }}>{info.decade}s</strong></div>
              <div>Happiness: {formatPct(info.valence)}</div>
              <div>Danceability: {formatPct(info.danceability)}</div>
              <div>Loudness: {formatPct(info.loudness_norm)}</div>
              <div>Acousticness: {formatPct(info.acousticness)}</div>
              {info.repSong && (
                <div style={{ marginTop: 8, color: 'rgba(232,232,240,0.45)' }}>
                  Representative track: <em>{info.repSong}</em> — {info.repArtist}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ minWidth: 260, maxWidth: 420, flex: 1 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {FEATURES.map(f => (
              <button
                key={f.key}
                onClick={() => onFeatureChange(f.key)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 999,
                  border: `1px solid ${focusFeature === f.key ? 'rgba(255,255,255,0.24)' : 'rgba(255,255,255,0.10)'}`,
                  background: focusFeature === f.key ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
                  color: focusFeature === f.key ? '#e8e8f0' : 'rgba(232,232,240,0.45)',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
            {data.length > 0 && (
              <Sparkline
                data={data}
                feature={focusFeature}
                color={tier.color}
                hoveredDecade={hoveredDecade}
                brushedRange={brushedRange}
                width={420}
                height={98}
              />
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(232,232,240,0.35)', fontSize: 12 }}>
              <span>Selected feature: {FEATURES.find(f => f.key === focusFeature)?.label}</span>
              <span>Tap a tier card below to change focus</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

const TierCard = memo(({ tier, data, active, hoveredTier, hoveredDecade, onClick, onHover, brushLabel }) => {
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => onHover(tier.id)}
      onMouseLeave={() => onHover(null)}
      style={{
        textAlign: 'left',
        width: '100%',
        border: `1px solid ${active ? tier.accentBorder : 'rgba(255,255,255,0.08)'}`,
        background: active
          ? `linear-gradient(180deg, ${tier.accentLight} 0%, rgba(255,255,255,0.02) 100%)`
          : 'rgba(255,255,255,0.02)',
        borderRadius: 16,
        padding: 16,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: hoveredTier === tier.id ? `0 0 0 1px ${tier.accentBorder}` : 'none',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: tier.color, display: 'inline-block' }} />
            <span style={{ color: '#e8e8f0', fontWeight: 700, fontFamily: "'DM Sans',sans-serif" }}>{tier.label}</span>
          </div>
          <div style={{ fontSize: 11, color: 'rgba(232,232,240,0.38)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {tier.sublabel}
          </div>
        </div>
        <DeltaBadge data={data} feature="valence" color={tier.color} />
      </div>

      <div style={{ marginTop: 10, color: 'rgba(232,232,240,0.35)', fontSize: 12 }}>
        {data.reduce((acc, d) => acc + (d.count || 0), 0).toLocaleString()} track-decades
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: 'rgba(232,232,240,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Valence
          </span>
          <span style={{ fontSize: 11, color: 'rgba(232,232,240,0.35)' }}>{brushLabel || 'hover a decade'}</span>
        </div>
        <Sparkline
          data={data}
          feature="valence"
          color={tier.color}
          hoveredDecade={hoveredDecade}
          width={240}
          height={54}
        />
      </div>
    </button>
  );
});

export default function PopularityTierStrip({ data = [] }) {
  const [ref, inView] = useInView({ threshold: 0.08 });
  const wrapRef = useRef(null);
  const width = useContainerWidth(wrapRef);

  const [hoveredTier, setHoveredTier] = useState(null);
  const [selectedTier, setSelectedTier] = useState('hits');
  const [selectedFeature, setSelectedFeature] = useState('valence');
  const [hoveredDecade, setHoveredDecade] = useState(null);
  const [brushExtent, setBrushExtent] = useState([1960, 2020]);

  const tierDecadeData = useMemo(() => {
    if (!data?.length) return {};
    const result = {};

    TIERS.forEach(tier => {
      const filtered = data.filter(d => {
        const pop = +d.popularity;
        return pop >= tier.min && pop <= tier.max;
      });

      const byDecade = d3.rollup(
        filtered,
        rows => {
          // OPTIMIZATION: Calc median once instead of inside d3.least loop
          const medianValence = d3.median(rows, x => x.valence);
          const repTrack = d3.least(rows, r => Math.abs(r.valence - medianValence));
          
          return {
            decade: +rows[0].decade,
            valence: d3.mean(rows, r => r.valence),
            danceability: d3.mean(rows, r => r.danceability),
            loudness_norm: d3.mean(rows, r => normalizeLoudness(r.loudness)),
            acousticness: d3.mean(rows, r => r.acousticness),
            count: rows.length,
            repSong: repTrack?.name,
            repArtist: repTrack?.artists,
          };
        },
        d => +d.decade
      );

      result[tier.id] = Array.from(byDecade.values())
        .filter(d => d.decade >= DECADE_START && d.decade <= DECADE_END)
        .sort((a, b) => a.decade - b.decade);
    });

    return result;
  }, [data]);

  const brushLabel = useMemo(() => {
    const [a, b] = brushExtent;
    return `${a}s–${b}s`;
  }, [brushExtent]);

  useEffect(() => {
    if (!data?.length) return;
    const start = Math.max(DECADE_START, d3.min(data, d => +d.decade) || DECADE_START);
    const end = Math.min(DECADE_END, d3.max(data, d => +d.decade) || DECADE_END);
    setBrushExtent([start, end]);
  }, [data]);

  const brushedFiltered = useMemo(() => {
    const [a, b] = brushExtent;
    const filtered = {};
    TIERS.forEach(tier => {
      filtered[tier.id] = (tierDecadeData[tier.id] || []).filter(d => d.decade >= a && d.decade <= b);
    });
    return filtered;
  }, [tierDecadeData, brushExtent]);

  const featureTitle = FEATURES.find(f => f.key === selectedFeature)?.label || 'Valence';

  return (
    <section ref={ref} style={styles.section}>
      <div className="container" ref={wrapRef}>
        <p className="section-label" style={{ color: '#F59E0B' }}>Sound by Popularity</p>
        <h2 className="section-title" style={{ color: '#e8e8f0', marginBottom: 12 }}>
          Did Hits Change
          <br />
          <em>Differently Than Deep Cuts?</em>
        </h2>
        <p className="section-body" style={{ marginBottom: 28 }}>
          This view compares three popularity tiers across the same four audio features. Hover a tier to spotlight it, click to lock the focus, and brush the decade rail to inspect a narrower time window.
        </p>

        <FocusPanel
          selectedTier={selectedTier}
          selectedFeature={selectedFeature}
          tierData={tierDecadeData}
          onFeatureChange={setSelectedFeature}
          hoveredDecade={hoveredDecade}
          setHoveredDecade={setHoveredDecade}
          brushedRange={brushExtent}
          setBrushedRange={setBrushExtent}
        />

        <div style={styles.brushCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ color: 'rgba(232,232,240,0.42)', fontSize: 12 }}>
              Brush decade window: <strong style={{ color: '#e8e8f0' }}>{brushLabel}</strong>
            </div>
            <div style={{ color: 'rgba(232,232,240,0.35)', fontSize: 12 }}>
              {featureTitle} divergence across popularity tiers
            </div>
          </div>
          
          <DivergenceRail
            allTierData={brushedFiltered}
            feature={selectedFeature}
            hoveredDecade={hoveredDecade}
            brushedRange={brushExtent}
          />
        </div>

        <div style={styles.gridHeader}>
          <div style={{ color: 'rgba(232,232,240,0.45)', fontSize: 12 }}>
            Tier cards — click one to lock focus
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {TIERS.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedTier(t.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 999,
                  border: `1px solid ${selectedTier === t.id ? t.accentBorder : 'rgba(255,255,255,0.10)'}`,
                  background: selectedTier === t.id ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
                  color: selectedTier === t.id ? '#e8e8f0' : 'rgba(232,232,240,0.45)',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div style={styles.cardGrid}>
          {TIERS.map(tier => (
            <TierCard
              key={tier.id}
              tier={tier}
              data={brushedFiltered[tier.id] || []}
              active={selectedTier === tier.id}
              hoveredTier={hoveredTier}
              hoveredDecade={hoveredDecade}
              onClick={() => setSelectedTier(tier.id)}
              onHover={setHoveredTier}
              brushLabel={brushLabel}
            />
          ))}
        </div>

        <div style={styles.insightRow}>
          <InsightCard
            color="#F59E0B"
            label="Mainstream shift"
            body="Hits often show the sharpest change, making popularity an important lens on the sadness paradox."
          />
          <InsightCard
            color="#818CF8"
            label="Shared production trend"
            body="Loudness tends to rise across tiers, which suggests a broad production-level change rather than only a hit-driven one."
          />
          <InsightCard
            color="#34D399"
            label="Deep-cut texture"
            body="Smaller-tier music often retains acoustic warmth longer, giving the user a reason to compare tiers directly."
          />
        </div>

        {!inView && <div style={{ height: 1 }} />}
      </div>
    </section>
  );
}

const InsightCard = memo(({ color, label, body }) => (
  <div style={{
    flex: 1,
    minWidth: 220,
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderTop: `3px solid ${color}`,
    borderRadius: 12,
    padding: 16,
  }}>
    <p style={{ margin: 0, marginBottom: 6, color, fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans',sans-serif" }}>
      {label}
    </p>
    <p style={{ margin: 0, color: 'rgba(232,232,240,0.46)', fontSize: 12, lineHeight: 1.65 }}>
      {body}
    </p>
  </div>
));

const styles = {
  section: {
    padding: '96px 0',
    background: 'linear-gradient(180deg, var(--bg2) 0%, var(--bg) 100%)',
  },
  brushCard: {
    marginTop: 14,
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 16,
    padding: 14,
  },
  gridHeader: {
    marginTop: 28,
    marginBottom: 14,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 16,
  },
  insightRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 16,
    marginTop: 24,
  },
};
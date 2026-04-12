import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { useInView } from '../hooks/useScrollProgress';
import { normalizeLoudness } from '../utils/dataUtils';

const METRICS = [
  { key: 'valence',       label: 'Valence',       color: '#f4a261', desc: 'Emotional positivity — higher = happier' },
  { key: 'loudness_norm', label: 'Loudness',       color: '#e9c46a', desc: 'Normalized loudness — higher = louder' },
  { key: 'acousticness',  label: 'Acousticness',   color: '#457b9d', desc: 'Acoustic instrument presence' },
  { key: 'danceability',  label: 'Danceability',   color: '#1db954', desc: 'Rhythmic appeal and groove' },
];

const CHART_H = 240;

function MiniChart({ metricKey, color, yearData, hoveredDecade, onHover }) {
  const svgRef = useRef(null);
  const [ref, inView] = useInView({ threshold: 0.08 });
  const drawn = useRef(false);

  useEffect(() => {
    if (!yearData.length || !svgRef.current) return;
    if (!inView && !drawn.current) return;
    drawn.current = true;
    renderChart();
  }, [yearData, inView]);

  useEffect(() => {
    if (!svgRef.current || !yearData.length || !drawn.current) return;
    const margin = { top: 20, right: 16, bottom: 36, left: 48 };
    const totalW = svgRef.current.clientWidth || 460;
    const width  = totalW - margin.left - margin.right;
    const height = CHART_H - margin.top - margin.bottom;
    const x = d3.scaleLinear().domain([1921, 2020]).range([0, width]);
    const y = d3.scaleLinear().domain([0, 1]).range([height, 0]);
    const g = d3.select(svgRef.current).select('g');
    g.selectAll('.cross-line, .cross-dot').remove();

    if (hoveredDecade !== null) {
      const rows = yearData.filter(d => Math.floor(d.year / 10) * 10 === hoveredDecade);
      if (!rows.length) return;
      const mid = rows[Math.floor(rows.length / 2)];
      const xp = x(mid.year);
      g.append('line').attr('class', 'cross-line')
        .attr('x1', xp).attr('x2', xp).attr('y1', 0).attr('y2', height)
        .attr('stroke', color).attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '4,3').attr('opacity', 0.7).attr('pointer-events', 'none');
      g.append('circle').attr('class', 'cross-dot')
        .attr('cx', xp).attr('cy', y(mid[metricKey]))
        .attr('r', 5).attr('fill', color)
        .attr('stroke', '#0a0a0f').attr('stroke-width', 2).attr('pointer-events', 'none');
    }
  }, [hoveredDecade, yearData]);

  function renderChart() {
    const margin = { top: 20, right: 16, bottom: 36, left: 48 };
    const totalW = svgRef.current.clientWidth || 460;
    const width  = totalW - margin.left - margin.right;
    const height = CHART_H - margin.top - margin.bottom;

    d3.select(svgRef.current).selectAll('*').remove();
    const svg = d3.select(svgRef.current)
      .append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([1921, 2020]).range([0, width]);
    const y = d3.scaleLinear().domain([0, 1]).range([height, 0]);

    svg.append('g')
      .call(d3.axisLeft(y).ticks(4).tickSize(-width).tickFormat(''))
      .call(g => g.select('.domain').remove())
      .call(g => g.selectAll('line').attr('stroke', 'rgba(255,255,255,0.05)'));

    svg.append('g')
      .call(d3.axisLeft(y).ticks(4).tickFormat(d => `${Math.round(d * 100)}%`))
      .call(g => g.select('.domain').remove())
      .call(g => g.selectAll('text').attr('fill', 'rgba(232,232,240,0.3)').attr('font-size', '10px'));

    svg.append('g').attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d => `'${String(d).slice(2)}`).ticks(8))
      .call(g => g.select('.domain').attr('stroke', 'rgba(255,255,255,0.08)'))
      .call(g => g.selectAll('line').remove())
      .call(g => g.selectAll('text').attr('fill', 'rgba(232,232,240,0.3)').attr('font-size', '10px'));

    const defs = svg.append('defs');
    const grad = defs.append('linearGradient')
      .attr('id', `area-grad-${metricKey}`)
      .attr('x1', '0%').attr('y1', '0%').attr('x2', '0%').attr('y2', '100%');
    grad.append('stop').attr('offset', '0%').attr('stop-color', color).attr('stop-opacity', 0.2);
    grad.append('stop').attr('offset', '100%').attr('stop-color', color).attr('stop-opacity', 0);

    const areaGen = d3.area()
      .x(d => x(d.year)).y0(height).y1(d => y(d[metricKey]))
      .curve(d3.curveCatmullRom.alpha(0.5));
    svg.append('path').datum(yearData)
      .attr('fill', `url(#area-grad-${metricKey})`).attr('d', areaGen);

    const lineGen = d3.line()
      .x(d => x(d.year)).y(d => y(d[metricKey]))
      .curve(d3.curveCatmullRom.alpha(0.5));
    const path = svg.append('path').datum(yearData)
      .attr('fill', 'none').attr('stroke', color).attr('stroke-width', 2.5).attr('d', lineGen);
    const len = path.node().getTotalLength();
    path.attr('stroke-dasharray', len).attr('stroke-dashoffset', len)
      .transition().duration(1800).ease(d3.easeCubicInOut).attr('stroke-dashoffset', 0);

    const bisect = d3.bisector(d => d.year).left;
    svg.append('rect')
      .attr('width', width).attr('height', height)
      .attr('fill', 'none').attr('pointer-events', 'all').style('cursor', 'crosshair')
      .on('mousemove', function(event) {
        const [mx] = d3.pointer(event);
        const yr = x.invert(mx);
        const idx = Math.min(bisect(yearData, yr), yearData.length - 1);
        const d = yearData[idx];
        if (d) onHover(Math.floor(d.year / 10) * 10);
      })
      .on('mouseleave', () => onHover(null));
  }

  return (
    <div ref={ref}>
      <svg ref={svgRef} width="100%" height={CHART_H} style={{ display: 'block' }} />
    </div>
  );
}

export default function TrendOverview({ data, popularity, genre }) {
  const [hoveredDecade, setHoveredDecade] = React.useState(null);
  const [ref] = useInView({ threshold: 0.05 });

  const yearData = useMemo(() => {
    if (!data || !data.length) return [];
    let filtered = data;
    if (popularity > 0) filtered = filtered.filter(d => +d.popularity >= popularity);
    if (genre && genre !== 'All') filtered = filtered.filter(d =>
      d.genre_list && d.genre_list.toLowerCase().includes(genre.toLowerCase())
    );
    const byYear = d3.rollup(
      filtered,
      rows => ({
        year: rows[0].year,
        valence:       d3.mean(rows, r => r.valence),
        loudness_norm: d3.mean(rows, r => normalizeLoudness(r.loudness)),
        acousticness:  d3.mean(rows, r => r.acousticness),
        danceability:  d3.mean(rows, r => r.danceability),
      }),
      d => d.year
    );
    return Array.from(byYear.values()).sort((a, b) => a.year - b.year);
  }, [data, popularity, genre]);

  const hoveredStats = useMemo(() => {
    if (!hoveredDecade || !yearData.length) return null;
    const rows = yearData.filter(d => Math.floor(d.year / 10) * 10 === hoveredDecade);
    if (!rows.length) return null;
    const avg = key => d3.mean(rows, r => r[key]);
    return {
      valence:       avg('valence'),
      loudness_norm: avg('loudness_norm'),
      acousticness:  avg('acousticness'),
      danceability:  avg('danceability'),
    };
  }, [hoveredDecade, yearData]);

  return (
    <section ref={ref} style={styles.section}>
      <div className="container">
        <p className="section-label" style={{ color: '#1db954' }}>Decade by Decade</p>
        <h2 className="section-title" style={{ color: '#e8e8f0', marginBottom: 16 }}>
          Four Forces,<br /><em>One Century</em>
        </h2>
        <p className="section-body" style={{ marginBottom: 36 }}>
          Valence, loudness, acousticness, and danceability tracked year by year.
          Hover any chart to highlight that moment across all four simultaneously.
        </p>

        <div style={{ ...styles.callout, opacity: hoveredStats ? 1 : 0 }}>
          <span style={styles.calloutDecade}>{hoveredDecade ? `${hoveredDecade}s` : ''}</span>
          {hoveredStats && METRICS.map(({ key, label, color }) => (
            <span key={key} style={styles.calloutStat}>
              <span style={{ color }}>●</span>
              <span style={{ color: 'rgba(232,232,240,0.45)', marginLeft: 5 }}>{label}:</span>
              <strong style={{ color, marginLeft: 4 }}>{(hoveredStats[key] * 100).toFixed(1)}%</strong>
            </span>
          ))}
        </div>

        <div style={styles.grid}>
          {METRICS.map(({ key, label, color, desc }) => (
            <div key={key} style={styles.card}>
              <div style={styles.cardHeader}>
                <span style={{ ...styles.metricLabel, color }}>{label}</span>
                <span style={styles.metricDesc}>{desc}</span>
              </div>
              <MiniChart
                metricKey={key} color={color}
                yearData={yearData}
                hoveredDecade={hoveredDecade}
                onHover={setHoveredDecade}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const styles = {
  section: {
    padding: '100px 0',
    background: 'linear-gradient(180deg, var(--bg) 0%, var(--bg2) 100%)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',   // strict 2-col
    gap: 20,
  },
  card: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 14,
    padding: '20px 20px 14px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  },
  metricDesc: {
    fontSize: 11,
    color: 'rgba(232,232,240,0.3)',
  },
  callout: {
    display: 'flex',
    alignItems: 'center',
    gap: 24,
    flexWrap: 'wrap',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: '12px 20px',
    marginBottom: 20,
    transition: 'opacity 0.2s ease',
    fontSize: 13,
    pointerEvents: 'none',
    minHeight: 46,
  },
  calloutDecade: {
    fontFamily: "'DM Serif Display', serif",
    fontSize: '1.15rem',
    color: '#e8e8f0',
    minWidth: 48,
  },
  calloutStat: {
    display: 'flex',
    alignItems: 'center',
  },
};
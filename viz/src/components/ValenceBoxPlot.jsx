import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { useInView } from '../hooks/useScrollProgress';

// ─── Box stats helper ─────────────────────────────────────────────────────────
function computeBoxStats(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = d3.quantile(sorted, 0.25);
  const median = d3.quantile(sorted, 0.5);
  const q3 = d3.quantile(sorted, 0.75);
  const iqr = q3 - q1;
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;
  const nonOutliers = sorted.filter(v => v >= lowerFence && v <= upperFence);
  const outliers = sorted.filter(v => v < lowerFence || v > upperFence);
  return {
    q1,
    median,
    q3,
    lowerWhisker: nonOutliers.length ? nonOutliers[0] : q1,
    upperWhisker: nonOutliers.length ? nonOutliers[nonOutliers.length - 1] : q3,
    outliers,
    count: sorted.length,
    mean: d3.mean(sorted),
  };
}

// ─── D3 draw function ─────────────────────────────────────────────────────────
function draw(svgEl, stats) {
  const margin = { top: 48, right: 24, bottom: 56, left: 56 };
  const totalW = svgEl.clientWidth || 820;
  const width = totalW - margin.left - margin.right;
  const height = 420 - margin.top - margin.bottom;

  d3.select(svgEl).selectAll('*').remove();

  const svg = d3.select(svgEl)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const peakDecade = stats.reduce((a, b) => (a.median > b.median ? a : b));
  const troughDecade = stats.reduce((a, b) => (a.median < b.median ? a : b));

  const decades = stats.map(d => d.label);
  const x = d3.scaleBand().domain(decades).range([0, width]).padding(0.35);
  const y = d3.scaleLinear().domain([0, 1]).range([height, 0]);
  const bw = x.bandwidth();

  // ── Grid ──
  svg.append('g')
    .call(d3.axisLeft(y).ticks(5).tickSize(-width).tickFormat(''))
    .call(g => g.select('.domain').remove())
    .call(g => g.selectAll('line').attr('stroke', 'rgba(255,255,255,0.05)'));

  // ── Y axis ──
  svg.append('g')
    .call(d3.axisLeft(y).ticks(5).tickFormat(d => `${Math.round(d * 100)}%`))
    .call(g => g.select('.domain').remove())
    .call(g => g.selectAll('text')
      .attr('fill', 'rgba(232,232,240,0.35)')
      .attr('font-size', '11px'));

  // ── X axis ──
  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .call(g => g.select('.domain').attr('stroke', 'rgba(255,255,255,0.08)'))
    .call(g => g.selectAll('line').remove())
    .call(g => g.selectAll('text')
      .attr('fill', 'rgba(232,232,240,0.45)')
      .attr('font-size', '11px'));

  // ── Y axis label ──
  svg.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -height / 2)
    .attr('y', -44)
    .attr('text-anchor', 'middle')
    .attr('fill', 'rgba(232,232,240,0.25)')
    .attr('font-size', '10px')
    .attr('letter-spacing', '0.15em')
    .text('VALENCE');

  // ── Tooltip ──
  const tooltip = d3.select('body')
    .selectAll('.vbp-tooltip')
    .data([null])
    .join('div')
    .attr('class', 'vbp-tooltip')
    .style('position', 'absolute')
    .style('z-index', '100')
    .style('visibility', 'hidden')
    .style('padding', '10px 14px')
    .style('background', 'rgba(10,10,15,0.95)')
    .style('border', '1px solid rgba(244,162,97,0.25)')
    .style('border-radius', '8px')
    .style('color', '#e8e8f0')
    .style('font-size', '12px')
    .style('line-height', '1.8')
    .style('pointer-events', 'none');

  // ── Draw boxes ──
  stats.forEach((d, i) => {
    const cx = x(d.label) + bw / 2;
    const isPeak = d.decade === peakDecade.decade;
    const isTrough = d.decade === troughDecade.decade;

    const baseColor = '#f4a261';
    const troughColor = '#457b9d';

    const strokeColor = isPeak ? baseColor : isTrough ? troughColor : 'rgba(244,162,97,0.45)';
    const fillColor = isPeak
      ? 'rgba(244,162,97,0.18)'
      : isTrough
      ? 'rgba(69,123,157,0.18)'
      : 'rgba(244,162,97,0.06)';
    const strokeWidth = isPeak || isTrough ? 2 : 1;

    // Whisker vertical stem
    svg.append('line')
      .attr('x1', cx).attr('x2', cx)
      .attr('y1', y(d.upperWhisker)).attr('y2', y(d.lowerWhisker))
      .attr('stroke', strokeColor)
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', isPeak || isTrough ? 'none' : 'none');

    // Whisker caps
    [d.upperWhisker, d.lowerWhisker].forEach(v => {
      svg.append('line')
        .attr('x1', cx - bw * 0.28).attr('x2', cx + bw * 0.28)
        .attr('y1', y(v)).attr('y2', y(v))
        .attr('stroke', strokeColor)
        .attr('stroke-width', 1.5);
    });

    // IQR box
    const boxTop = y(d.q3);
    const boxH = Math.max(2, y(d.q1) - y(d.q3));

    svg.append('rect')
      .attr('x', x(d.label))
      .attr('y', boxTop)
      .attr('width', bw)
      .attr('height', boxH)
      .attr('rx', 3)
      .attr('fill', fillColor)
      .attr('stroke', strokeColor)
      .attr('stroke-width', strokeWidth)
      .style('cursor', 'pointer')
      .on('mouseover', (event) => {
        tooltip
          .style('visibility', 'visible')
          .html(
            `<strong style="color:${strokeColor}">${d.label}</strong><br/>` +
            `Median&nbsp;&nbsp; ${(d.median * 100).toFixed(1)}%<br/>` +
            `Q1 – Q3&nbsp; ${(d.q1 * 100).toFixed(1)}% – ${(d.q3 * 100).toFixed(1)}%<br/>` +
            `Whiskers ${(d.lowerWhisker * 100).toFixed(1)}% – ${(d.upperWhisker * 100).toFixed(1)}%<br/>` +
            `Outliers&nbsp; ${d.outliers.length} songs<br/>` +
            `n = ${d.count.toLocaleString()}`
          );
      })
      .on('mousemove', (event) => {
        tooltip
          .style('top', (event.pageY - 10) + 'px')
          .style('left', (event.pageX + 16) + 'px');
      })
      .on('mouseout', () => tooltip.style('visibility', 'hidden'));

    // Median line
    svg.append('line')
      .attr('x1', x(d.label)).attr('x2', x(d.label) + bw)
      .attr('y1', y(d.median)).attr('y2', y(d.median))
      .attr('stroke', isPeak ? '#f4a261' : isTrough ? '#7fb3d3' : 'rgba(232,232,240,0.55)')
      .attr('stroke-width', 2.5);

    // Outliers — jitter deterministically by index
    const maxOutliers = 50;
    const step = d.outliers.length > maxOutliers
      ? Math.ceil(d.outliers.length / maxOutliers)
      : 1;

    d.outliers.forEach((v, oi) => {
      if (oi % step !== 0) return;
      // deterministic jitter: use index-based pseudo-random
      const jitter = ((oi * 7 + i * 13) % 17) / 17 - 0.5;
      svg.append('circle')
        .attr('cx', cx + jitter * bw * 0.55)
        .attr('cy', y(v))
        .attr('r', 2)
        .attr('fill', 'none')
        .attr('stroke', strokeColor)
        .attr('stroke-width', 1)
        .attr('opacity', 0.45);
    });

    // ── Peak / Trough annotation ──
    if (isPeak) {
      const annotY = y(d.upperWhisker) - 16;
      svg.append('text')
        .attr('x', cx)
        .attr('y', annotY)
        .attr('text-anchor', 'middle')
        .attr('fill', baseColor)
        .attr('font-size', '9px')
        .attr('font-weight', '700')
        .attr('letter-spacing', '0.12em')
        .text('▲ PEAK');
    }

    if (isTrough) {
      const annotY = y(d.lowerWhisker) + 22;
      svg.append('text')
        .attr('x', cx)
        .attr('y', annotY)
        .attr('text-anchor', 'middle')
        .attr('fill', troughColor)
        .attr('font-size', '9px')
        .attr('font-weight', '700')
        .attr('letter-spacing', '0.12em')
        .text('▼ TROUGH');
    }
  });

  // ── Decline arrow annotation ──
  if (stats.length >= 2) {
    const firstDecade = stats[0];
    const lastDecade = stats[stats.length - 1];
    const x1 = x(firstDecade.label) + bw / 2;
    const x2 = x(lastDecade.label) + bw / 2;
    const arrowY = -26;

    svg.append('line')
      .attr('x1', x1 + 10).attr('x2', x2 - 10)
      .attr('y1', arrowY).attr('y2', arrowY)
      .attr('stroke', 'rgba(244,162,97,0.25)')
      .attr('stroke-width', 1)
      .attr('marker-end', 'url(#arrowhead)');

    // Arrowhead marker
    const defs = svg.append('defs');
    defs.append('marker')
      .attr('id', 'arrowhead')
      .attr('markerWidth', 6).attr('markerHeight', 6)
      .attr('refX', 5).attr('refY', 3)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,0 L0,6 L6,3 z')
      .attr('fill', 'rgba(244,162,97,0.25)');

    svg.append('text')
      .attr('x', (x1 + x2) / 2)
      .attr('y', arrowY - 8)
      .attr('text-anchor', 'middle')
      .attr('fill', 'rgba(244,162,97,0.35)')
      .attr('font-size', '9px')
      .attr('letter-spacing', '0.12em')
      .text('MEDIAN VALENCE DECLINING →');
  }
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ValenceBoxPlot({ data }) {
  const [ref, inView] = useInView({ threshold: 0.05 });
  const svgRef = useRef(null);
  const [sliderValue, setSliderValue] = useState(0);   // updates instantly (display)
  const [minPopularity, setMinPopularity] = useState(0); // debounced (computation)
  const debounceRef = useRef(null);

  function handleSliderChange(val) {
    setSliderValue(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setMinPopularity(val), 180);
  }

  const decadeStats = useMemo(() => {
    if (!data || !data.length) return [];

    const filtered =
      minPopularity > 0
        ? data.filter(d => +d.popularity >= minPopularity)
        : data;

    const byDecade = d3.rollup(
      filtered,
      rows => {
        const values = rows
          .map(r => +r.valence)
          .filter(v => !isNaN(v) && v >= 0 && v <= 1);
        if (values.length < 5) return null;
        return {
          decade: +rows[0].decade,
          label: rows[0].decade_label,
          ...computeBoxStats(values),
        };
      },
      d => +d.decade
    );

    return Array.from(byDecade.values())
      .filter(Boolean)
      .sort((a, b) => a.decade - b.decade);
  }, [data, minPopularity]);

  useEffect(() => {
    if (!decadeStats.length || !inView || !svgRef.current) return;
    draw(svgRef.current, decadeStats);
  }, [decadeStats, inView]);

  const peakDecade = decadeStats.length
    ? decadeStats.reduce((a, b) => (a.median > b.median ? a : b))
    : null;
  const troughDecade = decadeStats.length
    ? decadeStats.reduce((a, b) => (a.median < b.median ? a : b))
    : null;

  const totalSongs = decadeStats.reduce((s, d) => s + d.count, 0);

  const popularityLabels = {
    0: 'All songs',
    25: '≥ 25 — some traction',
    50: '≥ 50 — moderate hit',
    60: '≥ 60 — popular',
    75: '≥ 75 — major hit',
  };

  return (
    <section ref={ref} style={sectionStyle}>
      <div className="container">
        <p className="section-label" style={{ color: '#f4a261' }}>Valence Over Decades</p>
        <h2 className="section-title" style={{ color: '#e8e8f0', marginBottom: '20px' }}>
          Valence Has Been<br />
          <em>Declining Since the 1970s</em>
        </h2>
        <p
          className="section-body"
          style={{ marginBottom: '48px' }}
        >
          Popular music's happiness score 
peaked wiht a median of 62.0% in the 1970s and 
fell to a median of 44.6% by the 2010s — a 
17-point decline over four 
decades. The 2020s show a slight 
recovery, with a median of 50%, but remains well 
below the peak. Filtered to popular 
tracks (popularity ≥ 60)        </p>

        {/* ── Popularity filter ── */}
        <div style={filterWrap}>
          <div style={filterRow}>
            <span style={filterLabel}>Filter by popularity</span>
            <span style={filterBadge}>
              {sliderValue === 0 ? 'All songs' : `≥ ${sliderValue}`}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={sliderValue}
            onChange={e => handleSliderChange(+e.target.value)}
            style={sliderStyle}
          />
          <div style={sliderTicks}>
            {[0, 25, 50, 75, 100].map(v => (
              <span
                key={v}
                style={{ ...sliderTickLabel, color: 'rgba(232,232,240,0.25)' }}
              >
                {v === 0 ? 'All' : v}
              </span>
            ))}
          </div>
          <p style={filterNote}>
            Showing {totalSongs.toLocaleString()} songs across {decadeStats.length} decades
          </p>
        </div>

        {/* ── Chart card ── */}
        <div style={cardStyle}>
          <svg ref={svgRef} width="100%" height={420} />
        </div>

        {/* ── Legend ── */}
        {peakDecade && troughDecade && (
          <div style={legendRow}>
            <span style={legendItem}>
              <span style={{ ...legendSwatch, background: '#f4a261' }} />
              <span style={{ color: 'rgba(232,232,240,0.65)' }}>
                Peak — <strong style={{ color: '#f4a261' }}>{peakDecade.label}</strong>
                &nbsp;(median&nbsp;{(peakDecade.median * 100).toFixed(1)}%)
              </span>
            </span>
            <span style={legendItem}>
              <span style={{ ...legendSwatch, background: '#457b9d' }} />
              <span style={{ color: 'rgba(232,232,240,0.65)' }}>
                Trough — <strong style={{ color: '#7fb3d3' }}>{troughDecade.label}</strong>
                &nbsp;(median&nbsp;{(troughDecade.median * 100).toFixed(1)}%)
              </span>
            </span>
            <span style={legendItem}>
              <span style={{ width: 20, height: 2, background: 'rgba(244,162,97,0.4)', display: 'inline-block', borderRadius: 2 }} />
              <span style={{ color: 'rgba(232,232,240,0.4)', fontSize: 12 }}>Other decades</span>
            </span>
            <span style={{ ...legendItem, gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', border: '1px solid rgba(244,162,97,0.5)', display: 'inline-block' }} />
              <span style={{ color: 'rgba(232,232,240,0.4)', fontSize: 12 }}>Outliers (beyond 1.5 × IQR)</span>
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const sectionStyle = {
  padding: '100px 0',
  background: 'linear-gradient(180deg, var(--bg2) 0%, var(--bg) 100%)',
};

const cardStyle = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: '16px',
  padding: '8px 8px 8px 8px',
  overflowX: 'auto',
};

const filterWrap = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: '12px',
  padding: '20px 24px',
  marginBottom: '24px',
};

const filterRow = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '12px',
};

const filterLabel = {
  fontSize: '11px',
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
  color: 'rgba(232,232,240,0.35)',
  fontWeight: 600,
};

const filterBadge = {
  fontSize: '12px',
  color: '#f4a261',
  fontWeight: 600,
  background: 'rgba(244,162,97,0.1)',
  padding: '3px 10px',
  borderRadius: '20px',
  border: '1px solid rgba(244,162,97,0.2)',
};

const sliderStyle = {
  width: '100%',
  accentColor: '#f4a261',
  cursor: 'pointer',
  marginBottom: '8px',
};

const sliderTicks = {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: '4px',
};

const sliderTickLabel = {
  fontSize: '10px',
  letterSpacing: '0.05em',
  transition: 'color 0.2s',
};

const filterNote = {
  fontSize: '11px',
  color: 'rgba(232,232,240,0.25)',
  margin: 0,
  marginTop: '6px',
};

const legendRow = {
  display: 'flex',
  gap: '24px',
  flexWrap: 'wrap',
  marginTop: '20px',
  paddingTop: '16px',
  borderTop: '1px solid rgba(255,255,255,0.07)',
};

const legendItem = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '12px',
};

const legendSwatch = {
  width: 12,
  height: 12,
  borderRadius: '50%',
  display: 'inline-block',
  flexShrink: 0,
};

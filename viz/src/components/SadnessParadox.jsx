import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useInView } from '../hooks/useScrollProgress';
import { normalizeLoudness } from '../utils/dataUtils';

// ─── Step 1: Valence Decline ──────────────────────────────────────────────────
function ValenceChart({ data, inView }) {
  const svgRef = useRef(null);
  const drawn = useRef(false);

  useEffect(() => {
    if (!data || !inView || drawn.current) return;
    drawn.current = true;
    drawLine(svgRef.current, data, 'valence', '#f4a261', false, 'Valence (positivity)');
  }, [data, inView]);

  return (
    <div style={cardStyle}>
      <p style={stepLabel}>Step 01</p>
      <h3 style={chartTitle}>Valence Is Falling</h3>
      <p style={chartDesc}>Songs have grown emotionally darker decade after decade. The happiness index of music has been in steady decline since the 1960s.</p>
      <svg ref={svgRef} width="100%" height={240} style={{ display: 'block', overflow: 'hidden' }} />
      <div style={{ ...annoStyle, color: '#f4a261' }}>18% decline since the '60s</div>
    </div>
  );
}

// ─── Step 2: Loudness Rising ──────────────────────────────────────────────────
function LoudnessChart({ data, inView }) {
  const svgRef = useRef(null);
  const drawn = useRef(false);

  useEffect(() => {
    if (!data || !inView || drawn.current) return;
    drawn.current = true;
    drawLine(svgRef.current, data, 'loudness_norm', '#e9c46a', false, 'Loudness (normalized)');
  }, [data, inView]);

  return (
    <div style={cardStyle}>
      <p style={stepLabel}>Step 02</p>
      <h3 style={chartTitle}>Loudness Is Rising</h3>
      <p style={chartDesc}>The loudness wars are real. Modern production pushes everything louder. This is not just about volume — it changes the emotional texture of music.</p>
      <svg ref={svgRef} width="100%" height={240} style={{ display: 'block', overflow: 'hidden' }} />
      <div style={{ ...annoStyle, color: '#e9c46a' }}>34% growth since the '60s</div>
    </div>
  );
}

// ─── Step 3: Acousticness Crash ───────────────────────────────────────────────
function AcousticnessChart({ data, inView }) {
  const svgRef = useRef(null);
  const drawn = useRef(false);

  useEffect(() => {
    if (!data || !inView || drawn.current) return;
    drawn.current = true;
    drawLine(svgRef.current, data, 'acousticness', '#457b9d', false, 'Acousticness');
  }, [data, inView]);

  return (
    <div style={cardStyle}>
      <p style={stepLabel}>Step 03</p>
      <h3 style={chartTitle}>Acoustic Sound Has Collapsed</h3>
      <p style={chartDesc}>Instruments gave way to synthesizers. The warm resonance of acoustic instruments has nearly vanished from mainstream music.</p>
      <svg ref={svgRef} width="100%" height={240} style={{ display: 'block', overflow: 'hidden' }} />
      <div style={{ ...annoStyle, color: '#457b9d' }}>65% decline since the '60s</div>
    </div>
  );
}

// ─── Step 4: THE BIG REVEAL ───────────────────────────────────────────────────
function BigReveal({ data, inView }) {
  const svgRef = useRef(null);
  const drawn = useRef(false);

  useEffect(() => {
    if (!data || !inView || drawn.current) return;
    drawn.current = true;

    const margin = { top: 24, right: 24, bottom: 48, left: 50 };
    const totalW = svgRef.current.clientWidth;
    const width = totalW - margin.left - margin.right;
    const height = 280 - margin.top - margin.bottom;

    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([1921, 2020]).range([0, width]);
    const y = d3.scaleLinear().domain([0, 1]).range([height, 0]);

    // Grid
    svg.append('g')
      .call(d3.axisLeft(y).ticks(4).tickSize(-width).tickFormat(''))
      .call(g => g.select('.domain').remove())
      .call(g => g.selectAll('line').attr('stroke', 'rgba(255,255,255,0.05)'));

    // Axes
    svg.append('g').attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d => `'${String(d).slice(2)}`).ticks(10))
      .call(g => g.selectAll('text').attr('fill', 'rgba(232,232,240,0.35)').attr('font-size', '10px'))
      .call(g => g.select('.domain').attr('stroke', 'rgba(255,255,255,0.1)'));

    svg.append('g')
      .call(d3.axisLeft(y).ticks(4).tickFormat(d => `${Math.round(d * 100)}%`))
      .call(g => g.select('.domain').remove())
      .call(g => g.selectAll('text').attr('fill', 'rgba(232,232,240,0.35)').attr('font-size', '10px'));

    const fields = [
      { key: 'valence',       color: '#f4a261', label: 'Valence' },
      { key: 'loudness_norm', color: '#e9c46a', label: 'Loudness' },
      { key: 'acousticness',  color: '#457b9d', label: 'Acousticness' },
    ];

    fields.forEach(({ key, color, label }, i) => {
      const line = d3.line()
        .x(d => x(d.year))
        .y(d => y(d[key]))
        .curve(d3.curveCatmullRom.alpha(0.5));

      const path = svg.append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 2.5)
        .attr('d', line);

      const length = path.node().getTotalLength();
      path
        .attr('stroke-dasharray', length)
        .attr('stroke-dashoffset', length)
        .transition()
        .delay(i * 600)
        .duration(1800)
        .ease(d3.easeCubicInOut)
        .attr('stroke-dashoffset', 0);

      // End label
      const last = data[data.length - 1];
      svg.append('text')
        .attr('x', x(last.year) + 6)
        .attr('y', y(last[key]))
        .attr('fill', color)
        .attr('font-size', '11px')
        .attr('dominant-baseline', 'middle')
        .attr('opacity', 0)
        .text(label)
        .transition()
        .delay(i * 600 + 1800)
        .duration(400)
        .attr('opacity', 1);
    });

    // Annotation box
    svg.append('rect')
      .attr('x', x(1990))
      .attr('y', 10)
      .attr('width', x(2020) - x(1990))
      .attr('height', height - 10)
      .attr('fill', 'rgba(255,255,255,0.03)')
      .attr('stroke', 'rgba(255,255,255,0.08)')
      .attr('stroke-dasharray', '3,3');

    svg.append('text')
      .attr('x', x(2005))
      .attr('y', height - 6)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'auto')
      .attr('fill', 'rgba(232,232,240,0.3)')
      .attr('font-size', '10px')
      .text('GAP WIDENS →');

    // ── Crosshair tooltip overlay ──────────────────────────────────────────
    const bisect = d3.bisector(d => d.year).left;

    const crosshairLine = svg.append('line')
      .attr('class', 'crosshair')
      .attr('y1', 0).attr('y2', height)
      .attr('stroke', 'rgba(255,255,255,0.18)')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4,3')
      .attr('pointer-events', 'none')
      .style('visibility', 'hidden');

    // One dot per field, updated on hover
    const crosshairDots = fields.map(({ color }) =>
      svg.append('circle')
        .attr('r', 4)
        .attr('fill', color)
        .attr('stroke', '#0a0a0f')
        .attr('stroke-width', 1.5)
        .attr('pointer-events', 'none')
        .style('visibility', 'hidden')
    );

    const revealTooltip = d3.select('body')
      .selectAll('.reveal-tooltip')
      .data([null])
      .join('div')
      .attr('class', 'reveal-tooltip')
      .style('position', 'absolute')
      .style('z-index', '200')
      .style('visibility', 'hidden')
      .style('padding', '10px 14px')
      .style('background', 'rgba(10,10,15,0.95)')
      .style('border', '1px solid rgba(255,255,255,0.1)')
      .style('border-radius', '8px')
      .style('color', '#e8e8f0')
      .style('font-size', '12px')
      .style('line-height', '1.9')
      .style('pointer-events', 'none')
      .style('box-shadow', '0 8px 24px rgba(0,0,0,0.5)');

    // Invisible hit area across full chart
    svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'none')
      .attr('pointer-events', 'all')
      .style('cursor', 'crosshair')
      .on('mousemove', function (event) {
        const [mx] = d3.pointer(event);
        const yr = Math.round(x.invert(mx));
        const idx = Math.min(bisect(data, yr), data.length - 1);
        const d = data[idx];
        if (!d) return;

        const xPos = x(d.year);
        crosshairLine
          .attr('x1', xPos).attr('x2', xPos)
          .style('visibility', 'visible');

        crosshairDots.forEach((dot, i) => {
          dot
            .attr('cx', xPos)
            .attr('cy', y(d[fields[i].key]))
            .style('visibility', 'visible');
        });

        revealTooltip
          .style('visibility', 'visible')
          .style('left', (event.pageX + 16) + 'px')
          .style('top',  (event.pageY - 60) + 'px')
          .html(
            `<strong style="color:#e8e8f0;letter-spacing:0.05em">${d.year}</strong><br/>` +
            `<span style="color:#e9c46a">● Loudness&nbsp;&nbsp;&nbsp; ${(d.loudness_norm * 100).toFixed(1)}%</span><br/>` +
            `<span style="color:#f4a261">● Valence&nbsp;&nbsp;&nbsp;&nbsp; ${(d.valence * 100).toFixed(1)}%</span><br/>` +
            `<span style="color:#457b9d">● Acousticness ${(d.acousticness * 100).toFixed(1)}%</span>`
          );
      })
      .on('mouseleave', () => {
        crosshairLine.style('visibility', 'hidden');
        crosshairDots.forEach(dot => dot.style('visibility', 'hidden'));
        revealTooltip.style('visibility', 'hidden');
      });

  }, [data, inView]);

  return (
    <div style={{ ...cardStyle, background: 'linear-gradient(135deg, rgba(26,26,46,0.9) 0%, rgba(20,15,30,0.9) 100%)', border: '1px solid rgba(244,162,97,0.2)' }}>
      <p style={{ ...stepLabel, color: '#e63946' }}>The Reveal</p>
      <h3 style={{ ...chartTitle, fontSize: '1.5rem' }}>All Three — Together</h3>
      <p style={chartDesc}>When you overlay them: valence falls, loudness rises, acousticness collapses. Three diverging lines forming a paradox — music that feels more intense, yet more hollow.</p>
      <svg ref={svgRef} width="100%" height={280} />

      <div style={styles.revealLegend}>
        {[
          { c: '#f4a261', l: 'Valence declining' },
          { c: '#e9c46a', l: 'Loudness rising' },
          { c: '#457b9d', l: 'Acousticness collapsing' },
        ].map(({ c, l }) => (
          <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'rgba(232,232,240,0.6)' }}>
            <span style={{ width: 20, height: 2, background: c, borderRadius: 2, display: 'inline-block' }} />
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Shared draw helper ───────────────────────────────────────────────────────
function drawLine(svgEl, data, key, color, area = false, label = '') {
  const margin = { top: 16, right: 16, bottom: 36, left: 46 };
  const totalW = svgEl.clientWidth;
  const width = totalW - margin.left - margin.right;
  const height = 240 - margin.top - margin.bottom;

  d3.select(svgEl).selectAll('*').remove();

  const svg = d3.select(svgEl).append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // ── Defs: clip path + gradient ──────────────────────────────────────────
  const defs = svg.append('defs');

  defs.append('clipPath')
    .attr('id', `clip-${key}`)
    .append('rect')
    .attr('width', width)
    .attr('height', height);

  const gradient = defs.append('linearGradient')
    .attr('id', `grad-${key}`)
    .attr('x1', '0%').attr('y1', '0%')
    .attr('x2', '0%').attr('y2', '100%');

  gradient.append('stop')
    .attr('offset', '0%')
    .attr('stop-color', color)
    .attr('stop-opacity', 0.4);

  gradient.append('stop')
    .attr('offset', '100%')
    .attr('stop-color', color)
    .attr('stop-opacity', 0);

  const x = d3.scaleLinear().domain([1921, 2020]).range([0, width]);
  const y = d3.scaleLinear().domain([0, 1]).range([height, 0]);

  // ── Grid ────────────────────────────────────────────────────────────────
  svg.append('g')
    .call(d3.axisLeft(y).ticks(4).tickSize(-width).tickFormat(''))
    .call(g => g.select('.domain').remove())
    .call(g => g.selectAll('line').attr('stroke', 'rgba(255,255,255,0.05)'));

  // ── Axes ────────────────────────────────────────────────────────────────
  svg.append('g').attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x).tickFormat(d => `'${String(d).slice(2)}`).ticks(8))
    .call(g => g.selectAll('text').attr('fill', 'rgba(232,232,240,0.3)').attr('font-size', '10px'))
    .call(g => g.select('.domain').attr('stroke', 'rgba(255,255,255,0.08)'));

  svg.append('g')
    .call(d3.axisLeft(y).ticks(4).tickFormat(d => `${Math.round(d * 100)}%`))
    .call(g => g.select('.domain').remove())
    .call(g => g.selectAll('text').attr('fill', 'rgba(232,232,240,0.3)').attr('font-size', '10px'));

  // ── Clipped group: area + line + hover points ────────────────────────────
  const chartGroup = svg.append('g').attr('clip-path', `url(#clip-${key})`);

  // Area fill
  const areaGen = d3.area()
    .x(d => x(d.year))
    .y0(height)
    .y1(d => y(d[key]))
    .curve(d3.curveCatmullRom.alpha(0.5));

  chartGroup.append('path')
    .datum(data)
    .attr('fill', `url(#grad-${key})`)
    .attr('d', areaGen)
    .attr('opacity', 0)
    .transition()
    .duration(2000)
    .attr('opacity', 1);

  // Line
  const lineGen = d3.line()
    .x(d => x(d.year))
    .y(d => y(d[key]))
    .curve(d3.curveCatmullRom.alpha(0.5));

  const path = chartGroup.append('path')
    .datum(data)
    .attr('fill', 'none')
    .attr('stroke', color)
    .attr('stroke-width', 2.5)
    .attr('d', lineGen);

  // Animate line draw
  const length = path.node().getTotalLength();
  path
    .attr('stroke-dasharray', length)
    .attr('stroke-dashoffset', length)
    .transition()
    .duration(2000)
    .ease(d3.easeCubicInOut)
    .attr('stroke-dashoffset', 0);

  // ── Tooltip (one shared div per key, avoids duplicates) ──────────────────
  const tooltip = d3.select('body')
    .selectAll(`.d3-tip-${key}`)
    .data([null])
    .join('div')
    .attr('class', `d3-tip-${key}`)
    .style('position', 'absolute')
    .style('z-index', '200')
    .style('visibility', 'hidden')
    .style('padding', '8px 12px')
    .style('background', 'rgba(10,10,15,0.95)')
    .style('border', `1px solid ${color}44`)
    .style('border-radius', '7px')
    .style('color', '#e8e8f0')
    .style('font-size', '12px')
    .style('line-height', '1.7')
    .style('pointer-events', 'none')
    .style('box-shadow', '0 6px 20px rgba(0,0,0,0.5)');

  // ── Hover points (inside chartGroup so clipPath applies) ─────────────────
  // Use every ~2 years to keep point count reasonable without losing coverage
  const hoverData = data.filter((_, i) => i % 2 === 0 || i === data.length - 1);

  chartGroup.selectAll('.hover-point')
    .data(hoverData)
    .enter()
    .append('circle')
    .attr('class', 'hover-point')
    .attr('cx', d => x(d.year))
    .attr('cy', d => y(d[key]))
    .attr('r', 7)              // invisible but large hit target
    .attr('fill', color)
    .attr('opacity', 0)
    .style('pointer-events', 'all')
    .style('cursor', 'crosshair')
    .on('mouseover', function (event, d) {
      d3.select(this)
        .transition().duration(100)
        .attr('opacity', 1)
        .attr('r', 6);
      tooltip
        .style('visibility', 'visible')
        .html(
          `<strong style="color:${color}">${d.year}</strong><br/>` +
          `${label}: <strong>${(d[key] * 100).toFixed(1)}%</strong>`
        );
    })
    .on('mousemove', event => {
      tooltip
        .style('top',  (event.pageY - 52) + 'px')
        .style('left', (event.pageX + 14) + 'px');
    })
    .on('mouseout', function () {
      d3.select(this)
        .transition().duration(150)
        .attr('opacity', 0)
        .attr('r', 7);
      tooltip.style('visibility', 'hidden');
    });
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export default function SadnessParadox({ data }) {
  const [ref, inView] = useInView({ threshold: 0.1 });

  const yearData = React.useMemo(() => {
    if (!data || !data.length) return [];
    const byYear = d3.rollup(
      data,
      rows => ({
        year: rows[0].year,
        valence: d3.mean(rows, r => r.valence),
        loudness_norm: d3.mean(rows, r => normalizeLoudness(r.loudness)),
        acousticness: d3.mean(rows, r => r.acousticness),
        energy: d3.mean(rows, r => r.energy),
      }),
      d => d.year
    );
    return Array.from(byYear.values()).sort((a, b) => a.year - b.year);
  }, [data]);

  return (
    <section ref={ref} style={styles.section}>
      <div className="container">
        <p className="section-label" style={{ color: '#e63946' }}>The Sadness Paradox</p>
        <h2 className="section-title" style={styles.headline}>
          Music is getting sadder,<br />
          <em>louder</em>, and less acoustic.
        </h2>
        <p className="section-body" style={{ marginBottom: '64px' }}>
          These aren't random fluctuations. Three separate acoustic forces have been moving in concert — painting a portrait of how popular taste shifted across the century. The reveal unfolds in four steps.
        </p>

        <div style={styles.grid}>
          <ValenceChart data={yearData} inView={inView} />
          <LoudnessChart data={yearData} inView={inView} />
          <AcousticnessChart data={yearData} inView={inView} />
          <BigReveal data={yearData} inView={inView} />
        </div>
      </div>
    </section>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const cardStyle = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: '16px',
  padding: '28px',
  transition: 'border-color 0.3s ease',
};

const stepLabel = {
  fontSize: '10px',
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: 'rgba(232,232,240,0.3)',
  marginBottom: '8px',
  fontWeight: 600,
};

const chartTitle = {
  fontFamily: "'DM Serif Display', serif",
  fontSize: '1.25rem',
  marginBottom: '10px',
  color: '#e8e8f0',
};

const chartDesc = {
  fontSize: '13px',
  color: 'rgba(232,232,240,0.45)',
  lineHeight: 1.7,
  marginBottom: '20px',
};

const annoStyle = {
  fontSize: '13px',
  fontWeight: 600,
  letterSpacing: '0.05em',
  marginTop: '12px',
};

const styles = {
  section: {
    padding: '100px 0',
    background: 'linear-gradient(180deg, var(--bg) 0%, var(--bg2) 100%)',
  },
  headline: {
    color: '#e8e8f0',
    marginBottom: '20px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))',
    gap: '24px',
  },
  revealLegend: {
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap',
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid rgba(255,255,255,0.07)',
  },
};
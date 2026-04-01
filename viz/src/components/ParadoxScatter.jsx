import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { useInView } from '../hooks/useScrollProgress';

// ── Decade colour palette — warm→cold mirrors valence decline ─────────────
const DECADE_COLORS = {
  1960: '#F59E0B', 1970: '#FBBF24', 1980: '#C084FC',
  1990: '#818CF8', 2000: '#60A5FA', 2010: '#457b9d', 2020: '#22D3EE',
};

// ── Aggregate rows into one point per decade ───────────────────────────────
function aggregateByDecade(rows) {
  const grouped = d3.group(rows, d => d.decade);
  return Array.from(grouped, ([decade, items]) => {
    const medV = d3.median(items, d => d.valence);
    const rep  = items.reduce((best, r) =>
      Math.abs(r.valence - medV) < Math.abs(best.valence - medV) ? r : best
    );
    return {
      decade,
      valence:      d3.mean(items, d => d.valence),
      danceability: d3.mean(items, d => d.danceability),
      count:        items.length,
      trackName:    rep.name,
      trackArtist:  rep.artists,
    };
  }).sort((a, b) => a.decade - b.decade);
}

// ── D3 draw ────────────────────────────────────────────────────────────────
function draw(svgEl, decades) {
  const margin = { top: 40, right: 40, bottom: 64, left: 64 };
  const totalW = svgEl.clientWidth || 820;
  const width  = totalW - margin.left - margin.right;
  const height = 420   - margin.top  - margin.bottom;

  d3.select(svgEl).selectAll('*').remove();

  const svg = d3.select(svgEl)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const xScale = d3.scaleLinear()
    .domain([d3.min(decades, d => d.danceability) - 0.03,
             d3.max(decades, d => d.danceability) + 0.03])
    .range([0, width]);

  const yScale = d3.scaleLinear()
    .domain([d3.min(decades, d => d.valence) - 0.03,
             d3.max(decades, d => d.valence) + 0.03])
    .range([height, 0]);

  // ── Grid ──
  svg.append('g')
    .call(d3.axisLeft(yScale).tickSize(-width).tickFormat(''))
    .call(g => g.select('.domain').remove())
    .call(g => g.selectAll('line').attr('stroke', 'rgba(255,255,255,0.05)'));

  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(xScale).tickSize(-height).tickFormat(''))
    .call(g => g.select('.domain').remove())
    .call(g => g.selectAll('line').attr('stroke', 'rgba(255,255,255,0.05)'));

  // ── Axes ──
  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(xScale).ticks(5).tickFormat(d3.format('.2f')))
    .call(g => g.select('.domain').attr('stroke', 'rgba(255,255,255,0.08)'))
    .call(g => g.selectAll('line').remove())
    .call(g => g.selectAll('text')
      .attr('fill', 'rgba(232,232,240,0.35)').attr('font-size', '11px'));

  svg.append('g')
    .call(d3.axisLeft(yScale).ticks(5).tickFormat(d3.format('.0%')))
    .call(g => g.select('.domain').remove())
    .call(g => g.selectAll('line').remove())
    .call(g => g.selectAll('text')
      .attr('fill', 'rgba(232,232,240,0.35)').attr('font-size', '11px'));

  // ── Axis labels ──
  svg.append('text')
    .attr('x', width / 2).attr('y', height + 50)
    .attr('text-anchor', 'middle')
    .attr('fill', 'rgba(232,232,240,0.25)')
    .attr('font-size', '10px').attr('letter-spacing', '0.15em')
    .text('DANCEABILITY →');

  svg.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -height / 2).attr('y', -50)
    .attr('text-anchor', 'middle')
    .attr('fill', 'rgba(232,232,240,0.25)')
    .attr('font-size', '10px').attr('letter-spacing', '0.15em')
    .text('VALENCE / HAPPINESS →');

  // ── Paradox arrow (1960s → 2010s) ──
  const first  = decades[0];
  const target = decades.find(d => d.decade === 2010) ?? decades[decades.length - 2];
  if (first && target) {
    const ax1 = xScale(first.danceability),  ay1 = yScale(first.valence);
    const ax2 = xScale(target.danceability), ay2 = yScale(target.valence);
    const midX = (ax1 + ax2) / 2, midY = (ay1 + ay2) / 2;

    const defs = svg.append('defs');
    defs.append('marker')
      .attr('id', 'paradox-arr').attr('viewBox', '0 0 10 10')
      .attr('refX', 8).attr('refY', 5)
      .attr('markerWidth', 6).attr('markerHeight', 6)
      .attr('orient', 'auto-start-reverse')
      .append('path').attr('d', 'M2 1L8 5L2 9')
        .attr('fill', 'none').attr('stroke', 'rgba(251,113,133,0.7)')
        .attr('stroke-width', 1.5).attr('stroke-linecap', 'round');

    svg.append('line')
      .attr('x1', ax1).attr('y1', ay1).attr('x2', ax2).attr('y2', ay2)
      .attr('stroke', 'rgba(251,113,133,0.45)').attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '5 4')
      .attr('marker-end', 'url(#paradox-arr)');

    svg.append('text').attr('x', midX + 10).attr('y', midY - 8)
      .attr('fill', 'rgba(251,113,133,0.8)').attr('font-size', '11px')
      .attr('font-style', 'italic').text('The paradox:');
    svg.append('text').attr('x', midX + 10).attr('y', midY + 6)
      .attr('fill', 'rgba(251,113,133,0.8)').attr('font-size', '11px')
      .attr('font-style', 'italic').text('sadder AND more danceable');
  }

  // ── Connecting line through decades ──
  svg.append('path')
    .datum(decades)
    .attr('fill', 'none')
    .attr('stroke', 'rgba(255,255,255,0.08)').attr('stroke-width', 1.5)
    .attr('d', d3.line()
      .x(d => xScale(d.danceability))
      .y(d => yScale(d.valence))
      .curve(d3.curveMonotoneX));

  // ── Tooltip ──
  const tooltip = d3.select('body')
    .selectAll('.paradox-tooltip')
    .data([null])
    .join('div')
    .attr('class', 'paradox-tooltip')
    .style('position', 'absolute')
    .style('z-index', '100')
    .style('visibility', 'hidden')
    .style('padding', '10px 14px')
    .style('background', 'rgba(10,10,15,0.95)')
    .style('border', '1px solid rgba(255,255,255,0.07)')
    .style('border-radius', '8px')
    .style('color', '#e8e8f0')
    .style('font-size', '12px')
    .style('line-height', '1.8')
    .style('pointer-events', 'none')
    .style('backdrop-filter', 'blur(12px)')
    .style('box-shadow', '0 8px 32px rgba(0,0,0,0.5)');

  // ── Dots ──
  svg.selectAll('.dot')
    .data(decades)
    .join('circle')
      .attr('class', 'dot')
      .attr('cx', d => xScale(d.danceability))
      .attr('cy', d => yScale(d.valence))
      .attr('r', 10)
      .attr('fill', d => DECADE_COLORS[d.decade] ?? '#8B5CF6')
      .attr('stroke', '#0a0a0f').attr('stroke-width', 2.5)
      .attr('cursor', 'pointer')
      .on('mouseover', (event, d) => {
        d3.select(event.currentTarget).attr('r', 14);
        tooltip
          .style('visibility', 'visible')
          .html(
            `<strong style="color:${DECADE_COLORS[d.decade] ?? '#8B5CF6'}">${d.decade}s</strong><br/>` +
            `Happiness&nbsp;&nbsp;&nbsp; ${(d.valence * 100).toFixed(1)}%<br/>` +
            `Danceability ${(d.danceability * 100).toFixed(1)}%<br/>` +
            `<span style="color:rgba(232,232,240,0.35);font-size:11px">` +
            `<em>${d.trackName ?? ''}</em><br/>${d.trackArtist ?? ''}<br/>` +
            `n = ${d.count?.toLocaleString()}</span>`
          );
      })
      .on('mousemove', event => {
        tooltip
          .style('top',  (event.pageY - 10) + 'px')
          .style('left', (event.pageX + 16) + 'px');
      })
      .on('mouseout', event => {
        d3.select(event.currentTarget).attr('r', 10);
        tooltip.style('visibility', 'hidden');
      });

  // ── Decade labels above dots ──
  svg.selectAll('.dlabel')
    .data(decades)
    .join('text')
      .attr('class', 'dlabel')
      .attr('x', d => xScale(d.danceability))
      .attr('y', d => yScale(d.valence) - 15)
      .attr('text-anchor', 'middle')
      .attr('fill', d => DECADE_COLORS[d.decade] ?? '#8B5CF6')
      .attr('font-size', '11px').attr('font-weight', '600')
      .attr('pointer-events', 'none')
      .text(d => `${d.decade}s`);
}

// ── Component ──────────────────────────────────────────────────────────────
export default function ParadoxScatter({ data = [] }) {
  const [ref, inView] = useInView({ threshold: 0.05 });
  const svgRef        = useRef(null);

  const decades = useMemo(() => aggregateByDecade(
    data.filter(d => d.decade && !isNaN(d.valence) && !isNaN(d.danceability))
  ), [data]);

  useEffect(() => {
    if (!decades.length || !inView || !svgRef.current) return;
    draw(svgRef.current, decades);
  }, [decades, inView]);

  return (
    <section ref={ref} style={sectionStyle}>
      <div className="container">

        <p className="section-label" style={{ color: '#FB7185' }}>
          The Sadness Paradox
        </p>

        <h2 className="section-title" style={{ color: '#e8e8f0', marginBottom: '20px' }}>
          Music Got Sadder<br />
          <em>But More Danceable</em>
        </h2>

        <p className="section-body" style={{ marginBottom: '48px' }}>
          Here's the paradox at the heart of this story. Each dot represents the
          average happiness and danceability of all popular tracks in a decade.
          The 1970s sit at the top — the happiest and least danceable era.
          By the 2010s, music had become measurably sadder, yet significantly
          more danceable. These two trends should pull in opposite directions.
          Instead, they moved together. Hover over any decade to see a
          representative track and the exact values.
        </p>

        {/* Chart card */}
        <div style={cardStyle}>
          <svg ref={svgRef} width="100%" height={420} />
        </div>

        {/* Legend */}
        <div style={legendRow}>
          <span style={legendItem}>
            <span style={{ ...legendSwatch, background: '#F59E0B' }} />
            <span style={{ color: 'rgba(232,232,240,0.65)' }}>
              Warmest — <strong style={{ color: '#F59E0B' }}>1960s–70s</strong>&nbsp;(peak happiness)
            </span>
          </span>
          <span style={legendItem}>
            <span style={{ ...legendSwatch, background: '#457b9d' }} />
            <span style={{ color: 'rgba(232,232,240,0.65)' }}>
              Coolest — <strong style={{ color: '#60A5FA' }}>2010s</strong>&nbsp;(trough happiness)
            </span>
          </span>
          <span style={legendItem}>
            <span style={{ width: 20, height: 2, background: 'rgba(251,113,133,0.5)', display: 'inline-block', borderRadius: 2 }} />
            <span style={{ color: 'rgba(232,232,240,0.4)', fontSize: 12 }}>Direction of travel</span>
          </span>
        </div>

      </div>
    </section>
  );
}

// ─── Styles — mirror ValenceBoxPlot exactly ───────────────────────────────
const sectionStyle = {
  padding: '100px 0',
  background: 'linear-gradient(180deg, var(--bg) 0%, var(--bg2) 100%)',
};

const cardStyle = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: '16px',
  padding: '8px',
  overflowX: 'auto',
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
import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { useInView } from '../hooks/useScrollProgress';
import { normalizeLoudness } from '../utils/dataUtils';

// Warm → cool mirrors the valence decline story
const DECADE_COLORS = {
  1920: '#F97316', 1930: '#F59E0B', 1940: '#EAB308',
  1950: '#84CC16', 1960: '#F59E0B', 1970: '#FBBF24',
  1980: '#C084FC', 1990: '#818CF8', 2000: '#60A5FA',
  2010: '#457b9d', 2020: '#22D3EE',
};


const MODES = [
  {
    id: 'dance', xKey: 'danceability',
    xLabel: 'DANCEABILITY →',
    yLabel: 'VALENCE / HAPPINESS →',
    title: 'Valence vs. Danceability',
    paradoxCaption: 'sadder AND more danceable',
  },
  {
    id: 'loud', xKey: 'loudness_norm',
    xLabel: 'LOUDNESS →',
    yLabel: 'VALENCE / HAPPINESS →',
    title: 'Valence vs. Loudness',
    paradoxCaption: 'sadder AND louder',
  },
  {
    id: 'acoustic', xKey: 'acousticness',
    xLabel: '← ACOUSTICNESS (high → low)',
    yLabel: 'VALENCE / HAPPINESS →',
    title: 'Valence vs. Acousticness',
    paradoxCaption: 'both declining together',
  },
];

function drawScatter(svgEl, decades, mode) {
  const margin = { top: 44, right: 44, bottom: 68, left: 68 };
  const totalW = svgEl.clientWidth || 820;
  const width  = totalW - margin.left - margin.right;
  const height = 440 - margin.top - margin.bottom;

  d3.select(svgEl).selectAll('*').remove();

  const svg = d3.select(svgEl)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const xKey = mode.xKey;

  const xPad = 0.04, yPad = 0.04;
  const xExtent = d3.extent(decades, d => d[xKey]);
  const yExtent = d3.extent(decades, d => d.valence);

  // Acousticness is inverted: high = 1960s (left), low = 2020s (right)
  // This keeps the visual left→right = older→newer flow consistent across all three modes
  const xScale = d3.scaleLinear()
    .domain(
      mode.id === 'acoustic'
        ? [xExtent[1] + xPad, xExtent[0] - xPad]   // flipped: high acousticness left
        : [xExtent[0] - xPad, xExtent[1] + xPad]
    )
    .range([0, width]);
  const yScale = d3.scaleLinear()
    .domain([yExtent[0] - yPad, yExtent[1] + yPad]).range([height, 0]);

  // Grid
  svg.append('g')
    .call(d3.axisLeft(yScale).tickSize(-width).tickFormat(''))
    .call(g => g.select('.domain').remove())
    .call(g => g.selectAll('line').attr('stroke', 'rgba(255,255,255,0.05)'));
  svg.append('g').attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(xScale).tickSize(-height).tickFormat(''))
    .call(g => g.select('.domain').remove())
    .call(g => g.selectAll('line').attr('stroke', 'rgba(255,255,255,0.05)'));

  // Axes
  svg.append('g').attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(xScale).ticks(5).tickFormat(d3.format('.0%')))
    .call(g => g.select('.domain').attr('stroke', 'rgba(255,255,255,0.08)'))
    .call(g => g.selectAll('line').remove())
    .call(g => g.selectAll('text').attr('fill', 'rgba(232,232,240,0.35)').attr('font-size', '11px'));
  svg.append('g')
    .call(d3.axisLeft(yScale).ticks(5).tickFormat(d3.format('.0%')))
    .call(g => g.select('.domain').remove())
    .call(g => g.selectAll('line').remove())
    .call(g => g.selectAll('text').attr('fill', 'rgba(232,232,240,0.35)').attr('font-size', '11px'));

  // Axis labels
  svg.append('text')
    .attr('x', width / 2).attr('y', height + 54)
    .attr('text-anchor', 'middle')
    .attr('fill', 'rgba(232,232,240,0.25)')
    .attr('font-size', '10px').attr('letter-spacing', '0.15em')
    .text(mode.xLabel);
  svg.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -height / 2).attr('y', -54)
    .attr('text-anchor', 'middle')
    .attr('fill', 'rgba(232,232,240,0.25)')
    .attr('font-size', '10px').attr('letter-spacing', '0.15em')
    .text(mode.yLabel);

  // Paradox arrow: 1960s → 2010s (explicitly by decade value, not array position)
  const first  = decades.find(d => d.decade === 1960) ?? decades[0];
  const target = decades.find(d => d.decade === 2010) ?? decades[decades.length - 2];
  if (first && target) {
    const ax1 = xScale(first[xKey]),   ay1 = yScale(first.valence);
    const ax2 = xScale(target[xKey]),  ay2 = yScale(target.valence);
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

    svg.append('text').attr('x', midX + 10).attr('y', midY - 9)
      .attr('fill', 'rgba(251,113,133,0.8)').attr('font-size', '11px')
      .attr('font-style', 'italic').text('The paradox:');
    svg.append('text').attr('x', midX + 10).attr('y', midY + 5)
      .attr('fill', 'rgba(251,113,133,0.8)').attr('font-size', '11px')
      .attr('font-style', 'italic').text(mode.paradoxCaption);
  }

  // Connecting path — sorted by decade so chronological order holds in all three axis modes
  const chronological = [...decades].sort((a, b) => a.decade - b.decade);
  svg.append('path').datum(chronological)
    .attr('fill', 'none')
    .attr('stroke', 'rgba(255,255,255,0.1)').attr('stroke-width', 1.5)
    .attr('d', d3.line()
      .x(d => xScale(d[xKey])).y(d => yScale(d.valence))
      .curve(d3.curveCatmullRom.alpha(0.5)));

  // Tooltip
  const tip = d3.select('body')
    .selectAll('.rs-tip').data([null]).join('div').attr('class', 'rs-tip')
    .style('position', 'absolute').style('z-index', '300').style('visibility', 'hidden')
    .style('padding', '10px 14px')
    .style('background', 'rgba(10,10,15,0.96)')
    .style('border', '1px solid rgba(255,255,255,0.08)')
    .style('border-radius', '8px').style('color', '#e8e8f0')
    .style('font-size', '12px').style('line-height', '1.85')
    .style('pointer-events', 'none')
    .style('backdrop-filter', 'blur(12px)')
    .style('box-shadow', '0 8px 32px rgba(0,0,0,0.55)');

  // Dots
  decades.forEach((d, i) => {
    const cx   = xScale(d[xKey]);
    const cy   = yScale(d.valence);
    const col  = DECADE_COLORS[d.decade] ?? '#8B5CF6';
    const song   = d.trackName;
    const artist = d.trackArtist;

    // Halo ring
    svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', 0)
      .attr('fill', 'none').attr('stroke', col).attr('stroke-width', 1)
      .attr('opacity', 0.35)
      .transition().delay(i * 70).duration(500).attr('r', 16);

    // Main dot
    svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', 0)
      .attr('fill', col).attr('stroke', '#0a0a0f').attr('stroke-width', 2.5)
      .attr('cursor', 'pointer')
      .transition().delay(i * 70).duration(400).ease(d3.easeBounceOut).attr('r', 10);

    // Decade label above
    svg.append('text')
      .attr('x', cx).attr('y', cy - 18)
      .attr('text-anchor', 'middle')
      .attr('fill', col).attr('font-size', '11px').attr('font-weight', '600')
      .attr('opacity', 0).attr('pointer-events', 'none')
      .text(`${d.decade}s`)
      .transition().delay(i * 70 + 300).duration(300).attr('opacity', 1);

    // Hit area
    svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', 20)
      .attr('fill', 'none').attr('pointer-events', 'all').style('cursor', 'pointer')
      .on('mouseover', function() {
        d3.select(this.previousSibling).transition().duration(100);
        tip.style('visibility', 'visible').html(
          `<strong style="color:${col};font-size:14px">${d.decade}s</strong><br/>` +
          `Happiness&nbsp;&nbsp;&nbsp;&nbsp; ${(d.valence * 100).toFixed(1)}%<br/>` +
          `${{ dance: 'Danceability', loud: 'Loudness', acoustic: 'Acousticness' }[mode.id]}&nbsp; ${(d[xKey] * 100).toFixed(1)}%<br/>` +
          (song
            ? `<div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.08);font-size:11px">` +
              `<em style="color:#e8e8f0">${song}</em><br/>` +
              `<span style="color:rgba(232,232,240,0.4)">${artist}</span></div>`
            : '') +
          `<div style="margin-top:4px;font-size:11px;color:rgba(232,232,240,0.3)">n = ${d.count?.toLocaleString()}</div>`
        );
      })
      .on('mousemove', event => {
        tip.style('top', (event.pageY - 10) + 'px').style('left', (event.pageX + 18) + 'px');
      })
      .on('mouseout', () => tip.style('visibility', 'hidden'));
  });
}

export default function RelationshipScatter({ data, popularity, genre }) {
  const [ref, inView] = useInView({ threshold: 0.1 });
  const svgRef = useRef(null);
  const [modeIdx, setModeIdx] = useState(0);
  const mode = MODES[modeIdx];

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
        const medV = d3.median(rows, r => r.valence);
        const rep  = rows.reduce((best, r) =>
          Math.abs(r.valence - medV) < Math.abs(best.valence - medV) ? r : best
        );
        return {
          decade:       +rows[0].decade,
          valence:      d3.mean(rows, r => r.valence),
          danceability:  d3.mean(rows, r => r.danceability),
          loudness_norm: d3.mean(rows, r => normalizeLoudness(r.loudness)),
          acousticness:  d3.mean(rows, r => r.acousticness),
          count:         rows.length,
          trackName:     rep.name,
          trackArtist:   rep.artists,
        };
      },
      d => +d.decade
    );
    return Array.from(byDecade.values())
      .filter(d => d.decade >= 1960 && d.decade <= 2020 && !isNaN(d.valence) && !isNaN(d.danceability))
      .sort((a, b) => a.decade - b.decade);
  }, [data, popularity, genre]);

  useEffect(() => {
    if (!decadeData.length || !svgRef.current || !inView) return;
    drawScatter(svgRef.current, decadeData, mode);
  }, [decadeData, mode, inView]);

  return (
    <section ref={ref} style={styles.section}>
      <div className="container">
        <p className="section-label" style={{ color: '#FB7185' }}>The Sadness Paradox</p>
        <h2 className="section-title" style={{ color: '#e8e8f0', marginBottom: 16 }}>
          Music Got Sadder<br /><em>But More Compelling</em>
        </h2>
        <p className="section-body" style={{ marginBottom: 36 }}>
          Each dot represents a decade, mapping a clear trend: as valence declines, danceability and loudness rise. This reveals a compelling paradox — modern music is becoming sadder yet more energetic, suggesting a divorce between emotional tone and physical engagement. Hover to explore the defining sound of each decade.
        </p>

        <div style={styles.toggleRow}>
          {MODES.map((m, i) => (
            <button key={m.id} onClick={() => setModeIdx(i)} style={{
              ...styles.toggleBtn,
              borderColor:  modeIdx === i ? '#FB7185' : 'rgba(255,255,255,0.1)',
              background:   modeIdx === i ? 'rgba(251,113,133,0.1)' : 'rgba(255,255,255,0.03)',
              color:        modeIdx === i ? '#e8e8f0' : 'rgba(232,232,240,0.4)',
            }}>
              {m.title}
            </button>
          ))}
        </div>

        <div style={styles.card}>
          <svg ref={svgRef} width="100%" height={440} style={{ display: 'block' }} />
        </div>

        <div style={styles.legend}>
          {[
            { color: '#F59E0B', label: '1960s–70s — peak happiness' },
            { color: '#60A5FA', label: '2000s–10s — trough happiness' },
          ].map(({ color, label }) => (
            <span key={label} style={styles.legendItem}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
              <span style={{ color: 'rgba(232,232,240,0.55)', fontSize: 12 }}>{label}</span>
            </span>
          ))}
          <span style={styles.legendItem}>
            <span style={{ width: 22, height: 2, background: 'rgba(251,113,133,0.5)', display: 'inline-block', borderRadius: 2 }} />
            <span style={{ color: 'rgba(232,232,240,0.4)', fontSize: 12 }}>Direction of travel</span>
          </span>
          <span style={{ ...styles.legendItem, marginLeft: 'auto', fontSize: 11, color: 'rgba(232,232,240,0.25)', fontStyle: 'italic' }}>
            {MODES[modeIdx].id === 'acoustic'
              ? 'Co-decline: both fell together — possible causal link'
              : 'Paradox: opposite directions moved together'}
          </span>
        </div>
      </div>
    </section>
  );
}

const styles = {
  section: {
    padding: '100px 0',
    background: 'linear-gradient(180deg, var(--bg2) 0%, var(--bg) 100%)',
  },
  toggleRow: { display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' },
  toggleBtn: {
    padding: '10px 22px', border: '1px solid', borderRadius: 8, cursor: 'pointer',
    fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", transition: 'all 0.2s',
  },
  card: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 16, padding: '8px', overflowX: 'auto', marginBottom: 16,
  },
  legend: { display: 'flex', gap: 24, flexWrap: 'wrap', paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.07)' },
  legendItem: { display: 'flex', alignItems: 'center', gap: 8 },
};
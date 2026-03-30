import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useInView } from '../hooks/useScrollProgress';

// Pre-aggregated by decade × genre (via Gemini AI from spotify_clean.csv)
const rawData = [
  {"decade":1960,"loudness":-10.82,"genre_list":"All"},{"decade":1970,"loudness":-10.42,"genre_list":"All"},
  {"decade":1980,"loudness":-9.52,"genre_list":"All"},{"decade":1990,"loudness":-8.32,"genre_list":"All"},
  {"decade":2000,"loudness":-6.48,"genre_list":"All"},{"decade":2010,"loudness":-7.37,"genre_list":"All"},
  {"decade":2020,"loudness":-6.68,"genre_list":"All"},
  {"decade":1960,"loudness":-9.6,"genre_list":"album rock"},{"decade":1960,"loudness":-10.03,"genre_list":"classic rock"},
  {"decade":1960,"loudness":-9.79,"genre_list":"dance pop"},{"decade":1960,"loudness":-7.18,"genre_list":"hip hop"},
  {"decade":1960,"loudness":-10.77,"genre_list":"mellow gold"},{"decade":1960,"loudness":-9.22,"genre_list":"modern rock"},
  {"decade":1960,"loudness":-9.22,"genre_list":"pop"},{"decade":1960,"loudness":-9.22,"genre_list":"pop rock"},
  {"decade":1960,"loudness":-7.18,"genre_list":"r&b"},{"decade":1960,"loudness":-10.1,"genre_list":"rock"},
  {"decade":1960,"loudness":-10.9,"genre_list":"soft rock"},
  {"decade":1970,"loudness":-10.02,"genre_list":"album rock"},{"decade":1970,"loudness":-3.68,"genre_list":"alternative metal"},
  {"decade":1970,"loudness":-10.42,"genre_list":"classic rock"},{"decade":1970,"loudness":-11.32,"genre_list":"contemporary country"},
  {"decade":1970,"loudness":-10.64,"genre_list":"dance pop"},{"decade":1970,"loudness":-11.9,"genre_list":"hip hop"},
  {"decade":1970,"loudness":-7.94,"genre_list":"latin"},{"decade":1970,"loudness":-10.78,"genre_list":"mellow gold"},
  {"decade":1970,"loudness":-11.63,"genre_list":"modern rock"},{"decade":1970,"loudness":-11.52,"genre_list":"pop"},
  {"decade":1970,"loudness":-13.95,"genre_list":"pop rap"},{"decade":1970,"loudness":-9.58,"genre_list":"pop rock"},
  {"decade":1970,"loudness":-12.1,"genre_list":"r&b"},{"decade":1970,"loudness":-11.9,"genre_list":"rap"},
  {"decade":1970,"loudness":-10.23,"genre_list":"rock"},{"decade":1970,"loudness":-10.72,"genre_list":"soft rock"},
  {"decade":1970,"loudness":-13.95,"genre_list":"southern hip hop"},{"decade":1970,"loudness":-13.95,"genre_list":"trap"},
  {"decade":1980,"loudness":-8.83,"genre_list":"album rock"},{"decade":1980,"loudness":-7.95,"genre_list":"alternative metal"},
  {"decade":1980,"loudness":-8.99,"genre_list":"classic rock"},{"decade":1980,"loudness":-9.6,"genre_list":"contemporary country"},
  {"decade":1980,"loudness":-9.53,"genre_list":"dance pop"},{"decade":1980,"loudness":-8.68,"genre_list":"hip hop"},
  {"decade":1980,"loudness":-10.38,"genre_list":"latin"},{"decade":1980,"loudness":-9.59,"genre_list":"mellow gold"},
  {"decade":1980,"loudness":-10.38,"genre_list":"modern rock"},{"decade":1980,"loudness":-8.53,"genre_list":"pop"},
  {"decade":1980,"loudness":-5.23,"genre_list":"pop dance"},{"decade":1980,"loudness":-8.29,"genre_list":"pop rap"},
  {"decade":1980,"loudness":-8.82,"genre_list":"pop rock"},{"decade":1980,"loudness":-7.09,"genre_list":"r&b"},
  {"decade":1980,"loudness":-8.68,"genre_list":"rap"},{"decade":1980,"loudness":-8.48,"genre_list":"rock"},
  {"decade":1980,"loudness":-9.66,"genre_list":"soft rock"},
  {"decade":1990,"loudness":-7.84,"genre_list":"album rock"},{"decade":1990,"loudness":-6.61,"genre_list":"alternative metal"},
  {"decade":1990,"loudness":-8.29,"genre_list":"classic rock"},{"decade":1990,"loudness":-8.15,"genre_list":"contemporary country"},
  {"decade":1990,"loudness":-7.79,"genre_list":"dance pop"},{"decade":1990,"loudness":-7.65,"genre_list":"hip hop"},
  {"decade":1990,"loudness":-7.79,"genre_list":"latin"},{"decade":1990,"loudness":-10.1,"genre_list":"mellow gold"},
  {"decade":1990,"loudness":-6.93,"genre_list":"modern rock"},{"decade":1990,"loudness":-7.53,"genre_list":"pop"},
  {"decade":1990,"loudness":-7.17,"genre_list":"pop dance"},{"decade":1990,"loudness":-6.89,"genre_list":"pop rap"},
  {"decade":1990,"loudness":-7.79,"genre_list":"pop rock"},{"decade":1990,"loudness":-7.66,"genre_list":"post-teen pop"},
  {"decade":1990,"loudness":-8.07,"genre_list":"r&b"},{"decade":1990,"loudness":-7.52,"genre_list":"rap"},
  {"decade":1990,"loudness":-7.72,"genre_list":"rock"},{"decade":1990,"loudness":-9.7,"genre_list":"soft rock"},
  {"decade":1990,"loudness":-7.65,"genre_list":"southern hip hop"},{"decade":1990,"loudness":-8.5,"genre_list":"trap"},
  {"decade":2000,"loudness":-6.81,"genre_list":"album rock"},{"decade":2000,"loudness":-4.52,"genre_list":"alternative metal"},
  {"decade":2000,"loudness":-7.27,"genre_list":"classic rock"},{"decade":2000,"loudness":-5.74,"genre_list":"contemporary country"},
  {"decade":2000,"loudness":-5.7,"genre_list":"dance pop"},{"decade":2000,"loudness":-5.44,"genre_list":"hip hop"},
  {"decade":2000,"loudness":-6.46,"genre_list":"latin"},{"decade":2000,"loudness":-8.01,"genre_list":"mellow gold"},
  {"decade":2000,"loudness":-5.41,"genre_list":"modern rock"},{"decade":2000,"loudness":-5.87,"genre_list":"pop"},
  {"decade":2000,"loudness":-5.3,"genre_list":"pop dance"},{"decade":2000,"loudness":-5.61,"genre_list":"pop rap"},
  {"decade":2000,"loudness":-6.26,"genre_list":"pop rock"},{"decade":2000,"loudness":-5.17,"genre_list":"post-teen pop"},
  {"decade":2000,"loudness":-6.14,"genre_list":"r&b"},{"decade":2000,"loudness":-5.58,"genre_list":"rap"},
  {"decade":2000,"loudness":-5.96,"genre_list":"rock"},{"decade":2000,"loudness":-7.95,"genre_list":"soft rock"},
  {"decade":2000,"loudness":-5.94,"genre_list":"southern hip hop"},{"decade":2000,"loudness":-6.17,"genre_list":"trap"},
  {"decade":2010,"loudness":-6.38,"genre_list":"album rock"},{"decade":2010,"loudness":-4.79,"genre_list":"alternative metal"},
  {"decade":2010,"loudness":-7.55,"genre_list":"classic rock"},{"decade":2010,"loudness":-5.79,"genre_list":"contemporary country"},
  {"decade":2010,"loudness":-5.7,"genre_list":"dance pop"},{"decade":2010,"loudness":-6.9,"genre_list":"hip hop"},
  {"decade":2010,"loudness":-5.26,"genre_list":"latin"},{"decade":2010,"loudness":-7.72,"genre_list":"mellow gold"},
  {"decade":2010,"loudness":-6.26,"genre_list":"modern rock"},{"decade":2010,"loudness":-6.61,"genre_list":"pop"},
  {"decade":2010,"loudness":-5.55,"genre_list":"pop dance"},{"decade":2010,"loudness":-6.49,"genre_list":"pop rap"},
  {"decade":2010,"loudness":-6.4,"genre_list":"pop rock"},{"decade":2010,"loudness":-5.88,"genre_list":"post-teen pop"},
  {"decade":2010,"loudness":-6.77,"genre_list":"r&b"},{"decade":2010,"loudness":-6.72,"genre_list":"rap"},
  {"decade":2010,"loudness":-5.88,"genre_list":"rock"},{"decade":2010,"loudness":-7.7,"genre_list":"soft rock"},
  {"decade":2010,"loudness":-6.44,"genre_list":"southern hip hop"},{"decade":2010,"loudness":-6.72,"genre_list":"trap"},
  {"decade":2020,"loudness":-4.78,"genre_list":"album rock"},{"decade":2020,"loudness":-3.93,"genre_list":"alternative metal"},
  {"decade":2020,"loudness":-6.0,"genre_list":"contemporary country"},{"decade":2020,"loudness":-5.96,"genre_list":"dance pop"},
  {"decade":2020,"loudness":-7.0,"genre_list":"hip hop"},{"decade":2020,"loudness":-4.72,"genre_list":"latin"},
  {"decade":2020,"loudness":-6.15,"genre_list":"modern rock"},{"decade":2020,"loudness":-6.74,"genre_list":"pop"},
  {"decade":2020,"loudness":-6.1,"genre_list":"pop dance"},{"decade":2020,"loudness":-6.3,"genre_list":"pop rap"},
  {"decade":2020,"loudness":-5.91,"genre_list":"pop rock"},{"decade":2020,"loudness":-6.67,"genre_list":"post-teen pop"},
  {"decade":2020,"loudness":-6.9,"genre_list":"r&b"},{"decade":2020,"loudness":-6.85,"genre_list":"rap"},
  {"decade":2020,"loudness":-5.14,"genre_list":"rock"},{"decade":2020,"loudness":-6.44,"genre_list":"southern hip hop"},
  {"decade":2020,"loudness":-6.64,"genre_list":"trap"},
];

const genres = ['All', ...[...new Set(rawData.map(d => d.genre_list))].filter(g => g !== 'All').sort()];

function drawBars(svgEl, chartData, selectedGenre) {
  const margin = { top: 32, right: 24, bottom: 52, left: 60 };
  const totalW = svgEl.clientWidth || 600;
  const width = totalW - margin.left - margin.right;
  const height = 300 - margin.top - margin.bottom;

  d3.select(svgEl).selectAll('*').remove();

  const svg = d3.select(svgEl)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const decades = chartData.map(d => String(d.decade) + 's');
  const x = d3.scaleBand().domain(decades).range([0, width]).padding(0.3);
  const y = d3.scaleLinear().domain([-15, 0]).range([height, 0]);

  const barColor = selectedGenre === 'All' ? '#4a90e2' : '#1DB954';

  // Grid lines
  svg.append('g')
    .call(d3.axisLeft(y).tickValues([-15, -12, -9, -6, -3, 0]).tickSize(-width).tickFormat(''))
    .call(g => g.select('.domain').remove())
    .call(g => g.selectAll('line').attr('stroke', 'rgba(255,255,255,0.05)'));

  // Y axis
  svg.append('g')
    .call(d3.axisLeft(y).tickValues([-15, -12, -9, -6, -3, 0]).tickFormat(d => `${d} dB`))
    .call(g => g.select('.domain').remove())
    .call(g => g.selectAll('text').attr('fill', 'rgba(232,232,240,0.35)').attr('font-size', '10px'));

  // X axis
  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .call(g => g.select('.domain').attr('stroke', 'rgba(255,255,255,0.08)'))
    .call(g => g.selectAll('line').remove())
    .call(g => g.selectAll('text').attr('fill', 'rgba(232,232,240,0.45)').attr('font-size', '11px'));

  // Tooltip
  const tooltip = d3.select('body')
    .selectAll('.loudness-tooltip')
    .data([null])
    .join('div')
    .attr('class', 'loudness-tooltip')
    .style('position', 'absolute')
    .style('z-index', '10')
    .style('visibility', 'hidden')
    .style('padding', '8px 12px')
    .style('background', 'rgba(0,0,0,0.85)')
    .style('color', '#fff')
    .style('border-radius', '6px')
    .style('font-size', '12px')
    .style('pointer-events', 'none');

  // Bars with enter animation
  svg.selectAll('.bar')
    .data(chartData)
    .enter()
    .append('rect')
    .attr('class', 'bar')
    .attr('x', d => x(String(d.decade) + 's'))
    .attr('width', x.bandwidth())
    .attr('y', height)
    .attr('height', 0)
    .attr('fill', barColor)
    .attr('rx', 3)
    .style('cursor', 'pointer')
    .on('mouseover', function (event, d) {
      d3.select(this).transition().duration(100).attr('opacity', 0.8);
      tooltip.style('visibility', 'visible')
        .html(`<strong>${d.decade}s</strong><br/>Loudness: ${d.loudness.toFixed(1)} dB`);
    })
    .on('mousemove', (event) => {
      tooltip.style('top', (event.pageY - 48) + 'px').style('left', (event.pageX + 12) + 'px');
    })
    .on('mouseout', function () {
      d3.select(this).transition().duration(100).attr('opacity', 1);
      tooltip.style('visibility', 'hidden');
    })
    .transition()
    .duration(800)
    .delay((_, i) => i * 80)
    .ease(d3.easeCubicOut)
    .attr('y', d => y(d.loudness))
    .attr('height', d => height - y(d.loudness));

  // Value labels above bars
  svg.selectAll('.val-label')
    .data(chartData)
    .enter()
    .append('text')
    .attr('class', 'val-label')
    .attr('x', d => x(String(d.decade) + 's') + x.bandwidth() / 2)
    .attr('y', d => y(d.loudness) - 6)
    .attr('text-anchor', 'middle')
    .attr('fill', 'rgba(232,232,240,0.6)')
    .attr('font-size', '10px')
    .attr('font-weight', '600')
    .attr('opacity', 0)
    .text(d => d.loudness.toFixed(1))
    .transition()
    .duration(400)
    .delay((_, i) => i * 80 + 600)
    .attr('opacity', 1);
}

export default function LoudnessEvolution() {
  const [ref, inView] = useInView({ threshold: 0.1 });
  const [selectedGenre, setSelectedGenre] = useState('All');
  const svgRef = useRef(null);
  const hasDrawn = useRef(false);

  const chartData = rawData
    .filter(d => d.genre_list === selectedGenre)
    .sort((a, b) => a.decade - b.decade);

  useEffect(() => {
    if (!svgRef.current) return;
    if (!inView && !hasDrawn.current) return;
    hasDrawn.current = true;
    drawBars(svgRef.current, chartData, selectedGenre);
  }, [chartData, inView, selectedGenre]);

  return (
    <section ref={ref} style={styles.section}>
      <div className="container">
        <p className="section-label" style={{ color: '#e9c46a' }}>The Loudness Wars</p>
        <h2 className="section-title" style={styles.headline}>
          Volume Has Been Rising<br />
          <em>Decade After Decade</em>
        </h2>
        <p className="section-body" style={{ marginBottom: '48px' }}>
          Loudness in music is measured in dBFS — closer to 0 means louder. The relentless push
          toward higher volumes, driven by streaming compression and production trends, has reshaped
          how music feels. Filter by genre with the dropdown menu to see how the loudness war played out differently across styles. Hover over the bars for additional information.
        </p>

        <div style={styles.card}>
          <div style={styles.controls}>
            <label style={styles.label} htmlFor="genre-select">Filter by Genre:</label>
            <select
              id="genre-select"
              value={selectedGenre}
              onChange={e => setSelectedGenre(e.target.value)}
              style={styles.select}
            >
              {genres.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <svg ref={svgRef} width="100%" height={300} />

          <p style={styles.note}>
            Showing average loudness for{' '}
            <strong style={{ color: selectedGenre === 'All' ? '#4a90e2' : '#1DB954' }}>
              {selectedGenre === 'All' ? 'all popular tracks' : selectedGenre}
            </strong>.
            Values closer to 0 dB indicate louder recordings.
          </p>
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
  headline: {
    color: '#e8e8f0',
    marginBottom: '20px',
  },
  card: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '16px',
    padding: '32px',
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '24px',
  },
  label: {
    fontSize: '13px',
    color: 'rgba(232,232,240,0.45)',
    fontWeight: 500,
  },
  select: {
    padding: '8px 14px',
    borderRadius: '6px',
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.06)',
    color: '#e8e8f0',
    fontSize: '13px',
    fontWeight: 500,
    textTransform: 'capitalize',
    cursor: 'pointer',
    outline: 'none',
  },
  note: {
    marginTop: '20px',
    fontSize: '13px',
    color: 'rgba(232,232,240,0.4)',
    fontStyle: 'italic',
  },
};

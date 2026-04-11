import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { useScrollProgress } from '../hooks/useScrollProgress';
import { normalizeLoudness } from '../utils/dataUtils';

const FEATURES = [
  { key: 'valence', label: 'Valence', color: 'var(--valence)', higherMeans: 'happier' },
  { key: 'acousticness', label: 'Acousticness', color: 'var(--acousticness)', higherMeans: 'more acoustic' },
  { key: 'loudness', label: 'Loudness', color: 'var(--loudness)', higherMeans: 'louder' },
];

const KEEP_GENRES = [
  'all', 'pop', 'rock', 'hip hop', 'electronic', 'jazz',
  'classical', 'r&b', 'country', 'latin', 'indie',
];

// Helper to parse artist and genre lists
function parseList(raw) {
  if (!raw) return [];
  return raw
    .replace(/[[\]'"]/g, '')
    .split(',')
    .map(s => s.trim().toLowerCase().replace(/-/g, ' '))
    .filter(Boolean);
}

export default function ConsolidatedEvolution({ data = [], genreData = [] }) {
  const containerRef = useRef(null);
  const scrollProgress = useScrollProgress(containerRef);
  const svgRef = useRef(null);
  const brushRef = useRef(null);

  const [selectedGenre, setSelectedGenre] = useState('all');
  const [minPopularity, setMinPopularity] = useState(60);
  const [brushRange, setBrushRange] = useState(null);

  // Build artist -> Set<genre> map
  const artistGenreMap = useMemo(() => {
    const map = new Map();
    for (const row of genreData) {
      const artists = parseList(row.artists);
      const genres = parseList(row.genres);
      const matched = new Set();
      for (const g of genres) {
        const hit = KEEP_GENRES.find(k => k !== 'all' && (g.includes(k) || k.includes(g)));
        if (hit) matched.add(hit);
      }
      if (matched.size > 0) {
        for (const a of artists) {
          if (!map.has(a)) map.set(a, new Set());
          for (const g of matched) map.get(a).add(g);
        }
      }
    }
    return map;
  }, [genreData]);

  // Process and aggregate data
  const aggregatedData = useMemo(() => {
    if (!data.length) return [];

    let filtered = data;

    // Popularity filter
    if (minPopularity > 0) {
      filtered = filtered.filter(d => d.popularity >= minPopularity);
    }

    // Genre filter
    if (selectedGenre !== 'all') {
      filtered = filtered.filter(d => {
        const artists = parseList(d.artists);
        return artists.some(a => {
          const genres = artistGenreMap.get(a);
          return genres && genres.has(selectedGenre);
        });
      });
    }

    const byYear = d3.rollup(
      filtered,
      rows => ({
        year: rows[0].year,
        valence: d3.mean(rows, r => r.valence),
        acousticness: d3.mean(rows, r => r.acousticness),
        loudness: d3.mean(rows, r => normalizeLoudness(r.loudness)),
      }),
      d => d.year
    );

    return Array.from(byYear.values()).sort((a, b) => a.year - b.year);
  }, [data, artistGenreMap, selectedGenre, minPopularity]);

  // Handle brush domain integrity
  useEffect(() => {
    if (aggregatedData.length > 0 && brushRange) {
      const domain = d3.extent(aggregatedData, d => d.year);
      if (brushRange[0] > domain[1] || brushRange[1] < domain[0]) {
        setBrushRange(null);
      }
    }
  }, [aggregatedData, brushRange]);

  useEffect(() => {
    if (!svgRef.current) return;
    
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    if (!aggregatedData.length) {
      svg.append('text')
        .attr('x', '50%')
        .attr('y', '50%')
        .attr('text-anchor', 'middle')
        .attr('fill', 'var(--muted)')
        .text('No data matches your filters');
      return;
    }

    const margin = { top: 40, right: 80, bottom: 40, left: 60 };
    const width = svgRef.current.clientWidth - margin.left - margin.right;
    const height = 450 - margin.top - margin.bottom;

    const chart = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const xMain = d3.scaleLinear()
      .domain(d3.extent(aggregatedData, d => d.year))
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([0, 1])
      .range([height, 0]);

    // Apply brush filtering to scales if range exists
    if (brushRange) {
      xMain.domain(brushRange);
    }

    // Axes
    const xAxis = d3.axisBottom(xMain).tickFormat(d3.format('d')).ticks(width / 80);
    const yAxis = d3.axisLeft(y).ticks(5).tickFormat(d => `${Math.round(d * 100)}%`);

    chart.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(xAxis)
      .call(g => g.select('.domain').attr('stroke', 'var(--border)'))
      .call(g => g.selectAll('line').attr('stroke', 'var(--border)'))
      .call(g => g.selectAll('text').attr('fill', 'var(--muted)'));

    chart.append('g')
      .call(yAxis)
      .call(g => g.select('.domain').remove())
      .call(g => g.selectAll('line').attr('stroke', 'var(--border)').attr('stroke-dasharray', '2,2'))
      .call(g => g.selectAll('text').attr('fill', 'var(--muted)'));

    // Clip path for brushing
    chart.append('defs').append('clipPath')
      .attr('id', 'clip')
      .append('rect')
      .attr('width', width)
      .attr('height', height);

    const lineGroup = chart.append('g').attr('clip-path', 'url(#clip)');

    // Lines
    FEATURES.forEach((feature, i) => {
      const line = d3.line()
        .x(d => xMain(d.year))
        .y(d => y(d[feature.key]))
        .curve(d3.curveMonotoneX)
        .defined(d => !isNaN(d[feature.key]) && d[feature.key] !== null);

      const path = lineGroup.append('path')
        .datum(aggregatedData)
        .attr('class', `line-${feature.key}`)
        .attr('fill', 'none')
        .attr('stroke', feature.color)
        .attr('stroke-width', 3)
        .attr('d', line);

      // Scroll animation: Start later (0.35), finish earlier (faster multiplier 8)
      const length = path.node().getTotalLength();
      const progress = Math.min(1, Math.max(0, (scrollProgress - 0.35 - i * 0.05) * 8));
      path
        .attr('stroke-dasharray', length)
        .attr('stroke-dashoffset', length * (1 - progress));

      // End label
      const lastPoint = aggregatedData.filter(d => xMain(d.year) <= width && xMain(d.year) >= 0).pop();
      if (lastPoint && progress > 0.8) {
        lineGroup.append('text')
          .attr('x', xMain(lastPoint.year) + 10)
          .attr('y', y(lastPoint[feature.key]))
          .attr('fill', feature.color)
          .attr('font-size', '12px')
          .attr('font-weight', '600')
          .attr('alignment-baseline', 'middle')
          .attr('opacity', (progress - 0.8) * 5)
          .text(feature.label);
      }
    });

    // Brush SVG Area
    if (brushRef.current) {
      const bMargin = { top: 10, right: 80, bottom: 20, left: 60 };
      const bWidth = brushRef.current.clientWidth - bMargin.left - bMargin.right;
      const bHeight = 60 - bMargin.top - bMargin.bottom;

      const bSvg = d3.select(brushRef.current);
      bSvg.selectAll('*').remove();

      const bChart = bSvg.append('g')
        .attr('transform', `translate(${bMargin.left},${bMargin.top})`);

      const xBrush = d3.scaleLinear()
        .domain(d3.extent(aggregatedData, d => d.year))
        .range([0, bWidth]);

      const yBrush = d3.scaleLinear()
        .domain([0, 1])
        .range([bHeight, 0]);

      // Small lines in brush area
      FEATURES.forEach(feature => {
        const bLine = d3.line()
          .x(d => xBrush(d.year))
          .y(d => yBrush(d[feature.key]))
          .curve(d3.curveMonotoneX);

        bChart.append('path')
          .datum(aggregatedData)
          .attr('fill', 'none')
          .attr('stroke', feature.color)
          .attr('stroke-width', 1)
          .attr('opacity', 0.4)
          .attr('d', bLine);
      });

      const brush = d3.brushX()
        .extent([[0, 0], [bWidth, bHeight]])
        .on('brush end', (event) => {
          if (event.selection) {
            const range = event.selection.map(xBrush.invert);
            setBrushRange(range);
          } else {
            setBrushRange(null);
          }
        });

      bChart.append('g')
        .attr('class', 'brush')
        .call(brush);

      if (brushRange) {
        bChart.select('.brush').call(brush.move, brushRange.map(xBrush));
      }
    }

    // Tooltip / Crosshair logic
    const bisect = d3.bisector(d => d.year).left;
    const focus = chart.append('g')
      .style('display', 'none');

    focus.append('line')
      .attr('class', 'focus-line')
      .attr('y1', 0)
      .attr('y2', height)
      .attr('stroke', 'rgba(255,255,255,0.3)')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3');

    const focusDots = FEATURES.map(f => (
      focus.append('circle')
        .attr('class', `focus-dot-${f.key}`)
        .attr('r', 5)
        .attr('fill', f.color)
        .attr('stroke', 'var(--bg)')
        .attr('stroke-width', 2)
    ));

    const focusValues = FEATURES.map(f => (
      focus.append('text')
        .attr('class', `focus-val-${f.key}`)
        .attr('fill', f.color)
        .attr('font-size', '14px')
        .attr('font-weight', 'bold')
        .attr('dx', 12)
        .attr('dy', 4)
        .style('display', 'none')
        .style('text-shadow', '0 0 4px var(--bg), 0 0 8px var(--bg)')
    ));

    const tooltip = d3.select('body').selectAll('.consolidated-tooltip')
      .data([null])
      .join('div')
      .attr('class', 'consolidated-tooltip tooltip')
      .style('opacity', 0);

    svg.on('mousemove', (event) => {
      const [mx, my] = d3.pointer(event);
      const mouseX = mx - margin.left;
      const mouseY = my - margin.top;
      
      if (mouseX < 0 || mouseX > width) {
        focus.style('display', 'none');
        tooltip.style('opacity', 0);
        lineGroup.selectAll('path').attr('opacity', 1).attr('stroke-width', 3);
        return;
      }

      const x0 = xMain.invert(mouseX);
      const i = bisect(aggregatedData, x0, 1);
      const d0 = aggregatedData[i - 1];
      const d1 = aggregatedData[i];
      if (!d0 || !d1) return;
      const d = x0 - d0.year > d1.year - x0 ? d1 : d0;

      // Find closest feature to mouse vertical position
      let closestFeature = null;
      let minDistance = Infinity;

      FEATURES.forEach(f => {
        const yPos = y(d[f.key]);
        const dist = Math.abs(yPos - mouseY);
        if (dist < minDistance) {
          minDistance = dist;
          closestFeature = f.key;
        }
      });

      focus.style('display', null);
      focus.attr('transform', `translate(${xMain(d.year)},0)`);
      
      focusDots.forEach((dot, idx) => {
        const f = FEATURES[idx];
        const isClosest = f.key === closestFeature;
        const val = d[f.key];
        
        dot.attr('cy', y(val))
           .attr('r', isClosest ? 8 : 5)
           .attr('stroke-width', isClosest ? 3 : 2);
           
        const text = focusValues[idx];
        text.attr('y', y(val))
            .text(`${(val * 100).toFixed(1)}%`)
            .style('display', isClosest ? null : 'none');
      });

      // Highlight the closest line
      lineGroup.selectAll('path')
        .attr('opacity', p => (p && p.length > 0) ? 0.3 : 1) // datum is the whole array
        .attr('stroke-width', 3);
      
      // Since d3 datum is the whole array, we need a better way to select the specific path
      FEATURES.forEach(f => {
        lineGroup.select(`.line-${f.key}`)
          .attr('opacity', f.key === closestFeature ? 1 : 0.2)
          .attr('stroke-width', f.key === closestFeature ? 5 : 3);
      });

      tooltip
        .style('opacity', 1)
        .style('left', `${event.pageX + 20}px`)
        .style('top', `${event.pageY - 40}px`)
        .html(`
          <div style="font-weight:bold;margin-bottom:8px;border-bottom:1px solid var(--border);padding-bottom:4px;font-size:14px">${d.year}</div>
          ${FEATURES.map(f => {
            const isClosest = f.key === closestFeature;
            return `
              <div style="display:flex;justify-content:space-between;gap:30px;font-size:13px;margin-bottom:2px;${isClosest ? `color:${f.color};font-weight:bold;transform:scale(1.05);transition:all 0.1s;` : 'opacity:0.6;'}">
                <span>${isClosest ? '→ ' : ''}${f.label}</span>
                <span>${(d[f.key] * 100).toFixed(1)}%</span>
              </div>
            `;
          }).join('')}
        `);
    });

    svg.on('mouseleave', () => {
      focus.style('display', 'none');
      tooltip.style('opacity', 0);
      focusValues.forEach(v => v.style('display', 'none'));
      lineGroup.selectAll('path').attr('opacity', 1).attr('stroke-width', 3);
    });

  }, [aggregatedData, scrollProgress, brushRange]);

  return (
    <section ref={containerRef} style={styles.section}>
      <div className="container">
        <p className="section-label">A Century of Change</p>
        <h2 className="section-title">
          Music is getting sadder, <br />
          <em>louder, and less acoustic.</em>
        </h2>
        <p className="section-body" style={{ marginBottom: '40px' }}>
          By consolidating valence, acousticness, and loudness, we see the clear divergence of modern music. We can see that valence has been declining since the 1970s and a push toward higher volumes and lower acousticness, driven by streaming compression and production trends
          Use the filters to see how these trends hold across different genres and popularity tiers. 
          Drag the mini-chart at the bottom to focus on specific periods.
        </p>

        {/* Filters */}
        <div style={styles.filterBar}>
          <div style={styles.filterGroup}>
            <label style={styles.label}>Genre</label>
            <select 
              value={selectedGenre} 
              onChange={e => setSelectedGenre(e.target.value)}
              style={styles.select}
            >
              {KEEP_GENRES.map(g => (
                <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>
              ))}
            </select>
          </div>

          <div style={{ ...styles.filterGroup, flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <label style={styles.label}>Min Popularity</label>
              <span style={styles.valueBadge}>{minPopularity}</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={minPopularity} 
              onChange={e => setMinPopularity(+e.target.value)}
              style={styles.range}
            />
          </div>
        </div>

        {/* Main Chart Card */}
        <div style={styles.card}>
          <svg ref={svgRef} width="100%" height={450} style={{ display: 'block' }} />
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
            <p style={{ ...styles.label, textAlign: 'center', marginBottom: '5px', fontSize: '10px' }}>
              DRAG TO FOCUS TIME RANGE
            </p>
            <svg ref={brushRef} width="100%" height={60} style={{ display: 'block' }} />
          </div>
        </div>

        {/* Legend */}
        <div style={styles.legend}>
          {FEATURES.map(f => (
            <div key={f.key} style={styles.legendItem}>
              <span style={{ ...styles.dot, backgroundColor: f.color }} />
              <span style={styles.legendLabel}>{f.label}</span>
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
  filterBar: {
    display: 'flex',
    gap: '40px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    minWidth: '200px',
  },
  label: {
    fontSize: '11px',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--muted)',
    fontWeight: 600,
  },
  select: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    color: 'var(--text)',
    padding: '8px 12px',
    fontSize: '14px',
    cursor: 'pointer',
    outline: 'none',
  },
  range: {
    width: '100%',
    accentColor: 'var(--accent)',
    cursor: 'pointer',
  },
  valueBadge: {
    fontSize: '12px',
    color: 'var(--accent)',
    fontWeight: 'bold',
  },
  card: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    padding: '20px',
    position: 'relative',
  },
  legend: {
    display: 'flex',
    justifyContent: 'center',
    gap: '30px',
    marginTop: '24px',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  dot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
  },
  legendLabel: {
    fontSize: '13px',
    color: 'var(--muted)',
    fontWeight: 500,
  },
};

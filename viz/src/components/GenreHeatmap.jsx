import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { useInView } from '../hooks/useScrollProgress';

// ── Feature definitions ────────────────────────────────────────────────────
const FEATURES = [
  { key: 'valence',          label: 'Happiness',    color: '#f4a261', higherMeans: 'happier'        },
  { key: 'danceability',     label: 'Danceability', color: '#1db954', higherMeans: 'more danceable' },
  { key: 'energy',           label: 'Energy',       color: '#e63946', higherMeans: 'more energetic' },
  { key: 'loudness',         label: 'Loudness',     color: '#e9c46a', higherMeans: 'louder'         },
  { key: 'acousticness',     label: 'Acoustic',     color: '#457b9d', higherMeans: 'more acoustic'  },
  { key: 'instrumentalness', label: 'Instrumental', color: '#8B5CF6', higherMeans: 'less vocal'     },
  { key: 'speechiness',      label: 'Speechiness',  color: '#22D3EE', higherMeans: 'more speech'    },
];

const KEEP_GENRES = [
  'pop', 'rock', 'hip-hop', 'electronic', 'jazz',
  'classical', 'r&b', 'country', 'latin', 'indie',
];

// ── Parse "['pop', 'rock']" or "pop, rock" strings ────────────────────────
function parseGenres(raw) {
  if (!raw) return [];
  return raw
    .replace(/[\[\]'"]/g, '')
    .split(',')
    .map(g => g.trim().toLowerCase())
    .filter(Boolean);
}

// ── Normalize loudness dB → 0–1 (0 = quiet, 1 = loud) ────────────────────
function normalizeLoudness(val) {
  const MIN = -20, MAX = 0;
  return Math.max(0, Math.min(1, (val - MIN) / (MAX - MIN)));
}

// ── Build genre × feature matrix ──────────────────────────────────────────
function buildMatrix(rows) {
  const genreMap = {};
  for (const row of rows) {
    const genres = parseGenres(row.genres);
    for (const genre of genres) {
      const match = KEEP_GENRES.find(g => genre.includes(g) || g.includes(genre));
      if (!match) continue;
      if (!genreMap[match]) genreMap[match] = [];
      genreMap[match].push(row);
    }
  }
  return KEEP_GENRES
    .filter(g => genreMap[g]?.length > 0)
    .map(genre => {
      const items = genreMap[genre];
      const entry = { genre, count: items.length };
      for (const f of FEATURES) {
        const vals = items.map(d => +d[f.key]).filter(v => !isNaN(v));
        const raw  = vals.length ? d3.mean(vals) : null;
        entry[f.key]           = f.key === 'loudness' && raw != null ? normalizeLoudness(raw) : raw;
        entry[`${f.key}_raw`]  = raw;
      }
      return entry;
    });
}

// ── D3 draw ────────────────────────────────────────────────────────────────
function draw(svgEl, matrix, sortBy) {
  const margin = { top: 20, right: 24, bottom: 72, left: 110 };
  const totalW = svgEl.clientWidth || 820;
  const width  = totalW - margin.left - margin.right;
  const sorted = [...matrix].sort((a, b) => (b[sortBy] ?? 0) - (a[sortBy] ?? 0));
  const genres  = sorted.map(d => d.genre);
  const cellH   = 42;
  const height  = genres.length * cellH;

  d3.select(svgEl)
    .attr('height', height + margin.top + margin.bottom)
    .selectAll('*').remove();

  const svg = d3.select(svgEl)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const xScale = d3.scaleBand()
    .domain(FEATURES.map(f => f.key))
    .range([0, width]).padding(0.06);

  const yScale = d3.scaleBand()
    .domain(genres)
    .range([0, height]).padding(0.08);

  // Colour: blue (cold/low) → amber (warm/high)
  const colourScale = d3.scaleSequential()
    .domain([0, 1])
    .interpolator(t => {
      const r = Math.round(17  + t * (233 - 17));
      const g = Math.round(27  + t * (158 - 27));
      const b = Math.round(46  + t * (11  - 46));
      return `rgb(${r},${g},${b})`;
    });

  // ── Tooltip ──
  const tooltip = d3.select('body')
    .selectAll('.genre-tooltip')
    .data([null])
    .join('div')
    .attr('class', 'genre-tooltip')
    .style('position', 'absolute').style('z-index', '100')
    .style('visibility', 'hidden').style('padding', '10px 14px')
    .style('background', 'rgba(10,10,15,0.95)')
    .style('border', '1px solid rgba(255,255,255,0.07)')
    .style('border-radius', '8px').style('color', '#e8e8f0')
    .style('font-size', '12px').style('line-height', '1.8')
    .style('pointer-events', 'none')
    .style('backdrop-filter', 'blur(12px)')
    .style('box-shadow', '0 8px 32px rgba(0,0,0,0.5)');

  // ── Cells ──
  const cellData = sorted.flatMap(genreObj =>
    FEATURES.map(feat => ({
      genre:      genreObj.genre,
      feature:    feat.key,
      label:      feat.label,
      color:      feat.color,
      value:      genreObj[feat.key],
      rawValue:   genreObj[`${feat.key}_raw`],
      higherMeans: feat.higherMeans,
      count:      genreObj.count,
    }))
  );

  svg.selectAll('.cell').data(cellData).join('rect')
    .attr('class', 'cell')
    .attr('x',      d => xScale(d.feature))
    .attr('y',      d => yScale(d.genre))
    .attr('width',  xScale.bandwidth())
    .attr('height', yScale.bandwidth())
    .attr('rx', 4)
    .attr('fill', d => d.value != null ? colourScale(d.value) : '#1a1a2e')
    .attr('cursor', 'pointer')
    .on('mouseover', (event, d) => {
      d3.select(event.currentTarget)
        .attr('stroke', 'rgba(255,255,255,0.5)').attr('stroke-width', 1.5);
      tooltip
        .style('visibility', 'visible')
        .html(
          `<strong style="color:${d.color}">${d.genre.charAt(0).toUpperCase() + d.genre.slice(1)} — ${d.label}</strong><br/>` +
          `Score ${d.rawValue != null ? d.rawValue.toFixed(3) : 'n/a'}` +
          `${d.feature === 'loudness' ? ' dB' : ''}<br/>` +
          `<span style="color:rgba(232,232,240,0.35);font-size:11px">` +
          `Higher = ${d.higherMeans}<br/>n = ${d.count?.toLocaleString()}</span>`
        );
    })
    .on('mousemove', event => {
      tooltip.style('top', (event.pageY - 10) + 'px').style('left', (event.pageX + 16) + 'px');
    })
    .on('mouseout', event => {
      d3.select(event.currentTarget).attr('stroke', 'none');
      tooltip.style('visibility', 'hidden');
    });

  // Value text inside cells
  svg.selectAll('.cell-val').data(cellData.filter(d => d.value != null)).join('text')
    .attr('class', 'cell-val')
    .attr('x', d => xScale(d.feature) + xScale.bandwidth() / 2)
    .attr('y', d => yScale(d.genre)   + yScale.bandwidth() / 2 + 4)
    .attr('text-anchor', 'middle')
    .attr('fill', d => d.value > 0.52 ? 'rgba(10,10,15,0.85)' : 'rgba(232,232,240,0.7)')
    .attr('font-size', xScale.bandwidth() > 45 ? '11px' : '9px')
    .attr('pointer-events', 'none')
    .text(d => d.value.toFixed(2));

  // ── X axis — feature labels (click to sort) ──
  svg.append('g')
    .attr('transform', `translate(0,${height + 10})`)
    .selectAll('.xlabel').data(FEATURES).join('text')
      .attr('class', 'xlabel')
      .attr('x', f => xScale(f.key) + xScale.bandwidth() / 2)
      .attr('y', 0)
      .attr('text-anchor', 'middle')
      .attr('fill', f => f.key === sortBy ? f.color : 'rgba(232,232,240,0.35)')
      .attr('font-size', f => f.key === sortBy ? '11px' : '10px')
      .attr('font-weight', f => f.key === sortBy ? '600' : '400')
      .attr('letter-spacing', '0.05em')
      .attr('cursor', 'pointer')
      .text(f => f.label);

  svg.append('text')
    .attr('x', width / 2).attr('y', height + 46)
    .attr('text-anchor', 'middle')
    .attr('fill', 'rgba(232,232,240,0.2)')
    .attr('font-size', '10px').attr('font-style', 'italic')
    .text('Click a column header to re-sort genres by that feature');

  // ── Y axis — genre labels ──
  svg.selectAll('.ylabel').data(sorted).join('text')
    .attr('class', 'ylabel')
    .attr('x', -12)
    .attr('y', d => yScale(d.genre) + yScale.bandwidth() / 2 + 4)
    .attr('text-anchor', 'end')
    .attr('fill', 'rgba(232,232,240,0.65)')
    .attr('font-size', '12px').attr('font-weight', '500')
    .text(d => d.genre.charAt(0).toUpperCase() + d.genre.slice(1));

  // ── Colour legend ──
  const legendW = 140, legendH = 8;
  const defs = svg.append('defs');
  const grad = defs.append('linearGradient').attr('id', 'hm-grad');
  grad.append('stop').attr('offset', '0%').attr('stop-color', colourScale(0));
  grad.append('stop').attr('offset', '100%').attr('stop-color', colourScale(1));

  const lg = svg.append('g').attr('transform', `translate(0,${height + 56})`);
  lg.append('rect').attr('width', legendW).attr('height', legendH).attr('rx', 3)
    .attr('fill', 'url(#hm-grad)');
  lg.append('text').attr('x', 0).attr('y', -5)
    .attr('fill', 'rgba(232,232,240,0.25)').attr('font-size', '9px').text('Low');
  lg.append('text').attr('x', legendW).attr('y', -5).attr('text-anchor', 'end')
    .attr('fill', 'rgba(232,232,240,0.25)').attr('font-size', '9px').text('High');
}

// ── Component ──────────────────────────────────────────────────────────────
export default function GenreHeatmap({ data = [] }) {
  const [ref, inView]  = useInView({ threshold: 0.05 });
  const svgRef          = useRef(null);
  const [sortBy, setSortBy] = useState('valence');

  const matrix = useMemo(() => buildMatrix(data), [data]);

  useEffect(() => {
    if (!matrix.length || !inView || !svgRef.current) return;
    draw(svgRef.current, matrix, sortBy);

    // Attach click handlers after D3 draw (labels are SVG text, not React)
    const labels = svgRef.current.querySelectorAll('.xlabel');
    labels.forEach(el => {
      const featKey = FEATURES.find(f => f.label === el.textContent)?.key;
      if (featKey) el.addEventListener('click', () => setSortBy(featKey));
    });
  }, [matrix, inView, sortBy]);

  return (
    <section ref={ref} style={sectionStyle}>
      <div className="container">

        <p className="section-label" style={{ color: '#1db954' }}>
          Genre Fingerprints
        </p>

        <h2 className="section-title" style={{ color: '#e8e8f0', marginBottom: '20px' }}>
          Every Genre Has<br />
          <em>A Distinct Audio Identity</em>
        </h2>

        <p className="section-body" style={{ marginBottom: '48px' }}>
          Does the sadness paradox affect all genres equally? This heatmap shows the
          audio fingerprint of ten major genres across seven features — happiness,
          danceability, energy, loudness, acousticness, instrumentalness, and speechiness.
          Classical scores near-zero on loudness and near-perfect on instrumentalness.
          Hip-hop leads on speechiness. The loudness war hit pop and rock hardest.
          Click any column header to re-sort and explore which genres lead in each dimension.
          Hover any cell for exact values.
        </p>

        {/* Sort controls */}
        <div style={filterWrap}>
          <div style={filterRow}>
            <span style={filterLabel}>Sorted by</span>
            <span style={filterBadge}>
              {FEATURES.find(f => f.key === sortBy)?.label ?? sortBy}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {FEATURES.map(f => (
              <button
                key={f.key}
                onClick={() => setSortBy(f.key)}
                style={{
                  ...pillBase,
                  background: sortBy === f.key ? `${f.color}22` : 'transparent',
                  border: `1px solid ${sortBy === f.key ? f.color : 'rgba(255,255,255,0.1)'}`,
                  color: sortBy === f.key ? f.color : 'rgba(232,232,240,0.45)',
                  fontWeight: sortBy === f.key ? 600 : 400,
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chart card */}
        <div style={cardStyle}>
          <svg ref={svgRef} width="100%" />
        </div>

        {/* Legend */}
        <div style={legendRow}>
          {FEATURES.map(f => (
            <span key={f.key} style={legendItem}>
              <span style={{ ...legendSwatch, background: f.color }} />
              <span style={{ color: 'rgba(232,232,240,0.45)', fontSize: 12 }}>{f.label}</span>
            </span>
          ))}
        </div>

      </div>
    </section>
  );
}

// ─── Styles — mirror ValenceBoxPlot exactly ───────────────────────────────
const sectionStyle = {
  padding: '100px 0',
  background: 'linear-gradient(180deg, var(--bg2) 0%, var(--bg) 100%)',
};

const cardStyle = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: '16px',
  padding: '16px 8px 8px',
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
  color: '#1db954',
  fontWeight: 600,
  background: 'rgba(29,185,84,0.1)',
  padding: '3px 10px',
  borderRadius: '20px',
  border: '1px solid rgba(29,185,84,0.2)',
};

const pillBase = {
  fontSize: '12px',
  padding: '4px 12px',
  borderRadius: '20px',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  fontFamily: 'inherit',
};

const legendRow = {
  display: 'flex',
  gap: '20px',
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
  width: 10,
  height: 10,
  borderRadius: '50%',
  display: 'inline-block',
  flexShrink: 0,
};
// import React, { useEffect, useRef, useState, useMemo } from 'react';
// import * as d3 from 'd3';
// import { useInView } from '../hooks/useScrollProgress';

// // ── Feature definitions ────────────────────────────────────────────────────
// const FEATURES = [
//   { key: 'valence',          label: 'Happiness',    color: '#f4a261', higherMeans: 'happier'        },
//   { key: 'danceability',     label: 'Danceability', color: '#1db954', higherMeans: 'more danceable' },
//   { key: 'energy',           label: 'Energy',       color: '#e63946', higherMeans: 'more energetic' },
//   { key: 'loudness',         label: 'Loudness',     color: '#e9c46a', higherMeans: 'louder'         },
//   { key: 'acousticness',     label: 'Acoustic',     color: '#457b9d', higherMeans: 'more acoustic'  },
//   { key: 'instrumentalness', label: 'Instrumental', color: '#8B5CF6', higherMeans: 'less vocal'     },
//   { key: 'speechiness',      label: 'Speechiness',  color: '#22D3EE', higherMeans: 'more speech'    },
// ];

// const KEEP_GENRES = [
//   'pop', 'rock', 'hip-hop', 'electronic', 'jazz',
//   'classical', 'r&b', 'country', 'latin', 'indie',
// ];

// // ── Parse "['pop', 'rock']" or "pop, rock" strings ────────────────────────
// function parseGenres(raw) {
//   if (!raw) return [];
//   return raw
//     // .replace(/[\[\]'"]/g, '')
//     .replace(/[[\]'"]/g, '')
//     .split(',')
//     .map(g => g.trim().toLowerCase())
//     .filter(Boolean);
// }

// // ── Normalize loudness dB → 0–1 (0 = quiet, 1 = loud) ────────────────────
// function normalizeLoudness(val) {
//   const MIN = -20, MAX = 0;
//   return Math.max(0, Math.min(1, (val - MIN) / (MAX - MIN)));
// }

// // ── Build genre × feature matrix ──────────────────────────────────────────
// function buildMatrix(rows) {
//   const genreMap = {};
//   for (const row of rows) {
//     const genres = parseGenres(row.genres);
//     for (const genre of genres) {
//       const match = KEEP_GENRES.find(g => genre.includes(g) || g.includes(genre));
//       if (!match) continue;
//       if (!genreMap[match]) genreMap[match] = [];
//       genreMap[match].push(row);
//     }
//   }
//   return KEEP_GENRES
//     .filter(g => genreMap[g]?.length > 0)
//     .map(genre => {
//       const items = genreMap[genre];
//       const entry = { genre, count: items.length };
//       for (const f of FEATURES) {
//         const vals = items.map(d => +d[f.key]).filter(v => !isNaN(v));
//         const raw  = vals.length ? d3.mean(vals) : null;
//         entry[f.key]           = f.key === 'loudness' && raw != null ? normalizeLoudness(raw) : raw;
//         entry[`${f.key}_raw`]  = raw;
//       }
//       return entry;
//     });
// }

// // ── D3 draw ────────────────────────────────────────────────────────────────
// function draw(svgEl, matrix, sortBy) {
//   const margin = { top: 20, right: 24, bottom: 72, left: 110 };
//   const totalW = svgEl.clientWidth || 820;
//   const width  = totalW - margin.left - margin.right;
//   const sorted = [...matrix].sort((a, b) => (b[sortBy] ?? 0) - (a[sortBy] ?? 0));
//   const genres  = sorted.map(d => d.genre);
//   const cellH   = 42;
//   const height  = genres.length * cellH;

//   d3.select(svgEl)
//     .attr('height', height + margin.top + margin.bottom)
//     .selectAll('*').remove();

//   const svg = d3.select(svgEl)
//     .append('g')
//     .attr('transform', `translate(${margin.left},${margin.top})`);

//   const xScale = d3.scaleBand()
//     .domain(FEATURES.map(f => f.key))
//     .range([0, width]).padding(0.06);

//   const yScale = d3.scaleBand()
//     .domain(genres)
//     .range([0, height]).padding(0.08);

//   // Colour: blue (cold/low) → amber (warm/high)
//   const colourScale = d3.scaleSequential()
//     .domain([0, 1])
//     .interpolator(t => {
//       const r = Math.round(17  + t * (233 - 17));
//       const g = Math.round(27  + t * (158 - 27));
//       const b = Math.round(46  + t * (11  - 46));
//       return `rgb(${r},${g},${b})`;
//     });

//   // ── Tooltip ──
//   const tooltip = d3.select('body')
//     .selectAll('.genre-tooltip')
//     .data([null])
//     .join('div')
//     .attr('class', 'genre-tooltip')
//     .style('position', 'absolute').style('z-index', '100')
//     .style('visibility', 'hidden').style('padding', '10px 14px')
//     .style('background', 'rgba(10,10,15,0.95)')
//     .style('border', '1px solid rgba(255,255,255,0.07)')
//     .style('border-radius', '8px').style('color', '#e8e8f0')
//     .style('font-size', '12px').style('line-height', '1.8')
//     .style('pointer-events', 'none')
//     .style('backdrop-filter', 'blur(12px)')
//     .style('box-shadow', '0 8px 32px rgba(0,0,0,0.5)');

//   // ── Cells ──
//   const cellData = sorted.flatMap(genreObj =>
//     FEATURES.map(feat => ({
//       genre:      genreObj.genre,
//       feature:    feat.key,
//       label:      feat.label,
//       color:      feat.color,
//       value:      genreObj[feat.key],
//       rawValue:   genreObj[`${feat.key}_raw`],
//       higherMeans: feat.higherMeans,
//       count:      genreObj.count,
//     }))
//   );

//   svg.selectAll('.cell').data(cellData).join('rect')
//     .attr('class', 'cell')
//     .attr('x',      d => xScale(d.feature))
//     .attr('y',      d => yScale(d.genre))
//     .attr('width',  xScale.bandwidth())
//     .attr('height', yScale.bandwidth())
//     .attr('rx', 4)
//     .attr('fill', d => d.value != null ? colourScale(d.value) : '#1a1a2e')
//     .attr('cursor', 'pointer')
//     .on('mouseover', (event, d) => {
//       d3.select(event.currentTarget)
//         .attr('stroke', 'rgba(255,255,255,0.5)').attr('stroke-width', 1.5);
//       tooltip
//         .style('visibility', 'visible')
//         .html(
//           `<strong style="color:${d.color}">${d.genre.charAt(0).toUpperCase() + d.genre.slice(1)} — ${d.label}</strong><br/>` +
//           `Score ${d.rawValue != null ? d.rawValue.toFixed(3) : 'n/a'}` +
//           `${d.feature === 'loudness' ? ' dB' : ''}<br/>` +
//           `<span style="color:rgba(232,232,240,0.35);font-size:11px">` +
//           `Higher = ${d.higherMeans}<br/>n = ${d.count?.toLocaleString()}</span>`
//         );
//     })
//     .on('mousemove', event => {
//       tooltip.style('top', (event.pageY - 10) + 'px').style('left', (event.pageX + 16) + 'px');
//     })
//     .on('mouseout', event => {
//       d3.select(event.currentTarget).attr('stroke', 'none');
//       tooltip.style('visibility', 'hidden');
//     });

//   // Value text inside cells
//   svg.selectAll('.cell-val').data(cellData.filter(d => d.value != null)).join('text')
//     .attr('class', 'cell-val')
//     .attr('x', d => xScale(d.feature) + xScale.bandwidth() / 2)
//     .attr('y', d => yScale(d.genre)   + yScale.bandwidth() / 2 + 4)
//     .attr('text-anchor', 'middle')
//     .attr('fill', d => d.value > 0.52 ? 'rgba(10,10,15,0.85)' : 'rgba(232,232,240,0.7)')
//     .attr('font-size', xScale.bandwidth() > 45 ? '11px' : '9px')
//     .attr('pointer-events', 'none')
//     .text(d => d.value.toFixed(2));

//   // ── X axis — feature labels (click to sort) ──
//   svg.append('g')
//     .attr('transform', `translate(0,${height + 10})`)
//     .selectAll('.xlabel').data(FEATURES).join('text')
//       .attr('class', 'xlabel')
//       .attr('x', f => xScale(f.key) + xScale.bandwidth() / 2)
//       .attr('y', 0)
//       .attr('text-anchor', 'middle')
//       .attr('fill', f => f.key === sortBy ? f.color : 'rgba(232,232,240,0.35)')
//       .attr('font-size', f => f.key === sortBy ? '11px' : '10px')
//       .attr('font-weight', f => f.key === sortBy ? '600' : '400')
//       .attr('letter-spacing', '0.05em')
//       .attr('cursor', 'pointer')
//       .text(f => f.label);

//   svg.append('text')
//     .attr('x', width / 2).attr('y', height + 46)
//     .attr('text-anchor', 'middle')
//     .attr('fill', 'rgba(232,232,240,0.2)')
//     .attr('font-size', '10px').attr('font-style', 'italic')
//     .text('Click a column header to re-sort genres by that feature');

//   // ── Y axis — genre labels ──
//   svg.selectAll('.ylabel').data(sorted).join('text')
//     .attr('class', 'ylabel')
//     .attr('x', -12)
//     .attr('y', d => yScale(d.genre) + yScale.bandwidth() / 2 + 4)
//     .attr('text-anchor', 'end')
//     .attr('fill', 'rgba(232,232,240,0.65)')
//     .attr('font-size', '12px').attr('font-weight', '500')
//     .text(d => d.genre.charAt(0).toUpperCase() + d.genre.slice(1));

//   // ── Colour legend ──
//   const legendW = 140, legendH = 8;
//   const defs = svg.append('defs');
//   const grad = defs.append('linearGradient').attr('id', 'hm-grad');
//   grad.append('stop').attr('offset', '0%').attr('stop-color', colourScale(0));
//   grad.append('stop').attr('offset', '100%').attr('stop-color', colourScale(1));

//   const lg = svg.append('g').attr('transform', `translate(0,${height + 56})`);
//   lg.append('rect').attr('width', legendW).attr('height', legendH).attr('rx', 3)
//     .attr('fill', 'url(#hm-grad)');
//   lg.append('text').attr('x', 0).attr('y', -5)
//     .attr('fill', 'rgba(232,232,240,0.25)').attr('font-size', '9px').text('Low');
//   lg.append('text').attr('x', legendW).attr('y', -5).attr('text-anchor', 'end')
//     .attr('fill', 'rgba(232,232,240,0.25)').attr('font-size', '9px').text('High');
// }

// // ── Component ──────────────────────────────────────────────────────────────
// export default function GenreHeatmap({ data = [] }) {
//   const [ref, inView]  = useInView({ threshold: 0.05 });
//   const svgRef          = useRef(null);
//   const [sortBy, setSortBy] = useState('valence');

//   const matrix = useMemo(() => buildMatrix(data), [data]);

//   useEffect(() => {
//     if (!matrix.length || !inView || !svgRef.current) return;
//     draw(svgRef.current, matrix, sortBy);

//     // Attach click handlers after D3 draw (labels are SVG text, not React)
//     const labels = svgRef.current.querySelectorAll('.xlabel');
//     labels.forEach(el => {
//       const featKey = FEATURES.find(f => f.label === el.textContent)?.key;
//       if (featKey) el.addEventListener('click', () => setSortBy(featKey));
//     });
//   }, [matrix, inView, sortBy]);

//   return (
//     <section ref={ref} style={sectionStyle}>
//       <div className="container">

//         <p className="section-label" style={{ color: '#1db954' }}>
//           Genre Fingerprints
//         </p>

//         <h2 className="section-title" style={{ color: '#e8e8f0', marginBottom: '20px' }}>
//           Every Genre Has<br />
//           <em>A Distinct Audio Identity</em>
//         </h2>

//         <p className="section-body" style={{ marginBottom: '48px' }}>
//           Does the sadness paradox affect all genres equally? This heatmap shows the
//           audio fingerprint of ten major genres across seven features — happiness,
//           danceability, energy, loudness, acousticness, instrumentalness, and speechiness.
//           Classical scores near-zero on loudness and near-perfect on instrumentalness.
//           Hip-hop leads on speechiness. The loudness war hit pop and rock hardest.
//           Click any column header to re-sort and explore which genres lead in each dimension.
//           Hover any cell for exact values.
//         </p>

//         {/* Sort controls */}
//         <div style={filterWrap}>
//           <div style={filterRow}>
//             <span style={filterLabel}>Sorted by</span>
//             <span style={filterBadge}>
//               {FEATURES.find(f => f.key === sortBy)?.label ?? sortBy}
//             </span>
//           </div>
//           <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
//             {FEATURES.map(f => (
//               <button
//                 key={f.key}
//                 onClick={() => setSortBy(f.key)}
//                 style={{
//                   ...pillBase,
//                   background: sortBy === f.key ? `${f.color}22` : 'transparent',
//                   border: `1px solid ${sortBy === f.key ? f.color : 'rgba(255,255,255,0.1)'}`,
//                   color: sortBy === f.key ? f.color : 'rgba(232,232,240,0.45)',
//                   fontWeight: sortBy === f.key ? 600 : 400,
//                 }}
//               >
//                 {f.label}
//               </button>
//             ))}
//           </div>
//         </div>

//         {/* Chart card */}
//         <div style={cardStyle}>
//           <svg ref={svgRef} width="100%" />
//         </div>

//         {/* Legend */}
//         <div style={legendRow}>
//           {FEATURES.map(f => (
//             <span key={f.key} style={legendItem}>
//               <span style={{ ...legendSwatch, background: f.color }} />
//               <span style={{ color: 'rgba(232,232,240,0.45)', fontSize: 12 }}>{f.label}</span>
//             </span>
//           ))}
//         </div>

//       </div>
//     </section>
//   );
// }

// // ─── Styles — mirror ValenceBoxPlot exactly ───────────────────────────────
// const sectionStyle = {
//   padding: '100px 0',
//   background: 'linear-gradient(180deg, var(--bg2) 0%, var(--bg) 100%)',
// };

// const cardStyle = {
//   background: 'rgba(255,255,255,0.03)',
//   border: '1px solid rgba(255,255,255,0.07)',
//   borderRadius: '16px',
//   padding: '16px 8px 8px',
//   overflowX: 'auto',
// };

// const filterWrap = {
//   background: 'rgba(255,255,255,0.03)',
//   border: '1px solid rgba(255,255,255,0.07)',
//   borderRadius: '12px',
//   padding: '20px 24px',
//   marginBottom: '24px',
// };

// const filterRow = {
//   display: 'flex',
//   justifyContent: 'space-between',
//   alignItems: 'center',
//   marginBottom: '12px',
// };

// const filterLabel = {
//   fontSize: '11px',
//   letterSpacing: '0.15em',
//   textTransform: 'uppercase',
//   color: 'rgba(232,232,240,0.35)',
//   fontWeight: 600,
// };

// const filterBadge = {
//   fontSize: '12px',
//   color: '#1db954',
//   fontWeight: 600,
//   background: 'rgba(29,185,84,0.1)',
//   padding: '3px 10px',
//   borderRadius: '20px',
//   border: '1px solid rgba(29,185,84,0.2)',
// };

// const pillBase = {
//   fontSize: '12px',
//   padding: '4px 12px',
//   borderRadius: '20px',
//   cursor: 'pointer',
//   transition: 'all 0.15s ease',
//   fontFamily: 'inherit',
// };

// const legendRow = {
//   display: 'flex',
//   gap: '20px',
//   flexWrap: 'wrap',
//   marginTop: '20px',
//   paddingTop: '16px',
//   borderTop: '1px solid rgba(255,255,255,0.07)',
// };

// const legendItem = {
//   display: 'flex',
//   alignItems: 'center',
//   gap: '8px',
//   fontSize: '12px',
// };

// const legendSwatch = {
//   width: 10,
//   height: 10,
//   borderRadius: '50%',
//   display: 'inline-block',
//   flexShrink: 0,
// };

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { useInView } from '../hooks/useScrollProgress';

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

const DECADES = [1960, 1970, 1980, 1990, 2000, 2010, 2020];

// ── Parse helpers ──────────────────────────────────────────────────────────
function parseList(raw) {
  if (!raw) return [];
  return raw
    .replace(/[[\]'"]/g, '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
}

function normalizeLoudness(val) {
  return Math.max(0, Math.min(1, (val - (-20)) / 20));
}

// ── Build artist → Set<genre> map from data_w_genres rows ─────────────────
function buildArtistGenreMap(genreRows) {
  const map = new Map();
  for (const row of genreRows) {
    const artists = parseList(row.artists);
    const genres  = parseList(row.genres);
    const matched = new Set();
    for (const g of genres) {
      const hit = KEEP_GENRES.find(k => g.includes(k) || k.includes(g));
      if (hit) matched.add(hit);
    }
    if (!matched.size) continue;
    for (const a of artists) {
      if (!map.has(a)) map.set(a, new Set());
      for (const g of matched) map.get(a).add(g);
    }
  }
  return map;
}

// ── Join tracks → genres, bucket by decade ────────────────────────────────
// Returns Map<decade, Map<genre, track[]>>
function buildDecadeGenreMap(trackRows, artistGenreMap) {
  const result = new Map();
  for (const row of trackRows) {
    const decade = +row.decade;
    if (!decade || isNaN(decade)) continue;
    const artists = parseList(row.artists);
    const genres  = new Set();
    for (const a of artists) {
      const found = artistGenreMap.get(a);
      if (found) for (const g of found) genres.add(g);
    }
    if (!genres.size) continue;
    if (!result.has(decade)) result.set(decade, new Map());
    const dm = result.get(decade);
    for (const g of genres) {
      if (!dm.has(g)) dm.set(g, []);
      dm.get(g).push(row);
    }
  }
  return result;
}

// ── Build genre × feature matrix for one decade ───────────────────────────
function buildMatrix(decadeGenreMap, decade) {
  const dm = decadeGenreMap.get(decade);
  if (!dm) return [];
  return KEEP_GENRES
    .filter(g => dm.has(g) && dm.get(g).length >= 5)
    .map(genre => {
      const items = dm.get(genre);
      const entry = { genre, count: items.length };
      for (const f of FEATURES) {
        const vals = items.map(d => +d[f.key]).filter(v => !isNaN(v));
        const raw  = vals.length ? d3.mean(vals) : null;
        entry[f.key]          = f.key === 'loudness' && raw != null ? normalizeLoudness(raw) : raw;
        entry[`${f.key}_raw`] = raw;
      }
      return entry;
    });
}

// ── D3 draw ────────────────────────────────────────────────────────────────
function draw(svgEl, matrix, sortBy, decade, prevMatrix) {
  const margin = { top: 20, right: 24, bottom: 72, left: 110 };
  const totalW  = svgEl.clientWidth || 820;
  const width   = totalW - margin.left - margin.right;
  const sorted  = [...matrix].sort((a, b) => (b[sortBy] ?? 0) - (a[sortBy] ?? 0));
  const genres  = sorted.map(d => d.genre);
  const cellH   = 44;
  const height  = Math.max(genres.length, 1) * cellH;

  d3.select(svgEl)
    .attr('height', height + margin.top + margin.bottom)
    .selectAll('*').remove();

  if (!sorted.length) {
    d3.select(svgEl)
      .append('text')
      .attr('x', totalW / 2).attr('y', 60)
      .attr('text-anchor', 'middle')
      .attr('fill', 'rgba(232,232,240,0.25)').attr('font-size', '13px')
      .text(`No genre data available for the ${decade}s — try an adjacent decade`);
    return;
  }

  const svg = d3.select(svgEl)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const xScale = d3.scaleBand()
    .domain(FEATURES.map(f => f.key))
    .range([0, width]).padding(0.06);

  const yScale = d3.scaleBand()
    .domain(genres).range([0, height]).padding(0.08);

  // Blue-dark → amber colour ramp
  const colourScale = d3.scaleSequential()
    .domain([0, 1])
    .interpolator(t => `rgb(${Math.round(17 + t*216)},${Math.round(27 + t*131)},${Math.round(46 - t*35)})`);

  // Build prev-decade lookup for delta arrows
  const prevLookup = new Map();
  if (prevMatrix) {
    for (const row of prevMatrix) prevLookup.set(row.genre, row);
  }

  // Tooltip
  const tooltip = d3.select('body')
    .selectAll('.genre-tooltip').data([null]).join('div')
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

  // Build cell data with delta
  const cellData = sorted.flatMap(genreObj =>
    FEATURES.map(feat => {
      const prev  = prevLookup.get(genreObj.genre);
      const delta = (genreObj[feat.key] != null && prev?.[feat.key] != null)
        ? genreObj[feat.key] - prev[feat.key] : null;
      return {
        genre: genreObj.genre, feature: feat.key,
        label: feat.label,    color: feat.color,
        value: genreObj[feat.key],
        rawValue: genreObj[`${feat.key}_raw`],
        higherMeans: feat.higherMeans,
        count: genreObj.count, delta,
      };
    })
  );

  // Cells
  svg.selectAll('.cell').data(cellData).join('rect')
    .attr('class', 'cell')
    .attr('x', d => xScale(d.feature)).attr('y', d => yScale(d.genre))
    .attr('width', xScale.bandwidth()).attr('height', yScale.bandwidth())
    .attr('rx', 4)
    .attr('fill', d => d.value != null ? colourScale(d.value) : '#1a1a2e')
    .attr('cursor', 'pointer')
    .on('mouseover', (event, d) => {
      d3.select(event.currentTarget).attr('stroke', 'rgba(255,255,255,0.5)').attr('stroke-width', 1.5);
      const deltaStr = d.delta != null
        ? `<br/><span style="color:${d.delta > 0.01 ? '#f4a261' : d.delta < -0.01 ? '#7fb3d3' : 'rgba(232,232,240,0.3)'}">` +
          `${d.delta > 0 ? '▲' : '▼'} ${Math.abs(d.delta).toFixed(3)} vs prev decade</span>`
        : '';
      tooltip.style('visibility', 'visible').html(
        `<strong style="color:${d.color}">${d.genre.charAt(0).toUpperCase() + d.genre.slice(1)} — ${d.label}</strong><br/>` +
        `Score&nbsp; ${d.rawValue != null ? d.rawValue.toFixed(3) : 'n/a'}${d.feature === 'loudness' ? ' dB' : ''}` +
        `${deltaStr}<br/>` +
        `<span style="color:rgba(232,232,240,0.35);font-size:11px">Higher = ${d.higherMeans}<br/>n = ${d.count?.toLocaleString()}</span>`
      );
    })
    .on('mousemove', e => tooltip.style('top', (e.pageY-10)+'px').style('left', (e.pageX+16)+'px'))
    .on('mouseout', e => { d3.select(e.currentTarget).attr('stroke','none'); tooltip.style('visibility','hidden'); });

  // Value text
  svg.selectAll('.cell-val').data(cellData.filter(d => d.value != null)).join('text')
    .attr('class', 'cell-val')
    .attr('x', d => xScale(d.feature) + xScale.bandwidth()/2)
    .attr('y', d => yScale(d.genre)   + yScale.bandwidth()/2 + 4)
    .attr('text-anchor', 'middle')
    .attr('fill', d => d.value > 0.52 ? 'rgba(10,10,15,0.85)' : 'rgba(232,232,240,0.65)')
    .attr('font-size', xScale.bandwidth() > 45 ? '11px' : '9px')
    .attr('pointer-events', 'none')
    .text(d => d.value.toFixed(2));

  // Delta indicators — small triangles on cells that shifted > 0.03
  svg.selectAll('.delta-icon')
    .data(cellData.filter(d => d.delta != null && Math.abs(d.delta) > 0.03))
    .join('text')
      .attr('class', 'delta-icon')
      .attr('x', d => xScale(d.feature) + xScale.bandwidth() - 5)
      .attr('y', d => yScale(d.genre) + 12)
      .attr('text-anchor', 'end')
      .attr('fill', d => d.delta > 0 ? 'rgba(244,162,97,0.9)' : 'rgba(127,179,211,0.9)')
      .attr('font-size', '8px').attr('pointer-events', 'none')
      .text(d => d.delta > 0 ? '▲' : '▼');

  // X axis — clickable feature labels
  svg.append('g').attr('transform', `translate(0,${height+10})`)
    .selectAll('.xlabel').data(FEATURES).join('text')
      .attr('class', 'xlabel')
      .attr('x', f => xScale(f.key) + xScale.bandwidth()/2)
      .attr('y', 0).attr('text-anchor', 'middle')
      .attr('fill', f => f.key === sortBy ? f.color : 'rgba(232,232,240,0.35)')
      .attr('font-size', f => f.key === sortBy ? '11px' : '10px')
      .attr('font-weight', f => f.key === sortBy ? '600' : '400')
      .attr('letter-spacing', '0.05em').attr('cursor', 'pointer')
      .text(f => f.label);

  svg.append('text').attr('x', width/2).attr('y', height+46)
    .attr('text-anchor', 'middle')
    .attr('fill', 'rgba(232,232,240,0.2)').attr('font-size', '10px').attr('font-style', 'italic')
    .text('Click a column header to re-sort  ·  ▲▼ = change vs previous decade');

  // Y axis — genre labels
  svg.selectAll('.ylabel').data(sorted).join('text')
    .attr('class', 'ylabel')
    .attr('x', -12).attr('y', d => yScale(d.genre) + yScale.bandwidth()/2 + 4)
    .attr('text-anchor', 'end')
    .attr('fill', 'rgba(232,232,240,0.65)').attr('font-size', '12px').attr('font-weight', '500')
    .text(d => d.genre.charAt(0).toUpperCase() + d.genre.slice(1));

  // Colour legend
  const defs = svg.append('defs');
  const grad = defs.append('linearGradient').attr('id', 'hm-grad');
  grad.append('stop').attr('offset', '0%').attr('stop-color', colourScale(0));
  grad.append('stop').attr('offset', '100%').attr('stop-color', colourScale(1));

  const lg = svg.append('g').attr('transform', `translate(0,${height+54})`);
  lg.append('rect').attr('width', 140).attr('height', 8).attr('rx', 3).attr('fill', 'url(#hm-grad)');
  lg.append('text').attr('x', 0).attr('y', -5).attr('fill', 'rgba(232,232,240,0.25)').attr('font-size', '9px').text('Low');
  lg.append('text').attr('x', 140).attr('y', -5).attr('text-anchor', 'end').attr('fill', 'rgba(232,232,240,0.25)').attr('font-size', '9px').text('High');
}

// ── Component ──────────────────────────────────────────────────────────────
export default function GenreHeatmap({ data = [], genreData = [] }) {
  const [ref, inView]         = useInView({ threshold: 0.05 });
  const svgRef                = useRef(null);
  const [sortBy,  setSortBy]  = useState('valence');
  const [decade,  setDecade]  = useState(2010);

  const artistGenreMap = useMemo(() => buildArtistGenreMap(genreData), [genreData]);
  const decadeGenreMap = useMemo(() => buildDecadeGenreMap(data, artistGenreMap), [data, artistGenreMap]);
  const matrix         = useMemo(() => buildMatrix(decadeGenreMap, decade), [decadeGenreMap, decade]);

  const prevDecadeIdx = DECADES.indexOf(decade) - 1;
  const prevMatrix    = useMemo(
    () => prevDecadeIdx >= 0 ? buildMatrix(decadeGenreMap, DECADES[prevDecadeIdx]) : null,
    [decadeGenreMap, decade] // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    if (!inView || !svgRef.current) return;
    draw(svgRef.current, matrix, sortBy, decade, prevMatrix);
    // Re-attach D3 text click handlers
    svgRef.current.querySelectorAll('.xlabel').forEach(el => {
      const feat = FEATURES.find(f => f.label === el.textContent)?.key;
      if (feat) el.addEventListener('click', () => setSortBy(feat));
    });
  }, [matrix, sortBy, inView, decade, prevMatrix]);

  const totalTracks = matrix.reduce((s, d) => s + d.count, 0);

  return (
    <section ref={ref} style={sectionStyle}>
      <div className="container">

        <p className="section-label" style={{ color: '#1db954' }}>Genre Fingerprints</p>

        <h2 className="section-title" style={{ color: '#e8e8f0', marginBottom: '20px' }}>
          Did Every Genre Get<br /><em>Sadder Over Time?</em>
        </h2>

        <p className="section-body" style={{ marginBottom: '48px' }}>
          The sadness paradox holds on average — but does it hold within every
          genre? Select a decade and watch how each genre's audio fingerprint
          evolves. Small triangles show whether a feature went{' '}
          <span style={{ color: '#f4a261' }}>▲ up</span> or{' '}
          <span style={{ color: '#7fb3d3' }}>▼ down</span> compared to the
          previous decade. If the happiness column drains from amber to blue
          across all genres over time, the decline is universal — not driven by
          one genre taking over the charts. Click any column header to re-sort.
          Hover any cell for exact values and the change from the previous decade.
        </p>

        {/* Decade selector */}
        <div style={filterWrap}>
          <div style={filterRow}>
            <span style={filterLabel}>Decade</span>
            <span style={filterBadge}>{decade}s</span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {DECADES.map(d => (
              <button key={d} onClick={() => setDecade(d)} style={{
                ...pillBase,
                background: decade === d ? 'rgba(29,185,84,0.15)' : 'transparent',
                border:     `1px solid ${decade === d ? '#1db954' : 'rgba(255,255,255,0.1)'}`,
                color:      decade === d ? '#1db954' : 'rgba(232,232,240,0.45)',
                fontWeight: decade === d ? 600 : 400,
              }}>
                {d}s
              </button>
            ))}
          </div>
          <p style={filterNote}>
            {totalTracks > 0
              ? `${totalTracks.toLocaleString()} matched tracks · ${matrix.length} genres · ${decade}s`
              : `No matched tracks for the ${decade}s — try an adjacent decade`}
          </p>
        </div>

        {/* Sort controls */}
        <div style={{ ...filterWrap, marginBottom: 24 }}>
          <div style={filterRow}>
            <span style={filterLabel}>Sort genres by</span>
            <span style={{ ...filterBadge, color: FEATURES.find(f => f.key === sortBy)?.color }}>
              {FEATURES.find(f => f.key === sortBy)?.label}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {FEATURES.map(f => (
              <button key={f.key} onClick={() => setSortBy(f.key)} style={{
                ...pillBase,
                background: sortBy === f.key ? `${f.color}22` : 'transparent',
                border:     `1px solid ${sortBy === f.key ? f.color : 'rgba(255,255,255,0.1)'}`,
                color:      sortBy === f.key ? f.color : 'rgba(232,232,240,0.45)',
                fontWeight: sortBy === f.key ? 600 : 400,
              }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chart */}
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
          <span style={legendItem}>
            <span style={{ color: '#f4a261', fontSize: 13 }}>▲</span>
            <span style={{ color: 'rgba(232,232,240,0.35)', fontSize: 12 }}>rose vs prev decade</span>
          </span>
          <span style={legendItem}>
            <span style={{ color: '#7fb3d3', fontSize: 13 }}>▼</span>
            <span style={{ color: 'rgba(232,232,240,0.35)', fontSize: 12 }}>fell vs prev decade</span>
          </span>
        </div>

      </div>
    </section>
  );
}

const sectionStyle = { padding: '100px 0', background: 'linear-gradient(180deg, var(--bg2) 0%, var(--bg) 100%)' };
const cardStyle    = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '16px 8px 8px', overflowX: 'auto' };
const filterWrap   = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '20px 24px', marginBottom: '16px' };
const filterRow    = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' };
const filterLabel  = { fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(232,232,240,0.35)', fontWeight: 600 };
const filterBadge  = { fontSize: '12px', color: '#1db954', fontWeight: 600, background: 'rgba(29,185,84,0.1)', padding: '3px 10px', borderRadius: '20px', border: '1px solid rgba(29,185,84,0.2)' };
const filterNote   = { fontSize: '11px', color: 'rgba(232,232,240,0.25)', margin: 0, marginTop: '6px' };
const pillBase     = { fontSize: '12px', padding: '4px 12px', borderRadius: '20px', cursor: 'pointer', transition: 'all 0.15s ease', fontFamily: 'inherit' };
const legendRow    = { display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.07)' };
const legendItem   = { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' };
const legendSwatch = { width: 10, height: 10, borderRadius: '50%', display: 'inline-block', flexShrink: 0 };
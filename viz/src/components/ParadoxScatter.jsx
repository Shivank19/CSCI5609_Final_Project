import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { useInView } from '../hooks/useScrollProgress';
import { normalizeLoudness } from '../utils/dataUtils';

const DECADE_COLORS = {
  1920: '#F97316', 1930: '#F59E0B', 1940: '#EAB308',
  1950: '#84CC16', 1960: '#F59E0B', 1970: '#FBBF24',
  1980: '#C084FC', 1990: '#818CF8', 2000: '#60A5FA',
  2010: '#457b9d', 2020: '#22D3EE',
};

const CHAPTERS = [
  {
    id: 'dance',
    xKey: 'danceability',
    xLabel: 'DANCEABILITY →',
    yLabel: 'VALENCE / HAPPINESS →',
    headline: 'Music Got Sadder, But We Kept Dancing...',
    body: 'From the 1960s onward, the emotional positivity (valence) of popular music fell steadily—decade after decade, songs grew darker in mood. Yet, in a fascinating paradox, as the music became more melancholic, its overall danceability actually increased.',
    paradoxCaption: 'sadder AND more danceable',
    highlightDecades: [1970, 2010],
    accent: '#FB7185',
  },
  {
    id: 'loud',
    xKey: 'loudness_norm',
    xLabel: 'LOUDNESS →',
    yLabel: 'VALENCE / HAPPINESS →',
    headline: '...And We Turned the Volume Up',
    body: "The paradox doesn't stop at the rhythm. As the emotional valence dropped, the sheer volume of the music surged. We traded acoustic warmth for amplified, driving intensity—proving that modern melancholy wears a much louder coat.",
    paradoxCaption: 'sadder AND louder',
    highlightDecades: [1970, 2010],
    accent: '#FBBF24',
  },
  {
    id: 'acoustic',
    xKey: 'acousticness',
    xLabel: 'ACOUSTIC ERA → ELECTRIC ERA',
    yLabel: 'VALENCE / HAPPINESS →',
    headline: 'Two Declines, One Story',
    body: 'Acousticness and valence fell together. As electric production replaced organic instruments, the warmth in both sound and sentiment drained in step — a possible causal link.',
    paradoxCaption: 'sadder AND less acoustic',
    highlightDecades: [1970, 2010],
    accent: '#60A5FA',
  },
  {
    id: 'sowhat',
    xKey: 'danceability',
    xLabel: '',
    yLabel: '',
    headline: 'So What Does It Mean?',
    body: "We traded warmth for drive. Sadness stopped being something to sit with — it became the engine of modern music. The paradox isn't a contradiction: it's an adaptation. When the world got louder and more electric, we learned to dance through the dark.",
    paradoxCaption: 'sadder AND more compelling',
    highlightDecades: [1970, 2010],
    accent: '#A78BFA',
    isSoWhat: true,
    hideChart: true,
  },
];

// ─── D3 drawing helpers ────────────────────────────────────────────────────────

function buildScales(decades, chapter, width, height) {
  const xKey = chapter.xKey;
  const xPad = 0.04, yPad = 0.04;
  const xExtent = d3.extent(decades, d => d[xKey]);
  const yExtent = d3.extent(decades, d => d.valence);

  const xScale = d3.scaleLinear()
    .domain(
      chapter.id === 'acoustic'
        ? [xExtent[1] + xPad, xExtent[0] - xPad]
        : [xExtent[0] - xPad, xExtent[1] + xPad]
    ).range([0, width]);

  const yScale = d3.scaleLinear()
    .domain([yExtent[0] - yPad, yExtent[1] + yPad])
    .range([height, 0]);

  return { xScale, yScale };
}

function buildAxes(g, decades, chapter, width, height, isInit = false) {
  const { xScale, yScale } = buildScales(decades, chapter, width, height);
  const dur = isInit ? 0 : 600;

  let gridX = g.select('.grid-x');
  let gridY = g.select('.grid-y');
  if (gridX.empty()) {
    gridX = g.append('g').attr('class', 'grid-x');
    gridY = g.append('g').attr('class', 'grid-y').attr('transform', `translate(0,${height})`);
  }
  gridY.transition().duration(dur)
    .call(d3.axisBottom(xScale).tickSize(-height).tickFormat(''))
    .call(gg => gg.select('.domain').remove())
    .call(gg => gg.selectAll('line').attr('stroke', 'rgba(255,255,255,0.05)'));
  gridX.transition().duration(dur)
    .call(d3.axisLeft(yScale).tickSize(-width).tickFormat(''))
    .call(gg => gg.select('.domain').remove())
    .call(gg => gg.selectAll('line').attr('stroke', 'rgba(255,255,255,0.05)'));

  let axX = g.select('.ax-x');
  let axY = g.select('.ax-y');
  if (axX.empty()) {
    axX = g.append('g').attr('class', 'ax-x').attr('transform', `translate(0,${height})`);
    axY = g.append('g').attr('class', 'ax-y');
  }
  axX.transition().duration(dur)
    .call(d3.axisBottom(xScale).ticks(5).tickFormat(d3.format('.0%')))
    .call(gg => gg.select('.domain').attr('stroke', 'rgba(255,255,255,0.08)'))
    .call(gg => gg.selectAll('line').remove())
    .call(gg => gg.selectAll('text').attr('fill', 'rgba(232,232,240,0.35)').attr('font-size', '11px'));
  axY.transition().duration(dur)
    .call(d3.axisLeft(yScale).ticks(5).tickFormat(d3.format('.0%')))
    .call(gg => gg.select('.domain').remove())
    .call(gg => gg.selectAll('line').remove())
    .call(gg => gg.selectAll('text').attr('fill', 'rgba(232,232,240,0.35)').attr('font-size', '11px'));

  g.selectAll('.label-x').data([chapter.xLabel]).join(
    enter => enter.append('text').attr('class', 'label-x')
      .attr('x', width / 2).attr('y', height + 56)
      .attr('text-anchor', 'middle')
      .attr('fill', 'rgba(232,232,240,0.25)')
      .attr('font-size', '10px').attr('letter-spacing', '0.15em'),
    update => update
  ).transition().duration(dur).text(d => d);

  g.selectAll('.label-y').data([chapter.yLabel]).join(
    enter => enter.append('text').attr('class', 'label-y')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2).attr('y', -58)
      .attr('text-anchor', 'middle')
      .attr('fill', 'rgba(232,232,240,0.25)')
      .attr('font-size', '10px').attr('letter-spacing', '0.15em'),
    update => update
  ).transition().duration(dur).text(d => d);

  return { xScale, yScale };
}

function buildTooltip(d, chapter, col) {
  const xVal = (d[chapter.xKey] * 100).toFixed(1);
  const xLabel = { dance: 'Danceability', loud: 'Loudness', acoustic: 'Acousticness', sowhat: 'Danceability' }[chapter.id];

  const bar = (pct, color) =>
    `<div style="display:flex;align-items:center;gap:8px;margin:2px 0">
      <div style="flex:1;height:4px;background:rgba(255,255,255,0.07);border-radius:2px;overflow:hidden">
        <div style="width:${pct}%;height:100%;background:${color};border-radius:2px"></div>
      </div>
      <span style="color:rgba(232,232,240,0.5);font-size:10px;min-width:30px;text-align:right">${pct}%</span>
    </div>`;

  return (
    `<div style="font-size:15px;font-weight:700;color:${col};margin-bottom:8px">${d.decade}s</div>` +
    `<div style="font-size:11px;color:rgba(232,232,240,0.45);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.1em">Mood Profile</div>` +
    `<div style="margin-bottom:2px;font-size:11px;color:rgba(232,232,240,0.6)">Valence / Happiness</div>` +
    bar((d.valence * 100).toFixed(1), '#FB7185') +
    `<div style="margin-top:6px;margin-bottom:2px;font-size:11px;color:rgba(232,232,240,0.6)">${xLabel}</div>` +
    bar(xVal, col) +
    (d.trackName
      ? `<div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.07);font-size:11px">
          <em style="color:#e8e8f0">${d.trackName}</em><br/>
          <span style="color:rgba(232,232,240,0.35)">${d.trackArtist}</span>
         </div>`
      : '') +
    `<div style="margin-top:6px;font-size:10px;color:rgba(232,232,240,0.25)">n = ${d.count?.toLocaleString()}</div>`
  );
}

function buildDots(g, decades, chapter, width, height) {
  const { xScale, yScale } = buildScales(decades, chapter, width, height);
  const isHighlighted = dec => chapter.highlightDecades?.includes(dec);

  const tip = d3.select('body')
    .selectAll('.rs-tip').data([null]).join('div').attr('class', 'rs-tip')
    .style('position', 'absolute').style('z-index', '400').style('visibility', 'hidden')
    .style('padding', '12px 16px')
    .style('background', 'rgba(6,6,12,0.97)')
    .style('border', '1px solid rgba(255,255,255,0.1)')
    .style('border-radius', '10px').style('color', '#e8e8f0')
    .style('font-size', '12px').style('line-height', '1.9')
    .style('pointer-events', 'none')
    .style('backdrop-filter', 'blur(16px)')
    .style('box-shadow', '0 8px 40px rgba(0,0,0,0.6)');

  decades.forEach((d, i) => {
    const col   = DECADE_COLORS[d.decade] ?? '#8B5CF6';
    const hi    = isHighlighted(d.decade);
    const cx    = xScale(d[chapter.xKey]);
    const cy    = yScale(d.valence);
    const delay = i * 60;

    g.selectAll(`.halo-${d.decade}`).data([d]).join(
      enter => enter.append('circle')
        .attr('class', `halo-${d.decade}`)
        .attr('cx', cx).attr('cy', cy).attr('r', hi ? 22 : 16)
        .attr('fill', 'none').attr('stroke', col)
        .attr('stroke-width', hi ? 2 : 1)
        .attr('opacity', hi ? 0.55 : 0.28),
      update => update.transition().duration(600).delay(delay)
        .attr('cx', cx).attr('cy', cy).attr('r', hi ? 22 : 16)
        .attr('stroke-width', hi ? 2 : 1).attr('opacity', hi ? 0.55 : 0.28)
    );

    g.selectAll(`.dot-${d.decade}`).data([d]).join(
      enter => enter.append('circle')
        .attr('class', `dot-${d.decade}`)
        .attr('cx', cx).attr('cy', cy).attr('r', 0)
        .attr('fill', col).attr('stroke', '#0a0a0f').attr('stroke-width', 2.5)
        .attr('cursor', 'pointer')
        .transition().delay(delay).duration(400).ease(d3.easeBounceOut)
        .attr('r', hi ? 13 : 9),
      update => update.transition().duration(600).delay(delay)
        .attr('cx', cx).attr('cy', cy).attr('r', hi ? 13 : 9)
    );

    g.selectAll(`.lbl-${d.decade}`).data([d]).join(
      enter => enter.append('text')
        .attr('class', `lbl-${d.decade}`)
        .attr('x', cx).attr('y', cy - (hi ? 26 : 20))
        .attr('text-anchor', 'middle')
        .attr('fill', col)
        .attr('font-size', hi ? '12px' : '11px')
        .attr('font-weight', hi ? '700' : '600')
        .attr('opacity', 0).attr('pointer-events', 'none')
        .text(`${d.decade}s`)
        .transition().delay(delay + 280).duration(300).attr('opacity', 1),
      update => update.transition().duration(600).delay(delay)
        .attr('x', cx).attr('y', cy - (hi ? 26 : 20))
        .attr('font-size', hi ? '12px' : '11px')
        .attr('font-weight', hi ? '700' : '600')
        .text(`${d.decade}s`)
    );

    g.selectAll(`.hit-${d.decade}`).data([d]).join(
      enter => enter.append('circle')
        .attr('class', `hit-${d.decade}`)
        .attr('cx', cx).attr('cy', cy).attr('r', 22)
        .attr('fill', 'none').attr('pointer-events', 'all')
        .style('cursor', 'pointer'),
      update => update.transition().duration(600).delay(delay).attr('cx', cx).attr('cy', cy)
    ).on('mouseover', function () {
      tip.style('visibility', 'visible').html(buildTooltip(d, chapter, col));
      g.select(`.halo-${d.decade}`)
        .raise()
        .transition().duration(300).attr('r', 28).attr('opacity', 0.8)
        .transition().duration(300).attr('r', hi ? 22 : 16).attr('opacity', hi ? 0.55 : 0.28);
    })
    .on('mousemove', evt => tip.style('top', (evt.pageY - 10) + 'px').style('left', (evt.pageX + 18) + 'px'))
    .on('mouseout', () => tip.style('visibility', 'hidden'));
  });
}

function buildParadoxArrow(g, decades, chapter, width, height) {
  const { xScale, yScale } = buildScales(decades, chapter, width, height);
  const [d1, d2] = chapter.highlightDecades ?? [];
  const first  = decades.find(d => d.decade === d1) ?? decades[0];
  const target = decades.find(d => d.decade === d2) ?? decades[decades.length - 2];
  if (!first || !target) return;

  const ax1 = xScale(first[chapter.xKey]),  ay1 = yScale(first.valence);
  const ax2 = xScale(target[chapter.xKey]), ay2 = yScale(target.valence);
  const midX = (ax1 + ax2) / 2, midY = (ay1 + ay2) / 2;

  const defs = g.select('defs').empty() ? g.append('defs') : g.select('defs');
  defs.selectAll('#paradox-arr').remove();
  defs.append('marker')
    .attr('id', 'paradox-arr').attr('viewBox', '0 0 10 10')
    .attr('refX', 8).attr('refY', 5)
    .attr('markerWidth', 6).attr('markerHeight', 6)
    .attr('orient', 'auto-start-reverse')
    .append('path').attr('d', 'M2 1L8 5L2 9')
      .attr('fill', 'none').attr('stroke', 'rgba(251,113,133,0.75)')
      .attr('stroke-width', 1.5).attr('stroke-linecap', 'round');

  g.selectAll('.p-arrow').data([null]).join('line').attr('class', 'p-arrow')
    .attr('x1', ax1).attr('y1', ay1).attr('x2', ax2).attr('y2', ay2)
    .attr('stroke', 'rgba(251,113,133,0.4)').attr('stroke-width', 1.5)
    .attr('stroke-dasharray', '5 4').attr('marker-end', 'url(#paradox-arr)')
    .attr('opacity', 0).transition().delay(600).duration(500).attr('opacity', 1);

  const lbl1 = chapter.isSoWhat ? 'The conclusion:' : 'The paradox:';
  g.selectAll('.p-lbl1').data([null]).join('text').attr('class', 'p-lbl1')
    .attr('x', midX + 12).attr('y', midY - 9)
    .attr('fill', 'rgba(251,113,133,0.8)').attr('font-size', '11px').attr('font-style', 'italic')
    .attr('opacity', 0).text(lbl1)
    .transition().delay(700).duration(400).attr('opacity', 1);

  g.selectAll('.p-lbl2').data([null]).join('text').attr('class', 'p-lbl2')
    .attr('x', midX + 12).attr('y', midY + 5)
    .attr('fill', 'rgba(251,113,133,0.8)').attr('font-size', '11px').attr('font-style', 'italic')
    .attr('opacity', 0).text(chapter.paradoxCaption)
    .transition().delay(700).duration(400).attr('opacity', 1);
}

function buildPath(g, decades, chapter, width, height) {
  const { xScale, yScale } = buildScales(decades, chapter, width, height);
  const chronological = [...decades].sort((a, b) => a.decade - b.decade);
  const lineGen = d3.line()
    .x(d => xScale(d[chapter.xKey]))
    .y(d => yScale(d.valence))
    .curve(d3.curveCatmullRom.alpha(0.5));

  g.selectAll('.connect-path').data([chronological]).join('path').attr('class', 'connect-path')
    .attr('fill', 'none').attr('stroke', 'rgba(255,255,255,0.1)').attr('stroke-width', 1.5)
    .attr('d', lineGen);
}

function initChart(svgEl, decades, chapter) {
  const margin = { top: 44, right: 48, bottom: 72, left: 72 };
  const totalW = svgEl.clientWidth || 820;
  const width  = totalW - margin.left - margin.right;
  const height = 460 - margin.top - margin.bottom;

  d3.select(svgEl).selectAll('*').remove();
  svgEl.__dims = { margin, width, height };

  const root = d3.select(svgEl)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  buildAxes(root, decades, chapter, width, height, true);
  buildDots(root, decades, chapter, width, height);
  buildParadoxArrow(root, decades, chapter, width, height);
  buildPath(root, decades, chapter, width, height);
}

function transitionChart(svgEl, decades, chapter) {
  const g = d3.select(svgEl).select('g');
  const { width, height } = svgEl.__dims || {};
  if (!width) return;

  buildAxes(g, decades, chapter, width, height, false);

  const { xScale, yScale } = buildScales(decades, chapter, width, height);
  const isHighlighted = dec => chapter.highlightDecades?.includes(dec);

  decades.forEach((d, i) => {
    const cx  = xScale(d[chapter.xKey]);
    const cy  = yScale(d.valence);
    const hi  = isHighlighted(d.decade);
    const del = i * 50;

    g.select(`.halo-${d.decade}`).transition().duration(600).delay(del)
      .attr('cx', cx).attr('cy', cy).attr('r', hi ? 22 : 16)
      .attr('stroke-width', hi ? 2 : 1).attr('opacity', hi ? 0.55 : 0.28);

    g.select(`.dot-${d.decade}`).transition().duration(600).delay(del)
      .attr('cx', cx).attr('cy', cy).attr('r', hi ? 13 : 9);

    g.select(`.lbl-${d.decade}`).transition().duration(600).delay(del)
      .attr('x', cx).attr('y', cy - (hi ? 26 : 20))
      .attr('font-size', hi ? '12px' : '11px')
      .attr('font-weight', hi ? '700' : '600');

    g.select(`.hit-${d.decade}`).transition().duration(600).delay(del).attr('cx', cx).attr('cy', cy);
  });

  g.selectAll('.p-arrow, .p-lbl1, .p-lbl2').remove();
  buildParadoxArrow(g, decades, chapter, width, height);

  const chronological = [...decades].sort((a, b) => a.decade - b.decade);
  const lineGen = d3.line()
    .x(d => xScale(d[chapter.xKey]))
    .y(d => yScale(d.valence))
    .curve(d3.curveCatmullRom.alpha(0.5));
  g.select('.connect-path').transition().duration(700).attr('d', lineGen(chronological));

  const tip = d3.select('.rs-tip');
  decades.forEach(d => {
    const col = DECADE_COLORS[d.decade] ?? '#8B5CF6';
    const hi  = isHighlighted(d.decade);
    g.select(`.hit-${d.decade}`)
      .on('mouseover', function () {
        tip.style('visibility', 'visible').html(buildTooltip(d, chapter, col));
        g.select(`.halo-${d.decade}`)
          .transition().duration(300).attr('r', 28).attr('opacity', 0.8)
          .transition().duration(300).attr('r', hi ? 22 : 16).attr('opacity', hi ? 0.55 : 0.28);
      })
      .on('mousemove', evt => tip.style('top', (evt.pageY - 10) + 'px').style('left', (evt.pageX + 18) + 'px'))
      .on('mouseout', () => tip.style('visibility', 'hidden'));
  });
}

// ─── Takeaway ─────────────────────────────────────────────────────────────────

const soWhatChapter = CHAPTERS[CHAPTERS.length - 1];

function ParadoxTakeaway() {
  return (
    <div style={{
      background: `linear-gradient(90deg, ${soWhatChapter.accent}0f 0%, ${soWhatChapter.accent}04 100%)`,
      borderTop: `1px solid ${soWhatChapter.accent}33`,
      borderBottom: `1px solid ${soWhatChapter.accent}33`,
      padding: '80px 0',
    }}>
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '0 32px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 60,
        alignItems: 'center',
      }}>
        {/* Left — tag + headline + body */}
        <div>
          <p style={{
            fontSize: 10,
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            color: soWhatChapter.accent,
            marginBottom: 16,
            fontWeight: 700,
            fontFamily: "'DM Mono', monospace",
            opacity: 0.78,
          }}>
            THE TAKEAWAY
          </p>
          <h3 style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: 'clamp(2rem, 4vw, 3.2rem)',
            lineHeight: 1.08,
            color: '#e8e8f0',
            marginBottom: 20,
          }}>
            {soWhatChapter.headline}
          </h3>
          <p style={{
            fontSize: 'clamp(0.95rem, 1.5vw, 1.1rem)',
            color: 'rgba(232,232,240,0.68)',
            lineHeight: 1.78,
          }}>
            {soWhatChapter.body}
          </p>
        </div>

        {/* Right — three left-bordered stat cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            { accent: '#FB7185', label: 'Valence',      value: '↓ sadder',      sub: 'mood dropped decade on decade' },
            { accent: '#FBBF24', label: 'Loudness',     value: '↑ louder',      sub: 'melancholy wore amplification' },
            { accent: '#60A5FA', label: 'Acousticness', value: '↓ less organic', sub: 'warmth left sound & sentiment' },
          ].map(({ accent, label, value, sub }) => (
            <div key={label} style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              padding: '20px 24px',
              background: `${accent}12`,
              border: `1px solid ${accent}24`,
              borderLeft: `4px solid ${accent}`,
              borderRadius: 12,
            }}>
              <span style={{
                fontSize: 11,
                color: 'rgba(232,232,240,0.56)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}>
                {label}
              </span>
              <span style={{
                fontSize: 'clamp(1.8rem, 3vw, 2.6rem)',
                fontWeight: 700,
                fontFamily: "'DM Serif Display', serif",
                lineHeight: 1,
                color: accent,
              }}>
                {value}
              </span>
              <span style={{ fontSize: 11, color: 'rgba(232,232,240,0.46)' }}>
                {sub}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function RelationshipScatter({ data, popularity, genre }) {
  const [ref, inView]     = useInView({ threshold: 0.05 });
  const svgRef            = useRef(null);
  const stepsRef          = useRef([]);
  const [activeChapter, setActiveChapter] = useState(0);
  const prevChapter       = useRef(-1);

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
          decade:        +rows[0].decade,
          valence:       d3.mean(rows, r => r.valence),
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

  const prevDecadeData = useRef(null);
  useEffect(() => {
    if (!decadeData.length || !svgRef.current || !inView) return;

    const targetChapter = CHAPTERS[activeChapter];
    if (targetChapter.hideChart) return;

    const dataChanged = prevDecadeData.current !== decadeData;
    prevDecadeData.current = decadeData;

    if (dataChanged) {
      initChart(svgRef.current, decadeData, targetChapter);
      prevChapter.current = activeChapter;
      return;
    }

    if (prevChapter.current === activeChapter) return;
    transitionChart(svgRef.current, decadeData, targetChapter);
    prevChapter.current = activeChapter;
  }, [decadeData, activeChapter, inView]);

  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) setActiveChapter(+entry.target.dataset.chapter);
        });
      },
      { rootMargin: '-40% 0px -40% 0px', threshold: 0 }
    );
    stepsRef.current.forEach(el => el && obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const chapter = CHAPTERS[activeChapter];

  const scopeText = [
    popularity > 0 ? `popularity ≥ ${popularity}` : 'all popularity levels',
    genre && genre !== 'All' ? `genre: ${genre}` : 'all genres',
  ].join(' · ');

  return (
    <section ref={ref} style={styles.section}>
      <div className="container">
        <p className="section-label" style={{ color: '#FB7185' }}>The Sadness Paradox</p>
        <h2 className="section-title" style={{ color: '#e8e8f0', marginBottom: 16 }}>
          Music Got Sadder<br /><em>But More Compelling</em>
        </h2>
      </div>

      {/* ── Scrollytelling: left steps + right sticky chart ── */}
      <div style={styles.scrollyWrap}>

        {/* LEFT — narrative steps */}
        <div style={styles.stepsCol}>
          {CHAPTERS.map((ch, i) => (
            <div
              key={ch.id}
              data-chapter={i}
              ref={el => stepsRef.current[i] = el}
              style={{
                ...styles.step,
                opacity: activeChapter === i ? 1 : 0.35,
                transform: activeChapter === i ? 'translateY(0)' : 'translateY(6px)',
              }}
            >
              {ch.isSoWhat ? (
                /* Invisible scroll target — triggers the observer so the
                   sticky chart disappears as the takeaway band scrolls in */
                <div style={{ height: '30vh' }} />
              ) : (
                <>
                  <div style={{ ...styles.chapterPill, background: ch.accent + '22', borderColor: ch.accent + '55', color: ch.accent }}>
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <h3 style={{ ...styles.stepHead, color: activeChapter === i ? '#e8e8f0' : 'rgba(232,232,240,0.55)' }}>
                    {ch.headline}
                  </h3>
                  <p style={styles.stepBody}>{ch.body}</p>
                  <div style={styles.decadeCallout}>
                    {ch.highlightDecades.map(dec => (
                      <span key={dec} style={{ ...styles.decadeBadge, borderColor: DECADE_COLORS[dec] + '99', color: DECADE_COLORS[dec] }}>
                        {dec}s
                      </span>
                    ))}
                    <span style={styles.decadeCalloutText}>highlighted on chart</span>
                  </div>
                </>
              )}
            </div>
          ))}
          <div style={{ height: '20vh' }} />
        </div>

        {/* RIGHT — sticky chart (hidden when sowhat chapter is active) */}
        <div style={{
          ...styles.stickyCol,
          opacity: chapter.hideChart ? 0 : 1,
          pointerEvents: chapter.hideChart ? 'none' : 'auto',
          transition: 'opacity 0.4s ease',
        }}>
          <div style={{
            ...styles.card,
            borderColor: 'rgba(255,255,255,0.07)',
            transition: 'border-color 0.6s ease',
          }}>
            <div style={styles.progressDots}>
              {CHAPTERS.filter(ch => !ch.isSoWhat).map((ch, i) => (
                <button
                  key={ch.id}
                  onClick={() => setActiveChapter(i)}
                  title={ch.headline}
                  style={{
                    ...styles.dot,
                    background: activeChapter === i ? ch.accent : 'rgba(255,255,255,0.15)',
                    transform: activeChapter === i ? 'scale(1.4)' : 'scale(1)',
                  }}
                />
              ))}
            </div>

            <svg ref={svgRef} width="100%" height={460} style={{ display: 'block' }} />

            <div style={{ ...styles.chartCaption, borderColor: chapter.accent + '33' }}>
              <span style={{ color: chapter.accent, fontWeight: 700, fontSize: 12 }}>{chapter.headline}</span>
              <span style={{ color: 'rgba(232,232,240,0.4)', fontSize: 11, marginLeft: 10 }}>
                {chapter.id === 'acoustic' ? 'Co-decline' : 'Paradox'}
              </span>
            </div>
          </div>

          <div style={styles.legendRow}>
            <div style={styles.legend}>
              {[
                { color: '#F59E0B', label: '1960s–70s · peak happiness' },
                { color: '#60A5FA', label: '2000s–10s · trough' },
              ].map(({ color, label }) => (
                <span key={label} style={styles.legendItem}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
                  <span style={{ color: 'rgba(232,232,240,0.45)', fontSize: 11 }}>{label}</span>
                </span>
              ))}
              <span style={styles.legendItem}>
                <span style={{ width: 20, height: 2, background: 'rgba(251,113,133,0.5)', display: 'inline-block', borderRadius: 2 }} />
                <span style={{ color: 'rgba(232,232,240,0.35)', fontSize: 11 }}>Direction of travel</span>
              </span>
            </div>
            <div style={styles.scopeTag}>
              <span style={styles.scopeDot} />
              {scopeText}
            </div>
          </div>
        </div>
      </div>

      {/* ── Full-bleed takeaway — outside the scrolly layout ── */}
      <ParadoxTakeaway />
    </section>
  );
}

const styles = {
  section: {
    padding: '100px 0 0',
    background: 'linear-gradient(180deg, var(--bg2) 0%, var(--bg) 100%)',
  },
  scrollyWrap: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 48,
    maxWidth: 1200,
    margin: '60px auto 0',
    padding: '0 24px',
    position: 'relative',
  },
  stepsCol: {
    flex: '0 0 320px',
    paddingTop: '15vh',
  },
  step: {
    minHeight: '60vh',
    paddingBottom: 40,
    transition: 'opacity 0.5s ease, transform 0.5s ease',
  },
  chapterPill: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '3px 12px',
    borderRadius: 999,
    border: '1px solid',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.12em',
    marginBottom: 16,
    fontFamily: "'DM Mono', monospace",
  },
  stepHead: {
    fontSize: 22,
    fontWeight: 700,
    lineHeight: 1.3,
    marginBottom: 12,
    transition: 'color 0.4s ease',
    fontFamily: "'DM Sans', sans-serif",
  },
  stepBody: {
    color: 'rgba(232,232,240,0.55)',
    fontSize: 14,
    lineHeight: 1.8,
    marginBottom: 20,
    fontFamily: "'DM Sans', sans-serif",
  },
  decadeCallout: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  decadeBadge: {
    border: '1px solid',
    borderRadius: 6,
    padding: '2px 10px',
    fontSize: 11,
    fontWeight: 700,
    fontFamily: "'DM Mono', monospace",
    letterSpacing: '0.08em',
  },
  decadeCalloutText: {
    color: 'rgba(232,232,240,0.3)',
    fontSize: 11,
    fontStyle: 'italic',
  },
  stickyCol: {
    flex: 1,
    position: 'sticky',
    top: '10vh',
    alignSelf: 'flex-start',
  },
  card: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid',
    borderRadius: 16,
    padding: '16px 8px 8px',
    overflowX: 'auto',
    position: 'relative',
  },
  progressDots: {
    display: 'flex',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
  },
  dot: {
    width: 8,
    height: 8,
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    borderRadius: '50%',
    transition: 'transform 0.3s ease, background 0.3s ease',
  },
  chartCaption: {
    borderTop: '1px solid',
    marginTop: 8,
    padding: '10px 12px 4px',
    display: 'flex',
    alignItems: 'center',
    transition: 'border-color 0.4s ease',
  },
  legendRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    paddingTop: 14,
    marginTop: 12,
    borderTop: '1px solid rgba(255,255,255,0.07)',
  },
  legend: {
    display: 'flex',
    gap: 20,
    flexWrap: 'wrap',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
  },
  scopeTag: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 11,
    color: 'rgba(232,232,240,0.28)',
    fontStyle: 'italic',
    fontFamily: "'DM Mono', monospace",
    letterSpacing: '0.04em',
  },
  scopeDot: {
    width: 5,
    height: 5,
    borderRadius: '50%',
    background: 'rgba(232,232,240,0.2)',
    display: 'inline-block',
    flexShrink: 0,
  },
};
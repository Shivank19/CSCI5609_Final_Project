import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { normalizeLoudness } from "../utils/dataUtils";

const FIELDS = [
  {
    key: "valence",
    label: "Valence",
    color: "#f4a261",
    dimColor: "rgba(244,162,97,0.12)",
    steps: [
      {
        tag: "THE BASELINE",
        title: "Popular music once leaned openly joyful.",
        body:
          "In the early decades of the dataset, the average song sounded far more buoyant than it does now. This is the world of swing, soul, disco, and songs built to lift a room. By the 1970s, valence reaches its high point. Mainstream music was not just catchy. It was emotionally bright.",
        bridge: "But warmth in mood is only one part of the story.",
      },
      {
        tag: "THE TURN",
        title: "The 1990s made melancholy feel mainstream.",
        body:
          "The shift is not subtle. Alternative rock, grunge, and darker pop aesthetics stop living at the edges and move into the center of culture. The average emotional tone bends downward, and it keeps bending. What had once felt like a countercurrent starts rewriting the default mood of popular music.",
        bridge: "And the emotional drop is not the only thing that spikes here.",
      },
      {
        tag: "THE DECLINE",
        title: "By the 2010s, the emotional floor has moved.",
        body:
          "Valence keeps sliding into the streaming era. The songs are still sticky, polished, and huge. They just carry less of the easy optimism that dominated earlier decades. The change matters because it reframes what a hit song is allowed to feel like.",
        bridge: "If songs felt less sunny, they also started hitting much harder.",
      },
    ],
  },
  {
    key: "loudness_norm",
    label: "Loudness",
    color: "#e9c46a",
    dimColor: "rgba(233,196,106,0.12)",
    steps: [
      {
        tag: "THE BUILDUP",
        title: "For decades, louder felt like better.",
        body:
          "Human ears are easy to fool. A track mastered a little hotter can feel more exciting in a quick comparison, especially on radio. Once labels realized that, loudness stopped being a technical setting and became a competitive strategy.",
        bridge: "Then software removed most of the old limits.",
      },
      {
        tag: "THE 1990S INFLECTION",
        title: "The 1990s break looks almost violent in the data.",
        body:
          "Digital production tools let engineers crush dynamic range and push songs toward the ceiling. The jump from the 1990s into the 2000s is the steepest rise anywhere in this series. It is the kind of change you can see at a glance, which is exactly why this decade needs to feel like the shock moment.",
        bridge: "And something even stranger is happening underneath that volume.",
      },
      {
        tag: "THE AFTERMATH",
        title: "Streaming changed the incentive, not the habit.",
        body:
          "Normalization on platforms like Spotify reduced the payoff for over-mastering, so the curve stops sprinting upward. But the sound of compression stays with us. Once audiences get used to that density, it becomes part of the texture of modern pop itself.",
        bridge: "Volume rises. Something organic disappears at the same time.",
      },
    ],
  },
  {
    key: "acousticness",
    label: "Acousticness",
    color: "#457b9d",
    dimColor: "rgba(69,123,157,0.12)",
    steps: [
      {
        tag: "THE ORGANIC ERA",
        title: "Recorded music used to sound much more physical.",
        body:
          "Earlier recordings carry more room tone, more live instruments, and more evidence of people actually playing together. High acousticness does not mean old-fashioned or simple. It means the sound is grounded in real instruments, real spaces, and less synthetic construction.",
        bridge: "That physical texture starts thinning out faster than you might expect.",
      },
      {
        tag: "THE COLLAPSE",
        title: "Once electronic production scales, acousticness caves in.",
        body:
          "Synths, drum machines, sampling, and tighter digital workflows do not just add new colors. They replace older ones. The decline is steep enough that the 1980s and 1990s feel like a structural break, not a gentle stylistic drift.",
        bridge: "By now, the pattern is too aligned to ignore.",
      },
      {
        tag: "THE NEW DEFAULT",
        title: "The synthetic soundscape becomes normal.",
        body:
          "By the 2020s, the average song contains far less of the acoustic signature that once anchored popular music. This is not a value judgment. It is a measurable change in the building materials of a hit record, and it completes the three-part turn you are seeing here.",
        bridge: "Put the three together and the century suddenly snaps into focus.",
      },
    ],
  },
];

const FIELD_START = FIELDS.reduce((acc, field, index) => {
  acc.push(index === 0 ? 0 : acc[index - 1] + FIELDS[index - 1].steps.length);
  return acc;
}, []);

function globalToField(globalStep) {
  for (let i = FIELDS.length - 1; i >= 0; i -= 1) {
    if (globalStep >= FIELD_START[i]) {
      return { fieldIdx: i, stepIdx: globalStep - FIELD_START[i] };
    }
  }
  return { fieldIdx: 0, stepIdx: 0 };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function useElementSize(ref, fallbackHeight = 420) {
  const [size, setSize] = useState({ width: 720, height: fallbackHeight });

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    const update = () => {
      const rect = node.getBoundingClientRect();
      setSize({
        width: Math.max(320, rect.width || 720),
        height: Math.max(280, rect.height || fallbackHeight),
      });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    window.addEventListener("resize", update);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [ref, fallbackHeight]);

  return size;
}

function buildVisibleSeries(yearData, progress) {
  if (!yearData.length) return [];
  if (yearData.length === 1) return yearData;

  const scaledIndex = clamp(progress, 0, 1) * (yearData.length - 1);
  const lowerIndex = Math.floor(scaledIndex);
  const upperIndex = Math.min(yearData.length - 1, Math.ceil(scaledIndex));
  const t = scaledIndex - lowerIndex;

  const visible = yearData.slice(0, lowerIndex + 1);

  if (upperIndex > lowerIndex) {
    const lower = yearData[lowerIndex];
    const upper = yearData[upperIndex];
    const interpolated = { year: lower.year + (upper.year - lower.year) * t };

    FIELDS.forEach((field) => {
      interpolated[field.key] =
        lower[field.key] + (upper[field.key] - lower[field.key]) * t;
    });

    visible.push(interpolated);
  }

  return visible;
}

function formatValue(field, value) {
  if (field.key === "loudness_norm") {
    const db = value * 20 - 20;
    return `${db.toFixed(1)} dB`;
  }
  return `${Math.round(value * 100)}%`;
}

function buildYearData(data, popularityThreshold) {
  if (!data?.length) return [];
  const byYear = d3.rollup(
    data.filter(
      (d) => d.year >= 1960 && Number.isFinite(d.popularity) && d.popularity >= popularityThreshold,
    ),
    (rows) => ({
      year: rows[0].year,
      valence: d3.mean(rows, (row) => +row.valence),
      loudness_norm: d3.mean(rows, (row) => normalizeLoudness(+row.loudness)),
      acousticness: d3.mean(rows, (row) => +row.acousticness),
    }),
    (row) => row.year,
  );
  return Array.from(byYear.values()).sort((a, b) => a.year - b.year);
}

function TrifectaChart({
  yearData,
  progressByField,
  activeField,
  fullReveal,
  popularityThreshold,
  interactiveHover,
  brushRange,
}) {
  const wrapperRef = useRef(null);
  const { width, height } = useElementSize(
    wrapperRef,
    fullReveal ? 420 : 360,
  );
  const [hoveredYear, setHoveredYear] = useState(null);
  const [hoveredField, setHoveredField] = useState(null);

  const margin = useMemo(
    () => ({ top: 28, right: 88, bottom: 42, left: 52 }),
    [],
  );

  const innerWidth = Math.max(240, width - margin.left - margin.right);
  const innerHeight = Math.max(220, height - margin.top - margin.bottom);

  const xScale = useMemo(
    () => {
      const scale = d3.scaleLinear().domain([1960, 2020]).range([0, innerWidth]);
      if (brushRange) {
        scale.domain([brushRange[0], brushRange[1]]);
      }
      return scale;
    },
    [innerWidth, brushRange],
  );
  const yScale = useMemo(
    () => d3.scaleLinear().domain([0, 1]).range([innerHeight, 0]),
    [innerHeight],
  );

  const lineGenerator = useMemo(
    () =>
      d3
        .line()
        .defined((d) => Number.isFinite(d.value))
        .x((d) => xScale(d.year))
        .y((d) => yScale(d.value))
        .curve(d3.curveMonotoneX),
    [xScale, yScale],
  );

  const hoverYear = hoveredYear ?? yearData[yearData.length - 1]?.year ?? 2020;

  const hoveredPoints = useMemo(
    () =>
      FIELDS.filter((field) => (progressByField[field.key] ?? 0) > 0.001)
        .map((field) => {
          const progress = progressByField[field.key] ?? 0;
          const series = buildVisibleSeries(yearData, progress);
          const closest =
            series.reduce((best, row) => {
              if (!best) return row;
              return Math.abs(row.year - hoverYear) < Math.abs(best.year - hoverYear)
                ? row
                : best;
            }, null) || series[series.length - 1];
          return closest
            ? {
                field,
                year: closest.year,
                value: closest[field.key],
                x: xScale(closest.year),
                y: yScale(closest[field.key]),
              }
            : null;
        })
        .filter(Boolean),
    [hoverYear, progressByField, yearData, xScale, yScale],
  );

  const tooltipPoint =
    hoveredPoints.find((point) => point.field.key === hoveredField) || null;

  const handlePointerMove = (event) => {
    if (!interactiveHover) return;
    const bounds = wrapperRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const localX = event.clientX - bounds.left - margin.left;
    const year = clamp(Math.round(xScale.invert(localX)), 1960, 2020);
    setHoveredYear(year);
  };

  return (
    <div
      ref={wrapperRef}
      style={{ position: "relative", width: "100%", height: "100%" }}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ display: "block", width: "100%", height: "100%", overflow: "visible" }}
        onMouseMove={handlePointerMove}
        onMouseLeave={() => {
          setHoveredYear(null);
          setHoveredField(null);
        }}
      >
        <defs>
          <linearGradient id="inflectionGlow" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,90,60,0.28)" />
            <stop offset="55%" stopColor="rgba(255,90,60,0.12)" />
            <stop offset="100%" stopColor="rgba(255,90,60,0.02)" />
          </linearGradient>
        </defs>

        <g transform={`translate(${margin.left},${margin.top})`}>
          {yScale.ticks(5).map((tick) => (
            <line
              key={`grid-${tick}`}
              x1={0}
              x2={innerWidth}
              y1={yScale(tick)}
              y2={yScale(tick)}
              stroke="rgba(255,255,255,0.06)"
              strokeDasharray="4 6"
            />
          ))}

          <rect
            x={xScale(1990)}
            y={0}
            width={xScale(2000) - xScale(1990)}
            height={innerHeight}
            fill="url(#inflectionGlow)"
            stroke="rgba(255,110,70,0.48)"
            strokeWidth={1}
            rx={10}
          />
          <text
            x={(xScale(1990) + xScale(2000)) / 2}
            y={16}
            textAnchor="middle"
            fill="rgba(255,183,160,0.92)"
            fontSize="10"
            fontWeight="700"
            letterSpacing="0.18em"
          >
            1990s BREAK
          </text>
          <text
            x={(xScale(1990) + xScale(2000)) / 2}
            y={32}
            textAnchor="middle"
            fill="rgba(255,220,210,0.58)"
            fontSize="9"
          >
            mood drops, volume surges
          </text>

          {xScale.ticks(7).map((tick) => (
            <g key={`xtick-${tick}`} transform={`translate(${xScale(tick)},0)`}>
              <line
                y1={innerHeight}
                y2={innerHeight + 6}
                stroke="rgba(255,255,255,0.18)"
              />
              <text
                y={innerHeight + 20}
                textAnchor="middle"
                fontSize="10"
                fill="rgba(232,232,240,0.42)"
              >
                {`'${String(tick).slice(2)}`}
              </text>
            </g>
          ))}

          {yScale.ticks(5).map((tick) => (
            <g key={`ytick-${tick}`} transform={`translate(0,${yScale(tick)})`}>
              <line x1={-6} x2={0} stroke="rgba(255,255,255,0.18)" />
              <text
                x={-12}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize="10"
                fill="rgba(232,232,240,0.42)"
              >
                {`${Math.round(tick * 100)}%`}
              </text>
            </g>
          ))}

          {FIELDS.map((field) => {
            const progress = progressByField[field.key] ?? 0;
            if (progress <= 0.001) return null;

            const series = buildVisibleSeries(yearData, progress).map((row) => ({
              year: row.year,
              value: row[field.key],
            }));
            if (series.length < 2) return null;

            const path = lineGenerator(series);
            const finalPoint = series[series.length - 1];
            const isActive = activeField === field.key || (!activeField && fullReveal);
            const isHovered = interactiveHover && hoveredField === field.key;

            return (
              <g key={field.key}>
                <path
                  d={path}
                  fill="none"
                  stroke={field.color}
                  strokeWidth={isActive || isHovered ? 3.8 : 2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={isActive || isHovered ? 1 : 0.18}
                  style={{ transition: "opacity 220ms ease, stroke-width 220ms ease" }}
                />
                <path
                  d={path}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={16}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  onMouseEnter={() => {
                    if (!interactiveHover) return;
                    setHoveredField(field.key);
                  }}
                  onMouseMove={(event) => {
                    if (!interactiveHover) return;
                    handlePointerMove(event);
                    setHoveredField(field.key);
                  }}
                  onMouseLeave={() => {
                    if (!interactiveHover) return;
                    setHoveredField(null);
                    setHoveredYear(null);
                  }}
                />
                <text
                  x={xScale(finalPoint.year) + 10}
                  y={yScale(finalPoint.value)}
                  fill={field.color}
                  opacity={isActive || isHovered ? 0.96 : 0.28}
                  fontSize="11"
                  dominantBaseline="middle"
                  style={{ transition: "opacity 220ms ease" }}
                >
                  {field.label}
                </text>
              </g>
            );
          })}

          {interactiveHover && tooltipPoint && (
            <line
              x1={tooltipPoint.x}
              x2={tooltipPoint.x}
              y1={0}
              y2={innerHeight}
              stroke="rgba(255,255,255,0.16)"
              strokeDasharray="4 6"
            />
          )}

          {interactiveHover &&
            hoveredField &&
            hoveredPoints.map((point) => {
              const emphasized = point.field.key === hoveredField;
              return (
                <g key={`hover-${point.field.key}`}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={emphasized ? 6 : 4}
                    fill={point.field.color}
                    opacity={emphasized ? 1 : 0.6}
                  />
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={emphasized ? 10 : 7}
                    fill={point.field.color}
                    opacity={emphasized ? 0.16 : 0.08}
                  />
                </g>
              );
            })}
        </g>
      </svg>

      {interactiveHover && tooltipPoint && hoveredField && (
        <div
          style={{
            ...tooltipStyle,
            left: clamp(margin.left + tooltipPoint.x + 18, 16, width - 190),
            top: clamp(margin.top + tooltipPoint.y - 44, 12, height - 110),
          }}
        >
          <div style={tooltipYear}>{tooltipPoint.year}</div>
          {hoveredPoints.map((point) => {
            const emphasized = point.field.key === hoveredField;
            return (
              <div
                key={`tooltip-${point.field.key}`}
                style={{
                  ...tooltipRow,
                  opacity: emphasized ? 1 : 0.56,
                }}
              >
                <span
                  style={{
                    ...tooltipDot,
                    background: point.field.color,
                  }}
                />
                <span style={{ color: emphasized ? "#f7f7fb" : "rgba(247,247,251,0.74)" }}>
                  {point.field.label}
                </span>
                <span style={{ marginLeft: "auto", color: point.field.color }}>
                  {formatValue(point.field, point.value)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div style={thresholdBadge}>
        Filter by popularity: {Math.round(popularityThreshold)}+
        {!interactiveHover && (
          <span style={thresholdSubtext}> locked for the narrative view</span>
        )}
      </div>
    </div>
  );
}

function RevealChart({ yearData, popularityThreshold, brushRange, setBrushRange }) {
  const svgRef = useRef(null);
  const brushRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current || !yearData.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 28, right: 88, bottom: 40, left: 52 };
    const width = svgRef.current.clientWidth - margin.left - margin.right;
    const height = 370 - margin.top - margin.bottom;

    const chart = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const xMain = d3.scaleLinear()
      .domain(d3.extent(yearData, (d) => d.year))
      .range([0, width]);

    if (brushRange) {
      xMain.domain(brushRange);
    }

    const y = d3.scaleLinear().domain([0, 1]).range([height, 0]);

    const xAxis = d3.axisBottom(xMain).tickFormat(d3.format('d')).ticks(width / 80);
    const yAxis = d3.axisLeft(y).ticks(5).tickFormat((d) => `${Math.round(d * 100)}%`);

    chart.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(xAxis)
      .call((g) => g.select('.domain').attr('stroke', 'rgba(255,255,255,0.12)'))
      .call((g) => g.selectAll('line').attr('stroke', 'rgba(255,255,255,0.12)'))
      .call((g) => g.selectAll('text').attr('fill', 'rgba(232,232,240,0.42)').attr('font-size', '10'));

    chart.append('g')
      .call(yAxis)
      .call((g) => g.select('.domain').remove())
      .call((g) => g.selectAll('line').attr('stroke', 'rgba(255,255,255,0.06)').attr('stroke-dasharray', '4,6'))
      .call((g) => g.selectAll('text').attr('fill', 'rgba(232,232,240,0.42)').attr('font-size', '10'));

    // 1990s inflection zone
    const x1990 = xMain(1990);
    const x2000 = xMain(2000);
    if (x1990 < width && x2000 > 0) {
      chart.append('rect')
        .attr('x', Math.max(0, x1990))
        .attr('y', 0)
        .attr('width', Math.min(width, x2000) - Math.max(0, x1990))
        .attr('height', height)
        .attr('fill', 'rgba(255,90,60,0.07)')
        .attr('stroke', 'rgba(255,110,70,0.3)')
        .attr('stroke-width', 1)
        .attr('rx', 6);
    }

    // Clip path
    chart.append('defs').append('clipPath')
      .attr('id', 'trifecta-clip')
      .append('rect')
      .attr('width', width)
      .attr('height', height);

    const lineGroup = chart.append('g').attr('clip-path', 'url(#trifecta-clip)');

    FIELDS.forEach((field) => {
      const line = d3.line()
        .x((d) => xMain(d.year))
        .y((d) => y(d[field.key]))
        .curve(d3.curveMonotoneX)
        .defined((d) => Number.isFinite(d[field.key]));

      lineGroup.append('path')
        .datum(yearData)
        .attr('class', `trifecta-line-${field.key}`)
        .attr('fill', 'none')
        .attr('stroke', field.color)
        .attr('stroke-width', 2.5)
        .attr('d', line);

      // End label
      const lastVisible = yearData.filter((d) => xMain(d.year) <= width && xMain(d.year) >= 0).pop();
      if (lastVisible) {
        lineGroup.append('text')
          .attr('x', xMain(lastVisible.year) + 8)
          .attr('y', y(lastVisible[field.key]))
          .attr('fill', field.color)
          .attr('font-size', '11')
          .attr('font-weight', '600')
          .attr('dominant-baseline', 'middle')
          .text(field.label);
      }
    });

    // Tooltip crosshair
    const bisect = d3.bisector((d) => d.year).left;
    const focus = chart.append('g').style('display', 'none');
    focus.append('line')
      .attr('y1', 0).attr('y2', height)
      .attr('stroke', 'rgba(255,255,255,0.2)')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4,4');
    FIELDS.forEach((field) => {
      focus.append('circle')
        .attr('class', `dot-${field.key}`)
        .attr('r', 5)
        .attr('fill', field.color)
        .attr('stroke', 'rgba(10,10,16,0.8)')
        .attr('stroke-width', 2);
    });

    const tooltip = d3.select('body').selectAll('.trifecta-reveal-tip')
      .data([null]).join('div')
      .attr('class', 'trifecta-reveal-tip')
      .style('position', 'fixed')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('min-width', '160px')
      .style('padding', '10px 12px')
      .style('border-radius', '10px')
      .style('border', '1px solid rgba(255,255,255,0.08)')
      .style('background', 'rgba(12,12,18,0.92)')
      .style('backdrop-filter', 'blur(12px)')
      .style('font-size', '12px')
      .style('color', '#e8e8f0')
      .style('z-index', 9999);

    svg.on('mousemove', (event) => {
      const [mx] = d3.pointer(event);
      const mouseX = mx - margin.left;
      if (mouseX < 0 || mouseX > width) {
        focus.style('display', 'none');
        tooltip.style('opacity', 0);
        return;
      }
      const x0 = xMain.invert(mouseX);
      const i = bisect(yearData, x0, 1);
      const d0 = yearData[i - 1];
      const d1 = yearData[i];
      if (!d0) return;
      const d = d1 && (x0 - d0.year > d1.year - x0) ? d1 : d0;

      focus.style('display', null).attr('transform', `translate(${xMain(d.year)},0)`);
      FIELDS.forEach((field) => {
        focus.select(`.dot-${field.key}`).attr('cy', y(d[field.key]));
      });

      const ttLeft = event.clientX + 16;
      const ttTop = event.clientY - 60;
      tooltip.style('opacity', 1)
        .style('left', `${ttLeft}px`)
        .style('top', `${ttTop}px`)
        .html(`<div style="font-weight:700;margin-bottom:6px;color:rgba(232,232,240,0.5);font-size:10px;letter-spacing:0.1em">${d.year}</div>` +
          FIELDS.map((f) => {
            const val = d[f.key];
            const display = f.key === 'loudness_norm'
              ? `${(val * 20 - 20).toFixed(1)} dB`
              : `${Math.round(val * 100)}%`;
            return `<div style="display:flex;justify-content:space-between;gap:24px;margin-bottom:3px">
              <span style="color:rgba(232,232,240,0.6)">${f.label}</span>
              <span style="color:${f.color};font-weight:600">${display}</span>
            </div>`;
          }).join(''));
    });

    svg.on('mouseleave', () => {
      focus.style('display', 'none');
      tooltip.style('opacity', 0);
    });

    // Brush mini-chart
    if (brushRef.current) {
      const bMargin = { top: 10, right: 88, bottom: 20, left: 52 };
      const bWidth = brushRef.current.clientWidth - bMargin.left - bMargin.right;
      const bHeight = 60 - bMargin.top - bMargin.bottom;

      const bSvg = d3.select(brushRef.current);
      bSvg.selectAll('*').remove();

      const bChart = bSvg.append('g').attr('transform', `translate(${bMargin.left},${bMargin.top})`);

      const xBrush = d3.scaleLinear()
        .domain(d3.extent(yearData, (d) => d.year))
        .range([0, bWidth]);

      const yBrush = d3.scaleLinear().domain([0, 1]).range([bHeight, 0]);

      FIELDS.forEach((field) => {
        const bLine = d3.line()
          .x((d) => xBrush(d.year))
          .y((d) => yBrush(d[field.key]))
          .curve(d3.curveMonotoneX);
        bChart.append('path')
          .datum(yearData)
          .attr('fill', 'none')
          .attr('stroke', field.color)
          .attr('stroke-width', 1)
          .attr('opacity', 0.4)
          .attr('d', bLine);
      });

      const brush = d3.brushX()
        .extent([[0, 0], [bWidth, bHeight]])
        .on('brush end', (event) => {
          if (event.selection) {
            setBrushRange(event.selection.map(xBrush.invert));
          } else {
            setBrushRange(null);
          }
        });

      bChart.append('g').attr('class', 'brush').call(brush);

      if (brushRange) {
        bChart.select('.brush').call(brush.move, brushRange.map(xBrush));
      }
    }
  }, [yearData, brushRange, setBrushRange]);

  return (
    <div style={revealChartCard}>
      <svg ref={svgRef} width="100%" height={370} style={{ display: 'block' }} />
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
        <p style={brushLabelStyle}>Drag to zoom into a time period</p>
        <svg ref={brushRef} width="100%" height={60} style={{ display: 'block' }} />
      </div>
    </div>
  );
}


function InflectionCallout() {
  return (
    <div style={inflectionWrap}>
      <div style={inflectionInner}>
        <div style={inflectionLeft}>
          <p style={inflectionTag}>THE TURNING POINT</p>
          <h2 style={inflectionHeadline}>
            The 1990s do not ease in.
            <br />
            They hit all at once.
          </h2>
          <p style={inflectionBody}>
            This is the section where the story should feel almost unfair. Mood
            falls, loudness lurches upward, and acoustic texture starts draining
            away in the same era. You are not looking at three unrelated style
            tweaks. You are watching the blueprint of mainstream music get rewritten.
          </p>
        </div>
        <div style={inflectionRight}>
          {[
            {
              label: "Valence",
              value: "-8 pts",
              sub: "the sharpest emotional drop",
              color: "#f4a261",
            },
            {
              label: "Loudness",
              value: "+1.8 dB",
              sub: "the most abrupt jump in the series",
              color: "#e9c46a",
            },
            {
              label: "Acousticness",
              value: "-12 pts",
              sub: "organic texture gives way fast",
              color: "#457b9d",
            },
          ].map(({ label, value, sub, color }) => (
            <div key={label} style={statCard(color)}>
              <span style={statLabel}>{label}</span>
              <span style={{ ...statValue, color }}>{value}</span>
              <span style={statSub}>{sub}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function TrifectaScrollytelling({ data }) {
  const [globalStep, setGlobalStep] = useState(0);
  const [finalPopularity, setFinalPopularity] = useState(70);
  const [brushRange, setBrushRange] = useState(null);
  const [fieldScrollProgress, setFieldScrollProgress] = useState(
    () => FIELDS.map((_, index) => (index === 0 ? 0 : 0)),
  );
  const stepsRef = useRef([]);

  const yearData = useMemo(() => buildYearData(data, 70), [data]);
  const finalYearData = useMemo(
    () => buildYearData(data, finalPopularity),
    [data, finalPopularity],
  );

  const allSteps = FIELDS.flatMap((field) =>
    field.steps.map((step) => ({ ...step, field })),
  );

  useEffect(() => {
    if (!yearData.length) return undefined;
    const observers = [];
    stepsRef.current.forEach((element, index) => {
      if (!element) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setGlobalStep(index);
        },
        {
          rootMargin: "-18% 0px -34% 0px",
          threshold: 0.15,
        },
      );
      observer.observe(element);
      observers.push(observer);
    });
    return () => observers.forEach((observer) => observer.disconnect());
  }, [yearData.length]);

  useEffect(() => {
    const updateProgress = () => {
      const viewportAnchor = window.innerHeight * 0.42;

      const nextProgress = FIELDS.map((field, fieldIndex) => {
        const startIndex = FIELD_START[fieldIndex];
        const endIndex = startIndex + field.steps.length - 1;
        const startEl = stepsRef.current[startIndex];
        const endEl = stepsRef.current[endIndex];

        if (!startEl || !endEl) return 0;

        const startRect = startEl.getBoundingClientRect();
        const endRect = endEl.getBoundingClientRect();
        const startPoint = startRect.top - viewportAnchor;
        const endPoint = endRect.top + endRect.height * 0.72 - viewportAnchor;

        if (startPoint >= 0) return 0;
        if (endPoint <= 0) return 1;

        return clamp(-startPoint / Math.max(1, endPoint - startPoint), 0, 1);
      });

      setFieldScrollProgress((prev) => {
        const changed = nextProgress.some(
          (value, index) => Math.abs(value - prev[index]) > 0.01,
        );
        return changed ? nextProgress : prev;
      });
    };

    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, []);

  const { fieldIdx, stepIdx } = globalToField(globalStep);
  const currentField = FIELDS[fieldIdx];
  const currentStep = currentField.steps[stepIdx];

  const progressByField = useMemo(() => {
    return FIELDS.reduce((acc, field, index) => {
      if (index < fieldIdx) acc[field.key] = 1;
      else if (index === fieldIdx) {
        acc[field.key] = Math.max(
          fieldScrollProgress[index] ?? 0,
          (stepIdx + 0.15) / field.steps.length,
        );
      }
      else acc[field.key] = 0;
      return acc;
    }, {});
  }, [fieldIdx, fieldScrollProgress, stepIdx]);

  if (!yearData.length) return null;

  return (
    <>
      <section style={scrollSection}>
        <div style={scrollInner}>
          <div style={textPane}>
            {allSteps.map((step, index) => {
              const isActive = globalStep === index;
              return (
                <div
                  key={`${step.field.key}-${step.tag}`}
                  ref={(element) => {
                    stepsRef.current[index] = element;
                  }}
                  style={{
                    ...stepBlock,
                    opacity: isActive ? 1 : 0.26,
                    transform: isActive ? "translateY(0)" : "translateY(14px)",
                    transition: "opacity 320ms ease, transform 320ms ease",
                  }}
                >
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "5px 12px",
                      background: `${step.field.color}18`,
                      border: `1px solid ${step.field.color}33`,
                      borderRadius: 999,
                      marginBottom: 14,
                    }}
                  >
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: step.field.color,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.12em",
                        color: step.field.color,
                      }}
                    >
                      {step.field.label} · {step.tag}
                    </span>
                  </div>

                  <h3 style={{ ...stepTitle, color: step.field.color }}>
                    {step.title}
                  </h3>
                  <p style={stepBody}>{step.body}</p>
                  <p style={stepBridge}>{step.bridge}</p>

                  <div style={{ display: "flex", gap: 5, marginTop: 18 }}>
                    {allSteps.map((_, dotIndex) => (
                      <div
                        key={`dot-${dotIndex}`}
                        style={{
                          width: dotIndex === index ? 20 : 6,
                          height: 6,
                          borderRadius: 999,
                          background:
                            dotIndex === index
                              ? step.field.color
                              : dotIndex < index
                                ? "rgba(255,255,255,0.25)"
                                : "rgba(255,255,255,0.1)",
                          transition: "all 220ms ease",
                        }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={chartPane}>
            <div style={chartCard}>
              <p style={chartSectionLabel}>
                {currentField.label}
                {fieldIdx > 0
                  ? ` with ${FIELDS.slice(0, fieldIdx)
                      .map((field) => field.label)
                      .join(" and ")} in the background`
                  : " in focus"}
              </p>

              <div style={chartCanvasWrap}>
                <TrifectaChart
                  yearData={yearData}
                  progressByField={progressByField}
                  activeField={currentField.key}
                  fullReveal={false}
                  popularityThreshold={70}
                  interactiveHover
                />
              </div>

              <p style={chartHint}>
                The bright line is the one this paragraph is talking about. The
                others stay visible so the continuity does not break. This story
                view is locked to songs with popularity scores of 70 and above so
                the narrative stays centered on the most visible hits. Hover a
                line to inspect a year.
              </p>
              <p style={chartBridge}>{currentStep.bridge}</p>
            </div>
          </div>
        </div>
      </section>

      <InflectionCallout />

      <section style={revealSection}>
        <div className="container">
          <p className="section-label" style={{ color: "#e63946", marginBottom: 12 }}>
            The Full Picture
          </p>
          <h2 className="section-title" style={{ color: "#e8e8f0", marginBottom: "20px" }}>
            Three shifts.
            <br />
            One new definition of a hit.
          </h2>
          <p className="section-body" style={{ marginBottom: "32px" }}>
            Once all three lines sit together, the pattern stops feeling abstract.
            Music grows less sunny, more compressed, and less acoustic over the same
            stretch of time. Here you can choose how narrowly you want to define
            mainstream.
          </p>

          <div style={finalControlRow}>
            <div>
              <p style={finalControlLabel}>Filter by popularity</p>
              <p style={finalControlBody}>
                Move this upward to concentrate on the songs that stayed closest to
                the center of platform listening. Move it downward to bring more of
                the catalog back into view.
              </p>
            </div>
            <div style={finalSliderWrap}>
              <div style={finalSliderHeader}>
                <span style={finalSliderValue}>0+</span>
                <span style={finalSliderValue}>{Math.round(finalPopularity)}+</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={finalPopularity}
                onChange={(event) => setFinalPopularity(+event.target.value)}
                style={{ width: "100%", accentColor: "#1db954", cursor: "pointer" }}
              />
            </div>
          </div>

          <RevealChart
            yearData={finalYearData}
            popularityThreshold={finalPopularity}
            brushRange={brushRange}
            setBrushRange={setBrushRange}
          />
          <div style={legendRow}>
            {FIELDS.map(({ key, label, color }) => (
              <span key={key} style={legendItem}>
                <span
                  style={{
                    width: 28,
                    height: 3,
                    background: color,
                    borderRadius: 2,
                    display: "inline-block",
                  }}
                />
                <span style={{ color: "rgba(232,232,240,0.66)", fontSize: 13 }}>
                  {label}
                </span>
              </span>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

const tooltipStyle = {
  position: "absolute",
  minWidth: 156,
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(12,12,18,0.88)",
  backdropFilter: "blur(14px)",
  boxShadow: "0 12px 24px rgba(0,0,0,0.28)",
  pointerEvents: "none",
};

const tooltipYear = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.12em",
  color: "rgba(247,247,251,0.5)",
  marginBottom: 8,
};

const tooltipRow = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 12,
  lineHeight: 1.5,
};

const tooltipDot = {
  width: 8,
  height: 8,
  borderRadius: "50%",
  flexShrink: 0,
};

const thresholdBadge = {
  position: "absolute",
  left: 14,
  top: 8,
  padding: "6px 10px",
  borderRadius: 999,
  background: "rgba(10,10,16,0.72)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "rgba(232,232,240,0.7)",
  fontSize: 11,
  lineHeight: 1.4,
  pointerEvents: "none",
};

const thresholdSubtext = {
  color: "rgba(232,232,240,0.44)",
};

const scrollSection = {
  background: "linear-gradient(180deg, var(--bg) 0%, var(--bg2) 100%)",
  paddingTop: "80px",
  paddingBottom: "80px",
};

const scrollInner = {
  maxWidth: "1200px",
  margin: "0 auto",
  padding: "0 32px",
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "48px",
  alignItems: "start",
};

const textPane = {
  display: "flex",
  flexDirection: "column",
  gap: "80vh",
  paddingTop: "15vh",
  paddingBottom: "30vh",
};

const stepBlock = {
  minHeight: "290px",
};

const stepTitle = {
  fontFamily: "'DM Serif Display', serif",
  fontSize: "clamp(1.3rem, 2.5vw, 1.95rem)",
  lineHeight: 1.15,
  marginBottom: "14px",
};

const stepBody = {
  fontSize: "clamp(0.94rem, 1.4vw, 1.05rem)",
  color: "rgba(232,232,240,0.72)",
  lineHeight: 1.8,
};

const stepBridge = {
  marginTop: "16px",
  fontSize: "0.98rem",
  color: "rgba(255,255,255,0.9)",
  lineHeight: 1.65,
};

const chartPane = {
  position: "sticky",
  top: "12vh",
  height: "76vh",
};

const chartCard = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: "18px",
  padding: "24px",
  height: "100%",
  display: "flex",
  flexDirection: "column",
};

const chartCanvasWrap = {
  position: "relative",
  flex: 1,
  minHeight: 0,
};

const chartSectionLabel = {
  fontSize: "10px",
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "rgba(232,232,240,0.34)",
  marginBottom: "12px",
  fontWeight: 600,
};

const chartHint = {
  fontSize: "11px",
  color: "rgba(232,232,240,0.48)",
  marginTop: "10px",
  lineHeight: 1.6,
};

const chartBridge = {
  fontSize: "12px",
  color: "rgba(255,255,255,0.88)",
  marginTop: "10px",
  lineHeight: 1.6,
};

const inflectionWrap = {
  background:
    "linear-gradient(90deg, rgba(255,80,40,0.08) 0%, rgba(255,80,40,0.02) 100%)",
  borderTop: "1px solid rgba(255,80,40,0.18)",
  borderBottom: "1px solid rgba(255,80,40,0.18)",
  padding: "80px 0",
};

const inflectionInner = {
  maxWidth: "1100px",
  margin: "0 auto",
  padding: "0 32px",
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "60px",
  alignItems: "center",
};

const inflectionLeft = {};

const inflectionTag = {
  fontSize: "10px",
  letterSpacing: "0.25em",
  textTransform: "uppercase",
  color: "rgba(255,110,70,0.78)",
  marginBottom: "16px",
  fontWeight: 700,
};

const inflectionHeadline = {
  fontFamily: "'DM Serif Display', serif",
  fontSize: "clamp(2rem, 4vw, 3.2rem)",
  lineHeight: 1.08,
  color: "#e8e8f0",
  marginBottom: "20px",
};

const inflectionBody = {
  fontSize: "clamp(0.95rem, 1.5vw, 1.1rem)",
  color: "rgba(232,232,240,0.68)",
  lineHeight: 1.78,
};

const inflectionRight = {
  display: "flex",
  flexDirection: "column",
  gap: "16px",
};

const statCard = (color) => ({
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  padding: "20px 24px",
  background: `${color}12`,
  border: `1px solid ${color}24`,
  borderLeft: `4px solid ${color}`,
  borderRadius: "12px",
});

const statLabel = {
  fontSize: 11,
  color: "rgba(232,232,240,0.56)",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
};

const statValue = {
  fontSize: "clamp(1.8rem,3vw,2.6rem)",
  fontWeight: 700,
  fontFamily: "'DM Serif Display', serif",
  lineHeight: 1,
};

const statSub = {
  fontSize: 11,
  color: "rgba(232,232,240,0.46)",
};

const revealSection = {
  padding: "100px 0",
  background: "linear-gradient(180deg, var(--bg2) 0%, var(--bg) 100%)",
};

const finalControlRow = {
  display: "grid",
  gridTemplateColumns: "1.1fr 0.9fr",
  gap: "24px",
  alignItems: "center",
  marginBottom: "22px",
};

const finalControlLabel = {
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "#1db954",
  marginBottom: "8px",
};

const finalControlBody = {
  color: "rgba(232,232,240,0.64)",
  fontSize: "0.95rem",
  lineHeight: 1.65,
};

const finalSliderWrap = {
  padding: "18px 20px",
  borderRadius: "14px",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.03)",
};

const finalSliderHeader = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: "10px",
};

const finalSliderValue = {
  fontSize: 12,
  color: "rgba(232,232,240,0.68)",
};

const revealChartCard = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: "18px",
  padding: "20px",
  marginBottom: "24px",
};

const brushLabelStyle = {
  fontSize: "10px",
  fontWeight: 600,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "rgba(232,232,240,0.35)",
  marginBottom: "4px",
  textAlign: "center",
};

const legendRow = {
  display: "flex",
  gap: "28px",
  flexWrap: "wrap",
  paddingTop: "16px",
  borderTop: "1px solid rgba(255,255,255,0.07)",
};

const legendItem = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
};

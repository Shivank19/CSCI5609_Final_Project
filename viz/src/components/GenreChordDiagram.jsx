import React, { useState, useMemo } from "react";
import * as d3 from "d3";

const data = {
  names: ["Pop", "Hip Hop / Rap", "Rock", "Metal", "Electronic", "Indie", "R&B / Soul", "Jazz", "Classical", "Country"],
  matrix: [[0, 2117, 2000, 154, 673, 639, 1176, 28, 15, 302], [2117, 0, 202, 259, 101, 56, 408, 17, 0, 31], [2000, 202, 0, 669, 195, 466, 138, 26, 2, 409], [154, 259, 669, 0, 16, 8, 0, 0, 0, 2], [673, 101, 195, 16, 0, 107, 38, 24, 1, 1], [639, 56, 466, 8, 107, 0, 131, 4, 0, 130], [1176, 408, 138, 0, 38, 131, 0, 74, 2, 0], [28, 17, 26, 0, 24, 4, 74, 0, 4, 0], [15, 0, 2, 0, 1, 0, 2, 4, 0, 0], [302, 31, 409, 2, 1, 130, 0, 0, 0, 0]]
};

const width = 720;
const height = 720;
const outerRadius = Math.min(width, height) * 0.5 - 110;
const innerRadius = outerRadius - 20;

const color = d3.scaleOrdinal([
  "#f4a261", // Pop - valence orange
  "#e63946", // Hip Hop - energy red
  "#1db954", // Rock - accent green
  "#818cf8", // Metal - purple
  "#22d3ee", // Electronic - cyan
  "#fbbf24", // Indie - yellow
  "#f472b6", // R&B - pink
  "#a78bfa", // Jazz - violet
  "#5b9ec9", // Classical - acoustic blue
  "#34d399", // Country - mint
]);

export default function GenreChordDiagram() {
  const [hoveredGroupIdx, setHoveredGroupIdx] = useState(null);
  const [hoveredRibbon, setHoveredRibbon] = useState(null);

  const chords = useMemo(() => {
    return d3.chord().padAngle(0.05).sortSubgroups(d3.descending)(data.matrix);
  }, []);

  const arc = d3.arc().innerRadius(innerRadius).outerRadius(outerRadius);
  const ribbon = d3.ribbon().radius(innerRadius);

  const checkHighlight = (c) => {
    if (hoveredGroupIdx === null && hoveredRibbon === null) return true;
    if (hoveredGroupIdx !== null) return c.source.index === hoveredGroupIdx || c.target.index === hoveredGroupIdx;
    if (hoveredRibbon !== null) return c.source.index === hoveredRibbon.s && c.target.index === hoveredRibbon.t;
    return false;
  };

  return (
    <section style={sectionStyle}>
      <div className="container">
        <p className="section-label" style={{ color: "#1db954" }}>Genre Connections</p>
        <h2 className="section-title" style={{ color: "#e8e8f0", marginBottom: 16 }}>
          Genre Crossover Map
        </h2>
        <p className="section-body" style={{ marginBottom: 36 }}>
          By mapping the connections between different music genres, we can see that some genres like Pop and Hip Hop or Rock and Metal occur together frequently. This may suggest that genres that co-occur may have similar valence, acoustic, and loudness measurements. Hover over a bridge or genre to see overlap counts.
        </p>

        <div style={chartWrapper}>
          <div style={infoPanel}>
            {hoveredRibbon ? (
              <div style={{...statCard, borderColor: color(hoveredRibbon.s)}}>
                <span style={genrePair}>
                  {data.names[hoveredRibbon.s]} &rarr; {data.names[hoveredRibbon.t]}
                </span>
                <span style={value}>
                  <strong>{hoveredRibbon.value.toLocaleString()}</strong> crossover tracks
                </span>
              </div>
            ) : hoveredGroupIdx !== null ? (
              <div style={{...statCard, borderColor: color(hoveredGroupIdx)}}>
                <span style={genrePair}>
                  Total Crossovers for {data.names[hoveredGroupIdx]}
                </span>
                <span style={value}>
                  <strong>{Math.round(chords.groups[hoveredGroupIdx].value).toLocaleString()}</strong> tracks
                </span>
              </div>
            ) : (
              <div style={instructions}>Hover over a bridge or genre to see overlap counts</div>
            )}
          </div>

          <svg width={width} height={height} viewBox={`${-width/2} ${-height/2} ${width} ${height}`}>
            <g className="ribbons">
              {chords.map((c, i) => (
                <path
                  key={i}
                  d={ribbon(c)}
                  fill={color(c.source.index)}
                  fillOpacity={checkHighlight(c) ? 0.7 : 0.05}
                  stroke={d3.rgb(color(c.source.index)).darker(0.3)}
                  strokeOpacity={checkHighlight(c) ? 1 : 0.05}
                  onMouseEnter={() => setHoveredRibbon({s: c.source.index, t: c.target.index, value: c.source.value})}
                  onMouseLeave={() => setHoveredRibbon(null)}
                  style={{transition: "fill-opacity 0.2s ease, stroke-opacity 0.2s ease", cursor: "pointer"}}
                />
              ))}
            </g>

            <g className="groups">
              {chords.groups.map((g, i) => (
                <g key={i}>
                  <path
                    d={arc(g)}
                    fill={color(i)}
                    stroke={d3.rgb(color(i)).darker()}
                    onMouseEnter={() => setHoveredGroupIdx(i)}
                    onMouseLeave={() => setHoveredGroupIdx(null)}
                    style={{cursor: "pointer", transition: "filter 0.2s"}}
                  />
                  <text
                    dy=".35em"
                    transform={`
                      rotate(${(g.startAngle + g.endAngle) * 90 / Math.PI - 90}) 
                      translate(${outerRadius + 15}) 
                      ${(g.startAngle + g.endAngle) / 2 > Math.PI ? 'rotate(180) translate(-30)' : ''}
                    `}
                    textAnchor={(g.startAngle + g.endAngle) / 2 > Math.PI ? "end" : "start"}
                    style={{
                      fontSize: 12,
                      fill: hoveredGroupIdx === i ? "#fff" : "rgba(232,232,240,0.6)",
                      fontWeight: hoveredGroupIdx === i ? 800 : 600,
                      pointerEvents: "none",
                      transition: "all 0.2s",
                    }}
                  >
                    {data.names[i]}
                  </text>
                </g>
              ))}
            </g>
          </svg>
        </div>
      </div>
    </section>
  );
}

const sectionStyle = {
  padding: "100px 0",
  background: "linear-gradient(180deg, var(--bg) 0%, var(--bg2) 100%)",
};

const chartWrapper = {
  background: "rgba(255,255,255,0.02)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 16,
  padding: "24px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
};

const infoPanel = {
  height: "90px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  marginBottom: "1rem",
};

const statCard = {
  background: "rgba(255,255,255,0.03)",
  padding: "1rem 2rem",
  borderRadius: 12,
  borderTop: "5px solid",
  boxShadow: "0 8px 20px rgba(0,0,0,0.3)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  minWidth: 300,
  animation: "slideUp 0.2s ease-out",
};

const genrePair = {
  fontSize: "0.75rem",
  textTransform: "uppercase",
  fontWeight: 700,
  letterSpacing: "1.2px",
  color: "rgba(232,232,240,0.5)",
  marginBottom: 5,
};

const value = {
  fontSize: "1.25rem",
  color: "#e8e8f0",
};

const instructions = {
  color: "rgba(232,232,240,0.3)",
  fontStyle: "italic",
  fontSize: "0.95rem",
};
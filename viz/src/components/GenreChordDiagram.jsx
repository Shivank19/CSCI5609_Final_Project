import React, { useState, useEffect, useMemo } from "react";
import * as d3 from "d3";

const GENRE_NAMES = [
  "Pop", "Hip Hop / Rap", "Rock", "Metal", "Electronic", 
  "Indie", "R&B / Soul", "Jazz", "Classical", "Country"
];

const width = 720;
const height = 720;
const outerRadius = Math.min(width, height) * 0.5 - 110;
const innerRadius = outerRadius - 20;

const color = d3.scaleOrdinal([
  "#f4a261", "#e63946", "#1db954", "#818cf8", "#22d3ee", 
  "#fbbf24", "#f472b6", "#a78bfa", "#5b9ec9", "#34d399",
]);

// --- Helper Functions ---
const parseArrayString = (str) => {
  if (!str) return [];
  try { return JSON.parse(str.replace(/'/g, '"')); } 
  catch (e) { return [str.replace(/[\[\]"']/g, '')]; }
};

const normalizeName = (name) => {
  if (!name) return "";
  return name.replace(/[\[\]"'`]/g, '').trim().toLowerCase();
};

const getMacroGenres = (microGenres) => {
  const macros = new Set();
  microGenres.forEach(g => {
    const lower = g.toLowerCase();
    if (lower.includes('pop')) macros.add("Pop");
    if (lower.includes('hip hop') || lower.includes('rap') || lower.includes('trap')) macros.add("Hip Hop / Rap");
    if (lower.includes('rock')) macros.add("Rock");
    if (lower.includes('metal')) macros.add("Metal");
    if (lower.includes('electronic') || lower.includes('edm') || lower.includes('techno') || lower.includes('house') || lower.includes('step')) macros.add("Electronic");
    if (lower.includes('indie')) macros.add("Indie");
    if (lower.includes('r&b') || lower.includes('soul') || lower.includes('blues')) macros.add("R&B / Soul");
    if (lower.includes('jazz')) macros.add("Jazz");
    if (lower.includes('classical') || lower.includes('orchestra') || lower.includes('show tunes') || lower.includes('broadway')) macros.add("Classical");
    if (lower.includes('country') || lower.includes('folk')) macros.add("Country");
  });
  return Array.from(macros);
};

export default function GenreChordDiagram() {
  const [hoveredGroupIdx, setHoveredGroupIdx] = useState(null);
  const [hoveredRibbon, setHoveredRibbon] = useState(null);
  
  const [dataByYear, setDataByYear] = useState(null);
  const [yearRange, setYearRange] = useState({ min: 1960, max: 2020 });
  const [currentYear, setCurrentYear] = useState(2020);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

  // --- Data Loading Effect ---
  useEffect(() => {
    Promise.all([
      d3.csv("/spotify_clean.csv"),
      d3.csv("/data_w_genres.csv")
    ]).then(([tracksData, genresData]) => {
      
      const artistGenresMap = new Map();
      genresData.forEach(row => {
        const parsedGenres = parseArrayString(row.genres);
        const macros = getMacroGenres(parsedGenres);
        if (macros.length > 0) {
          artistGenresMap.set(normalizeName(row.artists), macros);
        }
      });

      const processedData = {};
      let minYear = Infinity;
      let maxYear = -Infinity;

      tracksData.forEach(track => {
        const tYear = parseInt(track.year); // Now grouping by exact year
        if (isNaN(tYear)) return;

        minYear = Math.min(minYear, tYear);
        maxYear = Math.max(maxYear, tYear);

        if (!processedData[tYear]) {
          processedData[tYear] = { matrix: Array(10).fill(0).map(() => Array(10).fill(0)) };
        }

        const trackArtists = parseArrayString(track.artists);
        const trackMacroGenres = new Set();

        trackArtists.forEach(artist => {
          const normalized = normalizeName(artist);
          const macros = artistGenresMap.get(normalized);
          if (macros) macros.forEach(m => trackMacroGenres.add(m));
        });

        const uniqueMacros = Array.from(trackMacroGenres);

        if (uniqueMacros.length > 1) {
          for (let i = 0; i < uniqueMacros.length; i++) {
            for (let j = i + 1; j < uniqueMacros.length; j++) {
              const idx1 = GENRE_NAMES.indexOf(uniqueMacros[i]);
              const idx2 = GENRE_NAMES.indexOf(uniqueMacros[j]);
              
              if (idx1 !== -1 && idx2 !== -1) {
                processedData[tYear].matrix[idx1][idx2] += 1;
                processedData[tYear].matrix[idx2][idx1] += 1;
              }
            }
          }
        }
      });

      // Provide fallback bounds if data is weird
      if (minYear === Infinity) minYear = 1960;
      if (maxYear === -Infinity) maxYear = 2020;

      setYearRange({ min: minYear, max: maxYear });
      setCurrentYear(maxYear);
      setDataByYear(processedData);
      setLoading(false);

    }).catch(err => {
      console.error("Error loading CSV data: ", err);
      setLoading(false);
    });
  }, []);

  // --- Auto-Play Effect ---
  useEffect(() => {
    let interval;
    if (isPlaying) {
      // Faster interval for smoother scrubbing (400ms per year)
      interval = setInterval(() => {
        setCurrentYear(prev => {
          if (prev >= yearRange.max) return yearRange.min; // Loop back
          return prev + 1;
        });
      }, 400); 
    }
    return () => clearInterval(interval);
  }, [isPlaying, yearRange]);

  // --- Rolling Window Matrix Calculation ---
  const chords = useMemo(() => {
    if (!dataByYear) return null;

    // Create an empty matrix to hold our 5-year rolling average
    const aggregatedMatrix = Array(10).fill(0).map(() => Array(10).fill(0));
    let hasData = false;

    // Grab data from [currentYear - 2] to [currentYear + 2]
    for (let y = currentYear - 2; y <= currentYear + 2; y++) {
      if (dataByYear[y]) {
        for (let i = 0; i < 10; i++) {
          for (let j = 0; j < 10; j++) {
            aggregatedMatrix[i][j] += dataByYear[y].matrix[i][j];
            if (dataByYear[y].matrix[i][j] > 0) hasData = true;
          }
        }
      }
    }

    if (!hasData) return null;

    return d3.chord().padAngle(0.05).sortSubgroups(d3.descending)(aggregatedMatrix);
  }, [dataByYear, currentYear]);

  const arc = d3.arc().innerRadius(innerRadius).outerRadius(outerRadius);
  const ribbon = d3.ribbon().radius(innerRadius);

  const checkHighlight = (c) => {
    if (hoveredGroupIdx === null && hoveredRibbon === null) return true;
    if (hoveredGroupIdx !== null) return c.source.index === hoveredGroupIdx || c.target.index === hoveredGroupIdx;
    if (hoveredRibbon !== null) return c.source.index === hoveredRibbon.s && c.target.index === hoveredRibbon.t;
    return false;
  };

  if (loading) {
    return (
      <section style={sectionStyle}>
        <div className="container" style={{ textAlign: "center", padding: "100px 0" }}>
          <h2 style={{ color: "#1db954" }}>Mapping Genres...</h2>
          <p style={{ color: "rgba(232,232,240,0.5)" }}>Crunching crossover data across thousands of tracks.</p>
        </div>
      </section>
    );
  }

  return (
    <section style={sectionStyle}>
      <div className="container">
        <p className="section-label" style={{ color: "#1db954" }}>Genre Connections</p>
        <h2 className="section-title" style={{ color: "#e8e8f0", marginBottom: 16 }}>
          Crossover Trends: {currentYear}
        </h2>
        <p className="section-body" style={{ marginBottom: 36 }}>
The shift toward 'sad-danceable' music was fueled by genres bleeding into one another over the decades. Press Play to watch the rigid boundaries of the 1960s dissolve into the interconnected DNA of the modern era. This 5-year rolling average reveals how once-distinct styles merged, creating the complex emotional profiles that defined the music of your own era below.
        </p>

        {/* --- Interactive Controls --- */}
        <div style={sliderContainer}>
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            style={playButton}
          >
            {isPlaying ? "⏸ Pause" : "▶ Play"}
          </button>

          <span style={sliderLabel}>{yearRange.min}</span>
          <input 
            type="range" 
            min={yearRange.min} 
            max={yearRange.max} 
            step="1" 
            value={currentYear} 
            onChange={(e) => {
              setIsPlaying(false);
              setCurrentYear(Number(e.target.value));
            }}
            style={sliderInput}
          />
          <span style={sliderLabel}>{yearRange.max}</span>
        </div>

        <div style={chartWrapper}>
          <div style={infoPanel}>
            {hoveredRibbon ? (
              <div style={{...statCard, borderColor: color(hoveredRibbon.s)}}>
                <span style={genrePair}>
                  {GENRE_NAMES[hoveredRibbon.s]} &rarr; {GENRE_NAMES[hoveredRibbon.t]}
                </span>
                <span style={value}>
                  <strong>{hoveredRibbon.value.toLocaleString()}</strong> crossover tracks
                </span>
              </div>
            ) : hoveredGroupIdx !== null ? (
              <div style={{...statCard, borderColor: color(hoveredGroupIdx)}}>
                <span style={genrePair}>
                  Total Crossovers for {GENRE_NAMES[hoveredGroupIdx]}
                </span>
                <span style={value}>
                  <strong>{Math.round(chords.groups[hoveredGroupIdx].value).toLocaleString()}</strong> tracks
                </span>
              </div>
            ) : (
              <div style={instructions}>Hover over a bridge or genre to see overlap counts</div>
            )}
          </div>

          {!chords ? (
             <div style={{ color: "rgba(232,232,240,0.5)", padding: "100px 0" }}>
               Not enough crossover data around {currentYear}.
             </div>
          ) : (
            <svg width={width} height={height} viewBox={`${-width/2} ${-height/2} ${width} ${height}`}>
              <g className="ribbons">
                {chords.map((c) => {
                  const ribbonKey = c.source.index < c.target.index 
                    ? `${c.source.index}-${c.target.index}` 
                    : `${c.target.index}-${c.source.index}`;

                  return (
                    <path
                      key={`ribbon-${ribbonKey}`}
                      d={ribbon(c)}
                      fill={color(c.source.index)}
                      fillOpacity={checkHighlight(c) ? 0.7 : 0.05}
                      stroke={d3.rgb(color(c.source.index)).darker(0.3)}
                      strokeOpacity={checkHighlight(c) ? 1 : 0.05}
                      onMouseEnter={() => setHoveredRibbon({s: c.source.index, t: c.target.index, value: c.source.value})}
                      onMouseLeave={() => setHoveredRibbon(null)}
                      // Faster CSS transition to keep up with the yearly steps
                      style={{
                        transition: "d 0.5s cubic-bezier(0.25, 1, 0.5, 1), fill-opacity 0.2s, stroke-opacity 0.2s", 
                        cursor: "pointer"
                      }}
                    />
                  );
                })}
              </g>

              <g className="groups">
                {chords.groups.map((g, i) => (
                  <g key={`group-${i}`}>
                    <path
                      d={arc(g)}
                      fill={color(i)}
                      stroke={d3.rgb(color(i)).darker()}
                      onMouseEnter={() => setHoveredGroupIdx(i)}
                      onMouseLeave={() => setHoveredGroupIdx(null)}
                      style={{
                        cursor: "pointer", 
                        transition: "d 0.5s cubic-bezier(0.25, 1, 0.5, 1), filter 0.2s"
                      }}
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
                        transition: "transform 0.5s cubic-bezier(0.25, 1, 0.5, 1), fill 0.2s",
                      }}
                    >
                      {GENRE_NAMES[i]}
                    </text>
                  </g>
                ))}
              </g>
            </svg>
          )}
        </div>
      </div>
    </section>
  );
}

// --- Styles ---
const sectionStyle = { padding: "100px 0", background: "linear-gradient(180deg, var(--bg) 0%, var(--bg2) 100%)" };
const chartWrapper = { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "24px", display: "flex", flexDirection: "column", alignItems: "center" };
const infoPanel = { height: "90px", display: "flex", alignItems: "center", justifyContent: "center", width: "100%", marginBottom: "1rem" };
const statCard = { background: "rgba(255,255,255,0.03)", padding: "1rem 2rem", borderRadius: 12, borderTop: "5px solid", boxShadow: "0 8px 20px rgba(0,0,0,0.3)", display: "flex", flexDirection: "column", alignItems: "center", minWidth: 300, animation: "slideUp 0.2s ease-out" };
const genrePair = { fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, letterSpacing: "1.2px", color: "rgba(232,232,240,0.5)", marginBottom: 5 };
const value = { fontSize: "1.25rem", color: "#e8e8f0" };
const instructions = { color: "rgba(232,232,240,0.3)", fontStyle: "italic", fontSize: "0.95rem" };

const sliderContainer = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "1rem",
  marginBottom: "2rem",
  width: "100%",
  maxWidth: "600px",
  margin: "0 auto 2rem auto",
  background: "rgba(255,255,255,0.05)",
  padding: "1rem 2rem",
  borderRadius: "50px",
  border: "1px solid rgba(255,255,255,0.1)"
};

const playButton = {
  background: "#1db954",
  color: "#fff",
  border: "none",
  padding: "8px 16px",
  borderRadius: "20px",
  fontWeight: "bold",
  cursor: "pointer",
  transition: "background 0.2s",
  width: "90px"
};

const sliderLabel = { color: "#e8e8f0", fontWeight: "bold", fontSize: "1rem" };
const sliderInput = { flexGrow: 1, cursor: "pointer", accentColor: "#1db954" };
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

// --- Fast Helper Functions ---
const parseArrayString = (str) => {
  if (!str) return [];
  try { return JSON.parse(str.replace(/'/g, '"')); } 
  catch (e) { return [str.replace(/[[\]"']/g, '')]; }
};

const normalizeName = (name) => {
  if (!name) return "";
  return name.replace(/[[\]"'`]/g, '').trim().toLowerCase();
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

  // --- Fast Data Loading Effect ---
  useEffect(() => {
    Promise.all([
      d3.csv(`${process.env.PUBLIC_URL || ''}/spotify_clean.csv`),
      d3.csv(`${process.env.PUBLIC_URL || ''}/data_w_genres.csv`)
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
        const tYear = parseInt(track.year); 
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
      interval = setInterval(() => {
        setCurrentYear(prev => {
          // Stop incrementing if we reach the max year
          if (prev >= yearRange.max) return prev; 
          return prev + 1;
        });
      }, 400); 
    }
    return () => clearInterval(interval);
  }, [isPlaying, yearRange]);

  // Turn off the play button automatically when we hit the end
  useEffect(() => {
    if (isPlaying && currentYear >= yearRange.max) {
      setIsPlaying(false);
    }
  }, [currentYear, isPlaying, yearRange.max]);

  // --- Rolling Window Matrix Calculation ---
  const chords = useMemo(() => {
    if (!dataByYear) return null;

    const aggregatedMatrix = Array(10).fill(0).map(() => Array(10).fill(0));
    let hasData = false;

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
      <section style={styles.section}>
        <div className="container" style={{ textAlign: "center", padding: "100px 0" }}>
          <h2 style={{ color: "var(--accent)" }}>Mapping Genres...</h2>
          <p style={{ color: "var(--muted)" }}>Crunching crossover data across thousands of tracks.</p>
        </div>
      </section>
    );
  }

  return (
    <section style={styles.section}>
      <div className="container">
        <p className="section-label">Genre Connections</p>
        <h2 className="section-title">
          Crossover Trends: <br />
          <em>{currentYear}</em>
        </h2>
        <p className="section-body" style={{ marginBottom: '40px' }}>
          The shift toward 'sad-danceable' music was fueled by genres bleeding into one another over the decades. Press Play to watch the rigid boundaries of the 1960s dissolve into the interconnected DNA of the modern era. This 5-year rolling average reveals how once-distinct styles merged, creating the complex emotional profiles that defined the music of your own era below.
        </p>

        {/* --- Interactive Controls --- */}
        <div style={styles.filterBar}>
          <div style={{ ...styles.filterGroup, flex: 1, maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={styles.label}>Timeline Scrubber ({yearRange.min} - {yearRange.max})</label>
              <span style={styles.valueBadge}>{currentYear}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button 
                onClick={() => {
                  // If user clicks play while at the very end, rewind to the beginning automatically
                  if (!isPlaying && currentYear >= yearRange.max) {
                    setCurrentYear(yearRange.min);
                  }
                  setIsPlaying(!isPlaying);
                }} 
                style={styles.playButton}
              >
                {isPlaying ? "⏸ Pause" : "▶ Play"}
              </button>
              <input 
                type="range" 
                min={yearRange.min} 
                max={yearRange.max} 
                step="1" 
                value={currentYear} 
                onChange={(e) => { setIsPlaying(false); setCurrentYear(Number(e.target.value)); }}
                style={styles.range}
              />
            </div>
          </div>
        </div>

        {/* --- Main Chart Card --- */}
        <div style={styles.card}>
          <div style={styles.infoPanel}>
            {hoveredRibbon ? (
              <div style={{...styles.statCard, borderColor: color(hoveredRibbon.s)}}>
                <span style={styles.genrePair}>{GENRE_NAMES[hoveredRibbon.s]} &rarr; {GENRE_NAMES[hoveredRibbon.t]}</span>
                <span style={styles.value}><strong>{hoveredRibbon.value.toLocaleString()}</strong> crossover tracks</span>
              </div>
            ) : hoveredGroupIdx !== null ? (
              <div style={{...styles.statCard, borderColor: color(hoveredGroupIdx)}}>
                <span style={styles.genrePair}>Total Crossovers for {GENRE_NAMES[hoveredGroupIdx]}</span>
                <span style={styles.value}><strong>{Math.round(chords.groups[hoveredGroupIdx].value).toLocaleString()}</strong> tracks</span>
              </div>
            ) : (
              <div style={styles.instructions}>Hover over a bridge or genre to see overlap counts</div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {!chords ? (
               <div style={{ color: "var(--muted)", padding: "100px 0" }}>
                 Not enough crossover data around {currentYear}.
               </div>
            ) : (
              <svg width={width} height={height} viewBox={`${-width/2} ${-height/2} ${width} ${height}`}>
                <g className="ribbons">
                  {chords.map((c) => {
                    const ribbonKey = c.source.index < c.target.index ? `${c.source.index}-${c.target.index}` : `${c.target.index}-${c.source.index}`;
                    return (
                      <path
                        key={`ribbon-${ribbonKey}`} d={ribbon(c)}
                        fill={color(c.source.index)} fillOpacity={checkHighlight(c) ? 0.7 : 0.05}
                        stroke={d3.rgb(color(c.source.index)).darker(0.3)} strokeOpacity={checkHighlight(c) ? 1 : 0.05}
                        onMouseEnter={() => setHoveredRibbon({s: c.source.index, t: c.target.index, value: c.source.value})}
                        onMouseLeave={() => setHoveredRibbon(null)}
                        style={{ transition: "d 0.5s cubic-bezier(0.25, 1, 0.5, 1), fill-opacity 0.2s, stroke-opacity 0.2s", cursor: "pointer" }}
                      />
                    );
                  })}
                </g>
                <g className="groups">
                  {chords.groups.map((g, i) => (
                    <g key={`group-${i}`}>
                      <path
                        d={arc(g)} fill={color(i)} stroke={d3.rgb(color(i)).darker()}
                        onMouseEnter={() => setHoveredGroupIdx(i)} onMouseLeave={() => setHoveredGroupIdx(null)}
                        style={{ cursor: "pointer", transition: "d 0.5s cubic-bezier(0.25, 1, 0.5, 1), filter 0.2s" }}
                      />
                      <text
                        dy=".35em"
                        transform={`rotate(${(g.startAngle + g.endAngle) * 90 / Math.PI - 90}) translate(${outerRadius + 15}) ${(g.startAngle + g.endAngle) / 2 > Math.PI ? 'rotate(180) translate(-30)' : ''}`}
                        textAnchor={(g.startAngle + g.endAngle) / 2 > Math.PI ? "end" : "start"}
                        style={{ fontSize: 12, fill: hoveredGroupIdx === i ? "var(--text)" : "var(--muted)", fontWeight: hoveredGroupIdx === i ? 800 : 600, pointerEvents: "none", transition: "transform 0.5s cubic-bezier(0.25, 1, 0.5, 1), fill 0.2s" }}
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
      </div>
    </section>
  );
}

// --- Styles matching ConsolidatedEvolution ---
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
  range: {
    flexGrow: 1,
    accentColor: 'var(--accent)',
    cursor: 'pointer',
  },
  valueBadge: {
    fontSize: '14px',
    color: 'var(--accent)',
    fontWeight: 'bold',
  },
  playButton: {
    background: 'var(--accent)',
    color: 'var(--bg)',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '20px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background 0.2s',
    minWidth: '95px',
  },
  card: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    padding: '20px',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
  },
  infoPanel: {
    height: "90px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    marginBottom: "1rem",
  },
  statCard: {
    background: "rgba(255,255,255,0.03)",
    padding: "1rem 2rem",
    borderRadius: "12px",
    borderTop: "5px solid",
    boxShadow: "0 8px 20px rgba(0,0,0,0.3)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    minWidth: "300px",
    animation: "slideUp 0.2s ease-out",
  },
  genrePair: {
    fontSize: "0.75rem",
    textTransform: "uppercase",
    fontWeight: 700,
    letterSpacing: "1.2px",
    color: "var(--muted)",
    marginBottom: "5px",
  },
  value: {
    fontSize: "1.25rem",
    color: "var(--text)",
  },
  instructions: {
    color: "var(--muted)",
    fontStyle: "italic",
    fontSize: "0.95rem",
  }
};
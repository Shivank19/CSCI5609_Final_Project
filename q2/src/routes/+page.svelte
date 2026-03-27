<script>
  // 1. Data including the 'All' category and Top 20 Genres (aggregated by Gemini AI)
  const rawData = [{"decade": 1960, "loudness": -10.82, "genre_list": "All"}, {"decade": 1970, "loudness": -10.42, "genre_list": "All"}, {"decade": 1980, "loudness": -9.52, "genre_list": "All"}, {"decade": 1990, "loudness": -8.32, "genre_list": "All"}, {"decade": 2000, "loudness": -6.48, "genre_list": "All"}, {"decade": 2010, "loudness": -7.37, "genre_list": "All"}, {"decade": 2020, "loudness": -6.68, "genre_list": "All"}, {"decade": 1960, "loudness": -9.6, "genre_list": "album rock"}, {"decade": 1960, "loudness": -10.03, "genre_list": "classic rock"}, {"decade": 1960, "loudness": -9.79, "genre_list": "dance pop"}, {"decade": 1960, "loudness": -7.18, "genre_list": "hip hop"}, {"decade": 1960, "loudness": -10.77, "genre_list": "mellow gold"}, {"decade": 1960, "loudness": -9.22, "genre_list": "modern rock"}, {"decade": 1960, "loudness": -9.22, "genre_list": "pop"}, {"decade": 1960, "loudness": -9.22, "genre_list": "pop rock"}, {"decade": 1960, "loudness": -7.18, "genre_list": "r&b"}, {"decade": 1960, "loudness": -10.1, "genre_list": "rock"}, {"decade": 1960, "loudness": -10.9, "genre_list": "soft rock"}, {"decade": 1970, "loudness": -10.02, "genre_list": "album rock"}, {"decade": 1970, "loudness": -3.68, "genre_list": "alternative metal"}, {"decade": 1970, "loudness": -10.42, "genre_list": "classic rock"}, {"decade": 1970, "loudness": -11.32, "genre_list": "contemporary country"}, {"decade": 1970, "loudness": -10.64, "genre_list": "dance pop"}, {"decade": 1970, "loudness": -11.9, "genre_list": "hip hop"}, {"decade": 1970, "loudness": -7.94, "genre_list": "latin"}, {"decade": 1970, "loudness": -10.78, "genre_list": "mellow gold"}, {"decade": 1970, "loudness": -11.63, "genre_list": "modern rock"}, {"decade": 1970, "loudness": -11.52, "genre_list": "pop"}, {"decade": 1970, "loudness": -13.95, "genre_list": "pop rap"}, {"decade": 1970, "loudness": -9.58, "genre_list": "pop rock"}, {"decade": 1970, "loudness": -12.1, "genre_list": "r&b"}, {"decade": 1970, "loudness": -11.9, "genre_list": "rap"}, {"decade": 1970, "loudness": -10.23, "genre_list": "rock"}, {"decade": 1970, "loudness": -10.72, "genre_list": "soft rock"}, {"decade": 1970, "loudness": -13.95, "genre_list": "southern hip hop"}, {"decade": 1970, "loudness": -13.95, "genre_list": "trap"}, {"decade": 1980, "loudness": -8.83, "genre_list": "album rock"}, {"decade": 1980, "loudness": -7.95, "genre_list": "alternative metal"}, {"decade": 1980, "loudness": -8.99, "genre_list": "classic rock"}, {"decade": 1980, "loudness": -9.6, "genre_list": "contemporary country"}, {"decade": 1980, "loudness": -9.53, "genre_list": "dance pop"}, {"decade": 1980, "loudness": -8.68, "genre_list": "hip hop"}, {"decade": 1980, "loudness": -10.38, "genre_list": "latin"}, {"decade": 1980, "loudness": -9.59, "genre_list": "mellow gold"}, {"decade": 1980, "loudness": -10.38, "genre_list": "modern rock"}, {"decade": 1980, "loudness": -8.53, "genre_list": "pop"}, {"decade": 1980, "loudness": -5.23, "genre_list": "pop dance"}, {"decade": 1980, "loudness": -8.29, "genre_list": "pop rap"}, {"decade": 1980, "loudness": -8.82, "genre_list": "pop rock"}, {"decade": 1980, "loudness": -7.09, "genre_list": "r&b"}, {"decade": 1980, "loudness": -8.68, "genre_list": "rap"}, {"decade": 1980, "loudness": -8.48, "genre_list": "rock"}, {"decade": 1980, "loudness": -9.66, "genre_list": "soft rock"}, {"decade": 1990, "loudness": -7.84, "genre_list": "album rock"}, {"decade": 1990, "loudness": -6.61, "genre_list": "alternative metal"}, {"decade": 1990, "loudness": -8.29, "genre_list": "classic rock"}, {"decade": 1990, "loudness": -8.15, "genre_list": "contemporary country"}, {"decade": 1990, "loudness": -7.79, "genre_list": "dance pop"}, {"decade": 1990, "loudness": -7.65, "genre_list": "hip hop"}, {"decade": 1990, "loudness": -7.79, "genre_list": "latin"}, {"decade": 1990, "loudness": -10.1, "genre_list": "mellow gold"}, {"decade": 1990, "loudness": -6.93, "genre_list": "modern rock"}, {"decade": 1990, "loudness": -7.53, "genre_list": "pop"}, {"decade": 1990, "loudness": -7.17, "genre_list": "pop dance"}, {"decade": 1990, "loudness": -6.89, "genre_list": "pop rap"}, {"decade": 1990, "loudness": -7.79, "genre_list": "pop rock"}, {"decade": 1990, "loudness": -7.66, "genre_list": "post-teen pop"}, {"decade": 1990, "loudness": -8.07, "genre_list": "r&b"}, {"decade": 1990, "loudness": -7.52, "genre_list": "rap"}, {"decade": 1990, "loudness": -7.72, "genre_list": "rock"}, {"decade": 1990, "loudness": -9.7, "genre_list": "soft rock"}, {"decade": 1990, "loudness": -7.65, "genre_list": "southern hip hop"}, {"decade": 1990, "loudness": -8.5, "genre_list": "trap"}, {"decade": 2000, "loudness": -6.81, "genre_list": "album rock"}, {"decade": 2000, "loudness": -4.52, "genre_list": "alternative metal"}, {"decade": 2000, "loudness": -7.27, "genre_list": "classic rock"}, {"decade": 2000, "loudness": -5.74, "genre_list": "contemporary country"}, {"decade": 2000, "loudness": -5.7, "genre_list": "dance pop"}, {"decade": 2000, "loudness": -5.44, "genre_list": "hip hop"}, {"decade": 2000, "loudness": -6.46, "genre_list": "latin"}, {"decade": 2000, "loudness": -8.01, "genre_list": "mellow gold"}, {"decade": 2000, "loudness": -5.41, "genre_list": "modern rock"}, {"decade": 2000, "loudness": -5.87, "genre_list": "pop"}, {"decade": 2000, "loudness": -5.3, "genre_list": "pop dance"}, {"decade": 2000, "loudness": -5.61, "genre_list": "pop rap"}, {"decade": 2000, "loudness": -6.26, "genre_list": "pop rock"}, {"decade": 2000, "loudness": -5.17, "genre_list": "post-teen pop"}, {"decade": 2000, "loudness": -6.14, "genre_list": "r&b"}, {"decade": 2000, "loudness": -5.58, "genre_list": "rap"}, {"decade": 2000, "loudness": -5.96, "genre_list": "rock"}, {"decade": 2000, "loudness": -7.95, "genre_list": "soft rock"}, {"decade": 2000, "loudness": -5.94, "genre_list": "southern hip hop"}, {"decade": 2000, "loudness": -6.17, "genre_list": "trap"}, {"decade": 2010, "loudness": -6.38, "genre_list": "album rock"}, {"decade": 2010, "loudness": -4.79, "genre_list": "alternative metal"}, {"decade": 2010, "loudness": -7.55, "genre_list": "classic rock"}, {"decade": 2010, "loudness": -5.79, "genre_list": "contemporary country"}, {"decade": 2010, "loudness": -5.7, "genre_list": "dance pop"}, {"decade": 2010, "loudness": -6.9, "genre_list": "hip hop"}, {"decade": 2010, "loudness": -5.26, "genre_list": "latin"}, {"decade": 2010, "loudness": -7.72, "genre_list": "mellow gold"}, {"decade": 2010, "loudness": -6.26, "genre_list": "modern rock"}, {"decade": 2010, "loudness": -6.61, "genre_list": "pop"}, {"decade": 2010, "loudness": -5.55, "genre_list": "pop dance"}, {"decade": 2010, "loudness": -6.49, "genre_list": "pop rap"}, {"decade": 2010, "loudness": -6.4, "genre_list": "pop rock"}, {"decade": 2010, "loudness": -5.88, "genre_list": "post-teen pop"}, {"decade": 2010, "loudness": -6.77, "genre_list": "r&b"}, {"decade": 2010, "loudness": -6.72, "genre_list": "rap"}, {"decade": 2010, "loudness": -5.88, "genre_list": "rock"}, {"decade": 2010, "loudness": -7.7, "genre_list": "soft rock"}, {"decade": 2010, "loudness": -6.44, "genre_list": "southern hip hop"}, {"decade": 2010, "loudness": -6.72, "genre_list": "trap"}, {"decade": 2020, "loudness": -4.78, "genre_list": "album rock"}, {"decade": 2020, "loudness": -3.93, "genre_list": "alternative metal"}, {"decade": 2020, "loudness": -6.0, "genre_list": "contemporary country"}, {"decade": 2020, "loudness": -5.96, "genre_list": "dance pop"}, {"decade": 2020, "loudness": -7.0, "genre_list": "hip hop"}, {"decade": 2020, "loudness": -4.72, "genre_list": "latin"}, {"decade": 2020, "loudness": -6.15, "genre_list": "modern rock"}, {"decade": 2020, "loudness": -6.74, "genre_list": "pop"}, {"decade": 2020, "loudness": -6.1, "genre_list": "pop dance"}, {"decade": 2020, "loudness": -6.3, "genre_list": "pop rap"}, {"decade": 2020, "loudness": -5.91, "genre_list": "pop rock"}, {"decade": 2020, "loudness": -6.67, "genre_list": "post-teen pop"}, {"decade": 2020, "loudness": -6.9, "genre_list": "r&b"}, {"decade": 2020, "loudness": -6.85, "genre_list": "rap"}, {"decade": 2020, "loudness": -5.14, "genre_list": "rock"}, {"decade": 2020, "loudness": -6.44, "genre_list": "southern hip hop"}, {"decade": 2020, "loudness": -6.64, "genre_list": "trap"}];

  // Logic to put 'All' at the top of the list
  const genres = ['All', ...[...new Set(rawData.map(d => d.genre_list))].filter(g => g !== 'All').sort()];

  // 2. Set default state to 'All' using Svelte 5 Rune
  let selectedGenre = $state('All');
  
  // Derived state updates automatically
  let chartData = $derived(
    rawData
      .filter(d => d.genre_list === selectedGenre)
      .sort((a, b) => a.decade - b.decade)
  );

  // 3. Layout Constants
  const width = 650;
  const height = 400;
  const margin = { top: 40, right: 30, bottom: 60, left: 70 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  const yMin = -15; 
  const yMax = 0;

  const getX = (i) => (i * (chartWidth / chartData.length)) + 20;
  const getY = (val) => chartHeight - ((val - yMin) / (yMax - yMin)) * chartHeight;
  const barWidth = 40;
</script>

<div class="container">
  <h1>Evolution of Loudness</h1>

  <div class="controls">
    <label for="genre-select">Filter by Genre:</label>
    <select id="genre-select" bind:value={selectedGenre}>
      {#each genres as genre}
        <option value={genre}>{genre}</option>
      {/each}
    </select>
  </div>

  <svg {width} {height}>
    <g transform="translate({margin.left}, {margin.top})">
      
      {#each [-15, -12, -9, -6, -3, 0] as tick}
        <line x1="0" x2={chartWidth} y1={getY(tick)} y2={getY(tick)} stroke="#eee" stroke-dasharray="4" />
        <text x="-10" y={getY(tick) + 5} text-anchor="end" class="axis-label">{tick} dB</text>
      {/each}

      {#each chartData as d, i}
        <rect
          x={getX(i)}
          y={getY(d.loudness)}
          width={barWidth}
          height={chartHeight - getY(d.loudness)}
          fill={selectedGenre === 'All' ? '#4a90e2' : '#1DB954'}
          class="bar"
        />
        
        <text x={getX(i) + barWidth / 2} y={chartHeight + 25} text-anchor="middle" class="axis-label">
          {d.decade}s
        </text>

        <text x={getX(i) + barWidth / 2} y={getY(d.loudness) - 10} text-anchor="middle" class="value-label">
          {d.loudness.toFixed(1)}
        </text>
      {/each}

      <line x1="0" x2="0" y1="0" y2={chartHeight} stroke="#333" stroke-width="2" />
      <line x1="0" x2={chartWidth} y1={chartHeight} y2={chartHeight} stroke="#333" stroke-width="2" />
    </g>
  </svg>

  <p class="note">
    Showing average loudness for <strong>{selectedGenre === 'All' ? 'all popular tracks' : selectedGenre}</strong>.
  </p>
</div>

<style>
  .container {
    font-family: 'Inter', sans-serif;
    max-width: 720px;
    margin: 2rem auto;
    padding: 2.5rem;
    background: #ffffff;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.08);
    text-align: center;
  }
  .controls { margin-bottom: 2rem; }
  select { 
    padding: 10px 16px; 
    border-radius: 6px; 
    border: 1px solid #ccc; 
    font-weight: 500;
    text-transform: capitalize; 
  }
  .bar { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
  .bar:hover { opacity: 0.8; }
  .axis-label { font-size: 0.85rem; fill: #888; }
  .value-label { font-size: 0.8rem; font-weight: 600; fill: #333; }
  .note { margin-top: 1.5rem; color: #666; font-style: italic; }
  h1 { margin-bottom: 0.5rem; font-weight: 700; color: #111; }
</style>
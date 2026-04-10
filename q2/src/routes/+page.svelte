<script>
  import * as d3 from 'd3';

  // Matrix with 0s on the diagonal (no self-connections)
  const data = {
    "names": ["Pop", "Hip Hop / Rap", "Rock", "Metal", "Electronic", "Indie", "R&B / Soul", "Jazz", "Classical", "Country"],
    "matrix": [[0, 2117, 2000, 154, 673, 639, 1176, 28, 15, 302], [2117, 0, 202, 259, 101, 56, 408, 17, 0, 31], [2000, 202, 0, 669, 195, 466, 138, 26, 2, 409], [154, 259, 669, 0, 16, 8, 0, 0, 0, 2], [673, 101, 195, 16, 0, 107, 38, 24, 1, 1], [639, 56, 466, 8, 107, 0, 131, 4, 0, 130], [1176, 408, 138, 0, 38, 131, 0, 74, 2, 0], [28, 17, 26, 0, 24, 4, 74, 0, 4, 0], [15, 0, 2, 0, 1, 0, 2, 4, 0, 0], [302, 31, 409, 2, 1, 130, 0, 0, 0, 0]]
  };

  const width = 720;
  const height = 720;
  const outerRadius = Math.min(width, height) * 0.5 - 110;
  const innerRadius = outerRadius - 20;

  // Interaction State
  let hoveredGroupIdx = $state(null);
  let hoveredRibbon = $state(null); // Stores {s, t, value}

  // D3 Generators
  const chord = d3.chord().padAngle(0.05).sortSubgroups(d3.descending);
  const arc = d3.arc().innerRadius(innerRadius).outerRadius(outerRadius);
  const ribbon = d3.ribbon().radius(innerRadius);

  // Palette changed back to Tableau 10
  const color = d3.scaleOrdinal(d3.schemeTableau10);
  const chords = chord(data.matrix);

  function checkHighlight(c) {
    if (hoveredGroupIdx === null && hoveredRibbon === null) return true;
    if (hoveredGroupIdx !== null) return c.source.index === hoveredGroupIdx || c.target.index === hoveredGroupIdx;
    if (hoveredRibbon !== null) return c.source.index === hoveredRibbon.s && c.target.index === hoveredRibbon.t;
    return false;
  }
</script>

<div class="chart-container">
  <div class="header">
    <h2>Genre Crossover Map</h2>
    <p>Visualizing tracks that bridge different musical pillars</p>
  </div>

  <div class="info-panel">
    {#if hoveredRibbon}
      <div class="stat-card" style="border-color: {color(hoveredRibbon.s)}">
        <span class="genre-pair">{data.names[hoveredRibbon.s]} &rarr; {data.names[hoveredRibbon.t]}</span>
        <span class="value"><strong>{hoveredRibbon.value.toLocaleString()}</strong> crossover tracks</span>
      </div>
    {:else if hoveredGroupIdx !== null}
       <div class="stat-card" style="border-color: {color(hoveredGroupIdx)}">
        <span class="genre-pair">Total Crossovers for {data.names[hoveredGroupIdx]}</span>
        <span class="value"><strong>{Math.round(chords.groups[hoveredGroupIdx].value).toLocaleString()}</strong> tracks</span>
      </div>
    {:else}
      <div class="instructions">Hover over a bridge or genre to see overlap counts</div>
    {/if}
  </div>

  <svg {width} {height} viewBox="{-width/2} {-height/2} {width} {height}">
    <g class="ribbons">
      {#each chords as c}
        <path
          d={ribbon(c)}
          fill={color(c.source.index)}
          fill-opacity={checkHighlight(c) ? 0.75 : 0.05}
          stroke={d3.rgb(color(c.source.index)).darker(0.3)}
          stroke-opacity={checkHighlight(c) ? 1 : 0.05}
          onmouseenter={() => hoveredRibbon = {s: c.source.index, t: c.target.index, value: c.source.value}}
          onmouseleave={() => hoveredRibbon = null}
          class="ribbon"
        />
      {/each}
    </g>

    <g class="groups">
      {#each chords.groups as g, i}
        <path
          d={arc(g)}
          fill={color(i)}
          stroke={d3.rgb(color(i)).darker()}
          onmouseenter={() => hoveredGroupIdx = i}
          onmouseleave={() => hoveredGroupIdx = null}
          class="group-arc"
        />
        
        <text
          dy=".35em"
          transform="
            rotate({(g.startAngle + g.endAngle) * 90 / Math.PI - 90}) 
            translate({outerRadius + 15}) 
            { (g.startAngle + g.endAngle) / 2 > Math.PI ? 'rotate(180) translate(-30)' : ''}
          "
          text-anchor={(g.startAngle + g.endAngle) / 2 > Math.PI ? 'end' : 'start'}
          class="label"
          class:active={hoveredGroupIdx === i}
        >
          {data.names[i]}
        </text>
      {/each}
    </g>
  </svg>
</div>

<style>
  .chart-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background: #ffffff;
    padding: 2rem;
    border-radius: 20px;
    color: #333;
  }

  .header { text-align: center; margin-bottom: 1rem; }
  h2 { margin: 0; font-size: 1.6rem; font-weight: 700; }
  p { margin: 0.3rem 0; color: #666; font-size: 0.9rem; }

  .info-panel {
    height: 90px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    margin-bottom: 1rem;
  }

  .stat-card {
    background: #fbfbfb;
    padding: 1rem 2rem;
    border-radius: 12px;
    border-top: 5px solid;
    box-shadow: 0 8px 20px rgba(0,0,0,0.06);
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 300px;
    animation: slideUp 0.2s ease-out;
  }

  .genre-pair { font-size: 0.75rem; text-transform: uppercase; font-weight: 700; letter-spacing: 1.2px; color: #999; margin-bottom: 5px; }
  .value { font-size: 1.25rem; color: #222; }
  .instructions { color: #ccc; font-style: italic; font-size: 0.95rem; }

  .ribbon {
    transition: fill-opacity 0.2s ease, stroke-opacity 0.2s ease;
    cursor: pointer;
  }

  .group-arc { cursor: pointer; transition: filter 0.2s; }
  .group-arc:hover { filter: brightness(1.1); }

  .label {
    font-size: 12px;
    fill: #555;
    font-weight: 600;
    pointer-events: none;
    transition: all 0.2s;
  }

  .label.active {
    fill: #000;
    font-size: 14px;
    font-weight: 800;
  }

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
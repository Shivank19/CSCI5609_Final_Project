import React, { useState, useRef } from 'react';

const GENRES = [
  'All', 'album rock', 'alternative metal', 'classic rock', 'contemporary country',
  'dance pop', 'hip hop', 'latin', 'mellow gold', 'modern rock', 'pop', 'pop dance',
  'pop rap', 'pop rock', 'post-teen pop', 'r&b', 'rap', 'rock', 'soft rock',
  'southern hip hop', 'trap',
];

export default function GlobalFilters({ popularity, onPopularityChange, genre, onGenreChange }) {
  const [sliderDisplay, setSliderDisplay] = useState(popularity);
  const debounceRef = useRef(null);

  function handleSlider(val) {
    setSliderDisplay(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onPopularityChange(val), 180);
  }

  return (
    <div style={styles.bar}>
      <div style={styles.inner}>
        <div style={styles.label}>
          <span style={styles.labelText}>GLOBAL FILTERS</span>
          <span style={styles.scopeNote}>apply to all charts below</span>
        </div>

        <div style={styles.control}>
          <span style={styles.controlLabel}>Popularity</span>
          <input
            type="range" min={0} max={100} step={1}
            value={sliderDisplay}
            onChange={e => handleSlider(+e.target.value)}
            style={styles.slider}
          />
          <span style={styles.badge}>
            {sliderDisplay === 0 ? 'All' : `≥ ${sliderDisplay}`}
          </span>
        </div>

        <div style={styles.control}>
          <span style={styles.controlLabel}>Genre</span>
          <select
            value={genre}
            onChange={e => onGenreChange(e.target.value)}
            style={styles.select}
          >
            {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}

const styles = {
  bar: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    background: 'rgba(10,10,15,0.92)',
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
  },
  inner: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: '10px 24px',
    display: 'flex',
    alignItems: 'center',
    gap: 28,
    flexWrap: 'wrap',
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    marginRight: 8,
  },
  labelText: {
    fontSize: 10,
    letterSpacing: '0.2em',
    color: 'rgba(232,232,240,0.35)',
    fontWeight: 600,
  },
  scopeNote: {
    fontSize: 11,
    color: 'rgba(29,185,84,0.7)',
    letterSpacing: '0.03em',
  },
  control: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  controlLabel: {
    fontSize: 12,
    color: 'rgba(232,232,240,0.4)',
    whiteSpace: 'nowrap',
  },
  slider: {
    width: 140,
    accentColor: '#1db954',
    cursor: 'pointer',
  },
  badge: {
    fontSize: 12,
    color: '#1db954',
    fontWeight: 600,
    background: 'rgba(29,185,84,0.1)',
    padding: '2px 10px',
    borderRadius: 20,
    border: '1px solid rgba(29,185,84,0.2)',
    minWidth: 38,
    textAlign: 'center',
  },
  select: {
    padding: '6px 12px',
    borderRadius: 6,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.05)',
    color: '#e8e8f0',
    fontSize: 12,
    cursor: 'pointer',
    outline: 'none',
    textTransform: 'capitalize',
  },
};
import React, { useEffect, useState } from 'react';
import Hero from './components/Hero';
import GlobalFilters from './components/GlobalFilters';
import TrendOverview from './components/TrendOverview';
import EmotionalTerrain from './components/EmotionalTerrain';
import RelationshipScatter from './components/RelationshipScatter';
import DecadeSpotlight from './components/DecadeSpotlight';
import Closing from './components/Closing';
import { loadData } from './utils/dataUtils';

export default function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Global filters — shared across ALL chart sections ─────────────────────
  const [popularity, setPopularity] = useState(0);
  const [genre, setGenre] = useState('All');

  useEffect(() => {
    loadData()
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  if (loading) return (
    <div style={loadingStyle}>
      <div style={spinnerStyle} />
      <p style={{ color: 'rgba(232,232,240,0.4)', marginTop: 24, letterSpacing: '0.1em', fontSize: 13 }}>
        LOADING CENTURY OF SOUND
      </p>
    </div>
  );

  if (error) return (
    <div style={{ ...loadingStyle, flexDirection: 'column', gap: 16 }}>
      <p style={{ color: '#e63946', fontSize: 18 }}>Could not load data</p>
      <p style={{ color: 'rgba(232,232,240,0.4)', fontSize: 13 }}>
        Make sure <code>spotify_clean.csv</code> is in the <code>public/</code> folder.
      </p>
      <p style={{ color: 'rgba(232,232,240,0.2)', fontSize: 12 }}>{error}</p>
    </div>
  );

  return (
    <main>
      {/* Scene 1 — no filters needed */}
      <Hero />

      {/* Global filter bar — sticky, controls everything below */}
      <GlobalFilters
        popularity={popularity}
        onPopularityChange={setPopularity}
        genre={genre}
        onGenreChange={setGenre}
      />

      {/* Scene 2 — four synchronized small multiples */}
      <TrendOverview data={data} popularity={popularity} genre={genre} />

      {/* Scene 3 — emotional terrain / paradox */}
      <EmotionalTerrain data={data} popularity={popularity} genre={genre} />

      {/* Scene 4 — scatter: valence vs danceability / loudness */}
      <RelationshipScatter data={data} popularity={popularity} genre={genre} />

      {/* Scene 5 — vinyl decade spotlight */}
      <DecadeSpotlight data={data} popularity={popularity} genre={genre} />

      {/* Scene 6 — closing takeaway */}
      <Closing />
    </main>
  );
}

const loadingStyle = {
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'var(--bg)',
};

const spinnerStyle = {
  width: 36,
  height: 36,
  border: '3px solid rgba(29,185,84,0.15)',
  borderTop: '3px solid #1db954',
  borderRadius: '50%',
  animation: 'spin 0.8s linear infinite',
};
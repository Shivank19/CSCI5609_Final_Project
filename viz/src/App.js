import React, { useEffect, useState } from "react";
import Hero from "./components/Hero";
  import RelationshipScatter from "./components/RelationshipScatter";
import { loadData, loadGenreData } from "./utils/dataUtils";
import DecadeExplorer from "./components/DecadeExplorer";
import ConsolidatedEvolution from "./components/ConsolidatedEvolution";
import Popularitytierstrip from "./components/Popularitytierstrip"; // ← replaces GenreChordDiagram

export default function App() {
  const [data, setData] = useState([]);
  const [genreData, setGenreData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([loadData(), loadGenreData()])
      .then(([main, genre]) => {
        setData(main);
        setGenreData(genre);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  if (loading)
    return (
      <div style={loadingStyle}>
        <div style={spinnerStyle} />
        <p style={{ color: "rgba(232,232,240,0.4)", marginTop: 24, letterSpacing: "0.1em", fontSize: 13 }}>
          LOADING CENTURY OF SOUND
        </p>
      </div>
    );

  if (error)
    return (
      <div style={{ ...loadingStyle, flexDirection: "column", gap: 16 }}>
        <p style={{ color: "#e63946", fontSize: 18 }}>Could not load data</p>
        <p style={{ color: "rgba(232,232,240,0.4)", fontSize: 13 }}>
          Make sure <code>spotify_clean.csv</code> is in the <code>public/</code> folder.
        </p>
        <p style={{ color: "rgba(232,232,240,0.2)", fontSize: 12 }}>{error}</p>
      </div>
    );

  return (
    <main>
      <Hero />
      <ConsolidatedEvolution data={data} genreData={genreData} />
      <RelationshipScatter data={data} />
      <Popularitytierstrip data={data} />  {/* ← replaces GenreChordDiagram */}
      <DecadeExplorer />
    </main>
  );
}

const loadingStyle = {
  height: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  background: "var(--bg)",
};

const spinnerStyle = {
  width: 36,
  height: 36,
  border: "3px solid rgba(29,185,84,0.15)",
  borderTop: "3px solid #1db954",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
};
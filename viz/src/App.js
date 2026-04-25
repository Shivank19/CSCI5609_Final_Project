import React, { useEffect, useState } from "react";
import Hero from "./components/Hero";
import AttributeOnboarding from "./components/AttributeOnboarding";
import TrifectaScrollytelling from "./components/TrifectaScrollytelling";
import ParadoxScatter from "./components/ParadoxScatter";
import GenreChordDiagram from "./components/GenreChordDiagram";
import DecadeExplorer from "./components/DecadeExplorer";
import MusicTasteQuiz from "./components/MusicTasteQuiz";
import { loadData, loadGenreData } from "./utils/dataUtils";

export default function App() {
  const [data, setData] = useState([]);
  // const [genreData, setGenreData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([loadData(), loadGenreData()])
      .then(([main, genre]) => {
        setData(main);
        // setGenreData(genre);
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
        <p
          style={{
            color: "rgba(232,232,240,0.4)",
            marginTop: 24,
            letterSpacing: "0.1em",
            fontSize: 13,
          }}
        >
          LOADING CENTURY OF SOUND
        </p>
      </div>
    );

  if (error)
    return (
      <div style={{ ...loadingStyle, flexDirection: "column", gap: 16 }}>
        <p style={{ color: "#e63946", fontSize: 18 }}>Could not load data</p>
        <p style={{ color: "rgba(232,232,240,0.4)", fontSize: 13 }}>
          Make sure <code>spotify_clean.csv</code> is in the{" "}
          <code>public/</code> folder.
        </p>
        <p style={{ color: "rgba(232,232,240,0.2)", fontSize: 12 }}>{error}</p>
      </div>
    );

  return (
    <main>
      {/* 1. Hook — vinyl player, click to play, rewind animation */}
      <Hero />

      {/* 2. Attribute onboarding — waveform + sliders */}
      <AttributeOnboarding />

      {/* 3. Trifecta scrollytelling — sticky chart + progressive reveals + 1990s callout + full reveal */}
      <TrifectaScrollytelling data={data} />

      {/* 4. Paradox scatter */}
      <ParadoxScatter data={data} />

      {/* 5. Genre chord diagram */}
      <GenreChordDiagram />

      {/* 6. Decade explorer — vinyl disc + glyphs + song cards */}
      <DecadeExplorer />

      {/* 7. Music taste quiz — find your decade */}
      <MusicTasteQuiz data={data} />
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

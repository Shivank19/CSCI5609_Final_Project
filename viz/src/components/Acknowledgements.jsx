import React from "react";

const TEAM = [
  "Abhiram Danda",
  "Gabe Northrop",
  "Laeeq Ahmed Fazil",
  "Shivank Sapra",
];

const TOOLS = ["React", "D3.js", "Python / Pandas", "Spotify Web API"];

export default function Acknowledgements() {
  return (
    <footer style={footer}>
      <div style={divider} />

      <div style={inner}>
        {/* Left — Team Chart */}
        <div style={block}>
          <p style={eyebrow}>Team Chart</p>
          <p style={courseLabel}>
            CSCI 5609 · Spring 2026
          </p>
          <div style={teamGrid}>
            {TEAM.map((name) => (
              <div key={name} style={teamCard}>
                <span style={avatar}>
                  {name
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)}
                </span>
                <span style={teamName}>{name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Center — Data Source */}
        <div style={block}>
          <p style={eyebrow}>Data Source</p>
          <div style={sourceCard}>
            <span style={sourceTitle}>Spotify Web API</span>
            <span style={sourceSub}>Audio feature data</span>
            <div style={sourceDivider} />
            <span style={sourceTitle}>Spotify 1921–2020</span>
            <span style={sourceSub}>
              Kaggle dataset by{" "}
              <em style={{ color: "rgba(232,232,240,0.7)" }}>Yamac Eren Ay</em>
            </span>
            <a
              href="https://www.kaggle.com/datasets/yamaerenay/spotify-dataset-19212020-600k-tracks"
              target="_blank"
              rel="noopener noreferrer"
              style={kaggleLink}
            >
              View on Kaggle ↗
            </a>
          </div>
        </div>

        {/* Right — Built With */}
        <div style={block}>
          <p style={eyebrow}>Built With</p>
          <div style={toolsWrap}>
            {TOOLS.map((tool) => (
              <span key={tool} style={toolPill}>
                {tool}
              </span>
            ))}
          </div>
          <p style={copyrightNote}>
            All data used for academic and educational purposes only.
            <br />
            Spotify is a trademark of Spotify AB.
          </p>
        </div>
      </div>

      <div style={bottomBar}>
        <span style={bottomText}>
          Sound of Decades &mdash; CSCI 5609 Final Project &copy; 2026
        </span>
        <span style={bottomText}>University of Minnesota</span>
      </div>
    </footer>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const footer = {
  background: "linear-gradient(180deg, var(--bg) 0%, #0a0a10 100%)",
  borderTop: "1px solid rgba(255,255,255,0.06)",
};

const divider = {
  height: "1px",
  background:
    "linear-gradient(90deg, transparent 0%, rgba(29,185,84,0.28) 40%, rgba(29,185,84,0.28) 60%, transparent 100%)",
};

const inner = {
  maxWidth: 1200,
  margin: "0 auto",
  padding: "72px 32px 48px",
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: "52px",
  alignItems: "start",
};

const block = {
  display: "flex",
  flexDirection: "column",
  gap: "18px",
};

const eyebrow = {
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  color: "var(--accent)",
  opacity: 0.78,
  marginBottom: "2px",
};

const courseLabel = {
  color: "rgba(232,232,240,0.48)",
  fontSize: "0.82rem",
  lineHeight: 1.7,
  marginTop: "-8px",
};

const teamGrid = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};

const teamCard = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
};

const avatar = {
  width: 34,
  height: 34,
  borderRadius: "50%",
  background: "rgba(29,185,84,0.1)",
  border: "1px solid rgba(29,185,84,0.22)",
  color: "var(--accent)",
  fontSize: "11px",
  fontWeight: 700,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  letterSpacing: "0.04em",
};

const teamName = {
  color: "#e8e8f0",
  fontSize: "0.9rem",
  fontWeight: 500,
};

const sourceCard = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  padding: "18px 20px",
  borderRadius: "16px",
  border: "1px solid rgba(255,255,255,0.07)",
  background: "rgba(255,255,255,0.025)",
};

const sourceTitle = {
  color: "#e8e8f0",
  fontSize: "0.9rem",
  fontWeight: 600,
};

const sourceSub = {
  color: "rgba(232,232,240,0.46)",
  fontSize: "0.78rem",
  lineHeight: 1.5,
};

const sourceDivider = {
  height: "1px",
  background: "rgba(255,255,255,0.06)",
  margin: "10px 0",
};

const kaggleLink = {
  marginTop: "8px",
  display: "inline-block",
  fontSize: "11px",
  color: "var(--accent)",
  textDecoration: "none",
  opacity: 0.78,
  letterSpacing: "0.04em",
};

const toolsWrap = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
};

const toolPill = {
  padding: "5px 12px",
  borderRadius: "999px",
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.04)",
  color: "rgba(232,232,240,0.72)",
  fontSize: "12px",
};

const copyrightNote = {
  color: "rgba(232,232,240,0.28)",
  fontSize: "0.76rem",
  lineHeight: 1.7,
  marginTop: "4px",
};

const bottomBar = {
  borderTop: "1px solid rgba(255,255,255,0.05)",
  padding: "20px 32px",
  maxWidth: 1200,
  margin: "0 auto",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const bottomText = {
  color: "rgba(232,232,240,0.22)",
  fontSize: "11px",
  letterSpacing: "0.04em",
};

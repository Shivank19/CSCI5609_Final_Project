import * as d3 from "d3";

export async function loadData() {
  const raw = await d3.csv(
    `${process.env.PUBLIC_URL}/spotify_clean.csv`,
    (d) => ({
      valence: +d.valence,
      year: +d.year,
      acousticness: +d.acousticness,
      danceability: +d.danceability,
      energy: +d.energy,
      loudness: +d.loudness,
      speechiness: +d.speechiness,
      instrumentalness: +d.instrumentalness,
      popularity: +d.popularity,
      tempo: +d.tempo,
      name: d.name,
      artists: d.artists,
      decade: +d.decade,
      decade_label: d.decade_label,
    }),
  );
  return raw.filter(
    (d) =>
      !isNaN(d.valence) && !isNaN(d.year) && d.year >= 1921 && d.year <= 2020,
  );
}

export function aggregateByYear(data, fields) {
  const byYear = d3.rollup(
    data,
    (rows) => {
      const obj = { year: rows[0].year, count: rows.length };
      fields.forEach((f) => {
        obj[f] = d3.mean(rows, (r) => r[f]);
      });
      return obj;
    },
    (d) => d.year,
  );
  return Array.from(byYear.values()).sort((a, b) => a.year - b.year);
}

export function aggregateByDecade(data, fields) {
  const byDecade = d3.rollup(
    data,
    (rows) => {
      const obj = {
        decade: rows[0].decade,
        decade_label: rows[0].decade_label,
        count: rows.length,
      };
      fields.forEach((f) => {
        obj[f] = d3.mean(rows, (r) => r[f]);
      });
      return obj;
    },
    (d) => d.decade,
  );
  return Array.from(byDecade.values()).sort((a, b) => a.decade - b.decade);
}

// Normalize loudness from the project-wide display range [-20, 0] dB to [0, 1]
export function normalizeLoudness(val) {
  return Math.max(0, Math.min(1, (val + 20) / 20));
}

// New — loads data_w_genres.csv for the genre heatmap
export async function loadGenreData() {
  const raw = await d3.csv(
    `${process.env.PUBLIC_URL}/data_w_genres.csv`,
    (d) => ({
      genres: d.genres,
      artists: d.artists,
      acousticness: +d.acousticness,
      danceability: +d.danceability,
      duration_ms: +d.duration_ms,
      energy: +d.energy,
      instrumentalness: +d.instrumentalness,
      liveness: +d.liveness,
      loudness: +d.loudness,
      speechiness: +d.speechiness,
      tempo: +d.tempo,
      valence: +d.valence,
      popularity: +d.popularity,
      key: +d.key,
      mode: +d.mode,
      count: +d.count,
    }),
  );
  // Drop rows with missing core fields
  return raw.filter(
    (d) =>
      d.genres &&
      !isNaN(d.valence) &&
      !isNaN(d.loudness) &&
      !isNaN(d.danceability),
  );
}

import React from 'react';
import { useInView } from '../hooks/useScrollProgress';

const STATS = [
  {
    value: '−18%',
    label: 'Valence decline',
    sub: 'since the 1960s',
    color: '#f4a261',
  },
  {
    value: '+34%',
    label: 'Loudness rise',
    sub: 'normalized, since the 1960s',
    color: '#e9c46a',
  },
  {
    value: '−65%',
    label: 'Acousticness collapse',
    sub: 'instruments replaced by synthesis',
    color: '#457b9d',
  },
];

export default function Closing() {
  const [ref, inView] = useInView({ threshold: 0.1 });

  return (
    <section ref={ref} style={styles.section}>
      <div className="container" style={{ textAlign: 'center' }}>
        <p className="section-label" style={{ color: '#e63946' }}>The Takeaway</p>
        <h2 className="section-title" style={{ color: '#e8e8f0', marginBottom: 20 }}>
          Darker, Louder,<br /><em>Still Irresistible</em>
        </h2>
        <p className="section-body" style={{ maxWidth: 540, margin: '0 auto 60px' }}>
          Music became sonically darker and less acoustic over a century — yet danceability held,
          loudness surged, and streams kept climbing. The paradox is the point:
          we don't just listen to music for happiness. We listen for feeling.
        </p>

        <div style={styles.statsRow}>
          {STATS.map(({ value, label, sub, color }) => (
            <div key={label} style={styles.statCard}>
              <span style={{ ...styles.statValue, color }}>{value}</span>
              <span style={styles.statLabel}>{label}</span>
              <span style={styles.statSub}>{sub}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const styles = {
  section: {
    padding: '100px 0 120px',
    background: 'linear-gradient(180deg, var(--bg2) 0%, var(--bg) 100%)',
  },
  statsRow: {
    display: 'flex',
    gap: 24,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  statCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 16,
    padding: '32px 40px',
    minWidth: 200,
  },
  statValue: {
    fontFamily: "'DM Serif Display', serif",
    fontSize: '2.8rem',
    lineHeight: 1,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: '#e8e8f0',
    letterSpacing: '0.05em',
  },
  statSub: {
    fontSize: 11,
    color: 'rgba(232,232,240,0.35)',
  },
};
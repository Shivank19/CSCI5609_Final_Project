import React, { useEffect, useRef } from 'react';

export default function Hero() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animId;
    let t = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      
      const layers = [
        { amp: 40, freq: 0.008, speed: 0.012, color: 'rgba(29,185,84,0.15)', offset: 0 },
        { amp: 28, freq: 0.012, speed: 0.018, color: 'rgba(244,162,97,0.12)', offset: 1 },
        { amp: 20, freq: 0.018, speed: 0.025, color: 'rgba(230,57,70,0.10)', offset: 2 },
        { amp: 55, freq: 0.005, speed: 0.008, color: 'rgba(69,123,157,0.10)', offset: 3 },
      ];

      layers.forEach(({ amp, freq, speed, color, offset }) => {
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        for (let x = 0; x <= width; x += 2) {
          const y = height / 2
            + Math.sin(x * freq + t * speed + offset) * amp
            + Math.sin(x * freq * 1.7 + t * speed * 0.7 + offset + 1) * (amp * 0.4);
          ctx.lineTo(x, y);
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      t++;
      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <section style={styles.hero}>
      <canvas ref={canvasRef} style={styles.canvas} />
      
      <div style={styles.heroContent}>
        <p style={styles.eyebrow}>A Data Story · 1921 – 2020</p>
        <h1 style={styles.title}>
          The Sound of<br />
          <em>Each Decade</em>
        </h1>
        <p style={styles.subtitle}>
          How music evolved acoustically over a century — through sadness, loudness, and disappearing acoustics.
        </p>

        <div style={styles.legendRow}>
          {[
            { label: 'Valence', color: '#f4a261' },
            { label: 'Energy', color: '#e63946' },
            { label: 'Acousticness', color: '#457b9d' },
            { label: 'Loudness', color: '#e9c46a' },
          ].map(({ label, color }) => (
            <span key={label} style={styles.legendItem}>
              <span style={{ ...styles.dot, background: color }} />
              {label}
            </span>
          ))}
        </div>
      </div>

      <div style={styles.scrollIndicator}>
        <span style={styles.scrollText}>Scroll to explore</span>
        <div style={styles.scrollArrow}>↓</div>
      </div>
    </section>
  );
}

const styles = {
  hero: {
    position: 'relative',
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    background: 'var(--gradient-hero)',
  },
  canvas: {
    position: 'absolute',
    inset: 0,
    zIndex: 0,
  },
  heroContent: {
    position: 'relative',
    zIndex: 1,
    textAlign: 'center',
    animation: 'fadeUp 1s ease both',
    padding: '0 24px',
  },
  eyebrow: {
    fontSize: '11px',
    letterSpacing: '0.25em',
    textTransform: 'uppercase',
    color: 'var(--accent)',
    marginBottom: '20px',
    fontWeight: 600,
  },
  title: {
    fontFamily: "'DM Serif Display', serif",
    fontSize: 'clamp(3rem, 8vw, 7rem)',
    lineHeight: 1.05,
    marginBottom: '28px',
    background: 'linear-gradient(135deg, #e8e8f0 30%, rgba(232,232,240,0.6) 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    fontSize: 'clamp(1rem, 2vw, 1.25rem)',
    color: 'rgba(232,232,240,0.6)',
    maxWidth: '520px',
    margin: '0 auto 40px',
    lineHeight: 1.7,
  },
  legendRow: {
    display: 'flex',
    gap: '28px',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: 'rgba(232,232,240,0.6)',
    letterSpacing: '0.05em',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    display: 'inline-block',
  },
  scrollIndicator: {
    position: 'absolute',
    bottom: '40px',
    left: 0,
    right: 0,
    margin: '0 auto',
    width: 'fit-content',
    textAlign: 'center',
    animation: 'pulse 2s ease-in-out infinite',
    zIndex: 1,
  },
  scrollText: {
    fontSize: '11px',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    color: 'rgba(232,232,240,0.35)',
    display: 'block',
    marginBottom: '8px',
  },
  scrollArrow: {
    fontSize: '20px',
    color: 'rgba(232,232,240,0.35)',
  },
};
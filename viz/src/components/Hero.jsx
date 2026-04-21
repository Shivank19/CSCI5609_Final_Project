import React, { useCallback, useEffect, useRef, useState } from "react";

function VinylPlayer({ playing, onPlay }) {
  const discRef = useRef(null);
  const needleRef = useRef(null);
  const animRef = useRef(null);
  const angleRef = useRef(0);

  useEffect(() => {
    const disc = discRef.current;
    const needle = needleRef.current;
    if (!disc || !needle) return undefined;

    if (playing) {
      let last = null;
      const spin = (timestamp) => {
        if (last !== null) {
          angleRef.current += (timestamp - last) * 0.06;
        }
        last = timestamp;
        disc.style.transform = `rotate(${angleRef.current}deg)`;
        const progress = Math.min(angleRef.current / 20, 1);
        const needleAngle = -30 + progress * 22;
        needle.style.transform = `rotate(${needleAngle}deg)`;
        animRef.current = requestAnimationFrame(spin);
      };
      animRef.current = requestAnimationFrame(spin);
    } else {
      cancelAnimationFrame(animRef.current);
      needle.style.transform = "rotate(-30deg)";
    }

    return () => cancelAnimationFrame(animRef.current);
  }, [playing]);

  return (
    <div style={playerWrap}>
      <div style={turntableBase}>
        <div style={platter}>
          <div ref={discRef} style={discOuter}>
            {Array.from({ length: 14 }, (_, index) => (
              <div
                key={index}
                style={{
                  position: "absolute",
                  inset: `${10 + index * 4}%`,
                  borderRadius: "50%",
                  border: `${index % 2 === 0 ? "0.8px" : "0.3px"} solid rgba(0,0,0,${0.55 - index * 0.02})`,
                  pointerEvents: "none",
                }}
              />
            ))}

            <div style={discLabel}>
              <p style={labelTitle}>Echoes</p>
              <p style={labelSub}>of Time</p>
              <div style={labelSpindle} />
            </div>
          </div>

          <div style={spindleCap} />
        </div>

        <div style={tonearmPivot}>
          <div ref={needleRef} style={tonearm}>
            <div style={tonearmBody} />
            <div style={headshell} />
          </div>
        </div>

        {!playing && (
          <>
            <div style={playTooltip}>Press play to start the rewind</div>
            <button
              style={playBtn}
              onClick={onPlay}
              aria-label="Play the story"
              title="Play the story"
            >
              <div style={playTriangle} />
            </button>
          </>
        )}
      </div>

      <div style={platterReflection} />
    </div>
  );
}

export default function Hero() {
  const canvasRef = useRef(null);
  const sectionRef = useRef(null);
  const scrollTarget = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext("2d");
    let animationId;
    let t = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener("resize", resize);

    const layers = [
      {
        amp: 40,
        freq: 0.008,
        speed: 0.012,
        color: "rgba(29,185,84,0.14)",
        offset: 0,
      },
      {
        amp: 28,
        freq: 0.012,
        speed: 0.018,
        color: "rgba(244,162,97,0.11)",
        offset: 1,
      },
      {
        amp: 20,
        freq: 0.018,
        speed: 0.025,
        color: "rgba(230,57,70,0.09)",
        offset: 2,
      },
      {
        amp: 55,
        freq: 0.005,
        speed: 0.008,
        color: "rgba(69,123,157,0.09)",
        offset: 3,
      },
    ];

    const draw = () => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      layers.forEach(({ amp, freq, speed, color, offset }) => {
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        for (let x = 0; x <= width; x += 2) {
          const y =
            height / 2 +
            Math.sin(x * freq + t * speed + offset) * amp +
            Math.sin(x * freq * 1.7 + t * speed * 0.7 + offset + 1) *
              (amp * 0.4);
          ctx.lineTo(x, y);
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
      });
      t += 1;
      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setDismissed(false);
      },
      { threshold: 0.2 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const handlePlay = useCallback(() => {
    setPlaying(true);
    setTimeout(() => {
      setDismissed(true);
      setTimeout(() => {
        scrollTarget.current?.scrollIntoView({ behavior: "smooth" });
      }, 550);
    }, 2200);
  }, []);

  return (
    <>
      <section
        ref={sectionRef}
        style={{
          ...heroSection,
          opacity: dismissed ? 0 : 1,
          transform: dismissed ? "translateY(-36px) scale(0.98)" : "translateY(0) scale(1)",
          transition: "opacity 0.55s ease, transform 0.55s ease",
        }}
      >
        <canvas ref={canvasRef} style={canvasStyle} />

        <div style={heroLeft}>
          <p style={eyebrow}>A Data Story · 1921 to 2020</p>
          <h1 style={titleStyle}>
            A century of songs,
            <br />
            slowly changing their emotional DNA.
          </h1>
          <p style={hookText}>
            The hits we live with now are moodier, denser, and less acoustic than
            the hits people knew a few generations ago. The change happened gradually
            enough to feel normal, which is exactly why it is worth seeing.
          </p>
          <p style={subHook}>
            Start the turntable to rewind to the beginning.
          </p>

          {playing && <p style={playingLabel}>Rewinding to 1921...</p>}
        </div>

        <div style={heroRight}>
          <VinylPlayer playing={playing} onPlay={handlePlay} />
        </div>

        {!playing && (
          <div style={scrollHint}>
            <span style={scrollText}>Scroll when you are ready</span>
            <div style={scrollArrow}>↓</div>
          </div>
        )}
      </section>

      <div ref={scrollTarget} style={{ position: "relative", top: "-80px" }} />
    </>
  );
}

const heroSection = {
  position: "relative",
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "4.5vw",
  overflow: "hidden",
  background: "var(--gradient-hero)",
  padding: "0 7vw",
};

const canvasStyle = {
  position: "absolute",
  inset: 0,
  zIndex: 0,
};

const heroLeft = {
  position: "relative",
  zIndex: 1,
  maxWidth: 460,
  animation: "fadeUp 0.9s ease both",
};

const heroRight = {
  position: "relative",
  zIndex: 1,
  flexShrink: 0,
  animation: "fadeUp 1.1s ease both",
};

const eyebrow = {
  fontSize: "11px",
  letterSpacing: "0.25em",
  textTransform: "uppercase",
  color: "var(--accent)",
  marginBottom: "18px",
  fontWeight: 600,
};

const titleStyle = {
  fontFamily: "'DM Serif Display', serif",
  fontSize: "clamp(2.45rem, 5.2vw, 4.8rem)",
  lineHeight: 1.04,
  marginBottom: "20px",
  background:
    "linear-gradient(135deg, #f4f4fa 28%, rgba(232,232,240,0.58) 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const hookText = {
  fontSize: "clamp(0.95rem, 1.35vw, 1.06rem)",
  color: "rgba(232,232,240,0.78)",
  lineHeight: 1.7,
  marginBottom: "10px",
};

const subHook = {
  fontSize: "clamp(0.84rem, 1.08vw, 0.92rem)",
  color: "rgba(232,232,240,0.46)",
  lineHeight: 1.6,
  marginBottom: "16px",
};

const playingLabel = {
  fontSize: "12px",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--accent)",
  marginTop: "8px",
  animation: "pulse 1.4s ease-in-out infinite",
};

const scrollHint = {
  position: "absolute",
  bottom: "36px",
  left: 0,
  right: 0,
  margin: "0 auto",
  width: "fit-content",
  textAlign: "center",
  animation: "pulse 2.2s ease-in-out infinite",
  zIndex: 1,
};

const scrollText = {
  fontSize: "10px",
  letterSpacing: "0.15em",
  textTransform: "uppercase",
  color: "rgba(232,232,240,0.34)",
  display: "block",
  marginBottom: "6px",
};

const scrollArrow = {
  fontSize: "18px",
  color: "rgba(232,232,240,0.34)",
};

const playerWrap = {
  position: "relative",
  width: "clamp(250px, 28vw, 380px)",
  userSelect: "none",
};

const turntableBase = {
  position: "relative",
  background: "linear-gradient(145deg, #1a1a28 0%, #0d0d14 60%, #12121e 100%)",
  borderRadius: "16px",
  padding: "32px",
  boxShadow:
    "0 32px 80px rgba(0,0,0,0.85), 0 8px 24px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)",
  aspectRatio: "1 / 1",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const platter = {
  position: "relative",
  width: "72%",
  aspectRatio: "1 / 1",
  borderRadius: "50%",
  background: "linear-gradient(145deg, #222230 0%, #13131e 100%)",
  boxShadow: "0 4px 24px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.03)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const discOuter = {
  position: "absolute",
  inset: "4%",
  borderRadius: "50%",
  background: "linear-gradient(160deg, #141414 0%, #0a0a0a 50%, #111111 100%)",
  boxShadow: "0 4px 20px rgba(0,0,0,0.9)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "transform 0.1s linear",
  willChange: "transform",
};

const discLabel = {
  position: "relative",
  width: "35%",
  aspectRatio: "1 / 1",
  borderRadius: "50%",
  background: "linear-gradient(135deg, #1a2e1a 0%, #0d1a0d 60%, #162516 100%)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "inset 0 1px 0 rgba(29,185,84,0.15)",
  zIndex: 2,
};

const labelTitle = {
  fontSize: "clamp(6px, 1.2vw, 9px)",
  fontFamily: "'DM Serif Display', serif",
  color: "rgba(29,185,84,0.9)",
  margin: 0,
  lineHeight: 1.2,
};

const labelSub = {
  fontSize: "clamp(4px, 0.9vw, 7px)",
  color: "rgba(29,185,84,0.5)",
  margin: 0,
  letterSpacing: "0.1em",
};

const labelSpindle = {
  width: "12%",
  aspectRatio: "1/1",
  borderRadius: "50%",
  background: "#333",
  marginTop: "6%",
  boxShadow: "inset 0 1px 2px rgba(0,0,0,0.8)",
};

const spindleCap = {
  position: "absolute",
  width: "4%",
  aspectRatio: "1/1",
  borderRadius: "50%",
  background: "linear-gradient(135deg, #555 0%, #222 100%)",
  boxShadow: "0 1px 3px rgba(0,0,0,0.8)",
  zIndex: 3,
};

const tonearmPivot = {
  position: "absolute",
  top: "8%",
  right: "6%",
  width: "18%",
  height: "18%",
};

const tonearm = {
  position: "absolute",
  top: 0,
  right: 0,
  transformOrigin: "50% 10%",
  transform: "rotate(-30deg)",
  transition: "transform 1.2s cubic-bezier(0.34, 1.2, 0.64, 1)",
  willChange: "transform",
};

const tonearmBody = {
  width: "6px",
  height: "clamp(60px, 10vw, 120px)",
  background: "linear-gradient(to bottom, #888 0%, #555 100%)",
  borderRadius: "3px",
  margin: "0 auto",
  boxShadow: "1px 1px 4px rgba(0,0,0,0.6)",
};

const headshell = {
  width: "14px",
  height: "10px",
  background: "#777",
  borderRadius: "2px",
  margin: "0 auto",
  boxShadow: "1px 1px 3px rgba(0,0,0,0.5)",
};

const playTooltip = {
  position: "absolute",
  bottom: "20%",
  right: "16%",
  padding: "8px 12px",
  borderRadius: "999px",
  background: "rgba(12,12,18,0.82)",
  border: "1px solid rgba(29,185,84,0.24)",
  color: "rgba(232,232,240,0.86)",
  fontSize: 11,
  letterSpacing: "0.04em",
  backdropFilter: "blur(10px)",
  animation: "pulse 2s ease-in-out infinite",
  pointerEvents: "none",
};

const playBtn = {
  position: "absolute",
  bottom: "8%",
  right: "8%",
  width: "44px",
  height: "44px",
  borderRadius: "50%",
  background: "rgba(29,185,84,0.15)",
  border: "1px solid rgba(29,185,84,0.42)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 0.2s ease",
  zIndex: 10,
};

const playTriangle = {
  width: 0,
  height: 0,
  borderTop: "7px solid transparent",
  borderBottom: "7px solid transparent",
  borderLeft: "12px solid rgba(29,185,84,0.92)",
  marginLeft: "3px",
};

const platterReflection = {
  position: "absolute",
  bottom: "-20px",
  left: "10%",
  right: "10%",
  height: "30px",
  background:
    "radial-gradient(ellipse at center, rgba(255,255,255,0.06) 0%, transparent 70%)",
  borderRadius: "50%",
  filter: "blur(8px)",
  pointerEvents: "none",
};

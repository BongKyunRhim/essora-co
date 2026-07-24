import { useRef, useEffect } from "react";
import logo from "../assets/essora_logo1.png";

// The ESSORA compass logo. Hovering spins it up (slow → fast); moving the
// mouse away lets it coast to a natural stop instead of stopping abruptly.
export default function CompassLogo() {
  const imgRef = useRef(null);
  const compassRef = useRef(null);

  useEffect(() => {
    const state = { angle: 0, vel: 0, hovering: false, raf: 0, last: 0 };

    const MAX = 540; // top speed, degrees/second
    const ACCEL = 220; // how quickly it spins up while hovering
    const FRICTION = 1.0; // how quickly it coasts to a stop (higher = sooner)

    function frame(t) {
      if (!state.last) state.last = t;
      const dt = Math.min((t - state.last) / 1000, 0.05);
      state.last = t;

      if (state.hovering) {
        state.vel = Math.min(MAX, state.vel + ACCEL * dt);
      } else {
        // Smooth exponential decay down to a stop.
        state.vel *= Math.exp(-FRICTION * dt);
        if (state.vel < 2) state.vel = 0;
      }

      state.angle = (state.angle + state.vel * dt) % 360;
      if (imgRef.current) {
        imgRef.current.style.transform = `rotate(${state.angle}deg)`;
      }

      if (state.hovering || state.vel > 0) {
        state.raf = requestAnimationFrame(frame);
      } else {
        state.raf = 0;
        state.last = 0;
      }
    }

    function ensureRunning() {
      if (!state.raf) {
        state.last = 0;
        state.raf = requestAnimationFrame(frame);
      }
    }
    function onEnter() {
      state.hovering = true;
      ensureRunning();
    }
    function onLeave() {
      state.hovering = false;
      ensureRunning(); // keep looping so it can coast down
    }

    const el = compassRef.current;
    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", onLeave);
      if (state.raf) cancelAnimationFrame(state.raf);
    };
  }, []);

  return (
    <div className="compass" ref={compassRef} aria-label="ESSORA compass logo">
      <img ref={imgRef} className="compass-img" src={logo} alt="ESSORA compass" />
    </div>
  );
}

import { useRef, useEffect } from "react";
import logo from "../assets/essora_logo1.png";

// The small nav-bar logo. Hovering the ESSORA brand spins it up (slow → fast);
// moving away lets it coast to a natural stop instead of stopping abruptly.
export default function BrandLogo() {
  const imgRef = useRef(null);

  useEffect(() => {
    const img = imgRef.current;
    const target = img.closest(".brand") || img; // spin when hovering the whole brand
    const state = { angle: 0, vel: 0, hovering: false, raf: 0, last: 0 };

    const MAX = 240; // top speed, degrees/second
    const ACCEL = 120; // how quickly it spins up while hovering
    const FRICTION = 1.0; // how quickly it coasts to a stop (higher = sooner)

    function frame(t) {
      if (!state.last) state.last = t;
      const dt = Math.min((t - state.last) / 1000, 0.05);
      state.last = t;

      if (state.hovering) {
        state.vel = Math.min(MAX, state.vel + ACCEL * dt);
      } else {
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
      ensureRunning();
    }

    target.addEventListener("mouseenter", onEnter);
    target.addEventListener("mouseleave", onLeave);
    return () => {
      target.removeEventListener("mouseenter", onEnter);
      target.removeEventListener("mouseleave", onLeave);
      if (state.raf) cancelAnimationFrame(state.raf);
    };
  }, []);

  return <img ref={imgRef} className="brand-logo" src={logo} alt="" />;
}

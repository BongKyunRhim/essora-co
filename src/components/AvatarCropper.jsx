import { useState, useRef, useEffect, useCallback } from "react";

const PREVIEW_SIZE = 280;
const OUTPUT_SIZE = 400;
const MIN_SCALE = 0.5;
const MAX_SCALE = 4;

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function pinchDist(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.hypot(dx, dy);
}

export default function AvatarCropper({ file, onCancel, onCrop }) {
  const [imgSrc, setImgSrc] = useState("");
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  const circleRef = useRef(null);
  const dragOrigin = useRef(null);
  const pinchRef = useRef(null); // { dist, scale }
  // keep a ref in sync so wheel handler can read current scale
  const scaleRef = useRef(scale);
  useEffect(() => { scaleRef.current = scale; }, [scale]);

  useEffect(() => {
    const reader = new FileReader();
    reader.onload = (e) => setImgSrc(e.target.result);
    reader.readAsDataURL(file);
  }, [file]);

  // Scroll-wheel zoom (non-passive so we can preventDefault)
  useEffect(() => {
    const el = circleRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      setScale((s) => clamp(s - e.deltaY * 0.002, MIN_SCALE, MAX_SCALE));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // --- drag helpers ---
  const startDrag = (clientX, clientY) => {
    setDragging(true);
    dragOrigin.current = { x: clientX - offset.x, y: clientY - offset.y };
  };

  const moveDrag = useCallback((clientX, clientY) => {
    if (!dragOrigin.current) return;
    setOffset({
      x: clientX - dragOrigin.current.x,
      y: clientY - dragOrigin.current.y,
    });
  }, []);

  const endDrag = () => {
    setDragging(false);
    dragOrigin.current = null;
  };

  // --- touch handlers (single = drag, two-finger = pinch) ---
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      pinchRef.current = { dist: pinchDist(e.touches), scale: scaleRef.current };
    } else {
      const t = e.touches[0];
      startDrag(t.clientX, t.clientY);
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && pinchRef.current) {
      const ratio = pinchDist(e.touches) / pinchRef.current.dist;
      setScale(clamp(pinchRef.current.scale * ratio, MIN_SCALE, MAX_SCALE));
    } else if (e.touches.length === 1) {
      const t = e.touches[0];
      moveDrag(t.clientX, t.clientY);
    }
  };

  const handleTouchEnd = (e) => {
    if (e.touches.length < 2) pinchRef.current = null;
    if (e.touches.length === 0) endDrag();
  };

  async function handleSave() {
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");

    ctx.beginPath();
    ctx.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2);
    ctx.clip();

    const img = new Image();
    img.src = imgSrc;
    await new Promise((res) => { img.onload = res; });

    const ratio = OUTPUT_SIZE / PREVIEW_SIZE;
    const fitScale = Math.max(PREVIEW_SIZE / img.naturalWidth, PREVIEW_SIZE / img.naturalHeight);
    const totalScale = fitScale * scale * ratio;

    const drawW = img.naturalWidth * totalScale;
    const drawH = img.naturalHeight * totalScale;
    const drawX = OUTPUT_SIZE / 2 - drawW / 2 + offset.x * ratio;
    const drawY = OUTPUT_SIZE / 2 - drawH / 2 + offset.y * ratio;

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    canvas.toBlob((blob) => onCrop(blob), "image/jpeg", 0.92);
  }

  return (
    <div className="cropper-overlay">
      <div className="cropper-modal">
        <h3 className="cropper-title">Adjust photo</h3>

        <div
          ref={circleRef}
          className={`cropper-circle${dragging ? " dragging" : ""}`}
          onMouseDown={(e) => { e.preventDefault(); startDrag(e.clientX, e.clientY); }}
          onMouseMove={(e) => { if (dragOrigin.current) moveDrag(e.clientX, e.clientY); }}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {imgSrc && (
            <div className="cropper-img-wrap">
              <img
                src={imgSrc}
                className="cropper-img"
                style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}
                draggable={false}
                alt=""
              />
            </div>
          )}

          <div className="cropper-grid" aria-hidden="true">
            <div className="cropper-grid-line" style={{ left: "33.33%", top: 0, bottom: 0, width: 1 }} />
            <div className="cropper-grid-line" style={{ left: "66.66%", top: 0, bottom: 0, width: 1 }} />
            <div className="cropper-grid-line" style={{ top: "33.33%", left: 0, right: 0, height: 1 }} />
            <div className="cropper-grid-line" style={{ top: "66.66%", left: 0, right: 0, height: 1 }} />
          </div>
        </div>

        <p className="cropper-hint">Scroll or pinch to zoom · drag to reposition</p>

        <div className="cropper-actions">
          <button type="button" className="cropper-cancel-btn" onClick={onCancel}>Cancel</button>
          <button type="button" onClick={handleSave}>Save photo</button>
        </div>
      </div>
    </div>
  );
}

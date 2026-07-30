import { useState, useRef, useEffect, useCallback } from "react";

const PREVIEW_SIZE = 280;
const OUTPUT_SIZE = 400;

export default function AvatarCropper({ file, onCancel, onCrop }) {
  const [imgSrc, setImgSrc] = useState("");
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragOrigin = useRef(null);

  useEffect(() => {
    const reader = new FileReader();
    reader.onload = (e) => setImgSrc(e.target.result);
    reader.readAsDataURL(file);
  }, [file]);

  const startDrag = (clientX, clientY) => {
    setDragging(true);
    dragOrigin.current = { x: clientX - offset.x, y: clientY - offset.y };
  };

  const moveDrag = useCallback((clientX, clientY) => {
    if (!dragging || !dragOrigin.current) return;
    setOffset({
      x: clientX - dragOrigin.current.x,
      y: clientY - dragOrigin.current.y,
    });
  }, [dragging]);

  const endDrag = () => {
    setDragging(false);
    dragOrigin.current = null;
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
          className={`cropper-circle${dragging ? " dragging" : ""}`}
          onMouseDown={(e) => { e.preventDefault(); startDrag(e.clientX, e.clientY); }}
          onMouseMove={(e) => moveDrag(e.clientX, e.clientY)}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          onTouchStart={(e) => { const t = e.touches[0]; startDrag(t.clientX, t.clientY); }}
          onTouchMove={(e) => { const t = e.touches[0]; moveDrag(t.clientX, t.clientY); }}
          onTouchEnd={endDrag}
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

          {showGrid && (
            <div className="cropper-grid" aria-hidden="true">
              <div className="cropper-grid-line" style={{ left: "33.33%", top: 0, bottom: 0, width: 1 }} />
              <div className="cropper-grid-line" style={{ left: "66.66%", top: 0, bottom: 0, width: 1 }} />
              <div className="cropper-grid-line" style={{ top: "33.33%", left: 0, right: 0, height: 1 }} />
              <div className="cropper-grid-line" style={{ top: "66.66%", left: 0, right: 0, height: 1 }} />
            </div>
          )}
        </div>

        <div className="cropper-controls">
          <label className="cropper-zoom-label">
            <span>Zoom</span>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.01"
              value={scale}
              onChange={(e) => setScale(Number(e.target.value))}
              className="cropper-zoom"
            />
          </label>
          <button
            type="button"
            className={`cropper-grid-btn${showGrid ? " active" : ""}`}
            onClick={() => setShowGrid((g) => !g)}
          >
            Grid
          </button>
        </div>

        <div className="cropper-actions">
          <button type="button" className="cropper-cancel-btn" onClick={onCancel}>Cancel</button>
          <button type="button" onClick={handleSave}>Save photo</button>
        </div>
      </div>
    </div>
  );
}

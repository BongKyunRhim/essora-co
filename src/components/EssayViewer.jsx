import { useCallback, useEffect, useRef, useState } from "react";
import { getDocument, GlobalWorkerOptions, TextLayer } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

GlobalWorkerOptions.workerSrc = workerUrl;

function fileKind(name = "", url = "") {
  const source = (name || url).toLowerCase().split("?")[0];
  if (source.endsWith(".pdf")) return "pdf";
  if (source.endsWith(".txt")) return "txt";
  return "other";
}

/*
 * Renders the applicant's essay inline (PDF via pdf.js with a selectable text
 * layer, plain text directly) and turns text selections into review
 * suggestions. Highlight rectangles are stored as percentages of the page box
 * so they survive window resizes and re-renders at any zoom level.
 */
export default function EssayViewer({
  url,
  name,
  highlights,
  activeId,
  readOnly,
  onCreate,
  onHighlightClick,
}) {
  const kind = fileKind(name, url);
  const wrapperRef = useRef(null);
  const docRef = useRef(null);
  const renderSeq = useRef(0);
  const canvasRefs = useRef({});
  const textRefs = useRef({});
  const pageRefs = useRef({});

  const [numPages, setNumPages] = useState(0);
  const [pageDims, setPageDims] = useState({}); // page -> aspect ratio (h/w)
  const [width, setWidth] = useState(0);
  const [txtContent, setTxtContent] = useState("");
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(kind !== "other");

  // Pending selection → "Add suggestion" chip → composer
  const [pending, setPending] = useState(null); // { page, quote, rects, anchor }
  const [composing, setComposing] = useState(false);
  const [draftComment, setDraftComment] = useState("");

  /* ---- Load the document ---- */
  useEffect(() => {
    if (kind === "pdf") {
      let cancelled = false;
      setLoading(true);
      setLoadError("");
      const task = getDocument({ url: new URL(url, window.location.href).href });
      task.promise
        .then((doc) => {
          if (cancelled) { doc.destroy(); return; }
          docRef.current = doc;
          setNumPages(doc.numPages);
        })
        .catch((err) => {
          if (!cancelled) { setLoadError(err?.message || "Could not load the PDF."); setLoading(false); }
        });
      return () => {
        cancelled = true;
        docRef.current?.destroy();
        docRef.current = null;
      };
    }
    if (kind === "txt") {
      let cancelled = false;
      setLoading(true);
      setLoadError("");
      fetch(url)
        .then((r) => { if (!r.ok) throw new Error("Could not load the essay."); return r.text(); })
        .then((t) => { if (!cancelled) { setTxtContent(t); setLoading(false); } })
        .catch((err) => { if (!cancelled) { setLoadError(err.message); setLoading(false); } });
      return () => { cancelled = true; };
    }
  }, [url, kind]);

  /* ---- Track container width ---- */
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const measure = () => {
      const w = Math.floor(el.clientWidth);
      if (w > 0) setWidth((prev) => (Math.abs(prev - w) > 2 ? w : prev));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ---- Render PDF pages onto canvases + text layers ---- */
  useEffect(() => {
    const doc = docRef.current;
    if (!doc || !numPages || !width) return;
    const seq = ++renderSeq.current;
    let destroyed = false;

    (async () => {
      const dims = {};
      for (let n = 1; n <= numPages; n++) {
        if (destroyed || seq !== renderSeq.current) return;
        try {
          const page = await doc.getPage(n);
          if (destroyed || seq !== renderSeq.current) return;

          const base = page.getViewport({ scale: 1 });
          const scale = width / base.width;
          const viewport = page.getViewport({ scale });
          dims[n] = viewport.height / viewport.width;

          const canvas = canvasRefs.current[n];
          const textDiv = textRefs.current[n];
          const pageDiv = pageRefs.current[n];
          if (!canvas || !textDiv || !pageDiv) continue;

          const dpr = window.devicePixelRatio || 1;
          canvas.width = Math.floor(viewport.width * dpr);
          canvas.height = Math.floor(viewport.height * dpr);
          canvas.style.width = `${viewport.width}px`;
          canvas.style.height = `${viewport.height}px`;

          await page.render({
            canvasContext: canvas.getContext("2d"),
            viewport,
            transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
          }).promise;
          if (destroyed || seq !== renderSeq.current) return;

          textDiv.replaceChildren();
          pageDiv.style.setProperty("--scale-factor", viewport.scale);
          const textLayer = new TextLayer({
            textContentSource: page.streamTextContent(),
            container: textDiv,
            viewport,
          });
          await textLayer.render();
        } catch (err) {
          if (err?.name !== "RenderingCancelledException") console.error(err);
        }
      }
      if (!destroyed && seq === renderSeq.current) {
        setPageDims(dims);
        setLoading(false);
      }
    })();

    return () => { destroyed = true; };
  }, [numPages, width]);

  /* ---- Selection → pending suggestion ---- */
  const captureSelection = useCallback(() => {
    if (readOnly) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return;
    const quote = sel.toString().trim();
    if (!quote) return;

    const range = sel.getRangeAt(0);
    const node = range.commonAncestorContainer;
    const el = node.nodeType === 1 ? node : node.parentElement;
    const pageEl = el?.closest?.("[data-essay-page]");
    if (!pageEl || !wrapperRef.current?.contains(pageEl)) return;

    const pageRect = pageEl.getBoundingClientRect();
    const wrapRect = wrapperRef.current.getBoundingClientRect();
    const rects = Array.from(range.getClientRects())
      .filter((r) => r.width > 1 && r.height > 1)
      .slice(0, 60)
      .map((r) => ({
        x: ((r.left - pageRect.left) / pageRect.width) * 100,
        y: ((r.top - pageRect.top) / pageRect.height) * 100,
        w: (r.width / pageRect.width) * 100,
        h: (r.height / pageRect.height) * 100,
      }));
    if (!rects.length) return;

    const lastClient = range.getClientRects()[range.getClientRects().length - 1];
    setPending({
      page: Number(pageEl.dataset.essayPage),
      quote: quote.length > 400 ? `${quote.slice(0, 400)}…` : quote,
      rects,
      anchor: {
        x: Math.min(lastClient.right - wrapRect.left, wrapRect.width - 20),
        y: lastClient.bottom - wrapRect.top,
      },
    });
    setComposing(false);
  }, [readOnly]);

  useEffect(() => {
    // touchend fires before mobile selection handles settle — poll shortly after
    const onUp = () => setTimeout(captureSelection, 10);
    const el = wrapperRef.current;
    if (!el) return;
    el.addEventListener("mouseup", onUp);
    el.addEventListener("touchend", onUp);
    return () => {
      el.removeEventListener("mouseup", onUp);
      el.removeEventListener("touchend", onUp);
    };
  }, [captureSelection]);

  function dismissPending() {
    setPending(null);
    setComposing(false);
    setDraftComment("");
    window.getSelection()?.removeAllRanges();
  }

  function saveSuggestion() {
    if (!draftComment.trim()) return;
    onCreate({
      page: pending.page,
      quote: pending.quote,
      rects: pending.rects,
      comment: draftComment.trim(),
    });
    dismissPending();
  }

  /* ---- Highlight overlays for one page ---- */
  function renderHighlights(page) {
    return (highlights || [])
      .filter((h) => h.page === page && Array.isArray(h.rects))
      .flatMap((h) =>
        h.rects.map((r, i) => (
          <button
            key={`${h.id}-${i}`}
            type="button"
            data-hl-id={i === 0 ? h.id : undefined}
            className={`ev-highlight${h.id === activeId ? " ev-highlight--active" : ""}`}
            style={{ left: `${r.x}%`, top: `${r.y}%`, width: `${r.w}%`, height: `${r.h}%` }}
            onClick={() => onHighlightClick?.(h.id)}
            aria-label="View suggestion"
          />
        ))
      );
  }

  if (kind === "other") {
    return (
      <div className="ev-fallback">
        <p className="ev-fallback-title">Preview not available</p>
        <p className="ev-fallback-text">
          This essay is a Word document, so it can't be shown inline. Download it to
          read, then add your suggestions with the button in the panel.
        </p>
        <a href={url} target="_blank" rel="noopener noreferrer" className="rdp-download-btn">
          Download Essay
        </a>
      </div>
    );
  }

  return (
    <div className="ev-wrapper" ref={wrapperRef}>
      {loading && <p className="ev-status">Loading essay…</p>}
      {loadError && (
        <div className="ev-fallback">
          <p className="ev-fallback-title">Couldn't display the essay</p>
          <p className="ev-fallback-text">{loadError}</p>
          <a href={url} target="_blank" rel="noopener noreferrer" className="rdp-download-btn">
            Download Essay
          </a>
        </div>
      )}

      {kind === "pdf" &&
        Array.from({ length: numPages }, (_, i) => i + 1).map((n) => (
          <div
            key={n}
            className="ev-page"
            data-essay-page={n}
            ref={(el) => { pageRefs.current[n] = el; }}
            style={pageDims[n] ? { aspectRatio: `1 / ${pageDims[n]}` } : undefined}
          >
            <canvas ref={(el) => { canvasRefs.current[n] = el; }} />
            <div className="textLayer" ref={(el) => { textRefs.current[n] = el; }} />
            <div className="ev-highlight-layer">{renderHighlights(n)}</div>
          </div>
        ))}

      {kind === "txt" && !loading && !loadError && (
        <div className="ev-page ev-page--txt" data-essay-page={1}>
          <pre className="ev-txt">{txtContent}</pre>
          <div className="ev-highlight-layer">{renderHighlights(1)}</div>
        </div>
      )}

      {/* Floating chip on selection */}
      {pending && !composing && (
        <button
          type="button"
          className="ev-add-chip"
          style={{ left: pending.anchor.x, top: pending.anchor.y + 6 }}
          onClick={() => setComposing(true)}
        >
          + Add suggestion
        </button>
      )}

      {/* Composer */}
      {pending && composing && (
        <div className="ev-composer" style={{ top: Math.max(pending.anchor.y - 10, 8) }}>
          <p className="ev-composer-quote">“{pending.quote}”</p>
          <textarea
            autoFocus
            rows={3}
            value={draftComment}
            onChange={(e) => setDraftComment(e.target.value)}
            placeholder="What would you improve here, and why?"
          />
          <div className="ev-composer-actions">
            <button type="button" className="ev-composer-save" disabled={!draftComment.trim()} onClick={saveSuggestion}>
              Save suggestion
            </button>
            <button type="button" className="linklike" onClick={dismissPending}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

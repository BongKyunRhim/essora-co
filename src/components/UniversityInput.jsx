import { useState, useRef, useEffect } from "react";
import { searchUniversities } from "../data/universities.js";

export default function UniversityInput({ value, onChange, placeholder = "e.g. UCLA" }) {
  const [query, setQuery]         = useState(value ?? "");
  const [results, setResults]     = useState([]);
  const [open, setOpen]           = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const wrapRef = useRef(null);

  // Keep local query in sync when external value changes (e.g. profile load)
  useEffect(() => { setQuery(value ?? ""); }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    function onDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function handleInput(e) {
    const q = e.target.value;
    setQuery(q);
    onChange(q);
    const hits = searchUniversities(q);
    setResults(hits);
    setOpen(hits.length > 0);
    setHighlighted(-1);
  }

  function selectOption(label) {
    setQuery(label);
    onChange(label);
    setOpen(false);
    setResults([]);
  }

  function handleKeyDown(e) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && highlighted >= 0) {
      e.preventDefault();
      selectOption(results[highlighted].label);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="uni-wrap" ref={wrapRef}>
      <input
        type="text"
        value={query}
        placeholder={placeholder}
        autoComplete="off"
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (results.length) setOpen(true); }}
      />
      {open && (
        <ul className="uni-dropdown" role="listbox">
          {results.map((u, i) => (
            <li
              key={u.label}
              role="option"
              aria-selected={i === highlighted}
              className={`uni-option${i === highlighted ? " uni-option--hl" : ""}`}
              onMouseDown={(e) => { e.preventDefault(); selectOption(u.label); }}
              onMouseEnter={() => setHighlighted(i)}
            >
              {u.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

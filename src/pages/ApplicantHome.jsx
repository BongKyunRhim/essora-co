import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import Avatar from "../components/Avatar.jsx";

const SORT_OPTIONS = [
  { value: "default",    label: "Default" },
  { value: "price_asc",  label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "name_asc",   label: "Name: A – Z" },
];

function FilterIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <line x1="1.5" y1="3.5" x2="13.5" y2="3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="1.5" y1="7.5" x2="13.5" y2="7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="1.5" y1="11.5" x2="13.5" y2="11.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <circle cx="4.5" cy="3.5" r="1.75" fill="white" stroke="currentColor" strokeWidth="1.4"/>
      <circle cx="9.5" cy="7.5" r="1.75" fill="white" stroke="currentColor" strokeWidth="1.4"/>
      <circle cx="6"   cy="11.5" r="1.75" fill="white" stroke="currentColor" strokeWidth="1.4"/>
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

export default function ApplicantHome() {
  const [reviewers, setReviewers] = useState([]);
  const [ratingsById, setRatingsById] = useState({});
  const [loading, setLoading]     = useState(true);
  const [maxPrice, setMaxPrice]   = useState(200);
  const [sortBy, setSortBy]       = useState("default");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [query, setQuery]           = useState("");

  const highestPrice = useMemo(
    () => Math.max(200, ...reviewers.map((r) => r.price ?? 0)),
    [reviewers]
  );

  useEffect(() => {
    let active = true;
    Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .eq("role", "reviewer")
        .eq("is_listed", true),
      supabase.from("reviewer_ratings").select("reviewer_id, stars"),
    ]).then(([{ data }, { data: rats }]) => {
      if (!active) return;
      const list = data ?? [];
      setReviewers(list);
      setMaxPrice(Math.max(200, ...list.map((r) => r.price ?? 0)));

      // Aggregate stars per reviewer for the card badges
      const agg = {};
      (rats ?? []).forEach(({ reviewer_id, stars }) => {
        (agg[reviewer_id] ??= { sum: 0, count: 0 });
        agg[reviewer_id].sum += stars;
        agg[reviewer_id].count += 1;
      });
      setRatingsById(agg);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = reviewers.filter((r) => {
      if (r.price != null && r.price > maxPrice) return false;
      if (!q) return true;
      return (
        (r.full_name  ?? "").toLowerCase().includes(q) ||
        (r.college    ?? "").toLowerCase().includes(q) ||
        (r.major      ?? "").toLowerCase().includes(q)
      );
    });
    if (sortBy === "price_asc")  list = [...list].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    if (sortBy === "price_desc") list = [...list].sort((a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity));
    if (sortBy === "name_asc")   list = [...list].sort((a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? ""));
    return list;
  }, [reviewers, maxPrice, sortBy, query]);

  const isFiltered = sortBy !== "default" || maxPrice < highestPrice;

  function resetFilters() {
    setMaxPrice(highestPrice);
    setSortBy("default");
  }

  return (
    <div className="find-reviewers-layout">

      {/* Overlay behind the open drawer */}
      <div
        className={`filter-drawer-overlay${drawerOpen ? " visible" : ""}`}
        onClick={() => setDrawerOpen(false)}
      />

      {/* Slide-out filter drawer */}
      <aside className={`filter-drawer${drawerOpen ? " open" : ""}`}>
        <div className="frs-header">
          <span className="frs-title">Filter</span>
          <div className="frs-header-right">
            {isFiltered && (
              <button type="button" className="frs-reset" onClick={resetFilters}>Reset</button>
            )}
            <button type="button" className="filter-drawer-close" onClick={() => setDrawerOpen(false)}>✕</button>
          </div>
        </div>

        <div className="frs-group">
          <label className="frs-label">Max price</label>
          <input
            type="range"
            min={0}
            max={highestPrice}
            step={5}
            value={maxPrice}
            onChange={(e) => setMaxPrice(Number(e.target.value))}
            className="frs-slider"
          />
          <span className="frs-slider-val">
            {maxPrice >= highestPrice ? "Any price" : `Up to $${maxPrice}`}
          </span>
        </div>

        <div className="frs-group">
          <label className="frs-label">Sort by</label>
          <div className="frs-radio-list">
            {SORT_OPTIONS.map((o) => (
              <label key={o.value} className="frs-radio-item">
                <input
                  type="radio"
                  name="sort"
                  value={o.value}
                  checked={sortBy === o.value}
                  onChange={() => setSortBy(o.value)}
                />
                <span>{o.label}</span>
              </label>
            ))}
          </div>
        </div>
      </aside>

      {/* Title row — full width so the divider line can reach both edges */}
      <div className="find-reviewers-heading">
        <h1>Find Reviewers</h1>
      </div>

      {/* Toolbar — filter left, search right */}
      <div className="find-reviewers-toolbar">
        <button
          type="button"
          className={`filter-btn${isFiltered ? " filter-btn--active" : ""}`}
          onClick={() => setDrawerOpen(true)}
        >
          <FilterIcon />
          Filter{isFiltered ? " ·" : ""}
        </button>

        <div className="toolbar-search">
          <svg className="toolbar-search-icon" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4"/>
            <line x1="9.5" y1="9.5" x2="13" y2="13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <input
            type="search"
            className="toolbar-search-input"
            placeholder="Search by name, school, major…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button type="button" className="toolbar-search-clear" onClick={() => setQuery("")}>✕</button>
          )}
        </div>
      </div>

      {/* Cards */}
      <main className="find-reviewers-main">
        {loading && <p className="muted">Loading reviewers…</p>}

        {!loading && filtered.length === 0 && (
          <p className="muted" style={{ marginTop: "2rem" }}>
            No reviewers match your filters.
          </p>
        )}

        <div className="cards">
          {filtered.map((r) => (
            <Link className="card reviewer-card" to={`/reviewers/${r.id}`} key={r.id}>
              <div className="reviewer-card-photo">
                <Avatar url={r.avatar_url} name={r.full_name} size={120} />
              </div>
              <div className="reviewer-card-body">
                <h2>{r.full_name || "Reviewer"}</h2>
                <p className="muted">
                  {[r.college, r.major].filter(Boolean).join(" · ") || "—"}
                </p>
                {ratingsById[r.id] ? (
                  <p className="reviewer-card-rating">
                    <StarIcon />
                    {(ratingsById[r.id].sum / ratingsById[r.id].count).toFixed(1)}
                    <span className="reviewer-card-rating-count">({ratingsById[r.id].count})</span>
                  </p>
                ) : (
                  <p className="reviewer-card-rating reviewer-card-rating--empty">
                    No ratings yet
                  </p>
                )}
                {r.price != null && <p className="price">${r.price} / essay</p>}
              </div>
            </Link>
          ))}
        </div>
      </main>

    </div>
  );
}

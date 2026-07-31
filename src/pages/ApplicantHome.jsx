import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import Avatar from "../components/Avatar.jsx";

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

const SORT_OPTIONS = [
  { value: "default",   label: "Default" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc",label: "Price: high to low" },
  { value: "name_asc",  label: "Name: A – Z" },
];

export default function ApplicantHome() {
  const [reviewers, setReviewers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery]       = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy]     = useState("default");

  useEffect(() => {
    let active = true;
    supabase
      .from("profiles")
      .select("*")
      .eq("role", "reviewer")
      .eq("is_listed", true)
      .then(({ data }) => {
        if (!active) return;
        setReviewers(data ?? []);
        setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = reviewers.filter((r) => {
      if (q) {
        const haystack = [r.full_name, r.college, r.major, r.bio]
          .filter(Boolean).join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (maxPrice !== "" && r.price != null && r.price > Number(maxPrice)) return false;
      return true;
    });

    if (sortBy === "price_asc")  list = [...list].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    if (sortBy === "price_desc") list = [...list].sort((a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity));
    if (sortBy === "name_asc")   list = [...list].sort((a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? ""));

    return list;
  }, [reviewers, query, maxPrice, sortBy]);

  const hasFilters = query !== "" || maxPrice !== "" || sortBy !== "default";

  function clearFilters() {
    setQuery("");
    setMaxPrice("");
    setSortBy("default");
  }

  return (
    <section className="page page-wide">
      <h1>Find a reviewer</h1>

      {/* Search + filter bar */}
      <div className="reviewer-search-bar">
        <div className="reviewer-search-input-wrap">
          <SearchIcon />
          <input
            type="text"
            className="reviewer-search-input"
            placeholder="Search by name, college, or major…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button type="button" className="reviewer-search-clear" onClick={() => setQuery("")} aria-label="Clear search">✕</button>
          )}
        </div>

        <div className="reviewer-filters">
          <label className="reviewer-filter-field">
            <span>Max price</span>
            <div className="reviewer-price-wrap">
              <span className="reviewer-price-symbol">$</span>
              <input
                type="number"
                min="0"
                placeholder="Any"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="reviewer-price-input"
              />
            </div>
          </label>

          <label className="reviewer-filter-field">
            <span>Sort by</span>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="reviewer-sort-select">
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>

          {hasFilters && (
            <button type="button" className="reviewer-clear-btn" onClick={clearFilters}>
              Clear all
            </button>
          )}
        </div>
      </div>

      {loading && <p>Loading reviewers…</p>}

      {!loading && filtered.length === 0 && (
        <p className="muted reviewer-empty">
          {hasFilters ? "No reviewers match your filters." : "No reviewers have posted yet. Check back soon."}
        </p>
      )}

      {!loading && filtered.length > 0 && (
        <p className="reviewer-count muted">{filtered.length} reviewer{filtered.length !== 1 ? "s" : ""}</p>
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
              {r.price != null && <p className="price">${r.price} / essay</p>}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

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

export default function ApplicantHome() {
  const [reviewers, setReviewers] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [maxPrice, setMaxPrice]   = useState(200);
  const [sortBy, setSortBy]       = useState("default");

  const highestPrice = useMemo(
    () => Math.max(200, ...reviewers.map((r) => r.price ?? 0)),
    [reviewers]
  );

  useEffect(() => {
    let active = true;
    supabase
      .from("profiles")
      .select("*")
      .eq("role", "reviewer")
      .eq("is_listed", true)
      .then(({ data }) => {
        if (!active) return;
        const list = data ?? [];
        setReviewers(list);
        setMaxPrice(Math.max(200, ...list.map((r) => r.price ?? 0)));
        setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    let list = reviewers.filter((r) =>
      r.price == null || r.price <= maxPrice
    );
    if (sortBy === "price_asc")  list = [...list].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    if (sortBy === "price_desc") list = [...list].sort((a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity));
    if (sortBy === "name_asc")   list = [...list].sort((a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? ""));
    return list;
  }, [reviewers, maxPrice, sortBy]);

  const isFiltered = sortBy !== "default" || maxPrice < highestPrice;

  function resetFilters() {
    setMaxPrice(highestPrice);
    setSortBy("default");
  }

  return (
    <div className="find-reviewers-layout page-wide">

      {/* Left sidebar */}
      <aside className="find-reviewers-sidebar">
        <div className="frs-header">
          <span className="frs-title">Filter</span>
          {isFiltered && (
            <button type="button" className="frs-reset" onClick={resetFilters}>Reset</button>
          )}
        </div>

        <div className="frs-group">
          <label className="frs-label">Max price</label>
          <div className="frs-slider-row">
            <input
              type="range"
              min={0}
              max={highestPrice}
              step={5}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="frs-slider"
            />
          </div>
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

      {/* Main content */}
      <main className="find-reviewers-main">
        <div className="find-reviewers-heading">
          <h1>Find Reviewers</h1>
          {!loading && (
            <span className="frs-count">{filtered.length} reviewer{filtered.length !== 1 ? "s" : ""}</span>
          )}
        </div>

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
                {r.price != null && <p className="price">${r.price} / essay</p>}
              </div>
            </Link>
          ))}
        </div>
      </main>

    </div>
  );
}

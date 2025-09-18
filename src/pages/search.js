import { useEffect, useMemo, useState } from "react";

const TS_HOST = process.env.NEXT_PUBLIC_TYPESENSE_HOST; // e.g. https://xxxx.a1.typesense.net
const TS_KEY = process.env.NEXT_PUBLIC_TYPESENSE_SEARCH_KEY;

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [facets, setFacets] = useState({
    industry: "",
    province: "",
    verified: "",
    certifications: "",
  });
  const [sort, setSort] = useState("lead_time_production:asc");
  const [error, setError] = useState("");

  const searchParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set("q", q || "*");
    params.set("query_by", "name,industry,province,keywords");
    params.set("facet_by", "industry,province,verified,certifications");
    params.set("sort_by", sort);
    params.set("include_fields", "id,name,industry,province,verified");
    params.set("per_page", "20");

    const filterParts = [];
    if (facets.industry) filterParts.push(`industry:=${JSON.stringify(facets.industry)}`);
    if (facets.province) filterParts.push(`province:=${JSON.stringify(facets.province)}`);
    if (facets.verified) filterParts.push(`verified:=${facets.verified === "true" ? "true" : "false"}`);
    if (facets.certifications) {
      filterParts.push(`certifications:=[${JSON.stringify(facets.certifications)}]`);
    }
    if (filterParts.length) params.set("filter_by", filterParts.join(" && "));
    return params;
  }, [q, facets, sort]);

  async function runSearch() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${TS_HOST}/collections/suppliers/documents/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-TYPESENSE-API-KEY": TS_KEY,
        },
        body: JSON.stringify(Object.fromEntries(searchParams)),
      });

      if (!res.ok) throw new Error(`Typesense ${res.status}`);
      const data = await res.json();
      setHits(data.hits?.map(h => h.document) ?? []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    runSearch(); // initial load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ maxWidth: 900, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>Supplier Search</h1>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          style={{ flex: 1, padding: 8 }}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search suppliers by name, industry, province, keywords…"
        />
        <button onClick={runSearch} disabled={loading}>
          {loading ? "Searching…" : "Search"}
        </button>
      </div>

      {error && <p style={{ color: "crimson" }}>Error: {error}</p>}

      <ul style={{ listStyle: "none", padding: 0, marginTop: 16 }}>
        {hits.map(h => (
          <li key={h.id} style={{ border: "1px solid #eee", padding: 12, borderRadius: 8, marginBottom: 8 }}>
            <strong>{h.name}</strong>
            <div style={{ fontSize: 14, opacity: 0.8 }}>
              {h.industry} · {h.province} · verified: {String(h.verified)}
            </div>
          </li>
        ))}
        {!loading && hits.length === 0 && <p>No results.</p>}
      </ul>
    </div>
  );
}

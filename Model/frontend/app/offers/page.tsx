"use client";

import axios from "axios";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Building2, Filter, MapPin, Wallet } from "lucide-react";

import api from "@/lib/api";
import { OfferSummary } from "@/lib/types";

const PAGE_SIZE = 20;

function moneyRange(offer: OfferSummary) {
  if (offer.salary_min === null && offer.salary_max === null) return "Salary not specified";
  if (offer.salary_min !== null && offer.salary_max !== null) return `${offer.salary_min} - ${offer.salary_max}`;
  if (offer.salary_min !== null) return `From ${offer.salary_min}`;
  return `Up to ${offer.salary_max}`;
}

function OfferCardSkeleton() {
  return (
    <article className="offer-card" aria-hidden="true">
      <p className="eyebrow skeleton" style={{ width: "44px" }}>
        .
      </p>
      <h3 className="skeleton" style={{ width: "78%" }}>
        .
      </h3>
      <p className="result-meta skeleton" style={{ width: "55%", height: "0.9rem" }}>
        .
      </p>
      <p className="chip neutral skeleton" style={{ width: "70px", color: "transparent" }}>
        .
      </p>
      <p className="muted small skeleton" style={{ width: "50%", marginTop: "0.5rem" }}>
        .
      </p>
    </article>
  );
}

export default function OffersPage() {
  const [city, setCity] = useState("");
  const [jobFamily, setJobFamily] = useState("");

  const [offers, setOffers] = useState<OfferSummary[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cityOptions = useMemo(
    () =>
      [...new Set(offers.map((item) => item.city).filter(Boolean) as string[])].sort(
        (a, b) => a.localeCompare(b),
      ),
    [offers],
  );

  const familyOptions = useMemo(
    () =>
      [...new Set(offers.map((item) => item.job_family).filter(Boolean) as string[])].sort((a, b) =>
        a.localeCompare(b),
      ),
    [offers],
  );

  const fetchPage = useCallback(
    async (offset: number, append: boolean) => {
      setError(null);

      try {
        const response = await api.get<OfferSummary[]>("/offers", {
          params: {
            city: city || undefined,
            job_family: jobFamily || undefined,
            limit: PAGE_SIZE,
            offset,
          },
        });

        const payload = response.data;
        setOffers((prev) => (append ? [...prev, ...payload] : payload));
        setHasMore(payload.length === PAGE_SIZE);
      } catch (requestError) {
        if (axios.isAxiosError(requestError) && requestError.response?.data?.detail) {
          setError(String(requestError.response.data.detail));
        } else {
          setError("Could not load offers. Please retry.");
        }
        if (!append) {
          setOffers([]);
        }
        setHasMore(false);
      }
    },
    [city, jobFamily],
  );

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      await fetchPage(0, false);
      setLoading(false);
    };

    void run();
  }, [fetchPage]);

  const loadMore = async () => {
    setLoadingMore(true);
    await fetchPage(offers.length, true);
    setLoadingMore(false);
  };

  return (
    <div className="page-stack">
      <section className="panel hero-panel compact">
        <p className="eyebrow">Step E • Browse</p>
        <h1>Browse Job Offers</h1>
        <p className="lede">Filter by city and family, then drill down to full offer details.</p>
      </section>

      <section className="panel">
        <div className="filter-row">
          <div className="field-inline">
            <label htmlFor="city-filter">
              <MapPin size={12} style={{ verticalAlign: "-1px", marginRight: 4 }} />
              City
            </label>
            <select
              id="city-filter"
              value={city}
              onChange={(event) => setCity(event.target.value)}
            >
              <option value="">All cities</option>
              {cityOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="field-inline">
            <label htmlFor="family-filter">
              <Building2 size={12} style={{ verticalAlign: "-1px", marginRight: 4 }} />
              Job Family
            </label>
            <select
              id="family-filter"
              value={jobFamily}
              onChange={(event) => setJobFamily(event.target.value)}
            >
              <option value="">All families</option>
              {familyOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <p className="meta-line inline">
            <Filter size={14} />
            <span>{offers.length} result(s) loaded</span>
          </p>
        </div>
      </section>

      <section className="panel">
        {loading ? (
          <div className="offers-grid">
            {Array.from({ length: 6 }).map((_, index) => (
              <OfferCardSkeleton key={index} />
            ))}
          </div>
        ) : offers.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
            <p className="muted" style={{ marginBottom: "0.4rem" }}>
              No offers found for this filter set.
            </p>
            <p className="muted small">Try clearing the filters to see everything.</p>
          </div>
        ) : (
          <div className="offers-grid">
            {offers.map((offer) => (
              <article className="offer-card" key={offer.offer_id}>
                <div className="result-top">
                  <p className="eyebrow">#{offer.offer_id}</p>
                  <span className="chip neutral">{offer.job_family}</span>
                </div>
                <h3>{offer.title}</h3>
                <p className="result-meta">
                  {offer.company} {offer.city ? `— ${offer.city}` : ""}
                </p>
                <p className="muted small">
                  <Wallet size={12} style={{ verticalAlign: "-1px", marginRight: 4 }} />
                  {moneyRange(offer)}
                </p>

                <Link href={`/offers/${offer.offer_id}`} className="inline-link" style={{ marginTop: "0.6rem" }}>
                  Open Offer <ArrowRight size={14} />
                </Link>
              </article>
            ))}
          </div>
        )}

        {error && <p className="alert error">{error}</p>}

        {hasMore && !loading && (
          <div className="actions-row">
            <button className="btn-secondary" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? "Loading more..." : "Load more"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

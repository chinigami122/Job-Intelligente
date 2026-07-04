"use client";

import axios from "axios";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  MapPin,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import api from "@/lib/api";
import { StatsResponse } from "@/lib/types";

const compactNumber = new Intl.NumberFormat("en-US");

function StatSkeleton() {
  return (
    <article className="stat-card" aria-hidden="true">
      <span className="stat-icon">
        <BriefcaseBusiness size={16} />
      </span>
      <p className="skeleton" style={{ width: "60%" }}>
        .
      </p>
      <strong className="skeleton" style={{ width: "40%", height: "1.7rem" }}>
        .
      </strong>
    </article>
  );
}

function SkillSkeleton() {
  return (
    <article className="skill-cloud-item" aria-hidden="true">
      <div className="skill-cloud-head">
        <span className="skeleton" style={{ width: "45%" }}>
          .
        </span>
        <strong className="skeleton" style={{ width: "18px" }}>
          .
        </strong>
      </div>
      <div className="score-bar-track" aria-hidden="true">
        <span className="score-bar-fill skeleton" style={{ width: "70%" }} />
      </div>
    </article>
  );
}

export default function HomePage() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get<StatsResponse>("/stats");
        setStats(response.data);
      } catch (requestError) {
        if (axios.isAxiosError(requestError) && requestError.response?.data?.detail) {
          setError(String(requestError.response.data.detail));
        } else {
          setError("Could not load dashboard stats.");
        }
      } finally {
        setLoading(false);
      }
    };

    void fetchStats();
  }, []);

  const topSkills = stats?.top_skills || [];
  const maxSkillCount = topSkills.reduce(
    (currentMax, skill) => Math.max(currentMax, skill.count),
    1,
  );

  const statCards = [
    { icon: BriefcaseBusiness, label: "Total Offers", value: stats?.total_offers },
    { icon: Building2, label: "Total Companies", value: stats?.total_companies },
    { icon: MapPin, label: "Total Cities", value: stats?.total_cities },
  ];

  return (
    <div className="page-stack">
      <section className="panel hero-panel">
        <p className="eyebrow">Step E • Home</p>
        <h1>Navigate the Data Job Market with Precision</h1>
        <p className="lede">
          Job Intelligent merges warehouse data with NLP ranking to surface
          offers that truly match your profile.
        </p>

        <div className="actions-row left">
          <Link href="/recommend" className="btn-primary">
            <Sparkles size={16} /> Find Your Match
          </Link>
          <Link href="/offers" className="btn-secondary">
            Browse Offers <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <section className="panel">
        <div className="section-head">
          <h2>Marketplace Snapshot</h2>
          <p className="meta-line">
            <TrendingUp size={14} />
            <span>Live from the warehouse</span>
          </p>
        </div>

        {loading ? (
          <div className="stats-grid">
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </div>
        ) : error ? (
          <p className="alert error">{error}</p>
        ) : stats ? (
          <div className="stats-grid">
            {statCards.map(({ icon: Icon, label, value }) => (
              <article className="stat-card" key={label}>
                <span className="stat-icon">
                  <Icon size={16} />
                </span>
                <p>{label}</p>
                <strong>{compactNumber.format(value ?? 0)}</strong>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted">No stats available.</p>
        )}
      </section>

      <section className="panel">
        <div className="section-head">
          <h2>Top Skills Demand</h2>
        </div>

        {loading ? (
          <div className="skill-cloud-list">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkillSkeleton key={index} />
            ))}
          </div>
        ) : topSkills.length === 0 ? (
          <p className="muted">No skills data available yet.</p>
        ) : (
          <div className="skill-cloud-list">
            {topSkills.map((skill, index) => {
              const width = Math.round((skill.count / maxSkillCount) * 100);
              return (
                <article className="skill-cloud-item" key={`${skill.name}-${index}`}>
                  <div className="skill-cloud-head">
                    <span>{skill.name}</span>
                    <strong>{skill.count}</strong>
                  </div>
                  <div className="score-bar-track" aria-hidden="true">
                    <span
                      className="score-bar-fill"
                      style={{ width: `${Math.max(6, width)}%` }}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

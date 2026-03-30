"use client";

import { useState, useEffect, useCallback } from "react";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface Sale {
  id: number;
  customer: string;
  product: string;
  amount: number;
  score: number | null;
  created_at: string;
}

interface Stats {
  avg_score: number | null;
  total: number;
  evaluated: number;
}

interface FormData {
  customer: string;
  product: string;
  amount: string;
}

interface FormErrors {
  customer?: string;
  product?: string;
  amount?: string;
}

function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className={styles.stars}>
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          className={`${styles.star} ${s <= (hover || value) ? styles.starActive : ""}`}
          onClick={() => onChange(s)}
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          aria-label={`Score ${s}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function Home() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [evaluatingId, setEvaluatingId] = useState<number | null>(null);
  const [pendingScore, setPendingScore] = useState(0);
  const [savingScore, setSavingScore] = useState(false);

  const [form, setForm] = useState<FormData>({ customer: "", product: "", amount: "" });
  const [errors, setErrors] = useState<FormErrors>({});

  const fetchSales = useCallback(async () => {
    try {
      const [salesRes, statsRes] = await Promise.all([
        fetch(`${API}/sales`),
        fetch(`${API}/sales/stats`),
      ]);
      const salesData = await salesRes.json();
      const statsData = await statsRes.json();
      setSales(salesData);
      setStats(statsData);
    } catch {
      console.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  function validate(): boolean {
    const errs: FormErrors = {};
    if (!form.customer.trim()) errs.customer = "Required";
    if (!form.product.trim()) errs.product = "Required";
    if (!form.amount.trim()) errs.amount = "Required";
    else if (isNaN(Number(form.amount)) || Number(form.amount) <= 0)
      errs.amount = "Must be a positive number";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/sales`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: form.customer.trim(),
          product: form.product.trim(),
          amount: Number(form.amount),
        }),
      });
      if (res.ok) {
        setForm({ customer: "", product: "", amount: "" });
        setErrors({});
        setShowForm(false);
        fetchSales();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEvaluate() {
    if (!evaluatingId || !pendingScore) return;
    setSavingScore(true);
    try {
      const res = await fetch(`${API}/sales/${evaluatingId}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score: pendingScore }),
      });
      if (res.ok) {
        setEvaluatingId(null);
        setPendingScore(0);
        fetchSales();
      }
    } finally {
      setSavingScore(false);
    }
  }

  function openEvaluate(sale: Sale) {
    setEvaluatingId(sale.id);
    setPendingScore(sale.score || 0);
  }

  function renderScore(score: number | null) {
    if (!score) return <span className={styles.noScore}>—</span>;
    return (
      <span className={styles.scoreChip} data-score={score}>
        {"★".repeat(score)}{"☆".repeat(5 - score)}
        <span className={styles.scoreNum}>{score}</span>
      </span>
    );
  }

  const evaluatingSale = sales.find((s) => s.id === evaluatingId);

  return (
    <main className={styles.main}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.brand}>
            <span className={styles.brandDot} />
            <h1 className={styles.brandName}>Sales<span>Tracker</span></h1>
          </div>
          {stats && (
            <div className={styles.statsBar}>
              <div className={styles.stat}>
                <span className={styles.statValue}>{stats.total}</span>
                <span className={styles.statLabel}>Total</span>
              </div>
              <div className={styles.statDivider} />
              <div className={styles.stat}>
                <span className={styles.statValue}>{stats.evaluated}</span>
                <span className={styles.statLabel}>Evaluated</span>
              </div>
              <div className={styles.statDivider} />
              <div className={styles.stat}>
                <span className={styles.statValue}>
                  {stats.avg_score ? stats.avg_score.toFixed(1) : "—"}
                </span>
                <span className={styles.statLabel}>Avg Score</span>
              </div>
            </div>
          )}
          <button className={styles.btnPrimary} onClick={() => setShowForm(true)}>
            + New Sale
          </button>
        </div>
      </header>

      {/* Sales Table */}
      <div className={styles.content}>
        {loading ? (
          <div className={styles.emptyState}>
            <span className={styles.loader} />
            <p>Loading sales...</p>
          </div>
        ) : sales.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyIcon}>◈</p>
            <p>No sales yet. Create your first one.</p>
            <button className={styles.btnPrimary} onClick={() => setShowForm(true)}>
              + New Sale
            </button>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Customer</th>
                  <th>Product</th>
                  <th>Amount</th>
                  <th>Score</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id}>
                    <td className={styles.idCell}>#{sale.id}</td>
                    <td className={styles.nameCell}>{sale.customer}</td>
                    <td>{sale.product}</td>
                    <td className={styles.amountCell}>
                      ${sale.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td>{renderScore(sale.score)}</td>
                    <td className={styles.dateCell}>
                      {new Date(sale.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td>
                      <button
                        className={styles.btnEval}
                        onClick={() => openEvaluate(sale)}
                      >
                        {sale.score ? "Re-evaluate" : "Evaluate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Sale Modal */}
      {showForm && (
        <div className={styles.overlay} onClick={() => setShowForm(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>New Sale</h2>
              <button className={styles.closeBtn} onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate} className={styles.form}>
              <div className={styles.field}>
                <label>Customer</label>
                <input
                  type="text"
                  placeholder="e.g. Acme Corp"
                  value={form.customer}
                  onChange={(e) => setForm({ ...form, customer: e.target.value })}
                  className={errors.customer ? styles.inputError : ""}
                  autoFocus
                />
                {errors.customer && <span className={styles.error}>{errors.customer}</span>}
              </div>
              <div className={styles.field}>
                <label>Product</label>
                <input
                  type="text"
                  placeholder="e.g. Enterprise License"
                  value={form.product}
                  onChange={(e) => setForm({ ...form, product: e.target.value })}
                  className={errors.product ? styles.inputError : ""}
                />
                {errors.product && <span className={styles.error}>{errors.product}</span>}
              </div>
              <div className={styles.field}>
                <label>Amount (USD)</label>
                <input
                  type="number"
                  placeholder="e.g. 4500"
                  min="0.01"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className={errors.amount ? styles.inputError : ""}
                />
                {errors.amount && <span className={styles.error}>{errors.amount}</span>}
              </div>
              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.btnPrimary} disabled={submitting}>
                  {submitting ? "Creating..." : "Create Sale"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Evaluate Modal */}
      {evaluatingId && evaluatingSale && (
        <div className={styles.overlay} onClick={() => setEvaluatingId(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Evaluate Sale</h2>
              <button className={styles.closeBtn} onClick={() => setEvaluatingId(null)}>✕</button>
            </div>
            <div className={styles.evalContent}>
              <div className={styles.salePreview}>
                <div className={styles.previewRow}>
                  <span>Customer</span>
                  <strong>{evaluatingSale.customer}</strong>
                </div>
                <div className={styles.previewRow}>
                  <span>Product</span>
                  <strong>{evaluatingSale.product}</strong>
                </div>
                <div className={styles.previewRow}>
                  <span>Amount</span>
                  <strong>${evaluatingSale.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong>
                </div>
              </div>
              <div className={styles.ratingSection}>
                <label>Select a score</label>
                <StarRating value={pendingScore} onChange={setPendingScore} />
                {pendingScore > 0 && (
                  <p className={styles.scoreLabel}>
                    {["", "Poor", "Fair", "Good", "Great", "Excellent"][pendingScore]}
                  </p>
                )}
              </div>
              <div className={styles.formActions}>
                <button
                  className={styles.btnSecondary}
                  onClick={() => setEvaluatingId(null)}
                >
                  Cancel
                </button>
                <button
                  className={styles.btnPrimary}
                  onClick={handleEvaluate}
                  disabled={!pendingScore || savingScore}
                >
                  {savingScore ? "Saving..." : "Save Score"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

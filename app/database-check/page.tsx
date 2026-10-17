'use client';

import { useState } from 'react';

type CheckResult = {
  ok: boolean;
  error?: string;
  tables?: { name: string; rowCount: number }[];
  categories?: { id: number; name: string }[];
};

export default function DatabaseCheckPage() {
  const [result, setResult] = useState<CheckResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function checkDatabase() {
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch('/api/database-check', { cache: 'no-store' });
      const data: CheckResult = await response.json();
      setResult(response.ok ? data : { ok: false, error: data.error ?? 'Database check failed.' });
    } catch {
      setResult({ ok: false, error: 'Could not reach the database check API. Try again.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main id="main" className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10">
      <h1 className="font-display text-3xl font-bold">Database connection check</h1>
      <p>This reads your five tables through the backend. It does not change any data.</p>
      <button type="button" onClick={checkDatabase} disabled={loading}
        className="min-h-12 self-start rounded-lg bg-brand px-6 font-bold text-white disabled:opacity-60">
        {loading ? 'Checking…' : 'Check database'}
      </button>
      <div role="status" aria-live="polite" aria-busy={loading}>
        {result && (result.ok ? (
          <div className="flex flex-col gap-4">
            <p className="font-bold text-brand-dark">Connected: the frontend successfully read all five database tables.</p>
            <ul className="flex flex-col gap-2">
              {result.tables?.map((table) => <li key={table.name}>{table.name}: {table.rowCount} rows</li>)}
            </ul>
            <p>Categories: {result.categories?.map((category) => category.name).join(', ') || 'None yet.'}</p>
            <p className="text-sm text-muted">Zero rows means the table is readable but empty. The donor and recipient workflows still use demo data.</p>
          </div>
        ) : <p className="text-warn-text">{result.error}</p>)}
      </div>
    </main>
  );
}

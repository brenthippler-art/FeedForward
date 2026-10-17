'use client';

import { useState } from 'react';

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="min-h-11 rounded-[10px] border-[1.5px] border-brand bg-surface px-4 font-bold text-brand"
    >
      <span aria-live="polite">{copied ? 'Copied' : 'Copy to share'}</span>
    </button>
  );
}
'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { scrollToSignIn } from '@/lib/scroll-to-sign-in';

export default function SignInScroller() {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!searchParams.has('signin')) return;

    // Wait one frame so Next finishes its own scroll-to-top first
    const frame = requestAnimationFrame(() => scrollToSignIn());
    return () => cancelAnimationFrame(frame);
  }, [searchParams]);

  return null;
}
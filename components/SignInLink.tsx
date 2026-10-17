'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { MouseEvent, ReactNode } from 'react';
import { scrollToSignIn } from '@/lib/scroll-to-sign-in';

type SignInLinkProps = {
  className?: string;
  children: ReactNode;
};

export default function SignInLink({ className, children }: SignInLinkProps) {
  const pathname = usePathname();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    if (pathname !== '/') return;
    if (scrollToSignIn()) event.preventDefault();
  }

  return (
    <Link href="/?signin=1" onClick={handleClick} className={className}>
      {children}
    </Link>
  );
}
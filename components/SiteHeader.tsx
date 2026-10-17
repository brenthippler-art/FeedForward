'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const roles = [
  { href: '/donor', label: 'Donor' },
  { href: '/recipient', label: 'Recipient' },
  { href: '/dashboard', label: 'Dashboard' },
];

export default function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="bg-brand">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-6 py-3.5">
        <Link href="/" className="font-display text-2xl font-bold text-white">
          FeedForward
        </Link>

        <nav aria-label="Demo role" className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1.5 text-sm text-white/85">Viewing as</span>
          {roles.map((role) => {
            const active = pathname.startsWith(role.href);
            return (
              <Link
                key={role.href}
                href={role.href}
                aria-current={active ? 'page' : undefined}
                className={`inline-flex min-h-11 items-center rounded-[10px] px-4 font-bold ${
                  active ? 'bg-white text-brand' : 'text-white hover:bg-white/10'
                }`}
              >
                {role.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
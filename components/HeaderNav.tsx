'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavLink = { href: string; label: string };

export default function HeaderNav({ links }: { links: NavLink[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="flex flex-wrap items-center gap-1.5">
      {links.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={`inline-flex min-h-11 items-center rounded-[10px] px-4 font-bold ${
              active ? 'bg-white text-brand' : 'text-white hover:bg-white/10'
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
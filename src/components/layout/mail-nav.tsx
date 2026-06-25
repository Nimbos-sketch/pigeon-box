"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links: { href: Route; label: string }[] = [
  { href: "/inbox", label: "Inbox" },
  { href: "/compose", label: "Compose" },
  { href: "/settings", label: "Settings" }
];

export function MailNav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-ableton-border bg-ableton-surface px-4 py-2">
      <div className="mx-auto flex max-w-7xl gap-2">
        {links.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`ableton-chip ${active ? "ableton-chip-active" : ""}`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

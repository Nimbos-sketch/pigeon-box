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
  const onInbox = pathname === "/inbox" || pathname.startsWith("/inbox/");

  return (
    <nav
      className={`mail-app-nav border-b px-4 py-2 ${
        onInbox ? "border-ableton-border/70 bg-ableton-pane2" : "border-ableton-border bg-ableton-surface"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center gap-2">
        <p className="mr-2 hidden text-[10px] uppercase tracking-[0.14em] text-ableton-muted sm:block">App</p>
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

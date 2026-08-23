import { Link } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";

const links = [
  { to: "/", label: "Home" },
  { to: "/books", label: "Books" },
  { to: "/courses", label: "Courses" },
  { to: "/quiz", label: "Quiz" },
  { to: "/chat", label: "Chat" },
] as const;

export function SiteNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center gap-4 px-5 py-3">
        <Link to="/" className="flex items-center gap-2 font-display text-lg text-foreground">
          <BookOpen className="size-5 text-primary" aria-hidden />
          Grace Book
        </Link>
        <ul className="ml-auto flex items-center gap-1 overflow-x-auto text-sm">
          {links.slice(1).map((l) => (
            <li key={l.to}>
              <Link
                to={l.to}
                className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                activeProps={{ className: "bg-accent text-accent-foreground" }}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}

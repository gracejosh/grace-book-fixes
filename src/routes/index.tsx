import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, GraduationCap, ListChecks, MessagesSquare } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { isSupabaseConfigured } from "@/lib/supabase";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Grace Book — Read, Learn, Discuss" },
      {
        name: "description",
        content:
          "Grace Book brings your library, courses, quizzes and live discussion rooms together in one calm reading and learning space.",
      },
      { property: "og:title", content: "Grace Book — Read, Learn, Discuss" },
      {
        property: "og:description",
        content: "Your library, courses, quizzes and live discussion rooms in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const sections = [
  {
    to: "/books",
    label: "Books",
    icon: BookOpen,
    copy: "Your full library with covers, authors and summaries.",
  },
  {
    to: "/courses",
    label: "Courses",
    icon: GraduationCap,
    copy: "Structured study paths with lessons and levels.",
  },
  {
    to: "/quiz",
    label: "Quiz",
    icon: ListChecks,
    copy: "Check what stuck with instant-feedback questions.",
  },
  {
    to: "/chat",
    label: "Chat",
    icon: MessagesSquare,
    copy: "Live discussion rooms that update in real time.",
  },
] as const;

function Home() {
  return (
    <>
      <SiteNav />
      <main>
        <section className="border-b border-border bg-gradient-warm">
          <div className="mx-auto max-w-5xl px-5 py-20 sm:py-28">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Read · Learn · Discuss
            </p>
            <h1 className="mt-4 max-w-2xl font-display text-4xl leading-tight text-foreground sm:text-6xl">
              A quiet place for your books and study.
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground">
              Grace Book keeps your library, courses, quizzes and community conversations in one
              calm space — all backed by your own database.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/books"
                className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Browse the library
              </Link>
              <Link
                to="/courses"
                className="rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-medium text-card-foreground transition-colors hover:bg-accent"
              >
                Start a course
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5 py-14">
          <ul className="grid gap-5 sm:grid-cols-2">
            {sections.map(({ to, label, icon: Icon, copy }) => (
              <li key={to}>
                <Link
                  to={to}
                  className="block h-full rounded-xl border border-border bg-card p-6 shadow-soft transition-shadow hover:shadow-lift"
                >
                  <Icon className="size-6 text-primary" aria-hidden />
                  <h2 className="mt-3 font-display text-xl text-card-foreground">{label}</h2>
                  <p className="mt-1.5 text-sm text-muted-foreground">{copy}</p>
                </Link>
              </li>
            ))}
          </ul>

          {!isSupabaseConfigured ? (
            <p className="mt-10 rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">
              Database credentials aren&apos;t set yet. Add{" "}
              <code className="font-mono text-xs">VITE_SUPABASE_URL</code> and{" "}
              <code className="font-mono text-xs">VITE_SUPABASE_ANON_KEY</code> as environment
              variables in your hosting dashboard, then redeploy.
            </p>
          ) : null}
        </section>
      </main>
    </>
  );
}

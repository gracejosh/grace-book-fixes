import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Clock, GraduationCap, Layers } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { EmptyNote, ErrorNote, Loading, PageShell } from "@/components/StateBlocks";
import { requireSupabase } from "@/lib/supabase";

export const Route = createFileRoute("/courses")({
  head: () => ({
    meta: [
      { title: "Courses — Grace Book" },
      {
        name: "description",
        content:
          "Structured Grace Book courses with lessons, levels and estimated study time for guided learning.",
      },
      { property: "og:title", content: "Courses — Grace Book" },
      {
        property: "og:description",
        content: "Structured courses with lessons, levels and estimated study time.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CoursesPage,
});

type Course = {
  id: string | number;
  title?: string | null;
  description?: string | null;
  level?: string | null;
  duration?: string | null;
  lessons_count?: number | null;
};

function CoursesPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data, error } = await requireSupabase().from("courses").select("*");
      if (error) throw new Error(error.message);
      return (data ?? []) as Course[];
    },
  });

  return (
    <>
      <SiteNav />
      <PageShell title="Courses" intro="Guided study paths pulled live from your courses table.">
        {isLoading ? (
          <Loading label="Loading courses…" />
        ) : error ? (
          <ErrorNote error={error} />
        ) : !data || data.length === 0 ? (
          <EmptyNote>No courses yet. Add rows to the “courses” table to see them here.</EmptyNote>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2">
            {data.map((course) => (
              <li
                key={course.id}
                className="rounded-xl border border-border bg-card p-5 shadow-soft transition-shadow hover:shadow-lift"
              >
                <div className="flex items-center gap-2 text-primary">
                  <GraduationCap className="size-5" aria-hidden />
                  {course.level ? (
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">
                      {course.level}
                    </span>
                  ) : null}
                </div>
                <h2 className="mt-3 font-display text-xl text-card-foreground">
                  {course.title ?? "Untitled course"}
                </h2>
                {course.description ? (
                  <p className="mt-2 text-sm text-muted-foreground">{course.description}</p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
                  {typeof course.lessons_count === "number" ? (
                    <span className="flex items-center gap-1.5">
                      <Layers className="size-3.5" aria-hidden />
                      {course.lessons_count} lessons
                    </span>
                  ) : null}
                  {course.duration ? (
                    <span className="flex items-center gap-1.5">
                      <Clock className="size-3.5" aria-hidden />
                      {course.duration}
                    </span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </PageShell>
    </>
  );
}

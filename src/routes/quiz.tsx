import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { EmptyNote, ErrorNote, Loading, PageShell } from "@/components/StateBlocks";
import { requireSupabase } from "@/lib/supabase";

export const Route = createFileRoute("/quiz")({
  head: () => ({
    meta: [
      { title: "Quiz — Grace Book" },
      {
        name: "description",
        content:
          "Test what you have learned with Grace Book quizzes: multiple-choice questions with instant answers and explanations.",
      },
      { property: "og:title", content: "Quiz — Grace Book" },
      {
        property: "og:description",
        content: "Multiple-choice quizzes with instant answers and explanations.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: QuizPage,
});

type QuizRow = {
  id: string | number;
  question?: string | null;
  options?: unknown;
  answer?: unknown;
  correct_answer?: unknown;
  explanation?: string | null;
};

type Quiz = {
  id: string | number;
  question: string;
  options: string[];
  answerIndex: number | null;
  explanation: string | null;
};

/** JSONB columns arrive as arrays/objects, but can also be JSON strings. */
function parseJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function toOptions(value: unknown): string[] {
  const parsed = parseJson(value);
  if (Array.isArray(parsed)) {
    return parsed.map((o) =>
      typeof o === "string" ? o : typeof o === "object" && o !== null && "text" in o
        ? String((o as { text: unknown }).text)
        : String(o),
    );
  }
  if (parsed && typeof parsed === "object") return Object.values(parsed as object).map(String);
  return [];
}

function toAnswerIndex(row: QuizRow, options: string[]): number | null {
  const raw = parseJson(row.correct_answer ?? row.answer);
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") {
    const asNumber = Number(raw);
    if (!Number.isNaN(asNumber) && raw.trim() !== "") return asNumber;
    const idx = options.findIndex((o) => o.toLowerCase() === raw.trim().toLowerCase());
    return idx >= 0 ? idx : null;
  }
  return null;
}

function QuizPage() {
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["quizzes"],
    queryFn: async () => {
      const { data, error } = await requireSupabase().from("quizzes").select("*");
      if (error) throw new Error(error.message);
      return ((data ?? []) as QuizRow[]).map((row): Quiz => {
        const options = toOptions(row.options);
        return {
          id: row.id,
          question: row.question ?? "Untitled question",
          options,
          answerIndex: toAnswerIndex(row, options),
          explanation: row.explanation ?? null,
        };
      });
    },
  });

  return (
    <>
      <SiteNav />
      <PageShell title="Quiz" intro="Pick an answer to check yourself — feedback is instant.">
        {isLoading ? (
          <Loading label="Loading questions…" />
        ) : error ? (
          <ErrorNote
            error={error}
            title="Couldn't load quiz questions"
            onRetry={() => void refetch()}
            retrying={isFetching}
          />
        ) : !data || data.length === 0 ? (
          <EmptyNote>No questions yet. Add rows to the “quizzes” table to see them here.</EmptyNote>
        ) : (
          <ol className="space-y-6">
            {data.map((quiz, qi) => {
              const key = String(quiz.id);
              const picked = answers[key];
              return (
                <li key={key} className="rounded-xl border border-border bg-card p-5 shadow-soft">
                  <h2 className="font-display text-lg text-card-foreground">
                    {qi + 1}. {quiz.question}
                  </h2>
                  <div className="mt-4 grid gap-2">
                    {quiz.options.map((option, oi) => {
                      const isPicked = picked === oi;
                      const isCorrect = quiz.answerIndex === oi;
                      const revealed = picked !== undefined;
                      return (
                        <button
                          key={oi}
                          type="button"
                          onClick={() => setAnswers((a) => ({ ...a, [key]: oi }))}
                          className={[
                            "flex items-center justify-between rounded-lg border px-4 py-2.5 text-left text-sm transition-colors",
                            revealed && isCorrect
                              ? "border-primary bg-primary/10 text-foreground"
                              : revealed && isPicked
                                ? "border-destructive bg-destructive/10 text-foreground"
                                : "border-border bg-background text-foreground hover:bg-accent",
                          ].join(" ")}
                        >
                          <span>{option}</span>
                          {revealed && isCorrect ? (
                            <CheckCircle2 className="size-4 text-primary" aria-hidden />
                          ) : revealed && isPicked ? (
                            <XCircle className="size-4 text-destructive" aria-hidden />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                  {picked !== undefined && quiz.explanation ? (
                    <p className="mt-3 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                      {quiz.explanation}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}
      </PageShell>
    </>
  );
}

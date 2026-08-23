import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteNav } from "@/components/SiteNav";
import { EmptyNote, ErrorNote, Loading, PageShell } from "@/components/StateBlocks";
import { requireSupabase } from "@/lib/supabase";

export const Route = createFileRoute("/books")({
  head: () => ({
    meta: [
      { title: "Books Library — Grace Book" },
      {
        name: "description",
        content:
          "Browse the Grace Book library of study books, devotionals and reading material with covers, authors and summaries.",
      },
      { property: "og:title", content: "Books Library — Grace Book" },
      {
        property: "og:description",
        content: "Browse study books, devotionals and reading material in the Grace Book library.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BooksPage,
});

type Book = {
  id: string | number;
  title?: string | null;
  author?: string | null;
  description?: string | null;
  cover_url?: string | null;
  category?: string | null;
};

function BooksPage() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["books"],
    queryFn: async () => {
      const { data, error } = await requireSupabase().from("books").select("*");
      if (error) throw new Error(error.message);
      return (data ?? []) as Book[];
    },
  });

  return (
    <>
      <SiteNav />
      <PageShell title="Books" intro="Every title in the library, straight from your database.">
        {isLoading ? (
          <Loading label="Loading books…" />
        ) : error ? (
          <ErrorNote
            error={error}
            title="Couldn't load books"
            onRetry={() => void refetch()}
            retrying={isFetching}
          />
        ) : !data || data.length === 0 ? (
          <EmptyNote>No books yet. Add rows to the “books” table to see them here.</EmptyNote>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((book) => (
              <li
                key={book.id}
                className="group overflow-hidden rounded-xl border border-border bg-card shadow-soft transition-shadow hover:shadow-lift"
              >
                <div className="aspect-[3/4] w-full overflow-hidden bg-muted">
                  {book.cover_url ? (
                    <img
                      src={book.cover_url}
                      alt={`Cover of ${book.title ?? "book"}`}
                      loading="lazy"
                      className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center font-display text-2xl text-muted-foreground">
                      {(book.title ?? "?").slice(0, 1)}
                    </div>
                  )}
                </div>
                <div className="space-y-1.5 p-4">
                  {book.category ? (
                    <span className="inline-block rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">
                      {book.category}
                    </span>
                  ) : null}
                  <h2 className="font-display text-lg leading-tight text-card-foreground">
                    {book.title ?? "Untitled"}
                  </h2>
                  {book.author ? (
                    <p className="text-sm text-muted-foreground">{book.author}</p>
                  ) : null}
                  {book.description ? (
                    <p className="line-clamp-3 pt-1 text-sm text-muted-foreground">
                      {book.description}
                    </p>
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

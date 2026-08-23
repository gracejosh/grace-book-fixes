import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { MessagesSquare, Radio } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import {
  EmptyNote,
  ErrorNote,
  Loading,
  PageShell,
  WarningNote,
} from "@/components/StateBlocks";
import { getSupabase, requireSupabase } from "@/lib/supabase";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Chat Rooms — Grace Book" },
      {
        name: "description",
        content:
          "Live Grace Book discussion rooms that update in real time as new rooms are opened by the community.",
      },
      { property: "og:title", content: "Chat Rooms — Grace Book" },
      {
        property: "og:description",
        content: "Live discussion rooms that update in real time.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChatPage,
});

type ChatRoom = {
  id: string | number;
  name?: string | null;
  description?: string | null;
  topic?: string | null;
  created_at?: string | null;
};

type RealtimeState = "connecting" | "live" | "error";

function ChatPage() {
  const queryClient = useQueryClient();
  const [realtime, setRealtime] = useState<RealtimeState>("connecting");
  const [realtimeMessage, setRealtimeMessage] = useState<string | null>(null);
  const [reconnectKey, setReconnectKey] = useState(0);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["chat_rooms"],
    queryFn: async () => {
      const { data, error } = await requireSupabase().from("chat_rooms").select("*");
      if (error) throw new Error(error.message);
      return (data ?? []) as ChatRoom[];
    },
  });

  // Realtime: refetch the room list whenever chat_rooms changes.
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setRealtime("error");
      setRealtimeMessage(
        "Database credentials are not configured, so live updates are unavailable.",
      );
      return;
    }

    setRealtime("connecting");
    setRealtimeMessage(null);

    const channel = supabase
      .channel("public:chat_rooms")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_rooms" }, () => {
        queryClient.invalidateQueries({ queryKey: ["chat_rooms"] });
      })
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          setRealtime("live");
          setRealtimeMessage(null);
          return;
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setRealtime("error");
          setRealtimeMessage(
            err?.message ??
              (status === "TIMED_OUT"
                ? "The live connection timed out."
                : "The live connection was interrupted."),
          );
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, reconnectKey]);

  return (
    <>
      <SiteNav />
      <PageShell title="Chat rooms" intro="Open conversations, kept in sync in real time.">
        {realtime === "error" ? (
          <WarningNote
            title="Live updates are offline"
            message={`${realtimeMessage ?? "The live connection failed."} Rooms shown may be out of date.`}
            onRetry={() => {
              setReconnectKey((k) => k + 1);
              void refetch();
            }}
          />
        ) : (
          <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">
            <Radio className="size-3.5 text-primary" aria-hidden />
            {realtime === "live" ? "Live updates enabled" : "Connecting live updates…"}
          </p>
        )}
        {isLoading ? (
          <Loading label="Loading rooms…" />
        ) : error ? (
          <ErrorNote
            error={error}
            title="Couldn't load chat rooms"
            onRetry={() => void refetch()}
            retrying={isFetching}
          />
        ) : !data || data.length === 0 ? (
          <EmptyNote>No rooms yet. Add rows to the “chat_rooms” table to see them here.</EmptyNote>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {data.map((room) => (
              <li
                key={room.id}
                className="flex gap-3 rounded-xl border border-border bg-card p-5 shadow-soft transition-shadow hover:shadow-lift"
              >
                <MessagesSquare className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                <div>
                  <h2 className="font-display text-lg text-card-foreground">
                    {room.name ?? "Untitled room"}
                  </h2>
                  {room.topic ? (
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {room.topic}
                    </p>
                  ) : null}
                  {room.description ? (
                    <p className="mt-1.5 text-sm text-muted-foreground">{room.description}</p>
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

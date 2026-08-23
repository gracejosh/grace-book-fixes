import { AlertTriangle, Loader2, RefreshCw, WifiOff } from "lucide-react";
import type { ReactNode } from "react";

export function PageShell({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-10">
      <h1 className="font-display text-3xl text-foreground sm:text-4xl">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{intro}</p>
      <div className="mt-8">{children}</div>
    </main>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <p className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" aria-hidden />
      {label}
    </p>
  );
}

export function ErrorNote({
  error,
  title = "Couldn't load this data",
  onRetry,
  retrying,
}: {
  error: unknown;
  title?: string;
  onRetry?: () => void;
  retrying?: boolean;
}) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string" && error.trim()
        ? error
        : "Something went wrong.";
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-foreground"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
      <div className="min-w-0">
        <p className="font-medium">{title}</p>
        <p className="mt-1 break-words text-muted-foreground">{message}</p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            disabled={retrying}
            className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-60"
          >
            <RefreshCw className={`size-3.5 ${retrying ? "animate-spin" : ""}`} aria-hidden />
            {retrying ? "Retrying…" : "Try again"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function WarningNote({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="status"
      className="mb-5 flex items-start gap-3 rounded-lg border border-border bg-muted p-3 text-sm text-foreground"
    >
      <WifiOff className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0">
        <p className="font-medium">{title}</p>
        <p className="mt-0.5 text-muted-foreground">{message}</p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
          >
            <RefreshCw className="size-3.5" aria-hidden />
            Reconnect
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

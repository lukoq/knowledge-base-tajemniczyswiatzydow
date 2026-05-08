import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Play, Clock, Sun, Moon, Loader2 } from "lucide-react";
import { fetchQuestions, groupByVideo } from "@/data/questions";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Zapytaj Żyda — Q&A Knowledge Base" },
      {
        name: "description",
        content:
          "Searchable knowledge base of Q&A from YouTube live sessions. Click any question to jump to its exact moment.",
      },
    ],
  }),
});

function Index() {
  const { theme, toggle } = useTheme();
  const [query, setQuery] = useState("");

  const { data: questions, isLoading } = useQuery({
    queryKey: ["questions", query],
    queryFn: () => fetchQuestions(query || undefined),
  });

  const groups = useMemo(() => {
    if (!questions) return [];
    return groupByVideo(questions);
  }, [questions]);

  const totalMatches = questions?.length ?? 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="grid place-items-center w-9 h-9 rounded-lg bg-primary/15 text-primary">
                <Play className="w-4 h-4 fill-current" />
              </div>
              <div>
                <h1 className="text-base font-semibold leading-tight">Q&A Knowledge Base</h1>
                <p className="text-xs text-muted-foreground">
                  {questions?.length ?? 0} questions · {groups.length} videos
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground tabular-nums hidden sm:block">
                {isLoading
                  ? "Loading…"
                  : query
                    ? `${totalMatches} match${totalMatches === 1 ? "" : "es"}`
                    : ""}
              </span>
              <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search questions across all videos…"
              className="w-full h-11 pl-10 pr-10 rounded-xl bg-card border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-accent"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 space-y-10">
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading questions…</span>
          </div>
        )}

        {!isLoading && groups.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            No questions match "<span className="text-foreground">{query}</span>"
          </div>
        )}

        {groups.map((group) => (
          <section key={group.video_id} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
              <a
                href={`https://www.youtube.com/watch?v=${group.video_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="relative block flex-shrink-0 w-full sm:w-64 aspect-video overflow-hidden rounded-xl border border-border group"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <img
                  src={`https://i.ytimg.com/vi/${group.video_id}/mqdefault.jpg`}
                  alt={group.video_title}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition" />
                <div className="absolute inset-0 grid place-items-center opacity-0 group-hover:opacity-100 transition">
                  <div className="w-12 h-12 rounded-full bg-primary/90 grid place-items-center">
                    <Play className="w-5 h-5 fill-current text-primary-foreground" />
                  </div>
                </div>
              </a>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl sm:text-2xl font-semibold leading-tight">
                  {group.video_title}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {group.questions.length} question{group.questions.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>

            <ul className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
              {group.questions.map((q, i) => (
                <li key={`${group.video_id}-${i}`}>
                  <a
                    href={`https://www.youtube.com/watch?v=${q.video_id}&t=${q.seconds}s`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 px-4 py-3 hover:bg-accent/60 transition group"
                  >
                    <span className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground text-xs font-mono tabular-nums shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition">
                      <Clock className="w-3 h-3" />
                      {q.timestamp}
                    </span>
                    <span className="text-sm leading-relaxed flex-1">{q.question}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <footer className="pt-8 pb-4 text-center text-xs text-muted-foreground">
          Click any question to open the video at the exact moment.
        </footer>
      </main>
    </div>
  );
}

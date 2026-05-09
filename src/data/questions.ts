import { supabase } from "@/lib/supabase";

export type QA = {
  video_id: string;
  video_title: string;
  question: string;
  timestamp: string;
  seconds: number;
};

export type VideoGroup = {
  video_id: string;
  video_title: string;
  questions: QA[];
};

export function groupByVideo(items: QA[]): VideoGroup[] {
  const map = new Map<string, VideoGroup>();
  for (const q of items) {
    if (!map.has(q.video_id)) {
      map.set(q.video_id, { video_id: q.video_id, video_title: q.video_title, questions: [] });
    }
    map.get(q.video_id)!.questions.push(q);
  }
  for (const g of map.values()) g.questions.sort((a, b) => a.seconds - b.seconds);
  return [...map.values()];
}

export async function fetchQuestions(
  query?: string,
  range?: { from: number; to: number }
): Promise<QA[]> {
  let builder = supabase.from("questions").select("*");

  if (query) {
    const term = `%${query}%`;
    builder = builder.ilike("question", term);
  }

  if (range) {
    builder = builder.range(range.from, range.to);
  }

  const { data, error } = await builder
    .order("video_title", { ascending: true })
    .order("seconds", { ascending: true });

    if (error) {
    console.error("Błąd Supabase:", error.message);
  }
  console.log("Pobrane dane z bazy:", data);

  if (error) throw error;
  return data ?? [];
}

export async function fetchMatchingCounts(
  query?: string
): Promise<{ questionCount: number; videoCount: number }> {
  let countBuilder = supabase.from("questions").select("*", { count: "exact", head: true });

  if (query) {
    const term = `%${query}%`;
    countBuilder = countBuilder.ilike("question", term);
  }

  const { count: questionCount, error: countError } = await countBuilder;
  if (countError) throw countError;

  const { data: videoCount, error: videoError } = await supabase.rpc("count_unique_videos", {
    search_term: query || null,
  });

  if (videoError) throw videoError;

  return { questionCount: questionCount ?? 0, videoCount: videoCount ?? 0 };
}

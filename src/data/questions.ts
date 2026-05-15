import { supabase } from "@/lib/supabase";

export type QA = {
  video_id: string;
  video_title: string;
  full_video_title: string;
  video_date: string;
  question: string;
  timestamp: string;
  seconds: number;
};

export type VideoGroup = {
  video_id: string;
  video_title: string;
  full_video_title: string;
  video_date: string;
  questions: QA[];
};

export function groupByVideo(items: QA[]): VideoGroup[] {
  const map = new Map<string, VideoGroup>();
  for (const q of items) {
    if (!map.has(q.video_id)) {
      map.set(q.video_id, {
        video_id: q.video_id,
        video_title: q.video_title,
        full_video_title: q.full_video_title,
        video_date: q.video_date,
        questions: [],
      });
    }
    map.get(q.video_id)!.questions.push(q);
  }
  for (const g of map.values()) g.questions.sort((a, b) => a.seconds - b.seconds);
  return [...map.values()];
}

export async function fetchQuestions(
  query?: string,
  range?: { from: number; to: number },
  year?: string 
): Promise<QA[]> {
  
  let builder;

  if (!query) {
    builder = supabase.from("questions_with_videos").select("*");
    
    if (year && year !== "all") {
      builder = builder.like("video_date", `${year}%`);
    }

    builder = builder
      .order("video_date", { ascending: false })
      .order("seconds", { ascending: true });
      
  } else {
    builder = supabase.rpc("search_questions_full", { query_text: query });
  }

  if (range) {
    builder = builder.range(range.from, range.to);
  }

  const { data, error } = await builder;

  if (error) {
    console.error("Błąd pobierania pytań:", error.message);
    return [];
  }

  return (data as QA[]) ?? [];
}

export async function fetchMatchingCounts(
  query?: string,
  year?: string 
): Promise<{ questionCount: number; videoCount: number }> {
  let questionCount = 0;

  if (query) {
    const { data, error } = await supabase.rpc("search_questions_final", { query_text: query });
    if (error) throw error;
    questionCount = data?.length ?? 0;
  } else {
    let builder = supabase.from("questions_with_videos").select("*", { count: "exact", head: true });
    if (year && year !== "all") {
      builder = builder.like("video_date", `${year}%`);
    }
    const { count, error } = await builder;
    if (error) throw error;
    questionCount = count ?? 0;
  }

  const { data: videoCount, error: videoError } = await supabase.rpc("count_unique_videos", {
    search_term: query || null,
    p_year: (year && year !== "all" && !query) ? year : null
  });

  if (videoError) throw videoError;

  return { questionCount, videoCount: videoCount ?? 0 };
}
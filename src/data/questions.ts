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
): Promise<QA[]> {
  if (!query) {
    let builder = supabase.from("questions_with_videos").select("*");
    
    if (range) {
      builder = builder.range(range.from, range.to);
    }
    
    builder = builder
      .order("video_date", { ascending: false })
      .order("seconds", { ascending: true });
      
    const { data, error } = await builder;
    if (error) {
      console.error("Błąd pobierania bazy:", error.message);
      throw error;
    }
    return (data as QA[]) ?? [];
  }
  
  const { data: rpcData, error: rpcError } = await supabase.rpc("search_questions_final", { query_text: query });
  
  if (rpcError) {
    console.error("Błąd inteligentnego wyszukiwania RPC:", rpcError);
    return [];
  }

  if (!rpcData || rpcData.length === 0) {
    console.log("Brak pasujących pytań.");
    return [];
  }
  const questionTexts = rpcData.map(q => q.question);

  const { data: fullData, error: fullError } = await supabase
    .from("questions_with_videos")
    .select("*")
    .in("question", questionTexts);

  if (fullError) {
    console.error("Błąd pobierania widoku z filmami:", fullError);
    return [];
  }

  if (!fullData || fullData.length === 0) {
    return [];
  }

  const sortedData = fullData.sort((a, b) => {
    const indexA = questionTexts.indexOf(a.question);
    const indexB = questionTexts.indexOf(b.question);
    return indexA - indexB;
  });

  if (range) {
    return (sortedData.slice(range.from, range.to + 1) as QA[]);
  }

  return sortedData as QA[];
}

export async function fetchMatchingCounts(
  query?: string,
): Promise<{ questionCount: number; videoCount: number }> {
  let questionCount: number;

  if (query) {
    const { data, error } = await supabase.rpc("search_questions_final", { query_text: query });
    if (error) throw error;
    questionCount = data?.length ?? 0;
  } else {
    const { count, error } = await supabase
      .from("questions")
      .select("*", { count: "exact", head: true });
    if (error) throw error;
    questionCount = count ?? 0;
  }

  const { data: videoCount, error: videoError } = await supabase.rpc("count_unique_videos", {
    search_term: query || null,
  });

  if (videoError) throw videoError;

  return { questionCount, videoCount: videoCount ?? 0 };
}

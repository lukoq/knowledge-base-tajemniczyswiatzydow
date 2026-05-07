import csvRaw from "./questions.csv?raw";

export type QA = {
  video_id: string;
  video_title: string;
  question: string;
  timestamp: string;
  seconds: number;
};

function parseCSV(text: string): QA[] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { cur.push(field); field = ""; }
      else if (c === "\n") { cur.push(field); rows.push(cur); cur = []; field = ""; }
      else if (c === "\r") { /* skip */ }
      else field += c;
    }
  }
  if (field.length || cur.length) { cur.push(field); rows.push(cur); }
  const [header, ...data] = rows.filter(r => r.length > 1);
  const idx = (k: string) => header.indexOf(k);
  return data.map(r => ({
    video_id: r[idx("video_id")],
    video_title: r[idx("video_title")],
    question: r[idx("question")],
    timestamp: r[idx("timestamp")],
    seconds: Number(r[idx("seconds")]),
  }));
}

export const questions: QA[] = parseCSV(csvRaw);

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

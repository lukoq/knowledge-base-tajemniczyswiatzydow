/*
=========================================================================
    EXTENSIONS 
=========================================================================
*/

CREATE EXTENSION IF NOT EXISTS pg_trgm;

/*
=========================================================================
    TABLES 
=========================================================================
*/

CREATE TABLE public.videos (
    video_id text PRIMARY KEY,
    video_title text,
    video_date text
);


CREATE TABLE public.questions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id text CONSTRAINT fk_video REFERENCES public.videos(video_id) ON DELETE CASCADE,
    video_title text, 
    question text,
    timestamp text,
    seconds int8,
    search_tags text
);

/*
=========================================================================
    INDEXES 
=========================================================================
*/

CREATE INDEX IF NOT EXISTS idx_questions_fts ON public.questions USING gin (to_tsvector('simple', question));

CREATE INDEX IF NOT EXISTS idx_questions_trgm ON public.questions USING gin (question gin_trgm_ops);

/*
=========================================================================
    VIEWS 
=========================================================================
*/

CREATE OR REPLACE VIEW public.questions_with_videos 
WITH (security_invoker = true) AS
SELECT
    q.id,
    q.video_id,
    v.video_title,
    q.question,
    q.timestamp,
    q.seconds,
    v.video_date,
    v.video_title AS full_video_title
FROM public.questions q
JOIN public.videos v ON q.video_id = v.video_id;

/*
=========================================================================
    FUNCTIONS 
=========================================================================
*/

CREATE OR REPLACE FUNCTION public.search_questions_final(query_text text)
RETURNS TABLE(
    id uuid,
    question text,
    search_tags text,
    wynik_trafnosci real
)
LANGUAGE plpgsql
AS $$
DECLARE
  zapytanie_or tsquery := nullif(replace(plainto_tsquery('simple', query_text)::text, '&', '|'), '')::tsquery;
  minimalna_trafnosc constant real := 0.20; 
BEGIN
  IF NULLIF(trim(query_text), '') IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH obliczone_wyniki AS (
    SELECT 
      q.id, 
      q.question, 
      q.search_tags,
      (
        (COALESCE(ts_rank(setweight(to_tsvector('simple', q.question), 'A'), zapytanie_or), 0) * 3.0) +
        (COALESCE(ts_rank(setweight(to_tsvector('simple', COALESCE(q.search_tags, '')), 'C'), zapytanie_or), 0) * 1.0) +
        (similarity(q.question, query_text) * 2.0)
      )::real AS wynik_trafnosci
    FROM 
      public.questions q
    WHERE 
      (zapytanie_or IS NOT NULL AND to_tsvector('simple', q.question) @@ zapytanie_or) OR
      (zapytanie_or IS NOT NULL AND to_tsvector('simple', COALESCE(q.search_tags, '')) @@ zapytanie_or) OR
      (similarity(q.question, query_text) > 0.05)
  )
  SELECT 
    ow.id,
    ow.question,
    ow.search_tags,
    ow.wynik_trafnosci
  FROM 
    obliczone_wyniki ow
  WHERE 
    ow.wynik_trafnosci >= minimalna_trafnosc 
  ORDER BY 
    ow.wynik_trafnosci DESC 
  LIMIT 50;
END;
$$;

CREATE OR REPLACE FUNCTION public.search_questions_full(query_text text)
RETURNS SETOF public.questions_with_videos
LANGUAGE plpgsql
AS $$
DECLARE
  zapytanie_or tsquery := nullif(replace(plainto_tsquery('simple', query_text)::text, '&', '|'), '')::tsquery;
  minimalna_trafnosc constant real := 0.20; 
BEGIN
  IF NULLIF(trim(query_text), '') IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH obliczone_wyniki AS (
    SELECT 
      q.id,
      (
        (COALESCE(ts_rank(setweight(to_tsvector('simple', q.question), 'A'), zapytanie_or), 0) * 3.0) +
        (COALESCE(ts_rank(setweight(to_tsvector('simple', COALESCE(q.search_tags, '')), 'C'), zapytanie_or), 0) * 1.0) +
        (similarity(q.question, query_text) * 2.0)
      )::real AS wynik_trafnosci
    FROM public.questions q
    WHERE 
      (zapytanie_or IS NOT NULL AND to_tsvector('simple', q.question) @@ zapytanie_or) OR
      (zapytanie_or IS NOT NULL AND to_tsvector('simple', COALESCE(q.search_tags, '')) @@ zapytanie_or) OR
      (similarity(q.question, query_text) > 0.05)
  )
  SELECT qwv.*
  FROM obliczone_wyniki ow
  JOIN public.questions_with_videos qwv ON qwv.id = ow.id
  WHERE ow.wynik_trafnosci >= minimalna_trafnosc
  ORDER BY ow.wynik_trafnosci DESC
  LIMIT 50;
END;
$$;

CREATE OR REPLACE FUNCTION public.count_unique_videos(search_term text, p_year text DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_count integer;
END;
$$;
# YouTube Channel Q&A Search Engine 

A full-stack web application designed to index and search through live Q&A session questions on the YouTube channel [Tajemniczy Świat Żydów](https://www.youtube.com/channel/UCUKwtw7EFTyl5VSks1gmF7A). 
Users can instantly find specific answers based on their query and jump directly to the exact part of a YouTube video. The app serves as a knowledge base on Judaism and related topics.

Live demo hosted via Cloudflare Workers & Pages [Click here](https://knowledge-base-tajemniczyswiatzydow.qa-app.workers.dev/)

## Tech Stack

**Frontend:** React, TypeScript, Tailwind CSS, Vite (Project template created via Lovable)\
**Backend/Database:** Supabase PostgreSQL\
**Search Engine:** Mixed search approach combining full-text search (`tsvector`, `tsquery`, `ts_rank`) & fuzzy text similarity (`pg_trgm`, `similarity`) & and search tags (generated via local LLM `qwen2.5:7b-instruct` ). \
**Hosting & Deployment:** Cloudflare Workers & Pages

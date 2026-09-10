-- Samples belong to each saved pairing, so the panel and downloaded guide agree.
alter table public.gym_font_pairings
  add column if not exists sample_heading text,
  add column if not exists sample_body text,
  add column if not exists sample_source text;

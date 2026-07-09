-- Run this in Supabase SQL Editor to fix the handle_new_user trigger.
-- This makes signup correctly assign the provisional rating based on skill level,
-- even when email confirmation is enabled (when auth.uid() is null post-signup).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  skill TEXT;
  init_rating INTEGER;
  init_rd     INTEGER;
BEGIN
  skill := COALESCE(NEW.raw_user_meta_data->>'skill_level', 'beginner');

  CASE skill
    WHEN 'beginner'     THEN init_rating := 800;  init_rd := 350;
    WHEN 'intermediate' THEN init_rating := 1100; init_rd := 300;
    WHEN 'tournament'   THEN init_rating := 1400; init_rd := 250;
    WHEN 'expert'       THEN init_rating := 1800; init_rd := 200;
    WHEN 'titled'       THEN init_rating := 2200; init_rd := 150;
    ELSE                     init_rating := 1500; init_rd := 350;
  END CASE;

  INSERT INTO public.users (id, name, email, city, phone, chess_com_username, fide_id, skill_level)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'New Player'),
    NEW.email,
    NEW.raw_user_meta_data->>'city',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'chess_com_username',
    NEW.raw_user_meta_data->>'fide_id',
    skill
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.ratings (user_id, rating, rd, volatility, games_played)
  VALUES (NEW.id, init_rating, init_rd, 0.060000, 0)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

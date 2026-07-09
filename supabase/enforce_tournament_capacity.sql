CREATE OR REPLACE FUNCTION check_tournament_capacity()
RETURNS TRIGGER AS $$
DECLARE
  max_p   INTEGER;
  current INTEGER;
BEGIN
  IF NEW.payment_status != 'paid' THEN
    RETURN NEW;
  END IF;

  SELECT max_players INTO max_p FROM tournaments WHERE id = NEW.tournament_id;

  IF max_p IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO current
  FROM tournament_registrations
  WHERE tournament_id = NEW.tournament_id
    AND payment_status = 'paid'
    AND user_id != NEW.user_id;

  IF current >= max_p THEN
    RAISE EXCEPTION 'Tournament is full (% / % spots taken)', current, max_p;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER enforce_tournament_capacity
BEFORE INSERT OR UPDATE ON tournament_registrations
FOR EACH ROW EXECUTE FUNCTION check_tournament_capacity();

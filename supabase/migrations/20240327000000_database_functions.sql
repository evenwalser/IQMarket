-- Database functions for IQ Marketplace
-- These functions handle statistics updates and counters

-- Function to update a professional's average rating and review count
CREATE OR REPLACE FUNCTION update_professional_ratings(p_id UUID) 
RETURNS VOID AS $$
DECLARE
  avg NUMERIC(3,2);
  cnt INTEGER;
BEGIN
  -- Get the average rating
  SELECT AVG(rating)::NUMERIC(3,2), COUNT(*)
  INTO avg, cnt
  FROM professional_reviews
  WHERE professional_id = p_id;
  
  -- Update the professional record
  UPDATE professionals
  SET 
    avg_rating = avg,
    review_count = cnt
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update an agent's average rating and review count
CREATE OR REPLACE FUNCTION update_agent_ratings(a_id UUID) 
RETURNS VOID AS $$
DECLARE
  avg NUMERIC(3,2);
  cnt INTEGER;
BEGIN
  -- Get the average rating
  SELECT AVG(rating)::NUMERIC(3,2), COUNT(*)
  INTO avg, cnt
  FROM agent_reviews
  WHERE agent_id = a_id;
  
  -- Update the agent record
  UPDATE rag_agents
  SET 
    avg_rating = avg,
    review_count = cnt
  WHERE id = a_id;
END;
$$ LANGUAGE plpgsql;

-- Function to increment a professional's booking count
CREATE OR REPLACE FUNCTION increment_professional_booking_count(p_id UUID) 
RETURNS VOID AS $$
BEGIN
  UPDATE professionals
  SET booking_count = COALESCE(booking_count, 0) + 1
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;

-- Function to increment an agent's purchase count
CREATE OR REPLACE FUNCTION increment_agent_purchase_count(a_id UUID) 
RETURNS VOID AS $$
BEGIN
  UPDATE rag_agents
  SET purchase_count = COALESCE(purchase_count, 0) + 1
  WHERE id = a_id;
END;
$$ LANGUAGE plpgsql;

-- Function to check for booking conflicts
CREATE OR REPLACE FUNCTION check_booking_conflict(
  p_id UUID, 
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE
) RETURNS BOOLEAN AS $$
DECLARE
  conflict_count INTEGER;
BEGIN
  -- Check for existing bookings that overlap
  SELECT COUNT(*)
  INTO conflict_count
  FROM bookings
  WHERE 
    professional_id = p_id AND
    status NOT IN ('cancelled') AND
    (
      (start_time <= $2 AND end_time > $2) OR
      (start_time < $3 AND end_time >= $3) OR
      (start_time >= $2 AND end_time <= $3)
    );
    
  -- Check for blocked times that overlap
  SELECT COUNT(*) + conflict_count
  INTO conflict_count
  FROM blocked_slots
  WHERE 
    professional_id = p_id AND
    (
      (start_time <= $2 AND end_time > $2) OR
      (start_time < $3 AND end_time >= $3) OR
      (start_time >= $2 AND end_time <= $3)
    );
    
  RETURN conflict_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to verify booking integrity
CREATE OR REPLACE FUNCTION verify_booking() RETURNS TRIGGER AS $$
BEGIN
  -- Check if the booking conflicts with existing bookings or blocked slots
  IF check_booking_conflict(NEW.professional_id, NEW.start_time, NEW.end_time) THEN
    RAISE EXCEPTION 'Booking conflicts with existing bookings or blocked times';
  END IF;
  
  -- Ensure end time is after start time
  IF NEW.end_time <= NEW.start_time THEN
    RAISE EXCEPTION 'End time must be after start time';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger for bookings
CREATE TRIGGER booking_verification
BEFORE INSERT OR UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION verify_booking();

-- Trigger function to ensure availability slot integrity
CREATE OR REPLACE FUNCTION verify_availability_slot() RETURNS TRIGGER AS $$
BEGIN
  -- Ensure end time is after start time
  IF NEW.end_time <= NEW.start_time THEN
    RAISE EXCEPTION 'End time must be after start time';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger for availability slots
CREATE TRIGGER availability_slot_verification
BEFORE INSERT OR UPDATE ON availability_slots
FOR EACH ROW
EXECUTE FUNCTION verify_availability_slot();

-- Function to generate available time slots for a professional
CREATE OR REPLACE FUNCTION get_available_slots(
  p_id UUID,
  start_date DATE,
  end_date DATE
) 
RETURNS TABLE (
  slot_date DATE,
  slot_start TIME,
  slot_end TIME,
  is_available BOOLEAN
) AS $$
DECLARE
  current_date DATE;
  dow INTEGER;
BEGIN
  -- Iterate through each date in the range
  current_date := start_date;
  WHILE current_date <= end_date LOOP
    dow := EXTRACT(DOW FROM current_date);
    
    -- Return recurring slots for this day of week
    RETURN QUERY
    SELECT 
      current_date AS slot_date,
      a.start_time AS slot_start,
      a.end_time AS slot_end,
      NOT EXISTS (
        SELECT 1 FROM bookings b
        WHERE 
          b.professional_id = p_id AND
          b.status NOT IN ('cancelled') AND
          DATE(b.start_time) = current_date AND
          (
            (TIME(b.start_time) <= a.start_time AND TIME(b.end_time) > a.start_time) OR
            (TIME(b.start_time) < a.end_time AND TIME(b.end_time) >= a.end_time) OR
            (TIME(b.start_time) >= a.start_time AND TIME(b.end_time) <= a.end_time)
          )
      ) AND NOT EXISTS (
        SELECT 1 FROM blocked_slots bs
        WHERE 
          bs.professional_id = p_id AND
          DATE(bs.start_time) = current_date AND
          (
            (TIME(bs.start_time) <= a.start_time AND TIME(bs.end_time) > a.start_time) OR
            (TIME(bs.start_time) < a.end_time AND TIME(bs.end_time) >= a.end_time) OR
            (TIME(bs.start_time) >= a.start_time AND TIME(bs.end_time) <= a.end_time)
          )
      ) AS is_available
    FROM availability_slots a
    WHERE 
      a.professional_id = p_id AND
      ((a.is_recurring AND a.day_of_week = dow) OR
       (NOT a.is_recurring AND a.specific_date = current_date));
    
    -- Move to the next day
    current_date := current_date + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql; 
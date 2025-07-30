/*
  # Fix update_auction_status function

  1. Changes
    - Drop function with explicit parameter list
    - Recreate function with proper column qualification
    - Fix ambiguous column references
*/

-- Drop the existing function with explicit parameter specification
DROP FUNCTION IF EXISTS public.update_auction_status(uuid);

-- Recreate the function with proper column qualification
CREATE OR REPLACE FUNCTION public.update_auction_status(input_auction_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update auction status to 'completed' if end_time has passed
  UPDATE public.auctions a
  SET status = 'completed'
  WHERE a.id = input_auction_id
    AND a.status = 'active'
    AND a.end_time <= NOW();

  -- If the auction is completed, ensure winner is determined
  IF EXISTS (
    SELECT 1
    FROM public.auctions a
    WHERE a.id = input_auction_id
    AND a.status = 'completed'
    AND a.winner_id IS NULL
  ) THEN
    -- Find the lowest unique bid
    WITH valid_bids AS (
      SELECT ab.*
      FROM public.auction_bids ab
      WHERE ab.auction_id = input_auction_id
      AND ab.amount > 0
    ),
    unique_bids AS (
      SELECT *
      FROM valid_bids
      GROUP BY id, amount
      HAVING COUNT(*) OVER (PARTITION BY amount) = 1
    )
    UPDATE public.auctions a
    SET 
      winner_id = ub.user_id,
      winning_bid_id = ub.id
    FROM (
      SELECT *
      FROM unique_bids
      ORDER BY amount ASC, created_at ASC
      LIMIT 1
    ) ub
    WHERE a.id = input_auction_id
    AND a.status = 'completed'
    AND a.winner_id IS NULL;

    -- Mark the winning bid
    UPDATE public.auction_bids ab
    SET is_winning_bid = true
    WHERE ab.id = (
      SELECT winning_bid_id 
      FROM public.auctions 
      WHERE id = input_auction_id
    );

    -- Reset other bids
    UPDATE public.auction_bids ab
    SET is_winning_bid = false
    WHERE ab.auction_id = input_auction_id
    AND ab.id != (
      SELECT winning_bid_id 
      FROM public.auctions 
      WHERE id = input_auction_id
    );
  END IF;
END;
$$;
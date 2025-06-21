-- Fix for Multiple Unique Tickets per Purchase
-- This script ensures that each ticket in a purchase gets its own unique ID

-- 1. First, let's check the current state
SELECT 'Current state check:' as info;
SELECT 
    tp.purchase_id,
    tp.quantity as expected_tickets,
    COUNT(ut.ticket_id) as actual_tickets,
    CASE 
        WHEN COUNT(ut.ticket_id) = tp.quantity THEN 'OK'
        WHEN COUNT(ut.ticket_id) = 0 THEN 'NO TICKETS'
        ELSE 'MISSING TICKETS'
    END as status
FROM ticket_purchases tp
LEFT JOIN unique_tickets ut ON tp.purchase_id = ut.purchase_id
GROUP BY tp.purchase_id, tp.quantity
ORDER BY tp.purchase_id;

-- 2. Drop and recreate the function to ensure it works correctly
DROP FUNCTION IF EXISTS create_unique_tickets_for_purchase(INTEGER);

CREATE OR REPLACE FUNCTION create_unique_tickets_for_purchase(purchase_id_param INTEGER) RETURNS VOID AS $$
DECLARE
    ticket_count INTEGER;
    i INTEGER;
    new_ticket_id VARCHAR(12);
    attempts INTEGER;
    max_attempts INTEGER := 100;
BEGIN
    -- Get the quantity for this purchase
    SELECT quantity INTO ticket_count FROM ticket_purchases WHERE purchase_id = purchase_id_param;
    
    -- Check if tickets already exist for this purchase
    IF EXISTS (SELECT 1 FROM unique_tickets WHERE purchase_id = purchase_id_param) THEN
        RAISE NOTICE 'Tickets already exist for purchase_id %. Skipping.', purchase_id_param;
        RETURN;
    END IF;
    
    -- Create unique tickets for each ticket in the purchase
    FOR i IN 1..ticket_count LOOP
        attempts := 0;
        
        -- Generate a unique ticket ID with retry logic
        LOOP
            attempts := attempts + 1;
            new_ticket_id := generate_ticket_id();
            
            -- Check if this ID already exists
            IF NOT EXISTS (SELECT 1 FROM unique_tickets WHERE ticket_id = new_ticket_id) THEN
                EXIT;
            END IF;
            
            -- Prevent infinite loop
            IF attempts >= max_attempts THEN
                RAISE EXCEPTION 'Failed to generate unique ticket ID after % attempts', max_attempts;
            END IF;
        END LOOP;
        
        -- Insert the unique ticket
        INSERT INTO unique_tickets (ticket_id, purchase_id, ticket_number)
        VALUES (new_ticket_id, purchase_id_param, i);
        
        RAISE NOTICE 'Created ticket % for purchase_id %: %', i, purchase_id_param, new_ticket_id;
    END LOOP;
    
    RAISE NOTICE 'Successfully created % unique tickets for purchase_id %', ticket_count, purchase_id_param;
END;
$$ LANGUAGE plpgsql;

-- 3. Create a function to fix existing purchases that don't have enough tickets
CREATE OR REPLACE FUNCTION fix_missing_tickets() RETURNS VOID AS $$
DECLARE
    purchase_record RECORD;
    existing_count INTEGER;
    missing_count INTEGER;
BEGIN
    FOR purchase_record IN 
        SELECT tp.purchase_id, tp.quantity
        FROM ticket_purchases tp
        LEFT JOIN (
            SELECT purchase_id, COUNT(*) as ticket_count 
            FROM unique_tickets 
            GROUP BY purchase_id
        ) ut ON tp.purchase_id = ut.purchase_id
        WHERE ut.ticket_count IS NULL OR ut.ticket_count < tp.quantity
    LOOP
        -- Get existing ticket count
        SELECT COUNT(*) INTO existing_count 
        FROM unique_tickets 
        WHERE purchase_id = purchase_record.purchase_id;
        
        missing_count := purchase_record.quantity - COALESCE(existing_count, 0);
        
        IF missing_count > 0 THEN
            RAISE NOTICE 'Fixing purchase_id %: need % more tickets', purchase_record.purchase_id, missing_count;
            
            -- Create missing tickets
            FOR i IN (existing_count + 1)..purchase_record.quantity LOOP
                DECLARE
                    new_ticket_id VARCHAR(12);
                    attempts INTEGER := 0;
                    max_attempts INTEGER := 100;
                BEGIN
                    LOOP
                        attempts := attempts + 1;
                        new_ticket_id := generate_ticket_id();
                        
                        IF NOT EXISTS (SELECT 1 FROM unique_tickets WHERE ticket_id = new_ticket_id) THEN
                            EXIT;
                        END IF;
                        
                        IF attempts >= max_attempts THEN
                            RAISE EXCEPTION 'Failed to generate unique ticket ID after % attempts', max_attempts;
                        END IF;
                    END LOOP;
                    
                    INSERT INTO unique_tickets (ticket_id, purchase_id, ticket_number)
                    VALUES (new_ticket_id, purchase_record.purchase_id, i);
                    
                    RAISE NOTICE 'Created missing ticket % for purchase_id %: %', i, purchase_record.purchase_id, new_ticket_id;
                END;
            END LOOP;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 4. Run the fix for existing purchases
SELECT 'Fixing existing purchases...' as info;
SELECT fix_missing_tickets();

-- 5. Verify the fix worked
SELECT 'Verification after fix:' as info;
SELECT 
    tp.purchase_id,
    tp.quantity as expected_tickets,
    COUNT(ut.ticket_id) as actual_tickets,
    CASE 
        WHEN COUNT(ut.ticket_id) = tp.quantity THEN '✅ OK'
        WHEN COUNT(ut.ticket_id) = 0 THEN '❌ NO TICKETS'
        ELSE '⚠️ MISSING TICKETS'
    END as status
FROM ticket_purchases tp
LEFT JOIN unique_tickets ut ON tp.purchase_id = ut.purchase_id
GROUP BY tp.purchase_id, tp.quantity
ORDER BY tp.purchase_id;

-- 6. Show sample of tickets for verification
SELECT 'Sample tickets:' as info;
SELECT 
    ut.ticket_id,
    ut.purchase_id,
    ut.ticket_number,
    tp.quantity as total_quantity,
    s.customer_name,
    tt.name as ticket_type
FROM unique_tickets ut
JOIN ticket_purchases tp ON ut.purchase_id = tp.purchase_id
JOIN sales s ON tp.sale_id = s.sale_id
JOIN ticket_types tt ON tp.ticket_type_id = tt.ticket_type_id
ORDER BY ut.purchase_id, ut.ticket_number
LIMIT 20;

-- 7. Test the function with a sample
SELECT 'Testing function with sample purchase:' as info;
-- Uncomment the line below to test with an actual purchase_id from your database
-- SELECT create_unique_tickets_for_purchase(1);

SELECT 'Fix complete! Each purchase should now have the correct number of unique tickets.' as status; 
-- Migration script to create unique tickets for existing purchases
-- Run this after setting up the check-in system if you have existing sales

-- Create unique tickets for all existing purchases that don't have them yet
DO $$
DECLARE
    purchase_record RECORD;
BEGIN
    FOR purchase_record IN 
        SELECT tp.purchase_id, tp.quantity
        FROM ticket_purchases tp
        LEFT JOIN unique_tickets ut ON tp.purchase_id = ut.purchase_id
        WHERE ut.purchase_id IS NULL
    LOOP
        -- Create unique tickets for this purchase
        PERFORM create_unique_tickets_for_purchase(purchase_record.purchase_id);
        
        RAISE NOTICE 'Created % unique tickets for purchase_id %', 
            purchase_record.quantity, purchase_record.purchase_id;
    END LOOP;
END $$;

-- Verify the migration
SELECT 
    tp.purchase_id,
    tp.quantity as expected_tickets,
    COUNT(ut.ticket_id) as actual_tickets,
    CASE 
        WHEN COUNT(ut.ticket_id) = tp.quantity THEN 'OK'
        ELSE 'MISSING'
    END as status
FROM ticket_purchases tp
LEFT JOIN unique_tickets ut ON tp.purchase_id = ut.purchase_id
GROUP BY tp.purchase_id, tp.quantity
ORDER BY tp.purchase_id;

-- Show sample of generated tickets
SELECT 
    ut.ticket_id,
    ut.purchase_id,
    ut.ticket_number,
    s.customer_name,
    tt.name as ticket_type
FROM unique_tickets ut
JOIN ticket_purchases tp ON ut.purchase_id = tp.purchase_id
JOIN sales s ON tp.sale_id = s.sale_id
JOIN ticket_types tt ON tp.ticket_type_id = tt.ticket_type_id
ORDER BY ut.purchase_id, ut.ticket_number
LIMIT 10; 
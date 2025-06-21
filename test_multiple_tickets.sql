-- Test Script for Multiple Tickets per Purchase
-- Run this to verify the system is working correctly

-- 1. Check if we have any purchases
SELECT 'Checking purchases:' as info;
SELECT 
    tp.purchase_id,
    tp.quantity,
    s.customer_name,
    tt.name as ticket_type,
    tp.total_price
FROM ticket_purchases tp
JOIN sales s ON tp.sale_id = s.sale_id
JOIN ticket_types tt ON tp.ticket_type_id = tt.ticket_type_id
ORDER BY tp.purchase_id;

-- 2. Check unique tickets for each purchase
SELECT 'Checking unique tickets:' as info;
SELECT 
    tp.purchase_id,
    tp.quantity as expected_tickets,
    COUNT(ut.ticket_id) as actual_tickets,
    CASE 
        WHEN COUNT(ut.ticket_id) = tp.quantity THEN '✅ CORRECT'
        WHEN COUNT(ut.ticket_id) = 0 THEN '❌ NO TICKETS'
        ELSE '⚠️ WRONG COUNT'
    END as status
FROM ticket_purchases tp
LEFT JOIN unique_tickets ut ON tp.purchase_id = ut.purchase_id
GROUP BY tp.purchase_id, tp.quantity
ORDER BY tp.purchase_id;

-- 3. Show individual tickets for each purchase
SELECT 'Individual tickets:' as info;
SELECT 
    ut.ticket_id,
    ut.purchase_id,
    ut.ticket_number,
    tp.quantity as total_quantity,
    s.customer_name,
    tt.name as ticket_type,
    CASE 
        WHEN ci.check_in_id IS NOT NULL THEN '✅ CHECKED IN'
        ELSE '⏳ NOT CHECKED IN'
    END as check_in_status
FROM unique_tickets ut
JOIN ticket_purchases tp ON ut.purchase_id = tp.purchase_id
JOIN sales s ON tp.sale_id = s.sale_id
JOIN ticket_types tt ON tp.ticket_type_id = tt.ticket_type_id
LEFT JOIN check_ins ci ON ut.ticket_id = ci.ticket_id
ORDER BY ut.purchase_id, ut.ticket_number;

-- 4. Test creating a new purchase with multiple tickets
-- (This would be done through the UI, but we can test the function directly)
SELECT 'Testing function with a sample purchase:' as info;

-- First, let's see if we have any purchases to test with
SELECT 
    'Available purchase_id for testing:' as test_info,
    tp.purchase_id,
    tp.quantity
FROM ticket_purchases tp
LEFT JOIN unique_tickets ut ON tp.purchase_id = ut.purchase_id
WHERE ut.purchase_id IS NULL
LIMIT 1;

-- 5. Show check-in statistics
SELECT 'Check-in statistics:' as info;
SELECT 
    tp.purchase_id,
    s.customer_name,
    tt.name as ticket_type,
    tp.quantity as total_tickets,
    COUNT(ci.check_in_id) as checked_in,
    tp.quantity - COUNT(ci.check_in_id) as remaining
FROM ticket_purchases tp
JOIN sales s ON tp.sale_id = s.sale_id
JOIN ticket_types tt ON tp.ticket_type_id = tt.ticket_type_id
LEFT JOIN unique_tickets ut ON tp.purchase_id = ut.purchase_id
LEFT JOIN check_ins ci ON ut.ticket_id = ci.ticket_id
GROUP BY tp.purchase_id, s.customer_name, tt.name, tp.quantity
ORDER BY tp.purchase_id;

-- 6. Summary
SELECT 'Summary:' as info;
SELECT 
    COUNT(DISTINCT tp.purchase_id) as total_purchases,
    SUM(tp.quantity) as total_tickets_sold,
    COUNT(ut.ticket_id) as total_unique_tickets_created,
    COUNT(ci.check_in_id) as total_check_ins
FROM ticket_purchases tp
LEFT JOIN unique_tickets ut ON tp.purchase_id = ut.purchase_id
LEFT JOIN check_ins ci ON ut.ticket_id = ci.ticket_id;

SELECT 'Test complete! Check the results above.' as status; 
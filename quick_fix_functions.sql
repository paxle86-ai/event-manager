-- Quick Fix for Missing Functions Error
-- Run this in your Supabase SQL Editor

-- 1. Create the generate_ticket_id function
CREATE OR REPLACE FUNCTION generate_ticket_id() RETURNS VARCHAR(12) AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result VARCHAR(12) := '';
    i INTEGER;
BEGIN
    FOR i IN 1..12 LOOP
        result := result || substr(chars, floor(random() * length(chars))::integer + 1, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 2. Create the create_unique_tickets_for_purchase function
CREATE OR REPLACE FUNCTION create_unique_tickets_for_purchase(purchase_id_param INTEGER) RETURNS VOID AS $$
DECLARE
    ticket_count INTEGER;
    i INTEGER;
    new_ticket_id VARCHAR(12);
BEGIN
    -- Get the quantity for this purchase
    SELECT quantity INTO ticket_count FROM ticket_purchases WHERE purchase_id = purchase_id_param;
    
    -- Create unique tickets for each ticket in the purchase
    FOR i IN 1..ticket_count LOOP
        -- Generate a unique ticket ID
        LOOP
            new_ticket_id := generate_ticket_id();
            -- Check if this ID already exists
            IF NOT EXISTS (SELECT 1 FROM unique_tickets WHERE ticket_id = new_ticket_id) THEN
                EXIT;
            END IF;
        END LOOP;
        
        -- Insert the unique ticket
        INSERT INTO unique_tickets (ticket_id, purchase_id, ticket_number)
        VALUES (new_ticket_id, purchase_id_param, i);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 3. Create unique_tickets table if it doesn't exist
CREATE TABLE IF NOT EXISTS unique_tickets (
    ticket_id VARCHAR(12) PRIMARY KEY,
    purchase_id INTEGER NOT NULL REFERENCES ticket_purchases(purchase_id) ON DELETE CASCADE,
    ticket_number INTEGER NOT NULL CHECK (ticket_number > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(purchase_id, ticket_number)
);

-- 4. Create check_ins table if it doesn't exist
CREATE TABLE IF NOT EXISTS check_ins (
    check_in_id SERIAL PRIMARY KEY,
    ticket_id VARCHAR(12) NOT NULL REFERENCES unique_tickets(ticket_id) ON DELETE CASCADE,
    checked_in_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    checked_in_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    notes TEXT,
    UNIQUE(ticket_id)
);

-- 5. Add indexes
CREATE INDEX IF NOT EXISTS idx_unique_tickets_purchase_id ON unique_tickets(purchase_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_ticket_id ON check_ins(ticket_id);

-- 6. Enable RLS
ALTER TABLE unique_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;

-- 7. Create policies
DROP POLICY IF EXISTS "Staff can manage unique tickets" ON unique_tickets;
CREATE POLICY "Staff can manage unique tickets" ON unique_tickets
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'staff')
        )
    );

DROP POLICY IF EXISTS "Users can view unique tickets" ON unique_tickets;
CREATE POLICY "Users can view unique tickets" ON unique_tickets
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff can manage check ins" ON check_ins;
CREATE POLICY "Staff can manage check ins" ON check_ins
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'staff')
        )
    );

DROP POLICY IF EXISTS "Users can view check ins" ON check_ins;
CREATE POLICY "Users can view check ins" ON check_ins
    FOR SELECT USING (true);

-- 8. Test the function
SELECT generate_ticket_id() as test_ticket_id;

-- 9. Show verification
SELECT 
    'Functions created successfully!' as status,
    routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('generate_ticket_id', 'create_unique_tickets_for_purchase'); 
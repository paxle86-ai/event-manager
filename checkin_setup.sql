-- Check-in system setup for Event Manager

-- Create unique_tickets table to assign unique IDs to each ticket
CREATE TABLE IF NOT EXISTS unique_tickets (
    ticket_id VARCHAR(12) PRIMARY KEY, -- Unique 12-character ID
    purchase_id INTEGER NOT NULL REFERENCES ticket_purchases(purchase_id) ON DELETE CASCADE,
    ticket_number INTEGER NOT NULL CHECK (ticket_number > 0), -- Which ticket in the purchase (1, 2, 3, etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(purchase_id, ticket_number) -- Prevent duplicate tickets
);

-- Create check_ins table to track ticket usage
CREATE TABLE IF NOT EXISTS check_ins (
    check_in_id SERIAL PRIMARY KEY,
    ticket_id VARCHAR(12) NOT NULL REFERENCES unique_tickets(ticket_id) ON DELETE CASCADE,
    checked_in_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    checked_in_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    notes TEXT,
    UNIQUE(ticket_id) -- Prevent duplicate check-ins for same ticket
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_unique_tickets_purchase_id ON unique_tickets(purchase_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_ticket_id ON check_ins(ticket_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_checked_in_by ON check_ins(checked_in_by);

-- Enable Row Level Security (RLS)
ALTER TABLE unique_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Staff can manage unique tickets" ON unique_tickets;
DROP POLICY IF EXISTS "Users can view unique tickets" ON unique_tickets;
DROP POLICY IF EXISTS "Staff can manage check ins" ON check_ins;
DROP POLICY IF EXISTS "Users can view check ins" ON check_ins;

-- Create policies for unique_tickets table (staff and admin can manage, others can view)
CREATE POLICY "Staff can manage unique tickets" ON unique_tickets
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'staff')
        )
    );

CREATE POLICY "Users can view unique tickets" ON unique_tickets
    FOR SELECT USING (true);

-- Create policies for check_ins table (staff and admin can manage, others can view)
CREATE POLICY "Staff can manage check ins" ON check_ins
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'staff')
        )
    );

CREATE POLICY "Users can view check ins" ON check_ins
    FOR SELECT USING (true);

-- Create a view for check-in statistics
CREATE OR REPLACE VIEW check_in_stats AS
SELECT 
    tp.purchase_id,
    tp.sale_id,
    s.customer_name,
    tt.name as ticket_type_name,
    tp.quantity,
    tp.price_per_ticket,
    tp.total_price,
    COUNT(ci.check_in_id) as checked_in_count,
    tp.quantity - COUNT(ci.check_in_id) as remaining_count
FROM ticket_purchases tp
JOIN sales s ON tp.sale_id = s.sale_id
JOIN ticket_types tt ON tp.ticket_type_id = tt.ticket_type_id
LEFT JOIN unique_tickets ut ON tp.purchase_id = ut.purchase_id
LEFT JOIN check_ins ci ON ut.ticket_id = ci.ticket_id
GROUP BY tp.purchase_id, tp.sale_id, s.customer_name, tt.name, tp.quantity, tp.price_per_ticket, tp.total_price;

-- Function to generate unique ticket IDs
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

-- Function to create unique tickets for a purchase
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

-- Grant permissions
GRANT SELECT ON check_in_stats TO authenticated; 
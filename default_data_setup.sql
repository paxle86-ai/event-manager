-- Default data setup for Event Manager
-- This script sets up the default venue and ticket types

-- First, let's check the actual structure of the ticket_types table
-- and fix any foreign key issues

-- Check if ticket_types table exists and what its primary key column is
DO $$
DECLARE
    pk_column_name text;
BEGIN
    -- Get the primary key column name for ticket_types table
    SELECT column_name INTO pk_column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'ticket_types' 
        AND tc.constraint_type = 'PRIMARY KEY'
    LIMIT 1;

    -- If the table exists and has a primary key
    IF pk_column_name IS NOT NULL THEN
        -- Drop the existing foreign key constraint if it exists
        ALTER TABLE ticket_purchases DROP CONSTRAINT IF EXISTS ticket_purchases_ticket_type_id_fkey;
        
        -- Add the correct foreign key constraint using the actual primary key column
        EXECUTE format('ALTER TABLE ticket_purchases ADD CONSTRAINT ticket_purchases_ticket_type_id_fkey FOREIGN KEY (ticket_type_id) REFERENCES ticket_types(%I) ON DELETE CASCADE', pk_column_name);
    END IF;
END $$;

-- Create venues table if it doesn't exist
CREATE TABLE IF NOT EXISTS venues (
    venue_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    address TEXT,
    capacity INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for venues
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admin can manage venues" ON venues;
DROP POLICY IF EXISTS "Users can view venues" ON venues;

-- Create policies for venues table
CREATE POLICY "Admin can manage venues" ON venues
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Users can view venues" ON venues
    FOR SELECT USING (true);

-- Insert default venue (Skycity theatre) if it doesn't exist
INSERT INTO venues (name, address, capacity) 
SELECT 'Skycity Theatre', 'Skycity Auckland, 87 Federal Street, Auckland 1010, New Zealand', 2000
WHERE NOT EXISTS (
    SELECT 1 FROM venues WHERE name = 'Skycity Theatre'
);

-- Create a function to get default ticket types for a concert
CREATE OR REPLACE FUNCTION get_default_ticket_types(concert_id_param INTEGER)
RETURNS TABLE (
    name VARCHAR(255),
    price DECIMAL(10,2),
    total_quantity INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ticket_type.name,
        ticket_type.price,
        ticket_type.total_quantity
    FROM (
        VALUES 
            ('Premium', 500.00, 100),
            ('VIP', 350.00, 100),
            ('Gold', 280.00, 100),
            ('Silver', 240.00, 100),
            ('Standard A', 200.00, 100),
            ('Standard B', 160.00, 100),
            ('Standard C', 120.00, 100)
    ) AS ticket_type(name, price, total_quantity);
END;
$$ LANGUAGE plpgsql;

-- Create a function to insert default ticket types for a concert
CREATE OR REPLACE FUNCTION insert_default_ticket_types(concert_id_param INTEGER)
RETURNS VOID AS $$
BEGIN
    INSERT INTO ticket_types (name, price, total_quantity, concert_id)
    SELECT 
        name,
        price,
        total_quantity,
        concert_id_param
    FROM get_default_ticket_types(concert_id_param);
END;
$$ LANGUAGE plpgsql;

-- Add indexes for venues table
CREATE INDEX IF NOT EXISTS idx_venues_name ON venues(name);

-- Update the concerts table to reference venues if it doesn't already
-- First check if the foreign key exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'concerts_venue_id_fkey' 
        AND table_name = 'concerts'
    ) THEN
        -- Add foreign key constraint if it doesn't exist
        ALTER TABLE concerts 
        ADD CONSTRAINT concerts_venue_id_fkey 
        FOREIGN KEY (venue_id) REFERENCES venues(venue_id) ON DELETE RESTRICT;
    END IF;
END $$; 
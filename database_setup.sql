-- Database setup for Event Manager sales functionality

-- First, let's check if ticket_types table exists and what its primary key is
-- If it doesn't exist, we'll create it with the expected structure

-- Create ticket_types table if it doesn't exist
CREATE TABLE IF NOT EXISTS ticket_types (
    ticket_type_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    total_quantity INTEGER NOT NULL,
    concert_id INTEGER NOT NULL REFERENCES concerts(concert_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sales table
CREATE TABLE IF NOT EXISTS sales (
    sale_id SERIAL PRIMARY KEY,
    concert_id INTEGER NOT NULL REFERENCES concerts(concert_id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(50),
    total_amount DECIMAL(10,2) NOT NULL,
    sale_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ticket_purchases table
CREATE TABLE IF NOT EXISTS ticket_purchases (
    purchase_id SERIAL PRIMARY KEY,
    sale_id INTEGER NOT NULL REFERENCES sales(sale_id) ON DELETE CASCADE,
    ticket_type_id INTEGER NOT NULL REFERENCES ticket_types(ticket_type_id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price_per_ticket DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create check_ins table to track ticket usage
CREATE TABLE IF NOT EXISTS check_ins (
    check_in_id SERIAL PRIMARY KEY,
    purchase_id INTEGER NOT NULL REFERENCES ticket_purchases(purchase_id) ON DELETE CASCADE,
    ticket_number INTEGER NOT NULL CHECK (ticket_number > 0), -- Which ticket in the purchase (1, 2, 3, etc.)
    checked_in_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    checked_in_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    notes TEXT,
    UNIQUE(purchase_id, ticket_number) -- Prevent duplicate check-ins for same ticket
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ticket_types_concert_id ON ticket_types(concert_id);
CREATE INDEX IF NOT EXISTS idx_sales_concert_id ON sales(concert_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_ticket_purchases_sale_id ON ticket_purchases(sale_id);
CREATE INDEX IF NOT EXISTS idx_ticket_purchases_ticket_type_id ON ticket_purchases(ticket_type_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_purchase_id ON check_ins(purchase_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_checked_in_by ON check_ins(checked_in_by);

-- Enable Row Level Security (RLS)
ALTER TABLE ticket_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admin can manage ticket types" ON ticket_types;
DROP POLICY IF EXISTS "Users can view ticket types" ON ticket_types;
DROP POLICY IF EXISTS "Admin can manage sales" ON sales;
DROP POLICY IF EXISTS "Users can view sales" ON sales;
DROP POLICY IF EXISTS "Admin can manage ticket purchases" ON ticket_purchases;
DROP POLICY IF EXISTS "Users can view ticket purchases" ON ticket_purchases;
DROP POLICY IF EXISTS "Staff can manage check ins" ON check_ins;
DROP POLICY IF EXISTS "Users can view check ins" ON check_ins;

-- Create policies for ticket_types table
CREATE POLICY "Admin can manage ticket types" ON ticket_types
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Users can view ticket types" ON ticket_types
    FOR SELECT USING (true);

-- Create policies for sales table (admin can read/write, others can read)
CREATE POLICY "Admin can manage sales" ON sales
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Users can view sales" ON sales
    FOR SELECT USING (true);

-- Create policies for ticket_purchases table
CREATE POLICY "Admin can manage ticket purchases" ON ticket_purchases
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Users can view ticket purchases" ON ticket_purchases
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
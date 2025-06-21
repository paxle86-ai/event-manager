# Database Setup Guide - Fix Missing Functions Error

## 🚨 Current Error
```
Failed to create unique tickets: Could not find the function public.create_unique_tickets_for_purchase(purchase_id_param) in the schema cache
```

This error occurs because the database functions haven't been created yet.

## 📋 Setup Steps

### 1. Access Supabase Dashboard
1. Go to [supabase.com](https://supabase.com)
2. Sign in to your account
3. Select your project
4. Go to **SQL Editor** in the left sidebar

### 2. Run Database Setup Scripts (in order)

#### Step 1: Basic Database Setup
```sql
-- Copy and paste the contents of database_setup.sql
-- This creates the basic tables and policies
```

#### Step 2: Check-in System Setup
```sql
-- Copy and paste the contents of checkin_setup.sql
-- This creates the unique_tickets table and functions
```

#### Step 3: Default Data (Optional)
```sql
-- Copy and paste the contents of default_data_setup.sql
-- This creates default venues and ticket types
```

#### Step 4: Migrate Existing Data (if you have existing sales)
```sql
-- Copy and paste the contents of migrate_existing_tickets.sql
-- This creates unique tickets for existing purchases
```

## 🔧 Manual Function Creation

If the scripts don't work, create the functions manually:

### 1. Create the generate_ticket_id function:
```sql
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
```

### 2. Create the create_unique_tickets_for_purchase function:
```sql
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
```

## ✅ Verification Steps

### 1. Check if functions exist:
```sql
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('generate_ticket_id', 'create_unique_tickets_for_purchase');
```

### 2. Test function generation:
```sql
SELECT generate_ticket_id();
```

### 3. Check if tables exist:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('unique_tickets', 'check_ins');
```

### 4. Test with existing purchase:
```sql
-- If you have existing purchases, test the function
SELECT create_unique_tickets_for_purchase(1); -- Replace 1 with actual purchase_id
```

## 🐛 Troubleshooting

### Common Issues:

1. **Permission Errors**: Make sure you're running as a database owner
2. **Syntax Errors**: Check for typos in the SQL
3. **Function Already Exists**: Use `CREATE OR REPLACE` to update existing functions
4. **Table Dependencies**: Make sure `ticket_purchases` table exists first

### Error Messages:

- **"function does not exist"**: Run the function creation scripts
- **"table does not exist"**: Run the database setup scripts first
- **"permission denied"**: Check your database role permissions

## 🚀 After Setup

Once the functions are created:

1. **Test Sales**: Try creating a new sale to see if unique tickets are generated
2. **Check-in System**: Test the check-in functionality
3. **QR Generator**: Verify QR codes are generated correctly

## 📞 Need Help?

If you're still having issues:

1. Check the Supabase logs in the dashboard
2. Verify your database connection
3. Make sure all scripts were executed successfully
4. Test the functions manually in the SQL editor

The error should be resolved once the functions are properly created in your database! 🎉 
# Database Setup Instructions

## Step 1: Run the Database Setup Scripts

You need to run these SQL scripts in your Supabase database in the following order:

### 1. First, run `database_setup.sql`
This creates the basic tables and structure:
- `ticket_types` table with `ticket_type_id` as primary key
- `sales` table
- `ticket_purchases` table with proper foreign keys
- RLS policies

### 2. Then, run `default_data_setup.sql`
This sets up the default data and fixes any foreign key issues:
- Creates `venues` table
- Adds default venue (Skycity Theatre)
- Fixes foreign key constraints
- Creates functions for default ticket types

## Step 2: Verify the Setup

After running both scripts, you should have:

1. **Default Venue**: Skycity Theatre
2. **Default Ticket Types** (when creating concerts):
   - Premium: $500 (100 tickets)
   - VIP: $350 (100 tickets)
   - Gold: $280 (100 tickets)
   - Silver: $240 (100 tickets)
   - Standard A: $200 (100 tickets)
   - Standard B: $160 (100 tickets)
   - Standard C: $120 (100 tickets)

## Step 3: Test the Application

1. Create a new concert - it should pre-populate with all 7 default ticket types
2. Visit `/venues` to manage venues (admin only)
3. Try the "Reset to Defaults" button in the concert form

## Troubleshooting

If you encounter the error "column ticket_type_id referenced in foreign key constraint does not exist":

1. Check if the `ticket_types` table was created with the correct column name
2. Run the `default_data_setup.sql` script which will automatically detect and fix foreign key issues
3. If problems persist, you may need to drop and recreate the tables

## SQL Scripts Location

- `database_setup.sql` - Basic table structure
- `default_data_setup.sql` - Default data and fixes 
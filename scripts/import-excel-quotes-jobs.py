#!/usr/bin/env python3
"""
Excel Import Script for Quotes and Jobs
Handles customer fuzzy matching, employee normalization, and database imports
"""

import sys
import os
import pandas as pd
from pathlib import Path
from rapidfuzz import fuzz, process
from datetime import datetime
import re
from typing import Dict, List, Tuple, Optional
import psycopg2
from psycopg2.extras import execute_values
from psycopg2.extensions import AsIs
import json

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Database connection - read from .env or use defaults
def get_db_connection():
    """Get database connection from environment variables"""
    import os
    from dotenv import load_dotenv
    
    load_dotenv(project_root / '.env')
    
    db_url = os.getenv('DATABASE_URL', '')
    if not db_url:
        raise ValueError("DATABASE_URL not found in environment variables")
    
    # Parse DATABASE_URL (postgresql://user:pass@host:port/dbname)
    # For psycopg2, we need to convert to connection params
    if db_url.startswith('postgresql://') or db_url.startswith('postgres://'):
        from urllib.parse import urlparse
        parsed = urlparse(db_url)
        return psycopg2.connect(
            host=parsed.hostname,
            port=parsed.port or 5432,
            database=parsed.path[1:],  # Remove leading /
            user=parsed.username,
            password=parsed.password
        )
    else:
        raise ValueError("Invalid DATABASE_URL format")

# Employee abbreviation mapping
EMPLOYEE_ABBREVIATIONS = {
    'JT': 'Jonathan Trembly',
    'JW': 'John Woloshyn',
    'IW': 'Ian Woloshyn',
    # Add more as needed
}

def normalize_customer_name(name: str) -> str:
    """Normalize customer name: capitalization, punctuation, spacing"""
    if not name or pd.isna(name):
        return ''
    
    # Convert to string and strip
    name = str(name).strip()
    
    # Remove extra whitespace
    name = re.sub(r'\s+', ' ', name)
    
    # Normalize common abbreviations
    name = re.sub(r'\bCo\.?\b', 'Company', name, flags=re.IGNORECASE)
    name = re.sub(r'\bInc\.?\b', 'Inc', name, flags=re.IGNORECASE)
    name = re.sub(r'\bLLC\.?\b', 'LLC', name, flags=re.IGNORECASE)
    name = re.sub(r'\bLtd\.?\b', 'Ltd', name, flags=re.IGNORECASE)
    
    # Title case (but preserve certain words)
    words = name.split()
    normalized_words = []
    for word in words:
        if word.upper() in ['LLC', 'INC', 'LTD', 'NF', 'USA', 'US']:
            normalized_words.append(word.upper())
        elif word.lower() in ['of', 'the', 'and', 'or', 'a', 'an', 'in', 'on', 'at', 'to', 'for']:
            normalized_words.append(word.lower())
        else:
            normalized_words.append(word.capitalize())
    
    return ' '.join(normalized_words)

def find_customer_match(customer_name: str, existing_customers: List[Dict]) -> Optional[Dict]:
    """Find matching customer using fuzzy matching"""
    if not customer_name or not existing_customers:
        return None
    
    normalized_name = normalize_customer_name(customer_name)
    
    # Get all customer names
    customer_names = [c['name'] for c in existing_customers]
    
    # Find best match
    result = process.extractOne(
        normalized_name,
        customer_names,
        scorer=fuzz.ratio,
        score_cutoff=80
    )
    
    if result:
        match_name, score, _ = result
        if score >= 90:
            # High confidence match
            return next(c for c in existing_customers if c['name'] == match_name)
        elif score >= 80:
            # Medium confidence - use closest match
            return next(c for c in existing_customers if c['name'] == match_name)
    
    return None

def normalize_employee_name(name: str) -> str:
    """Normalize employee name from 'Created By' field"""
    if not name or pd.isna(name):
        return 'Unknown'
    
    name = str(name).strip()
    
    # Handle multiple names separated by /
    if '/' in name:
        name = name.split('/')[0].strip()
    
    # Check abbreviations
    if name.upper() in EMPLOYEE_ABBREVIATIONS:
        name = EMPLOYEE_ABBREVIATIONS[name.upper()]
    
    # Title case
    words = name.split()
    normalized_words = [w.capitalize() for w in words]
    
    return ' '.join(normalized_words)

def parse_date(date_value) -> Optional[datetime]:
    """Parse date from various formats"""
    if pd.isna(date_value) or not date_value:
        return None
    
    if isinstance(date_value, datetime):
        return date_value
    
    if isinstance(date_value, str):
        # Try common formats
        for fmt in ['%Y-%m-%d', '%m/%d/%Y', '%d/%m/%Y', '%Y-%m-%d %H:%M:%S']:
            try:
                return datetime.strptime(date_value.strip(), fmt)
            except:
                continue
    
    try:
        return pd.to_datetime(date_value)
    except:
        return None

def detect_quote_vs_job(row: pd.Series, quote_indicators: List[str] = None, job_indicators: List[str] = None) -> str:
    """Detect if a row is a Quote or Job"""
    if quote_indicators is None:
        quote_indicators = ['quote', 'q-', 'q_', 'quotation']
    if job_indicators is None:
        job_indicators = ['job', 'j-', 'j_', 'project', 'proj']
    
    # Check common columns
    row_str = ' '.join([str(v).lower() for v in row.values if pd.notna(v)])
    
    # Check number columns
    number_cols = ['Quote Num.', 'Quote Number', 'QuoteNum', 'Job Number', 'Job Num.', 'JobNum', 'Project Number', 'Project Num.']
    for col in number_cols:
        if col in row.index and pd.notna(row[col]):
            value = str(row[col]).lower()
            if any(ind in value for ind in quote_indicators):
                return 'QUOTE'
            if any(ind in value for ind in job_indicators):
                return 'JOB'
    
    # Check status columns
    status_cols = ['Status', 'Quote Status', 'Job Status', 'Type']
    for col in status_cols:
        if col in row.index and pd.notna(row[col]):
            value = str(row[col]).lower()
            if 'quote' in value:
                return 'QUOTE'
            if 'job' in value or 'project' in value:
                return 'JOB'
    
    # Default: check if row_str contains indicators
    if any(ind in row_str for ind in quote_indicators):
        return 'QUOTE'
    if any(ind in row_str for ind in job_indicators):
        return 'JOB'
    
    return 'UNKNOWN'

def load_excel_file(file_path: str) -> Dict[str, pd.DataFrame]:
    """Load Excel file and return dictionary of dataframes"""
    file_path = Path(project_root) / 'storage' / file_path
    
    if not file_path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")
    
    print(f"📂 Loading Excel file: {file_path}")
    
    # Try to load all sheets
    excel_file = pd.ExcelFile(file_path)
    sheets = excel_file.sheet_names
    
    dataframes = {}
    
    # Look for Quotes and Jobs sheets
    for sheet in sheets:
        df = pd.read_excel(file_path, sheet_name=sheet)
        sheet_lower = sheet.lower()
        
        if 'quote' in sheet_lower:
            dataframes['quotes'] = df
            print(f"   ✓ Found Quotes sheet: {sheet}")
        elif 'job' in sheet_lower or 'project' in sheet_lower:
            dataframes['jobs'] = df
            print(f"   ✓ Found Jobs/Projects sheet: {sheet}")
        else:
            # Check if it's a combined sheet
            dataframes[sheet] = df
            print(f"   ✓ Loaded sheet: {sheet} ({len(df)} rows)")
    
    # If no specific sheets found, use the first sheet and detect
    if 'quotes' not in dataframes and 'jobs' not in dataframes and len(dataframes) > 0:
        first_sheet = list(dataframes.keys())[0]
        df = dataframes[first_sheet]
        
        print(f"   🔍 Detecting Quotes vs Jobs in sheet: {first_sheet}")
        
        quotes_rows = []
        jobs_rows = []
        
        for idx, row in df.iterrows():
            row_type = detect_quote_vs_job(row)
            if row_type == 'QUOTE':
                quotes_rows.append(idx)
            elif row_type == 'JOB':
                jobs_rows.append(idx)
        
        if quotes_rows:
            dataframes['quotes'] = df.loc[quotes_rows].copy()
            print(f"   ✓ Detected {len(quotes_rows)} quote rows")
        
        if jobs_rows:
            dataframes['jobs'] = df.loc[jobs_rows].copy()
            print(f"   ✓ Detected {len(jobs_rows)} job rows")
    
    return dataframes

def main():
    if len(sys.argv) < 2:
        print("Usage: python import-excel-quotes-jobs.py <excel_file_path>")
        print("Example: python import-excel-quotes-jobs.py JobList.xlsx")
        sys.exit(1)
    
    excel_file_path = sys.argv[1]
    
    try:
        # Load Excel file
        dataframes = load_excel_file(excel_file_path)
        
        # Connect to database
        print("\n🔌 Connecting to database...")
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Load existing data
        print("📊 Loading existing data...")
        
        # Get existing customers
        cur.execute("SELECT id, name FROM customers WHERE is_active = true")
        existing_customers = [{'id': row[0], 'name': row[1]} for row in cur.fetchall()]
        print(f"   ✓ Found {len(existing_customers)} existing customers")
        
        # Get existing users
        cur.execute("SELECT id, name, email FROM users WHERE is_active = true")
        user_rows = cur.fetchall()
        existing_users = {}
        existing_users_by_email = {}
        for row in user_rows:
            user_id, name, email = row[0], row[1], row[2]
            if name:
                existing_users[name] = {'id': user_id, 'name': name, 'email': email}
            if email:
                existing_users_by_email[email] = {'id': user_id, 'name': name, 'email': email}
        print(f"   ✓ Found {len(existing_users)} existing users")
        
        # Get existing quotes
        cur.execute("SELECT quote_number FROM quotes")
        existing_quote_numbers = {row[0] for row in cur.fetchall()}
        print(f"   ✓ Found {len(existing_quote_numbers)} existing quotes")
        
        # Get existing jobs
        cur.execute("SELECT job_number FROM jobs")
        existing_job_numbers = {row[0] for row in cur.fetchall()}
        print(f"   ✓ Found {len(existing_job_numbers)} existing jobs")
        
        # Statistics
        stats = {
            'customers_created': 0,
            'customers_matched': 0,
            'employees_created': 0,
            'employees_matched': 0,
            'quotes_imported': 0,
            'jobs_imported': 0
        }
        
        # Customer cache
        customer_cache = {}
        
        # User cache
        user_cache = {}
        
        # Process Quotes
        if 'quotes' in dataframes:
            print("\n📋 Processing Quotes...")
            quotes_df = dataframes['quotes']
            
            for idx, row in quotes_df.iterrows():
                try:
                    # Extract quote data
                    quote_number = None
                    for col in ['Quote Num.', 'Quote Number', 'QuoteNum', 'Quote #', 'Quote']:
                        if col in row.index and pd.notna(row[col]):
                            quote_number = str(row[col]).strip()
                            break
                    
                    if not quote_number or quote_number in existing_quote_numbers:
                        continue
                    
                    # Customer
                    customer_name = None
                    for col in ['Customer', 'Customer Name', 'Cust Name', 'Client']:
                        if col in row.index and pd.notna(row[col]):
                            customer_name = str(row[col]).strip()
                            break
                    
                    if not customer_name:
                        customer_name = 'Unknown Customer'
                    
                    # Find or create customer
                    normalized_customer = normalize_customer_name(customer_name)
                    if normalized_customer in customer_cache:
                        customer_id = customer_cache[normalized_customer]
                        stats['customers_matched'] += 1
                    else:
                        match = find_customer_match(customer_name, existing_customers)
                        if match:
                            customer_id = match['id']
                            customer_cache[normalized_customer] = customer_id
                            stats['customers_matched'] += 1
                        else:
                            # Create new customer
                            cur.execute(
                                "INSERT INTO customers (name, is_active, created_at, updated_at) VALUES (%s, %s, %s, %s) RETURNING id",
                                (normalized_customer, True, datetime.now(), datetime.now())
                            )
                            customer_id = cur.fetchone()[0]
                            customer_cache[normalized_customer] = customer_id
                            existing_customers.append({'id': customer_id, 'name': normalized_customer})
                            stats['customers_created'] += 1
                    
                    # Created By
                    created_by_name = None
                    for col in ['Created By', 'CreatedBy', 'Creator', 'Author']:
                        if col in row.index and pd.notna(row[col]):
                            created_by_name = str(row[col]).strip()
                            break
                    
                    if not created_by_name:
                        created_by_name = 'Unknown'
                    
                    normalized_employee = normalize_employee_name(created_by_name)
                    
                    # Find or create user
                    if normalized_employee in user_cache:
                        created_by_id = user_cache[normalized_employee]
                        stats['employees_matched'] += 1
                    else:
                        # Try to find by name
                        user_match = existing_users.get(normalized_employee)
                        if user_match:
                            created_by_id = user_match['id']
                            user_cache[normalized_employee] = created_by_id
                            stats['employees_matched'] += 1
                        else:
                            # Create placeholder user
                            email = f"{normalized_employee.lower().replace(' ', '.')}@placeholder.local"
                            cur.execute(
                                "INSERT INTO users (email, name, role, is_active, created_at, updated_at) VALUES (%s, %s, %s, %s, %s, %s) RETURNING id",
                                (email, normalized_employee, 'USER', True, datetime.now(), datetime.now())
                            )
                            created_by_id = cur.fetchone()[0]
                            user_cache[normalized_employee] = created_by_id
                            existing_users[normalized_employee] = {'id': created_by_id, 'name': normalized_employee, 'email': email}
                            stats['employees_created'] += 1
                    
                    # Description
                    description = None
                    for col in ['Description', 'Desc', 'Title', 'Quote Description']:
                        if col in row.index and pd.notna(row[col]):
                            description = str(row[col]).strip()
                            break
                    
                    if not description:
                        description = f"Quote {quote_number}"
                    
                    # Amount
                    amount = 0.0
                    for col in ['Amount', 'Total', 'Quote Amount', 'Value', 'Price']:
                        if col in row.index and pd.notna(row[col]):
                            try:
                                amount = float(row[col])
                                break
                            except:
                                pass
                    
                    # Status
                    status = 'DRAFT'
                    for col in ['Status', 'Quote Status', 'State']:
                        if col in row.index and pd.notna(row[col]):
                            status_str = str(row[col]).strip().upper()
                            if 'APPROVED' in status_str or 'WON' in status_str:
                                status = 'APPROVED'
                            elif 'CANCELLED' in status_str or 'CANCEL' in status_str:
                                status = 'CANCELLED'
                            elif 'SENT' in status_str:
                                status = 'SENT'
                            break
                    
                    # Dates
                    valid_until = None
                    for col in ['Valid Until', 'ValidUntil', 'Expiry', 'Expiration Date']:
                        if col in row.index and pd.notna(row[col]):
                            valid_until = parse_date(row[col])
                            break
                    
                    # Insert quote
                    cur.execute("""
                        INSERT INTO quotes (
                            quote_number, title, description, customer_id, amount, status,
                            valid_until, created_at, updated_at, is_active, quote_type
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (quote_number) DO UPDATE SET
                            title = EXCLUDED.title,
                            description = EXCLUDED.description,
                            customer_id = EXCLUDED.customer_id,
                            amount = EXCLUDED.amount,
                            status = EXCLUDED.status,
                            valid_until = EXCLUDED.valid_until,
                            updated_at = EXCLUDED.updated_at
                        RETURNING id
                    """, (
                        quote_number, description[:200], description, customer_id, amount, status,
                        valid_until, datetime.now(), datetime.now(), True, 'PROJECT'
                    ))
                    
                    quote_id = cur.fetchone()[0]
                    existing_quote_numbers.add(quote_number)
                    stats['quotes_imported'] += 1
                    
                except Exception as e:
                    print(f"   ⚠️  Error processing quote row {idx}: {e}")
                    continue
        
        # Process Jobs
        if 'jobs' in dataframes:
            print("\n🏗️  Processing Jobs...")
            jobs_df = dataframes['jobs']
            
            for idx, row in jobs_df.iterrows():
                try:
                    # Extract job data
                    job_number = None
                    for col in ['Job Number', 'Job Num.', 'JobNum', 'Job #', 'Project Number', 'Project Num.', 'ProjectNum']:
                        if col in row.index and pd.notna(row[col]):
                            job_number = str(row[col]).strip()
                            break
                    
                    if not job_number or job_number in existing_job_numbers:
                        continue
                    
                    # Customer
                    customer_name = None
                    for col in ['Customer', 'Customer Name', 'Cust Name', 'Client']:
                        if col in row.index and pd.notna(row[col]):
                            customer_name = str(row[col]).strip()
                            break
                    
                    if not customer_name:
                        customer_name = 'Unknown Customer'
                    
                    # Find or create customer (same logic as quotes)
                    normalized_customer = normalize_customer_name(customer_name)
                    if normalized_customer in customer_cache:
                        customer_id = customer_cache[normalized_customer]
                    else:
                        match = find_customer_match(customer_name, existing_customers)
                        if match:
                            customer_id = match['id']
                            customer_cache[normalized_customer] = customer_id
                        else:
                            cur.execute(
                                "INSERT INTO customers (name, is_active, created_at, updated_at) VALUES (%s, %s, %s, %s) RETURNING id",
                                (normalized_customer, True, datetime.now(), datetime.now())
                            )
                            customer_id = cur.fetchone()[0]
                            customer_cache[normalized_customer] = customer_id
                            existing_customers.append({'id': customer_id, 'name': normalized_customer})
                    
                    # Created By
                    created_by_name = None
                    for col in ['Created By', 'CreatedBy', 'Creator', 'Author']:
                        if col in row.index and pd.notna(row[col]):
                            created_by_name = str(row[col]).strip()
                            break
                    
                    if not created_by_name:
                        created_by_name = 'Unknown'
                    
                    normalized_employee = normalize_employee_name(created_by_name)
                    
                    if normalized_employee in user_cache:
                        created_by_id = user_cache[normalized_employee]
                    else:
                        user_match = existing_users.get(normalized_employee)
                        if user_match:
                            created_by_id = user_match['id']
                            user_cache[normalized_employee] = created_by_id
                        else:
                            email = f"{normalized_employee.lower().replace(' ', '.')}@placeholder.local"
                            cur.execute(
                                "INSERT INTO users (email, name, role, is_active, created_at, updated_at) VALUES (%s, %s, %s, %s, %s, %s) RETURNING id",
                                (email, normalized_employee, 'USER', True, datetime.now(), datetime.now())
                            )
                            created_by_id = cur.fetchone()[0]
                            user_cache[normalized_employee] = created_by_id
                            existing_users[normalized_employee] = {'id': created_by_id, 'name': normalized_employee, 'email': email}
                    
                    # Description/Title
                    title = None
                    for col in ['Title', 'Description', 'Desc', 'Job Description', 'Project Description']:
                        if col in row.index and pd.notna(row[col]):
                            title = str(row[col]).strip()
                            break
                    
                    if not title:
                        title = f"Job {job_number}"
                    
                    description = title
                    
                    # Status
                    status = 'ACTIVE'
                    for col in ['Status', 'Job Status', 'State', 'Project Status']:
                        if col in row.index and pd.notna(row[col]):
                            status_str = str(row[col]).strip().upper()
                            if 'COMPLETE' in status_str or 'FINISHED' in status_str:
                                status = 'COMPLETED'
                            elif 'CANCELLED' in status_str or 'CANCEL' in status_str:
                                status = 'CANCELLED'
                            elif 'ON HOLD' in status_str or 'HOLD' in status_str:
                                status = 'ON_HOLD'
                            break
                    
                    # Assigned To
                    assigned_to_id = None
                    assigned_to_name = None
                    for col in ['Assigned To', 'AssignedTo', 'Assigned Tech', 'Technician', 'Tech']:
                        if col in row.index and pd.notna(row[col]):
                            assigned_to_name = str(row[col]).strip()
                            break
                    
                    if assigned_to_name:
                        normalized_assigned = normalize_employee_name(assigned_to_name)
                        if normalized_assigned in user_cache:
                            assigned_to_id = user_cache[normalized_assigned]
                        else:
                            user_match = existing_users.get(normalized_assigned)
                            if user_match:
                                assigned_to_id = user_match['id']
                                user_cache[normalized_assigned] = assigned_to_id
                            else:
                                email = f"{normalized_assigned.lower().replace(' ', '.')}@placeholder.local"
                                cur.execute(
                                    "INSERT INTO users (email, name, role, is_active, created_at, updated_at) VALUES (%s, %s, %s, %s, %s, %s) RETURNING id",
                                    (email, normalized_assigned, 'USER', True, datetime.now(), datetime.now())
                                )
                                assigned_to_id = cur.fetchone()[0]
                                user_cache[normalized_assigned] = assigned_to_id
                                existing_users[normalized_assigned] = {'id': assigned_to_id, 'name': normalized_assigned, 'email': email}
                    
                    # Dates
                    start_date = None
                    for col in ['Start Date', 'StartDate', 'Begin Date']:
                        if col in row.index and pd.notna(row[col]):
                            start_date = parse_date(row[col])
                            break
                    
                    end_date = None
                    for col in ['End Date', 'EndDate', 'Due Date', 'DueDate', 'Completion Date']:
                        if col in row.index and pd.notna(row[col]):
                            end_date = parse_date(row[col])
                            break
                    
                    # Link to quote
                    related_quote_id = None
                    quote_number = None
                    for col in ['Quote Number', 'Quote Num.', 'QuoteNum', 'Related Quote']:
                        if col in row.index and pd.notna(row[col]):
                            quote_number = str(row[col]).strip()
                            break
                    
                    if quote_number:
                        cur.execute("SELECT id FROM quotes WHERE quote_number = %s", (quote_number,))
                        quote_result = cur.fetchone()
                        if quote_result:
                            related_quote_id = quote_result[0]
                    
                    # Insert job
                    cur.execute("""
                        INSERT INTO jobs (
                            job_number, title, description, customer_id, created_by_id,
                            assigned_to_id, status, start_date, end_date, related_quote_id,
                            type, priority, created_at, updated_at
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (job_number) DO UPDATE SET
                            title = EXCLUDED.title,
                            description = EXCLUDED.description,
                            customer_id = EXCLUDED.customer_id,
                            assigned_to_id = EXCLUDED.assigned_to_id,
                            status = EXCLUDED.status,
                            start_date = EXCLUDED.start_date,
                            end_date = EXCLUDED.end_date,
                            related_quote_id = EXCLUDED.related_quote_id,
                            updated_at = EXCLUDED.updated_at
                        RETURNING id
                    """, (
                        job_number, title, description, customer_id, created_by_id,
                        assigned_to_id, status, start_date, end_date, related_quote_id,
                        'JOB', 'MEDIUM', datetime.now(), datetime.now()
                    ))
                    
                    job_id = cur.fetchone()[0]
                    existing_job_numbers.add(job_number)
                    stats['jobs_imported'] += 1
                    
                except Exception as e:
                    print(f"   ⚠️  Error processing job row {idx}: {e}")
                    continue
        
        # Commit all changes
        conn.commit()
        
        # Output summary
        print("\n" + "="*60)
        print("📊 IMPORT SUMMARY")
        print("="*60)
        print(f"Customers created: {stats['customers_created']}")
        print(f"Customers matched: {stats['customers_matched']}")
        print(f"Employees created: {stats['employees_created']}")
        print(f"Employees matched: {stats['employees_matched']}")
        print(f"Quotes imported: {stats['quotes_imported']}")
        print(f"Jobs imported: {stats['jobs_imported']}")
        print("="*60)
        
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()


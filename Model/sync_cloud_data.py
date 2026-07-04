"""
Sync Cloud Data — replicates the data from the shared Neon PostgreSQL cloud database
into your local docker PostgreSQL database (jobs_dw).
"""

import sys
import time
import os
import psycopg2
from psycopg2.extras import execute_values

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Cloud DB Config (loaded from environment variables)
CLOUD_CONFIG = {
    "host": os.getenv("NEON_HOST"),
    "port": int(os.getenv("NEON_PORT", 5432)),
    "dbname": os.getenv("NEON_DATABASE"),
    "user": os.getenv("NEON_USER"),
    "password": os.getenv("NEON_PASSWORD"),
    "sslmode": os.getenv("NEON_SSLMODE", "require")
}


# Local DB Config
LOCAL_CONFIG = {
    "host": "localhost",
    "port": 5433,
    "dbname": "jobs_dw",
    "user": "warehouse",
    "password": "warehouse"
}

# Dependency order for syncing tables
TABLE_COLUMNS = {
    "dim_source": ["source_id", "platform_name", "platform_url"],
    "dim_contract_type": ["contract_id", "contract_label", "contract_category"],
    "dim_company": ["company_id", "company_name", "industry", "company_size"],
    "dim_location": ["location_id", "raw_location", "city", "region", "country", "country_code", "latitude", "longitude"],
    "dim_job_title": ["title_id", "raw_title", "normalised_title", "job_family", "seniority_level"],
    "dim_skill": ["skill_id", "skill_name", "skill_category"],
    "dim_date": ["date_id", "full_date", "day", "month", "month_name", "year", "quarter", "week_number", "day_of_week", "is_weekend"],
    "fact_job_offer": [
        "offer_id", "dim_company_id", "dim_location_id", "dim_title_id", "dim_source_id", 
        "dim_date_id", "dim_contract_id", "salary_min", "salary_max", "currency", 
        "description_raw", "description_clean", "url", "source_job_id", "ingestion_ts"
    ],
    "bridge_offer_skill": ["offer_id", "skill_id", "confidence_score"]
}

def sync_data():
    print("Connecting to cloud and local databases...")
    try:
        cloud_conn = psycopg2.connect(**CLOUD_CONFIG)
        local_conn = psycopg2.connect(**LOCAL_CONFIG)
    except Exception as e:
        print(f"Connection failed: {e}")
        return

    try:
        # 1. Truncate local tables (cascade) to ensure a clean import
        print("\nTruncating local tables (cascade)...")
        with local_conn.cursor() as local_cur:
            tables_to_truncate = ", ".join(TABLE_COLUMNS.keys())
            local_cur.execute(f"TRUNCATE TABLE {tables_to_truncate} RESTART IDENTITY CASCADE;")
        local_conn.commit()
        print("[OK] Local tables truncated.")

        # 2. Sync each table in dependency order
        for table, cols in TABLE_COLUMNS.items():
            start_time = time.time()
            print(f"\nSyncing {table}...")
            
            # Fetch from cloud
            with cloud_conn.cursor() as cloud_cur:
                col_str = ", ".join(cols)
                cloud_cur.execute(f"SELECT {col_str} FROM {table}")
                rows = cloud_cur.fetchall()
            
            print(f"  Fetched {len(rows)} records from cloud.")
            
            if not rows:
                print(f"  No records found for {table}. Skipping insert.")
                continue

            # Insert into local
            with local_conn.cursor() as local_cur:
                insert_query = f"INSERT INTO {table} ({col_str}) VALUES %s ON CONFLICT DO NOTHING"
                execute_values(local_cur, insert_query, rows, page_size=2000)
            
            local_conn.commit()
            print(f"  [OK] Sync complete for {table} in {time.time() - start_time:.2f}s.")

        # 3. Reset Postgres serial sequence counters
        # This prevents duplicate key errors when inserting new rows locally later.
        print("\nResetting table primary key sequence counters...")
        with local_conn.cursor() as local_cur:
            sequences = {
                "dim_company": ("company_id", "dim_company_company_id_seq"),
                "dim_location": ("location_id", "dim_location_location_id_seq"),
                "dim_job_title": ("title_id", "dim_job_title_title_id_seq"),
                "dim_source": ("source_id", "dim_source_source_id_seq"),
                "dim_contract_type": ("contract_id", "dim_contract_type_contract_id_seq"),
                "dim_skill": ("skill_id", "dim_skill_skill_id_seq"),
                "fact_job_offer": ("offer_id", "fact_job_offer_offer_id_seq")
            }
            for tbl, (pk, seq) in sequences.items():
                local_cur.execute(f"SELECT setval('{seq}', COALESCE(MAX({pk}), 1)) FROM {tbl};")
        local_conn.commit()
        print("[OK] All sequence counters reset successfully.")
        
        print("\nSync completed successfully!")

    except Exception as e:
        local_conn.rollback()
        print(f"\nSync failed with error: {e}")
    finally:
        cloud_conn.close()
        local_conn.close()

if __name__ == "__main__":
    sync_data()

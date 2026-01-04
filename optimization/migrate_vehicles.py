import os
import psycopg2

# Configuration matching solver.py
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '5433')
DB_NAME = os.getenv('DB_NAME', 'routedb')
DB_USER = os.getenv('DB_USER', 'user')
DB_PASS = os.getenv('DB_PASS', 'password')

def migrate_and_seed():
    print("Connecting to DB...")
    try:
        conn = psycopg2.connect(host=DB_HOST, port=DB_PORT, dbname=DB_NAME, user=DB_USER, password=DB_PASS)
        conn.autocommit = True
        cursor = conn.cursor()
    except Exception as e:
        print(f"Connection failed: {e}")
        return

    # 1. Alter Table
    print("Migrating schema...")
    try:
        cursor.execute("ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS end_lat FLOAT DEFAULT 0.0;")
        cursor.execute("ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS end_lon FLOAT DEFAULT 0.0;")
        # Ensure start columns exist (though schema.sql says they do)
        cursor.execute("ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS start_lat FLOAT DEFAULT 0.0;")
        cursor.execute("ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS start_lon FLOAT DEFAULT 0.0;")
    except Exception as e:
        print(f"Schema migration error (might already exist): {e}")

    # 2. Seed Data
    # User requested: "-22.754154, -47.397313"
    lat = -22.754154
    lon = -47.397313
    
    print(f"Updating vehicles to Start/End at requested location ({lat}, {lon})...")
    
    # Check if we need to insert vehicles (if table is empty)
    cursor.execute("SELECT count(*) FROM vehicles")
    count = cursor.fetchone()[0]
    
    if count == 0:
        print("Inserting 3 default vehicles...")
        vehicles = [
            ('Veículo 1', 10, lat, lon, lat, lon),
            ('Veículo 2', 10, lat, lon, lat, lon),
            ('Veículo 3', 10, lat, lon, lat, lon)
        ]
        curr = conn.cursor()
        curr.executemany("""
            INSERT INTO vehicles (name, capacity, start_lat, start_lon, end_lat, end_lon)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, vehicles)
    else:
        print("Updating existing vehicles...")
        cursor.execute("""
            UPDATE vehicles 
            SET start_lat = %s, start_lon = %s, end_lat = %s, end_lon = %s
        """, (lat, lon, lat, lon))
        
    print("Migration and seeding complete.")
    conn.close()

if __name__ == "__main__":
    migrate_and_seed()

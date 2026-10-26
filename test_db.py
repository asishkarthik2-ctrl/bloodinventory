from database import get_connection

print("Connecting to BloodLink database...")

connection = get_connection()

if connection:
    print("Database connected successfully!")

    cursor = connection.cursor()
    cursor.execute("SHOW TABLES")

    tables = cursor.fetchall()

    print("\nTables in bloodlink_db:")

    for table in tables:
        print(table[0])

    cursor.close()
    connection.close()

    print("\nDatabase test completed!")

else:
    print("Database connection failed!")
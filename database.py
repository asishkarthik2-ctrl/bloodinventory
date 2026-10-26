import os

import mysql.connector
from mysql.connector import Error


def get_connection():
    try:
        if os.getenv("DB_HOST"):
            return mysql.connector.connect(
                host=os.environ["DB_HOST"],
                user=os.environ["DB_USER"],
                password=os.environ["DB_PASSWORD"],
                database=os.getenv("DB_NAME", "bloodlink_db"),
                port=int(os.getenv("DB_PORT", "3306"))
            )

        connection = mysql.connector.connect(
            host="localhost",
            user="root",
            password="Ak@200730278",
            database="bloodlink_db",
            port=3306
        )
        if connection.is_connected():
            return connection

    except Error as error:
        print("MySQL connection failed:", error)

    return None
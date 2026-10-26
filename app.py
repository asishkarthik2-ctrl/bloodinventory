from flask import Flask, request, jsonify, send_from_directory
from database import get_connection
import os

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


# =====================================================
# HOME PAGE
# =====================================================

@app.route("/")
def home():
    return send_from_directory(BASE_DIR, "simulation.html")


# =====================================================
# SERVE CSS
# =====================================================

@app.route("/design.css")
def serve_css():
    return send_from_directory(BASE_DIR, "design.css")


# =====================================================
# SERVE JAVASCRIPT
# =====================================================

@app.route("/logic.js")
def serve_js():
    return send_from_directory(BASE_DIR, "logic.js")


# =====================================================
# HEALTH CHECK
# =====================================================

@app.route("/api/health", methods=["GET"])
def health_check():

    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute("SELECT 1")
        cursor.fetchone()

        return jsonify({
            "status": "success",
            "message": "Flask and MySQL are connected."
        }), 200

    except Exception as error:
        print("Database health check error:", error)

        return jsonify({
            "status": "error",
            "message": "Database connection failed."
        }), 500

    finally:
        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =====================================================
# BLOOD INVENTORY
# =====================================================

@app.route("/api/inventory", methods=["GET"])
def get_inventory():

    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                blood_group,
                available_units,
                minimum_stock
            FROM blood_inventory
            ORDER BY blood_group
        """)

        inventory = cursor.fetchall()

        return jsonify(inventory), 200

    except Exception as error:
        print("Inventory error:", error)

        return jsonify({
            "error": "Unable to load blood inventory."
        }), 500

    finally:
        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =====================================================
# GET ALL DONORS
# =====================================================

@app.route("/api/donors", methods=["GET"])
def get_donors():

    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                donor_id,
                name,
                phone,
                blood_group,
                location
            FROM donors
            ORDER BY donor_id DESC
        """)

        donors = cursor.fetchall()

        return jsonify(donors), 200

    except Exception as error:
        print("Donor loading error:", error)

        return jsonify({
            "error": "Unable to load donor records."
        }), 500

    finally:
        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =====================================================
# REGISTER A NEW DONOR
# =====================================================

@app.route("/api/donors", methods=["POST"])
def register_donor():

    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "error": "Please provide donor information."
        }), 400

    name = str(data.get("name", "")).strip()
    phone = str(data.get("phone", "")).strip()
    blood_group = str(data.get("blood_group", "")).strip().upper()
    location = str(data.get("location", "")).strip()

    valid_blood_groups = {
        "A+", "A-", "B+", "B-",
        "AB+", "AB-", "O+", "O-"
    }

    if not name or not phone or not blood_group or not location:
        return jsonify({
            "error": "All donor fields are required."
        }), 400

    if len(name) > 100:
        return jsonify({
            "error": "Donor name must not exceed 100 characters."
        }), 400

    if len(phone) > 20:
        return jsonify({
            "error": "Phone number is too long."
        }), 400

    if blood_group not in valid_blood_groups:
        return jsonify({
            "error": "Please select a valid blood group."
        }), 400

    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        # Check whether the phone number is already registered.
        cursor.execute("""
            SELECT donor_id
            FROM donors
            WHERE phone = %s
            LIMIT 1
        """, (phone,))

        existing_donor = cursor.fetchone()

        if existing_donor:
            return jsonify({
                "error": "This phone number is already registered."
            }), 409

        # Insert donor information.
        cursor.execute("""
            INSERT INTO donors
                (name, age, gender, blood_group, phone, location)
            VALUES
                (%s, %s, %s, %s, %s, %s)
        """, (
            name,
            18,
            "Not specified",
            blood_group,
            phone,
            location
        ))

        donor_id = cursor.lastrowid

        connection.commit()

        return jsonify({
            "message": "Donor registered successfully.",
            "donor_id": donor_id,
            "name": name,
            "phone": phone,
            "blood_group": blood_group,
            "location": location
        }), 201

    except Exception as error:

        if connection:
            connection.rollback()

        print("Donor registration error:", error)

        return jsonify({
            "error": "Unable to register donor. Check the Flask terminal."
        }), 500

    finally:
        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =====================================================
# DONOR COUNT
# =====================================================

@app.route("/api/donors/count", methods=["GET"])
def donor_count():

    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute("SELECT COUNT(*) FROM donors")

        result = cursor.fetchone()

        return jsonify({
            "count": result[0]
        }), 200

    except Exception as error:
        print("Donor count error:", error)

        return jsonify({
            "error": "Unable to count donors."
        }), 500

    finally:
        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =====================================================
# GET ALL EMERGENCY REQUESTS
# =====================================================

@app.route("/api/emergency-requests", methods=["GET"])
def get_emergency_requests():

    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                request_id,
                patient_name,
                hospital_name,
                blood_group,
                units_required,
                urgency,
                status,
                requested_at
            FROM emergency_requests
            ORDER BY requested_at DESC, request_id DESC
        """)

        requests_list = cursor.fetchall()

        # Convert MySQL datetime values to JSON-compatible strings.
        for item in requests_list:
            if item.get("requested_at") is not None:
                item["requested_at"] = str(item["requested_at"])

        return jsonify(requests_list), 200

    except Exception as error:
        print("Emergency request loading error:", error)

        return jsonify({
            "error": "Unable to load emergency requests."
        }), 500

    finally:
        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =====================================================
# CREATE AN EMERGENCY REQUEST
# =====================================================

@app.route("/api/emergency-requests", methods=["POST"])
def create_emergency_request():

    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "error": "Please provide emergency request details."
        }), 400

    patient_name = str(data.get("patient_name", "")).strip()
    hospital_name = str(data.get("hospital_name", "")).strip()
    blood_group = str(data.get("blood_group", "")).strip().upper()
    urgency = str(data.get("urgency", "")).strip().capitalize()

    try:
        units_required = int(data.get("units_required", 0))

    except (ValueError, TypeError):
        return jsonify({
            "error": "Units required must be a whole number."
        }), 400

    valid_blood_groups = {
        "A+", "A-", "B+", "B-",
        "AB+", "AB-", "O+", "O-"
    }

    valid_urgencies = {
        "Low", "Medium", "High", "Critical"
    }

    if not patient_name or not hospital_name:
        return jsonify({
            "error": "Patient name and hospital name are required."
        }), 400

    if len(patient_name) > 100 or len(hospital_name) > 150:
        return jsonify({
            "error": "The patient or hospital name is too long."
        }), 400

    if blood_group not in valid_blood_groups:
        return jsonify({
            "error": "Invalid blood group."
        }), 400

    if units_required < 1 or units_required > 100:
        return jsonify({
            "error": "Units required must be between 1 and 100."
        }), 400

    if urgency not in valid_urgencies:
        return jsonify({
            "error": "Invalid urgency level."
        }), 400

    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute("""
            INSERT INTO emergency_requests
            (
                patient_name,
                hospital_name,
                blood_group,
                units_required,
                urgency,
                status
            )
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            patient_name,
            hospital_name,
            blood_group,
            units_required,
            urgency,
            "Pending"
        ))

        request_id = cursor.lastrowid

        connection.commit()

        return jsonify({
            "message": "Emergency request submitted successfully.",
            "request_id": request_id,
            "status": "Pending"
        }), 201

    except Exception as error:

        if connection:
            connection.rollback()

        print("Emergency request creation error:", error)

        return jsonify({
            "error": "Unable to save emergency request."
        }), 500

    finally:
        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =====================================================
# BLOOD ALLOCATIONS
# =====================================================

def ensure_allocation_table(cursor):
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS blood_allocations (
            allocation_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
            allocation_type VARCHAR(20) NOT NULL,
            patient_name VARCHAR(100) NULL,
            hospital_name VARCHAR(150) NOT NULL,
            blood_group VARCHAR(3) NOT NULL,
            units_allocated INT NOT NULL,
            request_id INT NULL,
            allocated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_blood_allocations_request_id (request_id),
            INDEX idx_blood_allocations_allocated_at (allocated_at)
        )
    """)


@app.route("/api/allocations", methods=["GET"])
def get_allocations():

    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        ensure_allocation_table(cursor)

        cursor.execute("""
            SELECT
                allocation_id,
                allocation_type,
                patient_name,
                hospital_name,
                blood_group,
                units_allocated,
                request_id,
                allocated_at
            FROM blood_allocations
            ORDER BY allocated_at DESC, allocation_id DESC
        """)

        allocations = cursor.fetchall()

        for item in allocations:
            if item.get("allocated_at") is not None:
                item["allocated_at"] = str(item["allocated_at"])

        return jsonify(allocations), 200

    except Exception as error:
        print("Allocation loading error:", error)
        return jsonify({
            "error": "Unable to load allocation records."
        }), 500

    finally:
        if cursor:
            cursor.close()

        if connection:
            connection.close()


@app.route("/api/allocations", methods=["POST"])
def create_allocation():

    data = request.get_json(silent=True)

    if not isinstance(data, dict) or not data:
        return jsonify({
            "error": "Please provide allocation details."
        }), 400

    allocation_type = str(data.get("allocation_type", "")).strip().lower()
    valid_blood_groups = {
        "A+", "A-", "B+", "B-",
        "AB+", "AB-", "O+", "O-"
    }

    if allocation_type not in {"hospital", "emergency"}:
        return jsonify({
            "error": "Choose a hospital or emergency request allocation."
        }), 400

    if allocation_type == "hospital":
        hospital_name = str(data.get("hospital_name") or "").strip()
        patient_name = str(data.get("patient_name") or "").strip() or None
        blood_group = str(data.get("blood_group", "")).strip().upper()
        raw_units = data.get("units", 0)

        try:
            if isinstance(raw_units, bool):
                raise ValueError
            units = int(raw_units)
        except (ValueError, TypeError):
            return jsonify({
                "error": "Units must be a whole number."
            }), 400

        if isinstance(raw_units, float) and not raw_units.is_integer():
            return jsonify({
                "error": "Units must be a whole number."
            }), 400

        if not hospital_name or len(hospital_name) > 150:
            return jsonify({
                "error": "Enter a valid hospital name (up to 150 characters)."
            }), 400

        if patient_name and len(patient_name) > 100:
            return jsonify({
                "error": "Patient name must not exceed 100 characters."
            }), 400

        if blood_group not in valid_blood_groups:
            return jsonify({
                "error": "Select a valid blood group."
            }), 400

        if units < 1 or units > 100:
            return jsonify({
                "error": "Units must be between 1 and 100."
            }), 400

        request_id = None

    else:
        raw_request_id = data.get("request_id", 0)

        try:
            if isinstance(raw_request_id, bool):
                raise ValueError
            request_id = int(raw_request_id)
        except (ValueError, TypeError):
            return jsonify({
                "error": "Select a valid emergency request."
            }), 400

        if (
            isinstance(raw_request_id, float) and
            not raw_request_id.is_integer()
        ):
            return jsonify({
                "error": "Select a valid emergency request."
            }), 400

        if request_id < 1:
            return jsonify({
                "error": "Select a valid emergency request."
            }), 400

        hospital_name = None
        patient_name = None
        blood_group = None
        units = None

    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        ensure_allocation_table(cursor)

        if allocation_type == "emergency":
            cursor.execute("""
                SELECT
                    patient_name,
                    hospital_name,
                    blood_group,
                    units_required,
                    status
                FROM emergency_requests
                WHERE request_id = %s
                FOR UPDATE
            """, (request_id,))

            emergency_request = cursor.fetchone()

            if not emergency_request:
                connection.rollback()
                return jsonify({
                    "error": "Emergency request was not found."
                }), 404

            if str(emergency_request["status"]).lower() != "pending":
                connection.rollback()
                return jsonify({
                    "error": "This emergency request is no longer pending."
                }), 409

            patient_name = emergency_request["patient_name"]
            hospital_name = emergency_request["hospital_name"]
            blood_group = emergency_request["blood_group"]
            units = int(emergency_request["units_required"])

        cursor.execute("""
            SELECT available_units
            FROM blood_inventory
            WHERE blood_group = %s
            FOR UPDATE
        """, (blood_group,))

        inventory_row = cursor.fetchone()

        if not inventory_row:
            connection.rollback()
            return jsonify({
                "error": "No inventory record exists for this blood group."
            }), 404

        available_units = int(inventory_row["available_units"])

        if available_units < units:
            connection.rollback()
            return jsonify({
                "error": (
                    f"Insufficient {blood_group} stock. "
                    f"Available: {available_units} units; required: {units}."
                )
            }), 409

        cursor.execute("""
            UPDATE blood_inventory
            SET available_units = available_units - %s
            WHERE blood_group = %s AND available_units >= %s
        """, (units, blood_group, units))

        if cursor.rowcount != 1:
            connection.rollback()
            return jsonify({
                "error": "Inventory changed during allocation. Please retry."
            }), 409

        if allocation_type == "emergency":
            cursor.execute("""
                UPDATE emergency_requests
                SET status = 'Allocated'
                WHERE request_id = %s AND status = %s
            """, (request_id, emergency_request["status"]))

            if cursor.rowcount != 1:
                connection.rollback()
                return jsonify({
                    "error": "Emergency request changed during allocation. Please retry."
                }), 409

        cursor.execute("""
            INSERT INTO blood_allocations
                (allocation_type, patient_name, hospital_name, blood_group,
                 units_allocated, request_id)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            allocation_type,
            patient_name,
            hospital_name,
            blood_group,
            units,
            request_id
        ))

        allocation_id = cursor.lastrowid
        connection.commit()

        return jsonify({
            "message": "Blood allocated successfully and inventory updated.",
            "allocation_id": allocation_id,
            "allocation_type": allocation_type,
            "blood_group": blood_group,
            "units_allocated": units
        }), 201

    except Exception as error:
        if connection:
            connection.rollback()

        print("Blood allocation error:", error)
        return jsonify({
            "error": "Unable to complete allocation. Check the Flask terminal."
        }), 500

    finally:
        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =====================================================
# RUN FLASK SERVER
# =====================================================

if __name__ == "__main__":
    app.run(debug=True)

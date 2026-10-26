// =====================================================
// BLOODLINK - COMPLETE JAVASCRIPT
// Connects simulation.html to the Flask and MySQL backend
// =====================================================

document.addEventListener("DOMContentLoaded", function () {

    console.log("BloodLink JavaScript loaded successfully!");

    // =================================================
    // GLOBAL DATA
    // =================================================

    let bloodInventory = {};
    let bloodMinimumStock = {};
    let donorRecords = [];
    let emergencyRequests = [];

    // =================================================
    // ELEMENT REFERENCES
    // =================================================

    const donorModal = document.getElementById("donorModal");
    const donorForm = document.getElementById("donorForm");

    const registerDonorBtn =
        document.getElementById("registerDonorBtn");

    const registerDonorBtn2 =
        document.getElementById("registerDonorBtn2");

    const closeModalBtn =
        document.getElementById("closeModalBtn");

    const cancelModalBtn =
        document.getElementById("cancelModalBtn");

    const donorName =
        document.getElementById("donorName");

    const donorPhone =
        document.getElementById("donorPhone");

    const donorBloodGroup =
        document.getElementById("donorBloodGroup");

    const donorLocation =
        document.getElementById("donorLocation");

    const donorTableBody =
        document.getElementById("donorTableBody");

    const inventoryTableBody =
        document.getElementById("inventoryTableBody");

    const emergencyForm =
        document.getElementById("emergencyRequestForm");

    const emergencyTableBody =
        document.getElementById("emergencyRequestsTableBody");

    const allocationForm =
        document.getElementById("allocationForm");

    const allocationTypeSelect =
        document.getElementById("allocationType");

    const hospitalAllocationFields =
        document.getElementById("hospitalAllocationFields");

    const emergencyAllocationFields =
        document.getElementById("emergencyAllocationFields");

    const allocationRequestSelect =
        document.getElementById("allocationRequest");

    const historyTableBody =
        document.getElementById("historyTableBody");

    const submitAllocationBtn =
        document.getElementById("submitAllocationBtn");

    const refreshEmergencyRequestsBtn =
        document.getElementById("refreshEmergencyRequestsBtn");

    const newEmergencyRequestBtn =
        document.getElementById("newEmergencyRequestBtn");

    const submitEmergencyRequestBtn =
        document.getElementById("submitEmergencyRequestBtn");

    const toastMessage =
        document.getElementById("toastMessage");


    // =================================================
    // NOTIFICATION FUNCTION
    // =================================================

    function showToast(message, isError = false) {

        if (!toastMessage) {
            alert(message);
            return;
        }

        toastMessage.textContent = message;
        toastMessage.style.display = "block";

        toastMessage.style.backgroundColor =
            isError ? "#b91c1c" : "#15803d";

        toastMessage.style.color = "#ffffff";
        toastMessage.style.padding = "14px 18px";
        toastMessage.style.borderRadius = "8px";
        toastMessage.style.boxShadow =
            "0 4px 12px rgba(0,0,0,0.2)";

        clearTimeout(window.bloodLinkToastTimer);

        window.bloodLinkToastTimer = setTimeout(function () {
            toastMessage.style.display = "none";
        }, 3500);
    }


    // =================================================
    // API HELPER
    // =================================================

    async function apiRequest(url, options = {}) {

        const response = await fetch(url, options);

        let result;

        try {
            result = await response.json();
        } catch (error) {
            throw new Error(
                "The server returned an invalid response."
            );
        }

        if (!response.ok) {

            throw new Error(
                result.error ||
                result.message ||
                "The request failed."
            );
        }

        return result;
    }


    // =================================================
    // PAGE NAVIGATION
    // =================================================

    function showPage(pageId) {

        const selectedPage = document.getElementById(pageId);

        if (!selectedPage) {
            console.error("Page not found:", pageId);
            return;
        }

        document.querySelectorAll(".page-section").forEach(
            function (page) {
                page.classList.remove("active");
            }
        );

        selectedPage.classList.add("active");

        document.querySelectorAll(".nav-item").forEach(
            function (item) {

                item.classList.remove("active");

                if (item.dataset.page === pageId) {
                    item.classList.add("active");
                }
            }
        );

        // Refresh information when the relevant page opens.

        if (pageId === "dashboard") {
            loadBloodInventory();
            loadDonors();
            loadEmergencyRequests();
        }

        if (pageId === "donors") {
            loadDonors();
        }

        if (pageId === "inventory") {
            loadBloodInventory();
        }

        if (pageId === "emergency") {
            loadEmergencyRequests();
        }

        if (pageId === "allocation") {
            loadBloodInventory();
            loadEmergencyRequests();
        }

        if (pageId === "history") {
            loadAllocations();
        }
    }


    document.querySelectorAll(".nav-item").forEach(
        function (item) {

            item.addEventListener("click", function () {

                const pageId = item.dataset.page;

                if (pageId) {
                    showPage(pageId);
                }
            });
        }
    );


    document.querySelectorAll("[data-go]").forEach(
        function (button) {

            button.addEventListener("click", function () {

                const pageId = button.dataset.go;

                if (pageId) {
                    showPage(pageId);
                }
            });
        }
    );


    // =================================================
    // DONOR MODAL
    // =================================================

    function openDonorModal() {

        if (!donorModal) {
            showToast("Donor registration form not found.", true);
            return;
        }

        donorModal.classList.add("active");
        donorModal.style.display = "flex";

        if (donorName) {
            donorName.focus();
        }
    }


    function closeDonorModal() {

        if (donorModal) {
            donorModal.classList.remove("active");
            donorModal.style.display = "none";
        }
    }


    if (registerDonorBtn) {

        registerDonorBtn.addEventListener("click", function () {
            openDonorModal();
        });
    }


    if (registerDonorBtn2) {

        registerDonorBtn2.addEventListener("click", function () {
            openDonorModal();
        });
    }


    if (closeModalBtn) {
        closeModalBtn.addEventListener("click", closeDonorModal);
    }


    if (cancelModalBtn) {
        cancelModalBtn.addEventListener("click", closeDonorModal);
    }


    if (donorModal) {

        donorModal.addEventListener("click", function (event) {

            if (event.target === donorModal) {
                closeDonorModal();
            }
        });
    }


    document.addEventListener("keydown", function (event) {

        if (event.key === "Escape") {
            closeDonorModal();
        }
    });


    // =================================================
    // LOAD BLOOD INVENTORY
    // =================================================

    async function loadBloodInventory() {

        try {

            const inventory = await apiRequest("/api/inventory");

            if (!Array.isArray(inventory)) {
                throw new Error("Invalid inventory data received.");
            }

            bloodInventory = {};
            bloodMinimumStock = {};

            inventory.forEach(function (item) {

                bloodInventory[item.blood_group] =
                    Number(item.available_units) || 0;

                bloodMinimumStock[item.blood_group] =
                    Number(item.minimum_stock) || 0;
            });

            updateInventoryDisplay();
            updateDashboard();

            console.log("Inventory loaded:", bloodInventory);

        } catch (error) {

            console.error("Inventory error:", error);

            const totalUnitsElement =
                document.getElementById("totalUnits");

            if (totalUnitsElement) {
                totalUnitsElement.textContent = "Unavailable";
            }

            showToast(
                "Could not load blood inventory. Check the Flask server.",
                true
            );
        }
    }


    // =================================================
    // UPDATE INVENTORY CARDS AND TABLE
    // =================================================

    function updateInventoryDisplay() {

        document.querySelectorAll(".blood-card").forEach(
            function (card) {

                const group = card.dataset.group;

                if (
                    !group ||
                    !Object.prototype.hasOwnProperty.call(
                        bloodInventory,
                        group
                    )
                ) {
                    return;
                }

                const units = bloodInventory[group];
                const minimum = bloodMinimumStock[group] || 0;

                const unitCount =
                    card.querySelector(".unit-count");

                const progressFill =
                    card.querySelector(".progress-fill");

                const stockStatus =
                    card.querySelector(".stock-status");

                if (unitCount) {
                    unitCount.textContent = units + " units";
                }

                if (progressFill) {

                    // Visual scale: 100 units equals a full bar.
                    const percentage = Math.min(
                        Math.max(units, 0),
                        100
                    );

                    progressFill.style.width =
                        percentage + "%";
                }

                if (stockStatus) {

                    if (units <= minimum) {

                        stockStatus.textContent = "Critical Stock";

                        stockStatus.style.backgroundColor = "#fee2e2";
                        stockStatus.style.color = "#991b1b";

                    } else if (units <= minimum * 2) {

                        stockStatus.textContent = "Low Stock";

                        stockStatus.style.backgroundColor = "#fef3c7";
                        stockStatus.style.color = "#92400e";

                    } else {

                        stockStatus.textContent = "Available";

                        stockStatus.style.backgroundColor = "#dcfce7";
                        stockStatus.style.color = "#166534";
                    }
                }
            }
        );


        if (!inventoryTableBody) {
            return;
        }

        inventoryTableBody.innerHTML = "";

        const groups = Object.keys(bloodInventory).sort(
            function (a, b) {

                const order = [
                    "A+", "A-", "B+", "B-",
                    "AB+", "AB-", "O+", "O-"
                ];

                return order.indexOf(a) - order.indexOf(b);
            }
        );

        if (groups.length === 0) {

            inventoryTableBody.innerHTML = `
                <tr>
                    <td colspan="4">No inventory records found.</td>
                </tr>
            `;

            return;
        }

        groups.forEach(function (group) {

            const units = bloodInventory[group];
            const minimum = bloodMinimumStock[group] || 0;

            let status = "Available";

            if (units <= minimum) {
                status = "Critical Stock";
            } else if (units <= minimum * 2) {
                status = "Low Stock";
            }

            const row = document.createElement("tr");

            [
                group,
                units,
                minimum,
                status
            ].forEach(function (value) {

                const cell = document.createElement("td");

                cell.textContent = String(value);

                row.appendChild(cell);
            });

            inventoryTableBody.appendChild(row);
        });
    }


    // =================================================
    // LOAD DONORS FROM MYSQL
    // =================================================

    async function loadDonors() {

        try {

            const donors = await apiRequest("/api/donors");

            if (!Array.isArray(donors)) {
                throw new Error("Invalid donor data received.");
            }

            donorRecords = donors;

            displayDonors();
            updateDashboard();

            console.log("Donors loaded:", donorRecords);

        } catch (error) {

            console.error("Donor loading error:", error);

            if (donorTableBody) {

                donorTableBody.innerHTML = `
                    <tr>
                        <td colspan="5">
                            Could not load donor records.
                        </td>
                    </tr>
                `;
            }
        }
    }


    // =================================================
    // DISPLAY DONORS
    // =================================================

    function displayDonors() {

        if (!donorTableBody) {
            return;
        }

        donorTableBody.innerHTML = "";

        if (donorRecords.length === 0) {

            donorTableBody.innerHTML = `
                <tr>
                    <td colspan="5">
                        No donors registered yet.
                    </td>
                </tr>
            `;

            return;
        }

        donorRecords.forEach(function (donor) {

            const row = document.createElement("tr");

            const values = [
                donor.donor_id,
                donor.name,
                donor.phone,
                donor.blood_group,
                donor.location
            ];

            values.forEach(function (value) {

                const cell = document.createElement("td");

                cell.textContent =
                    value === null || value === undefined
                        ? ""
                        : String(value);

                row.appendChild(cell);
            });

            donorTableBody.appendChild(row);
        });

        applyDonorSearch();
    }


    // =================================================
    // DONOR SEARCH
    // =================================================

    const donorSearch = document.getElementById("donorSearch");

    function applyDonorSearch() {

        if (!donorSearch || !donorTableBody) {
            return;
        }

        const searchText = donorSearch.value
            .trim()
            .toLowerCase();

        donorTableBody.querySelectorAll("tr").forEach(
            function (row) {

                row.style.display = row.textContent
                    .toLowerCase()
                    .includes(searchText)
                        ? ""
                        : "none";
            }
        );
    }


    if (donorSearch) {

        donorSearch.addEventListener(
            "input",
            applyDonorSearch
        );
    }


    // =================================================
    // REGISTER DONOR
    // =================================================

    if (donorForm) {

        donorForm.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();

                const name = donorName.value.trim();
                const phone = donorPhone.value.trim();
                const bloodGroup = donorBloodGroup.value;
                const location = donorLocation.value.trim();

                if (!name || !phone || !bloodGroup || !location) {

                    showToast(
                        "Please complete all donor fields.",
                        true
                    );

                    return;
                }

                if (!/^[0-9]{10}$/.test(phone)) {

                    showToast(
                        "Enter a valid 10-digit phone number.",
                        true
                    );

                    return;
                }

                const submitButton = donorForm.querySelector(
                    'button[type="submit"]'
                );

                if (submitButton) {
                    submitButton.disabled = true;
                    submitButton.textContent = "Registering...";
                }

                try {

                    const result = await apiRequest(
                        "/api/donors",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type": "application/json"
                            },

                            body: JSON.stringify({
                                name: name,
                                phone: phone,
                                blood_group: bloodGroup,
                                location: location
                            })
                        }
                    );

                    showToast(
                        result.message ||
                        "Donor registered successfully."
                    );

                    donorForm.reset();

                    closeDonorModal();

                    await loadDonors();

                } catch (error) {

                    console.error(
                        "Donor registration error:",
                        error
                    );

                    showToast(error.message, true);

                } finally {

                    if (submitButton) {
                        submitButton.disabled = false;
                        submitButton.textContent = "Register Donor";
                    }
                }
            }
        );
    }


    // =================================================
    // LOAD EMERGENCY REQUESTS
    // =================================================

    async function loadEmergencyRequests() {

        if (!emergencyTableBody) {
            return;
        }

        emergencyTableBody.innerHTML = `
            <tr>
                <td colspan="9">Loading requests...</td>
            </tr>
        `;

        try {

            const requests = await apiRequest(
                "/api/emergency-requests"
            );

            if (!Array.isArray(requests)) {
                throw new Error(
                    "Invalid emergency request data received."
                );
            }

            emergencyRequests = requests;

            displayEmergencyRequests();
            updateDashboard();

            console.log(
                "Emergency requests loaded:",
                emergencyRequests
            );

        } catch (error) {

            console.error(
                "Emergency request loading error:",
                error
            );

            emergencyTableBody.innerHTML = `
                <tr>
                    <td colspan="9">
                        Unable to load requests. Check the Flask server
                        and database.
                    </td>
                </tr>
            `;

            const pendingElement =
                document.getElementById("pendingRequests");

            if (pendingElement) {
                pendingElement.textContent = "Unavailable";
            }
        }
    }


    // =================================================
    // DISPLAY EMERGENCY REQUESTS
    // =================================================

    function displayEmergencyRequests() {

        if (!emergencyTableBody) {
            return;
        }

        emergencyTableBody.innerHTML = "";

        if (emergencyRequests.length === 0) {

            emergencyTableBody.innerHTML = `
                <tr>
                    <td colspan="9">
                        No emergency requests found.
                    </td>
                </tr>
            `;

            updateEmergencyAllocationOptions();
            return;
        }

        updateEmergencyAllocationOptions();

        emergencyRequests.forEach(function (item) {

            const row = document.createElement("tr");

            const values = [
                item.request_id,
                item.patient_name,
                item.hospital_name,
                item.blood_group,
                item.units_required,
                item.urgency,
                item.status,
                item.requested_at || ""
            ];

            values.forEach(function (value) {

                const cell = document.createElement("td");

                cell.textContent =
                    value === null || value === undefined
                        ? ""
                        : String(value);

                row.appendChild(cell);
            });

            const actionCell = document.createElement("td");
            const allocateButton = document.createElement("button");

            if (String(item.status || "").toLowerCase() === "pending") {
                allocateButton.type = "button";
                allocateButton.className = "btn btn-secondary";
                allocateButton.textContent = "Allocate";
                allocateButton.addEventListener("click", function () {
                    allocationTypeSelect.value = "emergency";
                    updateAllocationFields();
                    allocationRequestSelect.value =
                        String(item.request_id);
                    showPage("allocation");
                    allocationRequestSelect.value =
                        String(item.request_id);
                });
                actionCell.appendChild(allocateButton);
            } else {
                actionCell.textContent = "-";
            }

            row.appendChild(actionCell);
            emergencyTableBody.appendChild(row);
        });
    }


    function updateEmergencyAllocationOptions() {

        if (!allocationRequestSelect) {
            return;
        }

        const selectedRequest = allocationRequestSelect.value;
        allocationRequestSelect.innerHTML = `
            <option value="">Select a pending request</option>
        `;

        emergencyRequests
            .filter(function (item) {
                return String(item.status || "").toLowerCase() === "pending";
            })
            .forEach(function (item) {
                const option = document.createElement("option");
                option.value = String(item.request_id);
                option.textContent =
                    "#" + item.request_id + " - " + item.patient_name +
                    " (" + item.hospital_name + ", " + item.blood_group +
                    ", " + item.units_required + " units)";
                allocationRequestSelect.appendChild(option);
            });

        if (selectedRequest) {
            allocationRequestSelect.value = selectedRequest;
        }
    }


    function updateAllocationFields() {

        if (
            !allocationTypeSelect ||
            !hospitalAllocationFields ||
            !emergencyAllocationFields ||
            !allocationRequestSelect
        ) {
            return;
        }

        const isEmergency =
            allocationTypeSelect.value === "emergency";

        hospitalAllocationFields.classList.toggle(
            "hidden",
            isEmergency
        );
        emergencyAllocationFields.classList.toggle(
            "hidden",
            !isEmergency
        );

        hospitalAllocationFields
            .querySelectorAll("input, select")
            .forEach(function (field) {
                field.disabled = isEmergency;
            });

        allocationRequestSelect.disabled = !isEmergency;
        allocationRequestSelect.required = isEmergency;
    }


    if (allocationTypeSelect) {
        allocationTypeSelect.addEventListener(
            "change",
            updateAllocationFields
        );
        updateAllocationFields();
    }


    if (allocationForm) {
        allocationForm.addEventListener(
            "submit",
            async function (event) {
                event.preventDefault();

                const isEmergency =
                    allocationTypeSelect.value === "emergency";

                const payload = isEmergency
                    ? {
                        allocation_type: "emergency",
                        request_id: Number(allocationRequestSelect.value)
                    }
                    : {
                        allocation_type: "hospital",
                        hospital_name: document.getElementById(
                            "allocationHospital"
                        ).value.trim(),
                        patient_name: document.getElementById(
                            "allocationPatient"
                        ).value.trim(),
                        blood_group: document.getElementById(
                            "allocationBloodGroup"
                        ).value,
                        units: Number(document.getElementById(
                            "allocationUnits"
                        ).value)
                    };

                if (
                    (isEmergency &&
                        (!Number.isInteger(payload.request_id) ||
                            payload.request_id < 1)) ||
                    (!isEmergency &&
                        (!payload.hospital_name ||
                            !payload.blood_group ||
                            !Number.isInteger(payload.units) ||
                            payload.units < 1 ||
                            payload.units > 100))
                ) {
                    showToast("Enter valid allocation details.", true);
                    return;
                }

                submitAllocationBtn.disabled = true;
                submitAllocationBtn.textContent = "Allocating...";

                try {
                    const result = await apiRequest(
                        "/api/allocations",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify(payload)
                        }
                    );

                    showToast(result.message);
                    allocationForm.reset();
                    updateAllocationFields();

                    await Promise.all([
                        loadBloodInventory(),
                        loadEmergencyRequests(),
                        loadAllocations()
                    ]);
                } catch (error) {
                    console.error("Blood allocation error:", error);
                    showToast(error.message, true);
                } finally {
                    submitAllocationBtn.disabled = false;
                    submitAllocationBtn.textContent = "Allocate Blood";
                }
            }
        );
    }


    async function loadAllocations() {

        if (!historyTableBody) {
            return;
        }

        historyTableBody.innerHTML = `
            <tr>
                <td colspan="6">Loading allocation records...</td>
            </tr>
        `;

        try {
            const allocations = await apiRequest("/api/allocations");

            if (!Array.isArray(allocations)) {
                throw new Error("Invalid allocation data received.");
            }

            historyTableBody.innerHTML = "";

            if (allocations.length === 0) {
                historyTableBody.innerHTML = `
                    <tr>
                        <td colspan="6">No allocation records found.</td>
                    </tr>
                `;
                return;
            }

            allocations.forEach(function (item) {
                const row = document.createElement("tr");
                const values = [
                    item.allocation_type,
                    item.patient_name || "",
                    item.hospital_name,
                    item.blood_group,
                    item.units_allocated,
                    item.allocated_at || ""
                ];

                values.forEach(function (value) {
                    const cell = document.createElement("td");
                    cell.textContent =
                        value === null || value === undefined
                            ? ""
                            : String(value);
                    row.appendChild(cell);
                });

                historyTableBody.appendChild(row);
            });
        } catch (error) {
            console.error("Allocation loading error:", error);
            historyTableBody.innerHTML = `
                <tr>
                    <td colspan="6">Unable to load allocation records.</td>
                </tr>
            `;
        }
    }


    // =================================================
    // SUBMIT EMERGENCY REQUEST
    // =================================================

    if (emergencyForm) {

        emergencyForm.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();

                const patientInput =
                    document.getElementById("patientName");

                const hospitalInput =
                    document.getElementById("hospitalName");

                const groupInput =
                    document.getElementById("requestBloodGroup");

                const unitsInput =
                    document.getElementById("unitsRequired");

                const urgencyInput =
                    document.getElementById("requestUrgency");


                const payload = {

                    patient_name: patientInput.value.trim(),

                    hospital_name: hospitalInput.value.trim(),

                    blood_group: groupInput.value,

                    units_required: Number(unitsInput.value),

                    urgency: urgencyInput.value
                };


                if (
                    !payload.patient_name ||
                    !payload.hospital_name ||
                    !payload.blood_group ||
                    !Number.isInteger(payload.units_required) ||
                    payload.units_required < 1 ||
                    payload.units_required > 100 ||
                    !payload.urgency
                ) {

                    showToast(
                        "Please enter valid emergency request details.",
                        true
                    );

                    return;
                }


                if (submitEmergencyRequestBtn) {

                    submitEmergencyRequestBtn.disabled = true;

                    submitEmergencyRequestBtn.textContent =
                        "Submitting...";
                }


                try {

                    const result = await apiRequest(
                        "/api/emergency-requests",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type": "application/json"
                            },

                            body: JSON.stringify(payload)
                        }
                    );


                    showToast(
                        result.message ||
                        "Emergency request submitted successfully."
                    );

                    emergencyForm.reset();

                    await loadEmergencyRequests();

                } catch (error) {

                    console.error(
                        "Emergency submission error:",
                        error
                    );

                    showToast(error.message, true);

                } finally {

                    if (submitEmergencyRequestBtn) {

                        submitEmergencyRequestBtn.disabled = false;

                        submitEmergencyRequestBtn.textContent =
                            "Submit Request";
                    }
                }
            }
        );
    }


    // =================================================
    // REFRESH EMERGENCY REQUESTS
    // =================================================

    if (refreshEmergencyRequestsBtn) {

        refreshEmergencyRequestsBtn.addEventListener(
            "click",
            loadEmergencyRequests
        );
    }


    // =================================================
    // NEW EMERGENCY REQUEST BUTTON
    // =================================================

    if (newEmergencyRequestBtn) {

        newEmergencyRequestBtn.addEventListener(
            "click",
            function () {

                const patientInput =
                    document.getElementById("patientName");

                if (patientInput) {
                    patientInput.focus();
                }
            }
        );
    }


    // =================================================
    // UPDATE DASHBOARD
    // =================================================

    function updateDashboard() {

        const totalUnits = Object.values(bloodInventory)
            .reduce(function (total, units) {

                return total + units;

            }, 0);


        const totalDonors = donorRecords.length;


        const pendingCount = emergencyRequests.filter(
            function (item) {

                return String(item.status || "")
                    .toLowerCase() === "pending";
            }
        ).length;


        const criticalCount = Object.keys(bloodInventory)
            .filter(function (group) {

                return bloodInventory[group] <=
                    (bloodMinimumStock[group] || 0);

            }).length;


        const totalUnitsElement =
            document.getElementById("totalUnits");

        const totalDonorsElement =
            document.getElementById("totalDonors");

        const pendingRequestsElement =
            document.getElementById("pendingRequests");

        const criticalAlertsElement =
            document.getElementById("criticalAlerts");

        const analyticsTotalElement =
            document.getElementById("analyticsTotal");

        const analyticsLowElement =
            document.getElementById("analyticsLow");


        if (totalUnitsElement) {
            totalUnitsElement.textContent = totalUnits;
        }

        if (totalDonorsElement) {
            totalDonorsElement.textContent = totalDonors;
        }

        if (pendingRequestsElement) {
            pendingRequestsElement.textContent = pendingCount;
        }

        if (criticalAlertsElement) {
            criticalAlertsElement.textContent = criticalCount;
        }

        if (analyticsTotalElement) {
            analyticsTotalElement.textContent = totalUnits;
        }

        if (analyticsLowElement) {
            analyticsLowElement.textContent = criticalCount;
        }
    }


    // =================================================
    // INITIALIZE BLOODLINK
    // =================================================

    loadBloodInventory();

    loadDonors();

    loadEmergencyRequests();

});


import { enhanceSelects } from "/shared/scripts/styled-select.js";

export function mount() {
const disposeDropdowns = enhanceSelects(document);

    // API configuration
    const API_BASE = "/api";
    const MACHINES_ENDPOINT = `${API_BASE}/machines`;

    // Page elements
    const userName = document.getElementById("userName");
    const logoutButton = document.getElementById("logoutButton");
    const refreshButton = document.getElementById("refreshButton");
    const addMachineButton = document.getElementById("addMachineButton");

    const searchInput = document.getElementById("searchInput");
    const statusFilter = document.getElementById("statusFilter");
    const searchButton = document.getElementById("searchButton");
    const clearButton = document.getElementById("clearButton");

    const machinesTableBody = document.getElementById("machinesTableBody");
    const loadingMessage = document.getElementById("loadingMessage");
    const errorMessage = document.getElementById("errorMessage");
    const emptyState = document.getElementById("emptyState");

    // Summary cards
    const totalMachines = document.getElementById("totalMachines");
    const operationalMachines = document.getElementById("operationalMachines");
    const faultReportedMachines = document.getElementById("faultReportedMachines");
    const maintenanceMachines = document.getElementById("maintenanceMachines");
    const outOfServiceMachines = document.getElementById("outOfServiceMachines");

    // Machine form dialog
    const machineDialog = document.getElementById("machineDialog");
    const machineForm = document.getElementById("machineForm");
    const dialogTitle = document.getElementById("dialogTitle");

    const closeDialogButton = document.getElementById("closeDialogButton");
    const cancelButton = document.getElementById("cancelButton");
    const saveMachineButton = document.getElementById("saveMachineButton");

    const machineId = document.getElementById("machineId");
    const machineCode = document.getElementById("machineCode");
    const machineName = document.getElementById("machineName");
    const machineLocation = document.getElementById("machineLocation");
    const machineStatus = document.getElementById("machineStatus");
    const formError = document.getElementById("formError");

    // Machine details dialog
    const detailsDialog = document.getElementById("detailsDialog");
    const closeDetailsButton = document.getElementById("closeDetailsButton");

    // Store machine records
    let allMachines = [];
    let canManageMachines = false;

    // API request helper
    async function apiRequest(url, options = {}) {

        const response = await fetch(url, {
            credentials: "include",
            ...options,
            headers: {
                ...(options.headers || {})
            }
        });

        if (response.status === 401 || response.status === 403) {
            throw new Error("Your session has expired or you are not authorised.");
        }

        if (!response.ok) {
            const message = await response.text();

            throw new Error(
                message || `Request failed with status ${response.status}.`
            );
        }

        if (response.status === 204) {
            return null;
        }

        const contentType = response.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
            return response.json();
        }

        return null;
    }

    // Handle different possible response formats
    function getMachineList(data) {

        if (Array.isArray(data)) {
            return data;
        }

        if (Array.isArray(data?.content)) {
            return data.content;
        }

        if (Array.isArray(data?.data)) {
            return data.data;
        }

        if (Array.isArray(data?.machines)) {
            return data.machines;
        }

        return [];
    }

    // Get machine ID
    function getMachineId(machine) {
        return machine.id ?? machine.machineId;
    }

    // Get machine code
    function getMachineCode(machine) {
        return machine.identifier ?? machine.machineCode ?? machine.code ?? machine.machineIdentifier ?? "";
    }

    // Get machine name
    function getMachineName(machine) {
        return machine.name ?? machine.machineName ?? "";
    }

    // Get machine location
    function getLocation(machine) {
        return machine.location ?? machine.machineLocation ?? "Not available";
    }

    // Get machine status
    function getStatus(machine) {
        return String(machine.status ?? "OPERATIONAL").toUpperCase();
    }

    // Format status for display
    function formatStatus(status) {
        return status.replaceAll("_", " ");
    }

    // Format date
    function formatDate(value) {

        if (!value) {
            return "Not available";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return String(value);
        }

        return date.toLocaleString();
    }

    // Safely create table cells
    function createCell(value) {

        const cell = document.createElement("td");

        cell.textContent =
            value === null || value === undefined || value === ""
                ? "Not available"
                : String(value);

        return cell;
    }

    // Load logged-in user
    async function loadUser() {

        try {
            const data = await window.roleNavigationUserPromise;

            const user = data?.user ?? data?.data ?? data;

            if (user?.displayName) userName.textContent = user.displayName;
            canManageMachines = user?.role === "SYSTEM_ADMINISTRATOR";
            addMachineButton.hidden = !canManageMachines;

        } catch (error) {
            console.error("Unable to load user:", error);
        }
    }

    // Update machine summary cards
    function updateSummary(machines) {

        totalMachines.textContent = machines.length;

        operationalMachines.textContent = machines.filter(machine =>
            getStatus(machine) === "OPERATIONAL"
        ).length;

        faultReportedMachines.textContent = machines.filter(machine =>
            getStatus(machine) === "FAULT_REPORTED"
        ).length;

        maintenanceMachines.textContent = machines.filter(machine =>
            getStatus(machine) === "UNDER_MAINTENANCE"
        ).length;

        outOfServiceMachines.textContent = machines.filter(machine =>
            getStatus(machine) === "OUT_OF_SERVICE"
        ).length;
    }

    // Create machine status badge
    function createStatusBadge(status) {

        const badge = document.createElement("span");

        badge.className = "status-badge";

        const statusClass = status.toLowerCase().replaceAll("_", "-");

        badge.classList.add(statusClass);

        badge.textContent = formatStatus(status);

        return badge;
    }

    // Display machines in the table
    function displayMachines(machines) {

        machinesTableBody.replaceChildren();

        emptyState.hidden = machines.length !== 0;

        machines.forEach(machine => {

            const row = document.createElement("tr");

            // Machine code
            const codeCell = createCell(getMachineCode(machine));
            codeCell.classList.add("machine-code");
            row.appendChild(codeCell);

            // Machine name
            row.appendChild(createCell(getMachineName(machine)));

            // Location
            row.appendChild(createCell(getLocation(machine)));

            // Status
            const statusCell = document.createElement("td");

            statusCell.appendChild(
                createStatusBadge(getStatus(machine))
            );

            row.appendChild(statusCell);

            // Actions
            const actionCell = document.createElement("td");
            const actionContainer = document.createElement("div");

            actionContainer.className = "table-actions";

            const viewButton = document.createElement("button");

            viewButton.type = "button";
            viewButton.className = "view-button";
            viewButton.textContent = "View";

            viewButton.addEventListener("click", () => {
                viewMachine(getMachineId(machine));
            });

            actionContainer.append(viewButton);
            if (canManageMachines) {
                const editButton = document.createElement("button");
                editButton.type = "button";
                editButton.className = "edit-button";
                editButton.textContent = "Edit";
                editButton.addEventListener("click", () => editMachine(machine));
                actionContainer.append(editButton);
            }
            actionCell.appendChild(actionContainer);

            row.appendChild(actionCell);

            machinesTableBody.appendChild(row);
        });
    }

    // Load machines from backend
    async function loadMachines() {

        loadingMessage.hidden = false;
        loadingMessage.textContent = "Loading machines...";

        errorMessage.hidden = true;
        emptyState.hidden = true;

        refreshButton.disabled = true;
        searchButton.disabled = true;
        addMachineButton.disabled = true;

        try {

            const data = await apiRequest(MACHINES_ENDPOINT);

            allMachines = getMachineList(data);

            updateSummary(allMachines);

            applyFilters();

            loadingMessage.hidden = true;

        } catch (error) {

            console.error("Unable to load machines:", error);

            loadingMessage.hidden = true;
            errorMessage.hidden = false;

            errorMessage.textContent =
                `Unable to load machines: ${error.message}`;

            machinesTableBody.replaceChildren();

            updateSummary([]);

        } finally {

            refreshButton.disabled = false;
            searchButton.disabled = false;
            addMachineButton.disabled = false;
        }
    }

    // Search and filter machines
    function applyFilters() {

        const searchTerm = searchInput.value.trim().toLowerCase();
        const selectedStatus = statusFilter.value;

        const filteredMachines = allMachines.filter(machine => {

            const code = String(getMachineCode(machine)).toLowerCase();
            const name = String(getMachineName(machine)).toLowerCase();

            const matchesSearch =
                !searchTerm ||
                code.includes(searchTerm) ||
                name.includes(searchTerm);

            const matchesStatus =
                !selectedStatus ||
                getStatus(machine) === selectedStatus;

            return matchesSearch && matchesStatus;
        });

        displayMachines(filteredMachines);
    }

    // Reset machine form
    function resetMachineForm() {

        machineForm.reset();

        machineId.value = "";
        machineStatus.value = "OPERATIONAL";
        machineStatus.dispatchEvent(new Event("styled-select-sync"));

        formError.hidden = true;
        formError.textContent = "";
    }

    // Open add machine dialog
    function openAddDialog() {

        resetMachineForm();

        dialogTitle.textContent = "Add New Machine";
        saveMachineButton.textContent = "Save Machine";

        machineDialog.showModal();
    }

    // Open edit machine dialog
    function editMachine(machine) {

        resetMachineForm();

        machineId.value = getMachineId(machine);
        machineCode.value = getMachineCode(machine);
        machineName.value = getMachineName(machine);
        machineLocation.value = getLocation(machine) === "Not available"
            ? ""
            : getLocation(machine);

        machineStatus.value = getStatus(machine);
        machineStatus.dispatchEvent(new Event("styled-select-sync"));

        dialogTitle.textContent = "Edit Machine";
        saveMachineButton.textContent = "Update Machine";

        machineDialog.showModal();
    }

    // Save machine information
    async function saveMachine(event) {

        event.preventDefault();

        formError.hidden = true;

        const id = machineId.value;

        const machineData = {
            identifier: machineCode.value.trim(),
            name: machineName.value.trim(),
            location: machineLocation.value.trim(),
            status: machineStatus.value
        };

        const isEditing = Boolean(id);

        const url = isEditing
            ? `${MACHINES_ENDPOINT}/${encodeURIComponent(id)}`
            : MACHINES_ENDPOINT;

        const method = isEditing ? "PUT" : "POST";

        saveMachineButton.disabled = true;

        saveMachineButton.textContent = isEditing
            ? "Updating..."
            : "Saving...";

        try {

            const csrfResponse = await apiRequest(`${API_BASE}/auth/csrf`);
            await apiRequest(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    "X-XSRF-TOKEN": csrfResponse.token
                },
                body: JSON.stringify(machineData)
            });

            machineDialog.close();

            resetMachineForm();

            await loadMachines();

        } catch (error) {

            console.error("Unable to save machine:", error);

            formError.hidden = false;
            formError.textContent =
                `Unable to save machine: ${error.message}`;

        } finally {

            saveMachineButton.disabled = false;

            saveMachineButton.textContent = isEditing
                ? "Update Machine"
                : "Save Machine";
        }
    }

    // Display a machine's details
    async function viewMachine(id) {

        try {

            const data = await apiRequest(
                `${MACHINES_ENDPOINT}/${encodeURIComponent(id)}`
            );

            const machine = data?.machine ?? data?.data ?? data;

            document.getElementById("detailCode").textContent =
                getMachineCode(machine);

            document.getElementById("detailName").textContent =
                getMachineName(machine);

            document.getElementById("detailLocation").textContent =
                getLocation(machine);

            document.getElementById("detailStatus").textContent =
                formatStatus(getStatus(machine));

            detailsDialog.showModal();

        } catch (error) {

            console.error("Unable to view machine:", error);

            alert(`Unable to view machine: ${error.message}`);
        }
    }

    // Event listeners

    addMachineButton.addEventListener("click", openAddDialog);

    machineForm.addEventListener("submit", saveMachine);

    refreshButton.addEventListener("click", loadMachines);

    searchButton.addEventListener("click", applyFilters);

    searchInput.addEventListener("keydown", event => {

        if (event.key === "Enter") {
            applyFilters();
        }
    });

    statusFilter.addEventListener("change", applyFilters);

    clearButton.addEventListener("click", () => {

        searchInput.value = "";
        statusFilter.value = "";
        statusFilter.dispatchEvent(new Event("styled-select-sync"));

        applyFilters();
    });

    closeDialogButton.addEventListener("click", () => {
        machineDialog.close();
    });

    cancelButton.addEventListener("click", () => {
        machineDialog.close();
    });

    closeDetailsButton.addEventListener("click", () => {
        detailsDialog.close();
    });

    machineDialog.addEventListener("close", resetMachineForm);

    // Close dialogs when clicking outside
    machineDialog.addEventListener("click", event => {

        if (event.target === machineDialog) {
            machineDialog.close();
        }
    });

    detailsDialog.addEventListener("click", event => {

        if (event.target === detailsDialog) {
            detailsDialog.close();
        }
    });

    // Sign out
    logoutButton.addEventListener("click", async () => {

        logoutButton.disabled = true;

        try {
            const csrfResponse = await apiRequest(`${API_BASE}/auth/csrf`);
            await apiRequest(`${API_BASE}/auth/logout`, {
                method: "POST",
                headers: { "X-XSRF-TOKEN": csrfResponse.token }
            });

        } catch (error) {

            console.error("Sign-out request failed:", error);

        } finally {
            window.location.href = "/login/login.html";
        }
    });

    // Initialise page
    async function initialisePage() {

        await loadUser();

        await loadMachines();
    }

    initialisePage();

    return disposeDropdowns;
}

if (!window.appRouterActive) mount();

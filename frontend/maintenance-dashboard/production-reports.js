
import { enhanceSelects } from "/shared/scripts/styled-select.js";

export function mount() {
const disposeDropdowns = enhanceSelects(document);
    // API endpoints
    const API_BASE = "/api";

    // Page elements
    const userName = document.getElementById("userName");
    const logoutButton = document.getElementById("logoutButton");
    const refreshButton = document.getElementById("refreshButton");

    const searchInput = document.getElementById("searchInput");
    const statusFilter = document.getElementById("statusFilter");
    const dateFilter = document.getElementById("dateFilter");
    const searchButton = document.getElementById("searchButton");
    const clearButton = document.getElementById("clearButton");

    const reportsTableBody = document.getElementById("reportsTableBody");
    const loadingMessage = document.getElementById("loadingMessage");
    const errorMessage = document.getElementById("errorMessage");
    const emptyState = document.getElementById("emptyState");

    const totalReports = document.getElementById("totalReports");
    const pendingReports = document.getElementById("pendingReports");
    const activeReports = document.getElementById("activeReports");
    const resolvedReports = document.getElementById("resolvedReports");

    // Dialog elements
    const reportDialog = document.getElementById("reportDialog");
    const closeDialogButton = document.getElementById("closeDialogButton");

    // Store reports loaded from the backend
    let allReports = [];

    // Fetch helper
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
            throw new Error(`Request failed with status ${response.status}.`);
        }

        if (response.status === 204) {
            return null;
        }

        return response.json();
    }

    // Handle different possible response formats
    function getReportList(data) {
        if (Array.isArray(data)) {
            return data;
        }

        if (Array.isArray(data?.content)) {
            return data.content;
        }

        if (Array.isArray(data?.data)) {
            return data.data;
        }

        if (Array.isArray(data?.reports)) {
            return data.reports;
        }

        return [];
    }

    // Safely display text
    function displayValue(value) {
        if (value === null || value === undefined || value === "") {
            return "Not available";
        }

        return String(value);
    }

    // Get report ID
    function getReportId(report) {
        return report.id ?? report.reportId ?? report.faultId ?? "N/A";
    }

    // Get machine information
    function getMachine(report) {
        if (typeof report.machine === "string") {
            return report.machine;
        }

        return (
            report.machineIdentifier ??
            report.machine?.machineCode ??
            report.machine?.code ??
            report.machineCode ??
            report.machineIdentifier ??
            report.machine?.name ??
            "Not available"
        );
    }

    // Get report status
    function getStatus(report) {
        return String(report.status ?? "REPORTED").toUpperCase();
    }

    // Get technician name
    function getTechnician(report) {
        if (typeof report.assignedTechnician === "string") {
            return report.assignedTechnician;
        }

        return (
            report.assignedTechnician?.fullName ??
            report.assignedTechnician?.name ??
            report.technician?.fullName ??
            report.technician?.name ??
            report.technicianName ??
            "Not assigned"
        );
    }

    // Get report date
    function getReportDate(report) {
        return (
            report.submittedAt ??
            report.createdAt ??
            report.reportedAt ??
            report.dateReported ??
            report.createdDate ??
            ""
        );
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

    // Create a status badge
    function createStatusBadge(status) {
        const badge = document.createElement("span");

        badge.className = "status-badge";

        const statusClass = status.toLowerCase().replaceAll("_", "-");
        badge.classList.add(statusClass);

        badge.textContent = status.replaceAll("_", " ");

        return badge;
    }

    // Load logged-in user
    async function loadUser() {
        try {
            const data = await window.roleNavigationUserPromise;

            const user = data?.user ?? data?.data ?? data;

            if (user && user.fullName) {
                userName.textContent = user.fullName;
            } else if (user && user.name) {
                userName.textContent = user.name;
            }
        } catch (error) {
            console.error("Unable to load user information:", error);
        }
    }

    // Update summary cards
    function updateSummary(reports) {
        totalReports.textContent = reports.length;

        pendingReports.textContent = reports.filter(report => {
            const status = getStatus(report);

            return status === "REPORTED";
        }).length;

        activeReports.textContent = reports.filter(report => {
            const status = getStatus(report);

            return status === "ASSIGNED" ||
                   status === "IN_PROGRESS";
        }).length;

        resolvedReports.textContent = reports.filter(report => {
            const status = getStatus(report);

            return status === "RESOLVED" ||
                   status === "CLOSED";
        }).length;
    }

    // Create a table cell
    function createCell(value) {
        const cell = document.createElement("td");
        cell.textContent = displayValue(value);
        return cell;
    }

    // Display reports
    function displayReports(reports) {
        reportsTableBody.replaceChildren();

        emptyState.hidden = reports.length !== 0;

        reports.forEach(report => {
            const row = document.createElement("tr");

            // Report ID
            const idCell = createCell(getReportId(report));
            idCell.classList.add("report-id");
            row.appendChild(idCell);

            // Machine
            row.appendChild(createCell(getMachine(report)));

            // Date reported
            row.appendChild(createCell(formatDate(getReportDate(report))));

            // Problem description
            row.appendChild(
                createCell(
                    report.description ??
                    report.problemDescription ??
                    report.problem ??
                    "Not available"
                )
            );

            // Assigned technician
            row.appendChild(createCell(getTechnician(report)));

            // Status
            const statusCell = document.createElement("td");
            statusCell.appendChild(createStatusBadge(getStatus(report)));
            row.appendChild(statusCell);

            // View report button
            const actionCell = document.createElement("td");
            const viewButton = document.createElement("button");

            viewButton.type = "button";
            viewButton.className = "view-button";
            viewButton.textContent = "View Report";

            viewButton.addEventListener("click", () => {
                openReport(getReportId(report));
            });

            actionCell.appendChild(viewButton);
            row.appendChild(actionCell);

            reportsTableBody.appendChild(row);
        });
    }

    // Load reports from backend
    async function loadReports() {
        loadingMessage.hidden = false;
        loadingMessage.textContent = "Loading your reports...";

        errorMessage.hidden = true;
        emptyState.hidden = true;

        refreshButton.disabled = true;
        searchButton.disabled = true;

        try {
            allReports = [];
            let page = 0;
            let totalPages = 1;
            while (page < totalPages) {
                const data = await apiRequest(`${API_BASE}/faults?page=${page}&size=100`);
                allReports.push(...getReportList(data));
                totalPages = data.totalPages ?? 1;
                page += 1;
            }

            updateSummary(allReports);
            applyFilters();

            loadingMessage.hidden = true;

        } catch (error) {
            console.error("Error loading reports:", error);

            loadingMessage.hidden = true;
            errorMessage.hidden = false;
            errorMessage.textContent =
                `Unable to load your reports: ${error.message}`;

            reportsTableBody.replaceChildren();
            emptyState.hidden = true;

            updateSummary([]);
        } finally {
            refreshButton.disabled = false;
            searchButton.disabled = false;
        }
    }

    // Search and filter reports
    function applyFilters() {
        const searchTerm = searchInput.value.trim().toLowerCase();
        const selectedStatus = statusFilter.value;
        const selectedDate = dateFilter.value;

        const filteredReports = allReports.filter(report => {
            const reportId = String(getReportId(report)).toLowerCase();
            const machine = String(getMachine(report)).toLowerCase();

            const matchesSearch =
                !searchTerm ||
                reportId.includes(searchTerm) ||
                machine.includes(searchTerm);

            const matchesStatus =
                !selectedStatus ||
                getStatus(report) === selectedStatus;

            const reportDate = getReportDate(report);
            const reportDateOnly = reportDate
                ? String(reportDate).slice(0, 10)
                : "";

            const matchesDate =
                !selectedDate ||
                reportDateOnly === selectedDate;

            return matchesSearch && matchesStatus && matchesDate;
        });

        displayReports(filteredReports);
    }

    // Fill a report detail field
    function setDetail(id, value) {
        const element = document.getElementById(id);

        if (element) {
            element.textContent = displayValue(value);
        }
    }

    // Display maintenance updates safely
    function displayUpdates(updates) {
        const container = document.getElementById("maintenanceUpdates");
        container.replaceChildren();

        if (!Array.isArray(updates) || updates.length === 0) {
            container.textContent = "No maintenance updates available.";
            return;
        }

        updates.forEach(update => {
            const entry = document.createElement("div");
            entry.className = "update-entry";

            const heading = document.createElement("strong");
            heading.textContent = displayValue(
                update.toStatus ?? update.status ?? update.title ?? "Maintenance Update"
            );

            const description = document.createElement("p");
            description.textContent = displayValue(
                update.notes ?? update.description ?? update.message ??
                (update.fromStatus ? `${update.fromStatus} → ${update.toStatus}` : "")
            );

            const date = document.createElement("small");
            date.textContent = formatDate(
                update.createdAt ?? update.updatedAt ?? update.date
            );

            entry.append(heading, description, date);
            container.appendChild(entry);
        });
    }

    // Display attached evidence
    function displayEvidence(evidence) {
        const container = document.getElementById("reportEvidence");
        container.replaceChildren();

        if (!Array.isArray(evidence) || evidence.length === 0) {
            container.textContent = "No evidence attached.";
            return;
        }

        evidence.forEach(item => {
            const link = document.createElement("a");

            const url = typeof item === "string"
                ? item
                : item.downloadUrl ?? item.url ?? item.fileUrl;

            if (!url) {
                return;
            }

            link.href = url;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.className = "evidence-link";
            link.textContent = typeof item === "string"
                ? "View attachment"
                : item.originalName ?? item.fileName ?? item.name ?? "View attachment";

            container.appendChild(link);
        });
    }

    // Open report details
    async function openReport(reportId) {
        try {
            const details = await apiRequest(
                `${API_BASE}/faults/${encodeURIComponent(reportId)}`
            );
            const report = details.fault ?? details;

            setDetail("detailReportId", getReportId(report));
            setDetail("detailMachine", getMachine(report));
            setDetail("detailDate", formatDate(getReportDate(report)));
            setDetail("detailStatus", getStatus(report).replaceAll("_", " "));
            setDetail("detailTechnician", getTechnician(report));

            setDetail(
                "detailUpdated",
                formatDate(report.updatedAt ?? report.lastUpdated)
            );

            setDetail(
                "detailDescription",
                report.description ??
                report.problemDescription ??
                report.problem
            );

            const actions = (details.maintenanceActions ?? []).map(action => ({
                title: `Maintenance action by ${action.technicianName}`,
                description: action.description,
                date: action.recordedAt
            }));
            const statuses = (details.statusHistory ?? []).map(change => ({
                title: `Status changed to ${change.toStatus?.replaceAll("_", " ")}`,
                description: change.fromStatus ? `From ${change.fromStatus.replaceAll("_", " ")}` : "Report created",
                date: change.changedAt
            }));
            displayUpdates([...statuses, ...actions]);

            displayEvidence(
                details.attachments ?? report.evidence ??
                report.attachments ??
                report.files
            );

            reportDialog.showModal();

        } catch (error) {
            console.error("Unable to open report:", error);
            alert(`Unable to open report: ${error.message}`);
        }
    }

    // Search button
    searchButton.addEventListener("click", applyFilters);

    // Allow Enter to search
    searchInput.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            applyFilters();
        }
    });

    // Refresh reports
    refreshButton.addEventListener("click", loadReports);

    // Clear filters
    clearButton.addEventListener("click", () => {
        searchInput.value = "";
        statusFilter.value = "";
        statusFilter.dispatchEvent(new Event("styled-select-sync"));
        dateFilter.value = "";

        applyFilters();
    });

    // Close dialog
    closeDialogButton.addEventListener("click", () => {
        reportDialog.close();
    });

    // Close dialog when clicking outside
    reportDialog.addEventListener("click", event => {
        if (event.target === reportDialog) {
            reportDialog.close();
        }
    });

    // Sign out
    logoutButton.addEventListener("click", async () => {
        logoutButton.disabled = true;

        try {
            const csrfResponse = await apiRequest(`${API_BASE}/auth/csrf`);
            await apiRequest(`${API_BASE}/auth/logout`, { method: "POST", headers: { "X-XSRF-TOKEN": csrfResponse.token } });
        } catch (error) {
            console.error("Sign-out request failed:", error);
        } finally {
            window.location.href = "/login/login.html";
        }
    });

    // Initialise page
    async function initialisePage() {
        await loadUser();
        await loadReports();
    }

    initialisePage();
    return disposeDropdowns;
}

if (!window.appRouterActive) mount();

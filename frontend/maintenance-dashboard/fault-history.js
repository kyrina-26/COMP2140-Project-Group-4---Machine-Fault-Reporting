
import { enhanceSelects } from "/shared/scripts/styled-select.js";

export function mount() {
const disposeDropdowns = enhanceSelects(document);
const accountName = document.getElementById("accountName");
const logoutButton = document.getElementById("logoutButton");
const searchForm = document.getElementById("searchForm");
const searchButton = document.getElementById("searchButton");
const clearButton = document.getElementById("clearButton");

const machineFilter = document.getElementById("machineFilter");
const statusFilter = document.getElementById("statusFilter");
const technicianFilter = document.getElementById("technicianFilter");
const fromFilter = document.getElementById("fromFilter");
const toFilter = document.getElementById("toFilter");

const resultsBody = document.getElementById("resultsBody");
const resultSummary = document.getElementById("resultSummary");
const resultCount = document.getElementById("resultCount");
const pageStatus = document.getElementById("pageStatus");
const emptyState = document.getElementById("emptyState");

const previousButton = document.getElementById("previousButton");
const nextButton = document.getElementById("nextButton");
const pageNumber = document.getElementById("pageNumber");

const historyDialog = document.getElementById("historyDialog");
const dialogTitle = document.getElementById("dialogTitle");
const dialogStatus = document.getElementById("dialogStatus");
const reportDetails = document.getElementById("reportDetails");
const closeReportButton = document.getElementById("closeReportButton");

const pageSize = 20;
let currentPage = 0;
let totalPages = 0;
let currentUserRole = null;
let currentReportId = null;

async function readJsonResponse(response) {
    if (response.status === 204) {
        return {};
    }

    const contentType = response.headers.get("content-type") || "";

    return contentType.includes("application/json")
        ? response.json()
        : {};
}

async function requestJson(url, options = {}) {
    let response;

    try {
        response = await fetch(url, options);
    } catch {
        throw new Error(
            "Unable to reach the server. Check your connection and try again."
        );
    }

    const result = await readJsonResponse(response);

    if (response.status === 401 || response.status === 403) {
        window.location.assign("/login/login.html");
        throw new Error("Your session has expired or access was denied.");
    }

    if (!response.ok) {
        throw new Error(
            result.error || `Request failed (HTTP ${response.status}).`
        );
    }

    return result;
}

function formatDate(value) {
    if (!value) return "Not available";

    return new Date(value).toLocaleString();
}

function formatStatus(status) {
    return status ? status.replaceAll("_", " ") : "Not available";
}

function statusClass(status) {
    if (status === "IN_PROGRESS") return "in-progress";
    if (status === "RESOLVED") return "resolved";
    if (status === "CLOSED") return "closed";
    return "";
}

function createStatusBadge(status) {
    const badge = document.createElement("span");
    badge.className = `status-badge ${statusClass(status)}`;
    badge.textContent = formatStatus(status);
    return badge;
}

function addDetailField(container, label, value) {
    const field = document.createElement("div");
    field.className = "detail-field";

    const heading = document.createElement("strong");
    heading.textContent = label;

    const paragraph = document.createElement("p");
    paragraph.textContent = value || "Not available";

    field.append(heading, paragraph);
    container.append(field);
}

function addHistoryEntry(container, title, description, date) {
    const entry = document.createElement("article");
    entry.className = "history-entry";

    const heading = document.createElement("strong");
    heading.textContent = title;

    const text = document.createElement("p");
    text.textContent = description || "No additional details.";

    const timestamp = document.createElement("small");
    timestamp.textContent = formatDate(date);

    entry.append(heading, text, timestamp);
    container.append(entry);
}

function addHistorySection(title, entries, renderEntry) {
    const section = document.createElement("section");
    section.className = "history-section";

    const heading = document.createElement("h3");
    heading.textContent = title;
    section.append(heading);

    if (!entries || entries.length === 0) {
        const message = document.createElement("p");
        message.textContent = "No records available.";
        section.append(message);
    } else {
        entries.forEach(entry => renderEntry(section, entry));
    }

    reportDetails.append(section);
}

function renderSearchResults(reports) {
    resultsBody.replaceChildren();
    emptyState.hidden = reports.length > 0;

    reports.forEach(report => {
        const row = document.createElement("tr");

        const idCell = document.createElement("td");
        idCell.className = "report-id";
        idCell.textContent = `#${report.id}`;

        const machineCell = document.createElement("td");
        machineCell.textContent =
            `${report.machineIdentifier} - ${report.machineName}`;

        const reporterCell = document.createElement("td");
        reporterCell.textContent = report.reporterName || "Not available";

        const technicianCell = document.createElement("td");
        technicianCell.textContent =
            report.technicianName || "Unassigned";

        const statusCell = document.createElement("td");
        statusCell.append(createStatusBadge(report.status));

        const dateCell = document.createElement("td");
        dateCell.textContent = formatDate(report.submittedAt);

        const detailsCell = document.createElement("td");
        const viewButton = document.createElement("button");

        viewButton.type = "button";
        viewButton.className = "view-button";
        viewButton.textContent = "View Details";
        viewButton.addEventListener("click", () => openReport(report.id));

        detailsCell.append(viewButton);

        row.append(
            idCell,
            machineCell,
            reporterCell,
            technicianCell,
            statusCell,
            dateCell,
            detailsCell
        );

        resultsBody.append(row);
    });
}

function dateToIso(value) {
    return value ? new Date(value).toISOString() : "";
}

async function loadReports() {
    searchButton.disabled = true;
    pageStatus.textContent = "Searching fault reports...";
    emptyState.hidden = true;

    try {
        const params = new URLSearchParams();

        params.set("page", String(currentPage));
        params.set("size", String(pageSize));

        if (machineFilter.value.trim()) {
            params.set("machineIdentifier", machineFilter.value.trim());
        }

        if (statusFilter.value) {
            params.set("status", statusFilter.value);
        }

        if (technicianFilter.value) {
            params.set("technicianId", technicianFilter.value);
        }

        if (fromFilter.value) {
            params.set("from", dateToIso(fromFilter.value));
        }

        if (toFilter.value) {
            params.set("to", dateToIso(toFilter.value));
        }

        const result = await requestJson(`/api/faults?${params}`);

        if (!Array.isArray(result.content)) {
            throw new Error("The server returned an invalid search result.");
        }

        renderSearchResults(result.content);

        totalPages = result.totalPages || 0;

        const total = result.totalElements || 0;

        resultCount.textContent =
            `${total} ${total === 1 ? "report" : "reports"}`;

        resultSummary.textContent =
            total === 0
                ? "No matching reports."
                : `Showing ${result.content.length} of ${total} reports.`;

        pageNumber.textContent =
            `Page ${totalPages === 0 ? 0 : currentPage + 1} of ${totalPages}`;

        previousButton.disabled = currentPage <= 0;
        nextButton.disabled =
            totalPages === 0 || currentPage >= totalPages - 1;

        pageStatus.textContent = "";
    } catch (error) {
        pageStatus.textContent =
            error.message || "Unable to search fault reports.";

        resultsBody.replaceChildren();
        emptyState.hidden = true;
        resultSummary.textContent = "Search could not be completed.";
        resultCount.textContent = "--";
    } finally {
        searchButton.disabled = false;
    }
}

async function loadTechnicians(role) {
    const allowedRoles = [
        "MAINTENANCE_SUPERVISOR",
        "SYSTEM_ADMINISTRATOR"
    ];

    if (!allowedRoles.includes(role)) {
        technicianFilter.closest(".form-field").hidden = true;
        return;
    }

    try {
        const technicians = await requestJson("/api/users/technicians");

        if (!Array.isArray(technicians)) {
            throw new Error("Invalid technician list.");
        }

        technicians.forEach(technician => {
            const option = document.createElement("option");
            option.value = technician.id;
            option.textContent = technician.displayName;
            technicianFilter.append(option);
        });
    } catch (error) {
        // Keep the other search filters available if this list cannot load.
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "Technician list unavailable";
        option.disabled = true;
        technicianFilter.append(option);
    }
}

async function openReport(reportId) {
    historyDialog.showModal();
    currentReportId = reportId;
    closeReportButton.hidden = true;
    closeReportButton.disabled = false;
    dialogTitle.textContent = `Fault Report #${reportId}`;
    dialogStatus.textContent = "Loading report history...";
    reportDetails.replaceChildren();

    try {
        const details = await requestJson(`/api/faults/${reportId}`);

        if (!details.fault) {
            throw new Error("The server returned an invalid fault report.");
        }

        renderReportDetails(details);
        dialogStatus.textContent = "";
    } catch (error) {
        dialogStatus.textContent =
            error.message || "Unable to load report history.";
    }
}

function renderReportDetails(details) {
    const fault = details.fault;

    currentReportId = fault.id;
    closeReportButton.hidden = currentUserRole !== "MAINTENANCE_SUPERVISOR"
        || fault.status === "CLOSED";
    dialogTitle.textContent = `Fault Report #${fault.id}`;
    reportDetails.replaceChildren();

    const fields = document.createElement("div");
    fields.className = "detail-grid";

    addDetailField(
        fields,
        "Machine",
        `${fault.machineIdentifier} - ${fault.machineName}`
    );

    addDetailField(fields, "Current Status", formatStatus(fault.status));
    addDetailField(fields, "Reported By", fault.reporterName);
    addDetailField(fields, "Assigned Technician", fault.technicianName);
    addDetailField(fields, "Submitted", formatDate(fault.submittedAt));
    addDetailField(fields, "Last Updated", formatDate(fault.updatedAt));

    reportDetails.append(fields);

    const descriptionSection = document.createElement("section");
    descriptionSection.className = "history-section";

    const descriptionHeading = document.createElement("h3");
    descriptionHeading.textContent = "Fault Description";

    const description = document.createElement("p");
    description.textContent = fault.description;

    descriptionSection.append(descriptionHeading, description);
    reportDetails.append(descriptionSection);

    addHistorySection(
        "Status History",
        details.statusHistory,
        (container, entry) => {
            addHistoryEntry(
                container,
                `${formatStatus(entry.fromStatus)} → ${formatStatus(entry.toStatus)}`,
                `Updated by ${entry.changedByName}`,
                entry.changedAt
            );
        }
    );

    addHistorySection(
        "Assignment History",
        details.assignmentHistory,
        (container, entry) => {
            const previous = entry.previousTechnicianName || "Unassigned";

            addHistoryEntry(
                container,
                `Assigned to ${entry.technicianName}`,
                `Previous technician: ${previous}. Assigned by ${entry.assignedByName}.`,
                entry.assignedAt
            );
        }
    );

    addHistorySection(
        "Maintenance Actions",
        details.maintenanceActions,
        (container, entry) => {
            addHistoryEntry(
                container,
                entry.technicianName,
                entry.description,
                entry.recordedAt
            );
        }
    );

    addHistorySection(
        "Attachments and Evidence",
        details.attachments,
        (container, entry) => {
            const wrapper = document.createElement("div");
            wrapper.className = "history-entry";

            const link = document.createElement("a");
            link.href = entry.downloadUrl;
            link.textContent = entry.originalName;
            link.target = "_blank";
            link.rel = "noopener noreferrer";

            const metadata = document.createElement("p");
            metadata.textContent =
                `${entry.contentType || "File"} · ${formatDate(entry.uploadedAt)}`;

            wrapper.append(link, metadata);
            container.append(wrapper);
        }
    );
}

async function signOut() {
    logoutButton.disabled = true;

    try {
        const csrf = await requestJson("/api/auth/csrf");

        if (!csrf.token) {
            throw new Error("Unable to retrieve the security token.");
        }

        await requestJson("/api/auth/logout", {
            method: "POST",
            headers: {
                "X-XSRF-TOKEN": csrf.token
            }
        });

        window.location.assign("/login/login.html");
    } catch (error) {
        pageStatus.textContent = error.message || "Unable to sign out.";
        logoutButton.disabled = false;
    }
}

async function closeReport() {
    if (currentUserRole !== "MAINTENANCE_SUPERVISOR" || !currentReportId) return;
    if (!window.confirm(`Close fault report #${currentReportId}?`)) return;

    const reportId = currentReportId;
    closeReportButton.disabled = true;
    dialogStatus.textContent = "Closing report...";

    try {
        const csrf = await requestJson("/api/auth/csrf");
        if (!csrf.token) throw new Error("Unable to retrieve the security token.");

        await requestJson(`/api/faults/${reportId}/status`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "X-XSRF-TOKEN": csrf.token
            },
            body: JSON.stringify({ status: "CLOSED" })
        });

        await loadReports();
        await openReport(reportId);
        dialogStatus.textContent = "Report closed.";
    } catch (error) {
        dialogStatus.textContent = error.message || "Unable to close the report.";
        closeReportButton.disabled = false;
    }
}

async function initializePage() {
    try {
        const user = await window.roleNavigationUserPromise;

        currentUserRole = user.role;
        accountName.textContent = user.displayName;

        await loadTechnicians(user.role);
        await loadReports();
    } catch (error) {
        pageStatus.textContent =
            error.message || "Unable to initialize fault history.";
    }
}

searchForm.addEventListener("submit", event => {
    event.preventDefault();

    if (fromFilter.value && toFilter.value &&
        new Date(fromFilter.value) > new Date(toFilter.value)) {
        pageStatus.textContent =
            "Choose a To date and time later than the From date and time.";
        renderSearchResults([]);
        resultSummary.textContent = "No matching reports.";
        resultCount.textContent = "0 reports";
        currentPage = 0;
        totalPages = 0;
        pageNumber.textContent = "Page 0 of 0";
        previousButton.disabled = true;
        nextButton.disabled = true;
        return;
    }

    currentPage = 0;
    loadReports();
});

clearButton.addEventListener("click", () => {
    searchForm.reset();
    currentPage = 0;
    loadReports();
});

previousButton.addEventListener("click", () => {
    if (currentPage > 0) {
        currentPage--;
        loadReports();
    }
});

nextButton.addEventListener("click", () => {
    if (currentPage < totalPages - 1) {
        currentPage++;
        loadReports();
    }
});

document.getElementById("closeDialog").addEventListener("click", () => {
    historyDialog.close();
});

closeReportButton.addEventListener("click", closeReport);
logoutButton.addEventListener("click", signOut);

initializePage();
return disposeDropdowns;
}

if (!window.appRouterActive) mount();

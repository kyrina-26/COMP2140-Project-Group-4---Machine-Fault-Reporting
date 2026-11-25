
import { enhanceSelects } from "/shared/scripts/styled-select.js";

export function mount() {
const disposeDropdowns = enhanceSelects(document);
const accountName = document.getElementById("accountName");
const logoutButton = document.getElementById("logoutButton");
const refreshButton = document.getElementById("refreshButton");
const statusFilter = document.getElementById("statusFilter");
const assignedCount = document.getElementById("assignedCount");
const inProgressCount = document.getElementById("inProgressCount");
const workList = document.getElementById("workList");
const pageStatus = document.getElementById("pageStatus");
const emptyState = document.getElementById("emptyState");
const previousButton = document.getElementById("previousButton");
const nextButton = document.getElementById("nextButton");
const pageNumber = document.getElementById("pageNumber");

const workDialog = document.getElementById("workDialog");
const dialogTitle = document.getElementById("dialogTitle");
const dialogStatus = document.getElementById("dialogStatus");
const reportDetails = document.getElementById("reportDetails");
const actionForm = document.getElementById("actionForm");
const actionDescription = document.getElementById("actionDescription");
const saveActionButton = document.getElementById("saveActionButton");
const statusSelect = document.getElementById("statusSelect");
const saveStatusButton = document.getElementById("saveStatusButton");

let currentPage = 0;
let totalPages = 0;
let currentReport = null;

const pageSize = 10;

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
        throw new Error("Your session has expired or you do not have permission.");
    }

    if (!response.ok) {
        throw new Error(
            result.error || `Request failed (HTTP ${response.status}).`
        );
    }

    return result;
}

async function getCsrfToken() {
    const result = await requestJson("/api/auth/csrf");

    if (!result.token) {
        throw new Error("The server did not provide a security token.");
    }

    return result.token;
}

function formatDate(value) {
    if (!value) return "Not available";

    return new Date(value).toLocaleString();
}

function formatStatus(status) {
    return status.replaceAll("_", " ");
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

function updateStatusControl(status) {
    statusSelect.value = status;
    statusSelect.dispatchEvent(new Event("change", { bubbles: true }));
    statusSelect.disabled = !currentReport;
    saveStatusButton.disabled = !currentReport || statusSelect.value === currentReport.status;
}

function setDialogMessage(text, isError = false) {
    dialogStatus.textContent = text;
    dialogStatus.classList.toggle("is-error", isError);
}

function renderWorkReports(reports) {
    workList.replaceChildren();

    emptyState.hidden = reports.length > 0;

    for (const report of reports) {
        const card = document.createElement("article");
        card.className = "work-card";

        const content = document.createElement("div");
        content.className = "work-card-content";

        const title = document.createElement("h4");
        title.textContent =
            `Report #${report.id} - ${report.machineIdentifier}`;

        const machine = document.createElement("p");
        machine.textContent = report.machineName;

        const submitted = document.createElement("p");
        submitted.textContent =
            `Submitted: ${formatDate(report.submittedAt)}`;

        const badge = document.createElement("span");
        badge.className = "status-badge";

        if (report.status === "IN_PROGRESS") {
            badge.classList.add("in-progress");
        } else if (report.status === "RESOLVED") {
            badge.classList.add("resolved");
        } else if (report.status === "CLOSED") {
            badge.classList.add("closed");
        }

        badge.textContent = formatStatus(report.status);

        content.append(title, machine, submitted, badge);

        const actions = document.createElement("div");
        actions.className = "work-card-actions";

        const openButton = document.createElement("button");
        openButton.type = "button";
        openButton.textContent = "View Report";
        openButton.addEventListener("click", () => openReport(report.id));

        actions.append(openButton);
        card.append(content, actions);
        workList.append(card);
    }
}

async function loadWork() {
    refreshButton.disabled = true;
    pageStatus.textContent = "Loading assigned reports...";
    emptyState.hidden = true;

    try {
        const params = new URLSearchParams({
            page: currentPage,
            size: pageSize
        });

        if (statusFilter.value) {
            params.set("status", statusFilter.value);
        }

        const result = await requestJson(`/api/technicians/me/faults?${params}`);

        if (!Array.isArray(result.content)) {
            throw new Error("The server returned an invalid report list.");
        }

        const newestFirst = [...result.content].sort((first, second) =>
            new Date(second.submittedAt) - new Date(first.submittedAt)
            || Number(second.id) - Number(first.id)
        );
        renderWorkReports(newestFirst);

        totalPages = result.totalPages || 0;
        pageNumber.textContent =
            `Page ${totalPages === 0 ? 0 : currentPage + 1} of ${totalPages}`;

        previousButton.disabled = currentPage <= 0;
        nextButton.disabled =
            totalPages === 0 || currentPage >= totalPages - 1;

        assignedCount.textContent = result.totalElements ?? result.content.length;

        // The summary counts reports on the current page.
        inProgressCount.textContent =
            result.content.filter(report => report.status === "IN_PROGRESS").length;

        pageStatus.textContent = "";
    } catch (error) {
        pageStatus.textContent =
            error.message || "Unable to load assigned reports.";
        assignedCount.textContent = "--";
        inProgressCount.textContent = "--";
    } finally {
        refreshButton.disabled = false;
    }
}

async function openReport(reportId) {
    setDialogMessage("Loading report details...");
    reportDetails.replaceChildren();
    currentReport = null;
    updateStatusControl("CLOSED");

    workDialog.showModal();

    try {
        const details = await requestJson(`/api/faults/${reportId}`);

        if (!details.fault) {
            throw new Error("The server returned an invalid fault report.");
        }

        currentReport = details.fault;
        renderReportDetails(details);
    } catch (error) {
        setDialogMessage(error.message || "Unable to open this report.", true);
    }
}

function renderReportDetails(details) {
    const fault = details.fault;

    currentReport = fault;
    dialogTitle.textContent = `Fault Report #${fault.id}`;
    setDialogMessage("");

    reportDetails.replaceChildren();

    const fields = document.createElement("div");
    fields.className = "detail-grid";

    addDetailField(
        fields,
        "Machine",
        `${fault.machineIdentifier} - ${fault.machineName}`
    );

    addDetailField(fields, "Status", formatStatus(fault.status));
    addDetailField(fields, "Reported by", fault.reporterName);
    addDetailField(fields, "Submitted", formatDate(fault.submittedAt));
    addDetailField(fields, "Technician", fault.technicianName);

    reportDetails.append(fields);

    const descriptionSection = document.createElement("section");
    descriptionSection.className = "detail-section";

    const descriptionTitle = document.createElement("h3");
    descriptionTitle.textContent = "Fault Description";

    const description = document.createElement("p");
    description.textContent = fault.description;

    descriptionSection.append(descriptionTitle, description);
    reportDetails.append(descriptionSection);

    if (details.attachments?.length) {
        const attachmentSection = document.createElement("section");
        attachmentSection.className = "detail-section";

        const heading = document.createElement("h3");
        heading.textContent = "Attached Evidence";

        const list = document.createElement("ul");

        for (const attachment of details.attachments) {
            const item = document.createElement("li");
            const link = document.createElement("a");

            link.href = attachment.downloadUrl;
            link.textContent = attachment.originalName;
            link.target = "_blank";
            link.rel = "noopener noreferrer";

            item.append(link);
            list.append(item);
        }

        attachmentSection.append(heading, list);
        reportDetails.append(attachmentSection);
    }

    if (details.maintenanceActions?.length) {
        const actionSection = document.createElement("section");
        actionSection.className = "detail-section";

        const heading = document.createElement("h3");
        heading.textContent = "Previous Maintenance Actions";

        actionSection.append(heading);

        for (const action of details.maintenanceActions) {
            const item = document.createElement("div");
            item.className = "action-item";

            const technician = document.createElement("strong");
            technician.textContent = action.technicianName;

            const description = document.createElement("p");
            description.textContent = action.description;

            const date = document.createElement("small");
            date.textContent = formatDate(action.recordedAt);

            item.append(technician, description, date);
            actionSection.append(item);
        }

        reportDetails.append(actionSection);
    }

    updateStatusControl(fault.status);
}

actionForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!currentReport) return;

    const description = actionDescription.value.trim();

    if (!description) {
        setDialogMessage("Enter a maintenance action before saving.", true);
        return;
    }

    saveActionButton.disabled = true;
    setDialogMessage("Saving maintenance action...");

    try {
        const token = await getCsrfToken();

        await requestJson(`/api/faults/${currentReport.id}/actions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-XSRF-TOKEN": token
            },
            body: JSON.stringify({ description })
        });

        actionDescription.value = "";
        setDialogMessage("Maintenance action saved successfully.");

        const details = await requestJson(`/api/faults/${currentReport.id}`);
        currentReport = details.fault;
        renderReportDetails(details);
        setDialogMessage("Maintenance action saved successfully.");
    } catch (error) {
        setDialogMessage(error.message || "Unable to save the maintenance action.", true);
    } finally {
        saveActionButton.disabled = false;
    }
});

statusSelect.addEventListener("change", () => {
    saveStatusButton.disabled = !currentReport || statusSelect.value === currentReport.status;
});

saveStatusButton.addEventListener("click", async () => {
    if (!currentReport) return;

    const selectedStatus = statusSelect.value;
    if (selectedStatus === currentReport.status) return;

    saveStatusButton.disabled = true;
    statusSelect.disabled = true;
    setDialogMessage("Saving report status...");

    try {
        const token = await getCsrfToken();

        await requestJson(`/api/faults/${currentReport.id}/status`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "X-XSRF-TOKEN": token
            },
            body: JSON.stringify({ status: selectedStatus })
        });

        const details = await requestJson(`/api/faults/${currentReport.id}`);
        renderReportDetails(details);

        setDialogMessage(`Report status updated to ${formatStatus(selectedStatus)}.`);

        await loadWork();
    } catch (error) {
        setDialogMessage(error.message || "Unable to update report status.", true);
    } finally {
        statusSelect.disabled = !currentReport;
        saveStatusButton.disabled = !currentReport || statusSelect.value === currentReport.status;
    }
});

async function signOut() {
    logoutButton.disabled = true;

    try {
        const token = await getCsrfToken();

        await requestJson("/api/auth/logout", {
            method: "POST",
            headers: {
                "X-XSRF-TOKEN": token
            }
        });

        window.location.assign("/login/login.html");
    } catch (error) {
        pageStatus.textContent = error.message || "Unable to sign out.";
        logoutButton.disabled = false;
    }
}

async function initializePage() {
    refreshButton.disabled = true;

    try {
        const user = await window.roleNavigationUserPromise;

        if (user.role !== "MAINTENANCE_TECHNICIAN") {
            window.location.assign("/maintenance-dashboard/maintenance-dashboard.html");
            return;
        }

        accountName.textContent = user.displayName;
        await loadWork();
    } catch (error) {
        pageStatus.textContent =
            error.message || "Unable to initialize the technician page.";
    } finally {
        refreshButton.disabled = false;
    }
}

document.getElementById("closeDialog").addEventListener("click", () => {
    workDialog.close();
});

refreshButton.addEventListener("click", () => {
    currentPage = 0;
    loadWork();
});

statusFilter.addEventListener("change", () => {
    currentPage = 0;
    loadWork();
});

previousButton.addEventListener("click", () => {
    if (currentPage > 0) {
        currentPage--;
        loadWork();
    }
});

nextButton.addEventListener("click", () => {
    if (currentPage < totalPages - 1) {
        currentPage++;
        loadWork();
    }
});

logoutButton.addEventListener("click", signOut);

initializePage();

return disposeDropdowns;
}

if (!window.appRouterActive) mount();

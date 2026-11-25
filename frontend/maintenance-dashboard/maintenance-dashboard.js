const summaryUnread = document.getElementById("summaryUnread");
const accountName = document.getElementById("accountName");
const inboxStatus = document.getElementById("inboxStatus");
const notificationsList = document.getElementById("notificationsList");
const emptyState = document.getElementById("emptyState");
const unreadCount = document.getElementById("unreadCount");
const refreshButton = document.getElementById("refreshButton");
const logoutButton = document.getElementById("logoutButton");
const reportDialog = document.getElementById("reportDialog");
const reportDialogTitle = document.getElementById("reportDialogTitle");
const reportDialogStatus = document.getElementById("reportDialogStatus");
const reportDetails = document.getElementById("reportDetails");
const notificationRoles = ["MAINTENANCE_SUPERVISOR", "SYSTEM_ADMINISTRATOR"];

async function readJsonResponse(response) {
    if (response.status === 204) {
        return {};
    }

    const contentType = response.headers.get("content-type") || "";
    return contentType.includes("application/json") ? response.json() : {};
}

async function requestJson(url, options = {}) {
    let response;

    try {
        response = await fetch(url, options);
    } catch {
        throw new Error("Unable to reach the server. Check your connection and try again.");
    }

    const result = await readJsonResponse(response);

    if (response.status === 401 || response.status === 403) {
        window.location.assign("/login/login.html");
        throw new Error("Your session has expired. Please sign in again.");
    }

    if (!response.ok) {
        throw new Error(result.error || `Request failed (HTTP ${response.status}).`);
    }

    return result;
}

async function getCsrfToken() {
    const result = await requestJson("/api/auth/csrf");

    if (!result.token) {
        throw new Error("The server did not provide a security token. Please try again.");
    }

    return result.token;
}

function renderNotifications(notifications) {
    if (!Array.isArray(notifications)) {
        throw new Error("The server returned an invalid notifications list.");
    }

    const unread = notifications.filter((notification) => !notification.readAt);
    unreadCount.textContent = String(unread.length);
    summaryUnread.textContent = String(unread.length);
    notificationsList.replaceChildren();
    emptyState.hidden = notifications.length > 0;

    for (const notification of notifications) {
        const card = document.createElement("article");
        card.className = notification.readAt ? "notification is-read" : "notification";

        const content = document.createElement("div");
        content.className = "notification-content";

        const type = document.createElement("p");
        type.className = "notification-type";
        type.textContent = notification.type.replaceAll("_", " ");

        const message = document.createElement("p");
        message.className = "notification-message";
        message.textContent = notification.message;

        const meta = document.createElement("p");
        meta.className = "notification-meta";
        const createdAt = new Date(notification.createdAt);
        meta.textContent = `Report #${notification.reportId} - ${createdAt.toLocaleString()}`;

        content.append(type, message, meta);

        const openButton = document.createElement("button");
        openButton.type = "button";
        openButton.className = "notification-open";
        openButton.setAttribute("aria-label", `Open fault report #${notification.reportId}`);
        openButton.append(content);
        openButton.addEventListener("click", () => openReport(notification, openButton));
        card.append(openButton);

        if (!notification.readAt) {
            const markReadButton = document.createElement("button");
            markReadButton.type = "button";
            markReadButton.textContent = "Mark as read";
            markReadButton.addEventListener("click", () => markAsRead(notification.id, markReadButton));
            card.append(markReadButton);
        }

        notificationsList.append(card);
    }
}

function addReportField(container, label, value) {
    const field = document.createElement("div");
    field.className = "report-field";

    const fieldLabel = document.createElement("strong");
    fieldLabel.textContent = label;

    const fieldValue = document.createElement("p");
    fieldValue.textContent = value || "Not available";

    field.append(fieldLabel, fieldValue);
    container.append(field);
}

function renderReportDetails(details) {
    if (!details.fault) {
        throw new Error("The server returned an invalid fault report.");
    }

    const fault = details.fault;
    reportDialogTitle.textContent = `Fault Report #${fault.id}`;
    reportDialogStatus.textContent = "";
    reportDetails.replaceChildren();

    const fields = document.createElement("div");
    fields.className = "report-fields";
    addReportField(fields, "Machine", `${fault.machineIdentifier} - ${fault.machineName}`);
    addReportField(fields, "Status", fault.status);
    addReportField(fields, "Reported by", fault.reporterName);
    addReportField(fields, "Submitted", new Date(fault.submittedAt).toLocaleString());
    addReportField(fields, "Assigned technician", fault.technicianName || "Unassigned");
    reportDetails.append(fields);

    const description = document.createElement("section");
    description.className = "report-description";
    const descriptionTitle = document.createElement("h3");
    descriptionTitle.textContent = "Fault description";
    const descriptionText = document.createElement("p");
    descriptionText.textContent = fault.description;
    description.append(descriptionTitle, descriptionText);
    reportDetails.append(description);

    if (details.attachments?.length) {
        const attachments = document.createElement("section");
        attachments.className = "report-attachments";
        const attachmentsTitle = document.createElement("h3");
        attachmentsTitle.textContent = "Evidence";
        const list = document.createElement("ul");

        for (const attachment of details.attachments) {
            const item = document.createElement("li");
            const link = document.createElement("a");
            link.href = attachment.downloadUrl;
            link.textContent = attachment.originalName;
            item.append(link);
            list.append(item);
        }

        attachments.append(attachmentsTitle, list);
        reportDetails.append(attachments);
    }

    reportDialog.showModal();
}

async function loadInbox() {
    refreshButton.disabled = true;
    inboxStatus.textContent = "Loading notifications...";
    emptyState.hidden = true;

    try {
        const notifications = await requestJson("/api/notifications");
        renderNotifications(notifications);
        inboxStatus.textContent = "";
    } catch (error) {
        inboxStatus.textContent = error.message || "Unable to load notifications.";
    } finally {
        refreshButton.disabled = false;
    }
}

async function openReport(notification, button) {
    button.disabled = true;
    inboxStatus.textContent = "Opening fault report...";

    try {
        const details = await requestJson(`/api/faults/${notification.reportId}`);
        renderReportDetails(details);

        if (!notification.readAt) {
            const token = await getCsrfToken();
            await requestJson(`/api/notifications/${notification.id}/read`, {
                method: "PATCH",
                headers: {
                    "X-XSRF-TOKEN": token
                }
            });
            await loadInbox();
            reportDialogStatus.textContent = "This notification has been marked as read.";
        } else {
            inboxStatus.textContent = "";
        }
    } catch (error) {
        const message = error.message || "Unable to open the fault report.";
        if (reportDialog.open) {
            reportDialogStatus.textContent = message;
        } else {
            inboxStatus.textContent = message;
        }
    } finally {
        button.disabled = false;
    }
}

async function markAsRead(notificationId, button) {
    button.disabled = true;
    inboxStatus.textContent = "Updating notification...";

    try {
        const token = await getCsrfToken();
        await requestJson(`/api/notifications/${notificationId}/read`, {
            method: "PATCH",
            headers: {
                "X-XSRF-TOKEN": token
            }
        });
        await loadInbox();
    } catch (error) {
        inboxStatus.textContent = error.message || "Unable to update notification.";
        button.disabled = false;
    }
}

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
        inboxStatus.textContent = error.message || "Unable to sign out.";
        logoutButton.disabled = false;
    }
}

async function initializeDashboard() {
    refreshButton.disabled = true;

    try {
        const user = await requestJson("/api/auth/me");

        if (!notificationRoles.includes(user.role)) {
            window.location.assign("/fault-report/fault-report.html");
            return;
        }

        accountName.textContent = user.displayName;
        await loadInbox();
    } catch (error) {
        inboxStatus.textContent = error.message || "Unable to load the maintenance inbox.";
    } finally {
        refreshButton.disabled = false;
    }
}

refreshButton.addEventListener("click", loadInbox);
logoutButton.addEventListener("click", signOut);
document.getElementById("closeReportDialog").addEventListener("click", () => reportDialog.close());
initializeDashboard();

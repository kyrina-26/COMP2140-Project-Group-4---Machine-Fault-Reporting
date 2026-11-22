
const faultReportForm = document.getElementById("faultReportForm");
const machineCodeInput = document.getElementById("machineCode");
const descriptionInput = document.getElementById("description");
const formMessage = document.getElementById("formMessage");
const submitButton = document.getElementById("submitButton");
const scanButton = document.getElementById("scanButton");
const scanStatus = document.getElementById("scanStatus");
const picturesInput = document.getElementById("pictures");
const audioInput = document.getElementById("audio");
const videoInput = document.getElementById("video");
const originalButtonText = submitButton.textContent.trim();
const accountName = document.getElementById("accountName");
const logoutButton = document.getElementById("logoutButton");

let pendingAttachments = null;

function displayMessage(message) {
    formMessage.textContent = message;
}

async function readJsonResponse(response) {
    if (!response.headers.get("content-type")?.includes("application/json")) {
        return {};
    }

    return response.json();
}

async function requestJson(url, options) {
    let response;

    try {
        response = await fetch(url, options);
    } catch {
        throw new Error("Unable to reach the server. Check your connection and try again.");
    }

    const result = await readJsonResponse(response);

    if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
            throw new Error("Your session may have expired. Please sign in again.");
        }

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

async function signOut() {
    logoutButton.disabled = true;

    try {
        const csrfToken = await getCsrfToken();
        await requestJson("/api/auth/logout", {
            method: "POST",
            headers: {
                "X-XSRF-TOKEN": csrfToken
            }
        });
        window.location.assign("login.html");
    } catch (error) {
        displayMessage(error.message || "Unable to sign out.");
        logoutButton.disabled = false;
    }
}

async function loadAccount() {
    try {
        const user = await requestJson("/api/auth/me");
        accountName.textContent = user.displayName;
    } catch (error) {
        displayMessage(error.message || "Unable to verify your session.");
        window.location.assign("login.html");
    }
}

function selectedFiles() {
    return [
        ...picturesInput.files,
        ...audioInput.files,
        ...videoInput.files
    ];
}

async function uploadAttachments(reportId, files, csrfToken) {
    const failed = [];

    for (const file of files) {
        const data = new FormData();
        data.append("file", file);

        try {
            await requestJson(`/api/faults/${reportId}/attachments`, {
                method: "POST",
                headers: {
                    "X-XSRF-TOKEN": csrfToken
                },
                body: data
            });
        } catch (error) {
            failed.push({ file, message: error.message });
        }
    }

    return failed;
}

function setRetryMode(enabled) {
    machineCodeInput.disabled = enabled;
    descriptionInput.disabled = enabled;
    picturesInput.disabled = enabled;
    audioInput.disabled = enabled;
    videoInput.disabled = enabled;
    submitButton.textContent = enabled ? "Retry Failed Uploads" : originalButtonText;
}

scanButton.addEventListener("click", () => {
    scanStatus.textContent =
        "QR scanning is not connected yet. Please enter the machine code manually.";
});

logoutButton.addEventListener("click", signOut);
loadAccount();

faultReportForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    submitButton.disabled = true;
    displayMessage("Submitting report...");

    try {
        const csrfToken = await getCsrfToken();

        if (!pendingAttachments) {
            const machineIdentifier = machineCodeInput.value.trim();
            const description = descriptionInput.value.trim();

            if (!machineIdentifier) {
                machineCodeInput.focus();
                throw new Error("Please enter the machine code.");
            }

            if (!description) {
                descriptionInput.focus();
                throw new Error("Please describe the machine fault.");
            }

            const report = await requestJson("/api/faults", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-XSRF-TOKEN": csrfToken
                },
                body: JSON.stringify({ machineIdentifier, description })
            });

            if (!report.id) {
                throw new Error("The report was submitted, but the server did not return its ID.");
            }

            pendingAttachments = {
                reportId: report.id,
                files: selectedFiles()
            };
        }

        if (pendingAttachments.files.length > 0) {
            displayMessage(`Uploading evidence for report #${pendingAttachments.reportId}...`);
            const failed = await uploadAttachments(
                pendingAttachments.reportId,
                pendingAttachments.files,
                csrfToken
            );

            if (failed.length > 0) {
                pendingAttachments.files = failed.map((item) => item.file);
                setRetryMode(true);
                displayMessage(
                    `Report #${pendingAttachments.reportId} was saved, but these uploads failed: ` +
                    failed.map((item) => `${item.file.name} (${item.message})`).join("; ") +
                    ". Select Retry Failed Uploads to try again."
                );
                return;
            }
        }

        const reportId = pendingAttachments.reportId;
        pendingAttachments = null;
        faultReportForm.reset();
        setRetryMode(false);
        displayMessage(`Report #${reportId} and its evidence were saved successfully.`);
    } catch (error) {
        displayMessage(error.message || "The report could not be submitted.");
    } finally {
        submitButton.disabled = false;
    }
});


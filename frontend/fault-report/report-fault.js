
export function mount() {
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
const accountName = document.getElementById("accountName");
const logoutButton = document.getElementById("logoutButton");

function displayMessage(message, state = "") {
    formMessage.textContent = message;
    formMessage.className = `form-message${state ? ` is-${state}` : ""}`;
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

        const error = new Error(result.error || `Request failed (HTTP ${response.status}).`);
        error.status = response.status;
        throw error;
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
        window.location.assign("/login/login.html");
    } catch (error) {
        displayMessage(error.message || "Unable to sign out.", "error");
        logoutButton.disabled = false;
    }
}

async function loadAccount() {
    try {
        const user = window.roleNavigationUserPromise
            ? await window.roleNavigationUserPromise
            : await requestJson("/api/auth/me");
        accountName.textContent = user.displayName;
    } catch (error) {
        displayMessage(error.message || "Unable to verify your session.", "error");
        window.location.assign("/login/login.html");
    }
}

function selectedFiles() {
    return [
        ...picturesInput.files,
        ...audioInput.files,
        ...videoInput.files
    ];
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
    displayMessage("Submitting report...", "loading");

    try {
        const csrfToken = await getCsrfToken();

        const machineIdentifier = machineCodeInput.value.trim();
        const description = descriptionInput.value.trim();
        const files = selectedFiles();

        if (!machineIdentifier) {
            machineCodeInput.focus();
            throw new Error("Please enter the machine code.");
        }

        if (!description) {
            descriptionInput.focus();
            throw new Error("Please describe the machine fault.");
        }

        displayMessage(
            files.length > 0 ? "Submitting report and uploading evidence..." : "Submitting report...",
            "loading"
        );

        let report;
        if (files.length > 0) {
            const data = new FormData();
            data.append("machineIdentifier", machineIdentifier);
            data.append("description", description);
            for (const file of files) {
                data.append("files", file);
            }
            report = await requestJson("/api/faults", {
                method: "POST",
                headers: { "X-XSRF-TOKEN": csrfToken },
                body: data
            });
        } else {
            report = await requestJson("/api/faults", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-XSRF-TOKEN": csrfToken
                },
                body: JSON.stringify({ machineIdentifier, description })
            });
        }

        if (!report.id) {
            throw new Error("The report was submitted, but the server did not return its ID.");
        }

        faultReportForm.reset();
        displayMessage(
            files.length > 0
                ? `Report #${report.id} and its evidence were saved successfully.`
                : `Report #${report.id} was saved successfully.`,
            "success"
        );
    } catch (error) {
        const message = error.status === 413
            ? "An attachment exceeds the upload size limit. Choose a smaller file and try again. No report was saved."
            : error.message || "The report could not be submitted.";
        displayMessage(message, "error");
    } finally {
        submitButton.disabled = false;
    }
});
}

if (!window.appRouterActive) mount();


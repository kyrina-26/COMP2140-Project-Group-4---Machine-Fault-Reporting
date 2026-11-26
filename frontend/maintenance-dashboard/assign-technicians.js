export function mount() {
    const rows = document.getElementById("assignmentRows");
    const message = document.getElementById("assignmentMessage");
    const empty = document.getElementById("assignmentEmpty");
    const refreshButton = document.getElementById("refreshAssignments");
    const logoutButton = document.getElementById("logoutButton");

    async function readResponse(response) {
        const type = response.headers.get("content-type") || "";
        const result = type.includes("application/json") ? await response.json() : null;
        if (!response.ok) {
            throw new Error(result?.error || result?.message || `Request failed (HTTP ${response.status}).`);
        }
        return result;
    }

    async function getJson(url) {
        return readResponse(await fetch(url, { credentials: "include" }));
    }

    async function assign(reportId, technicianId, button) {
        button.disabled = true;
        message.textContent = `Assigning technician to report #${reportId}…`;
        try {
            const { token } = await getJson("/api/auth/csrf");
            const result = await readResponse(await fetch(`/api/faults/${reportId}/assignment`, {
                method: "PUT",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    "X-XSRF-TOKEN": token
                },
                body: JSON.stringify({ technicianId })
            }));
            message.textContent = `Report #${result.id} assigned to ${result.technicianName}.`;
            await loadReports();
        } catch (error) {
            message.textContent = error.message || "Unable to assign this report.";
            button.disabled = false;
        }
    }

    function createCell(value, className) {
        const cell = document.createElement("td");
        if (className) cell.className = className;
        cell.textContent = value || "—";
        return cell;
    }

    function renderReport(report, technicians) {
        const row = document.createElement("tr");
        row.append(
            createCell(`#${report.id}`),
            createCell(`${report.machineIdentifier} · ${report.machineName}`),
            createCell(report.description, "fault-description"),
            createCell(report.status.replaceAll("_", " ")),
            createCell(report.technicianName)
        );

        const controls = document.createElement("td");
        controls.className = "assignment-controls";
        const select = document.createElement("select");
        select.setAttribute("aria-label", `Technician for report ${report.id}`);
        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = "Select technician";
        select.append(placeholder);

        for (const technician of technicians) {
            const option = document.createElement("option");
            option.value = technician.id;
            option.textContent = technician.displayName;
            if (String(technician.id) === String(report.technicianId)) option.selected = true;
            select.append(option);
        }

        const button = document.createElement("button");
        button.type = "button";
        button.className = "assign-button";
        button.textContent = report.technicianId ? "Reassign" : "Assign";
        button.disabled = technicians.length === 0;
        button.addEventListener("click", () => {
            if (!select.value) {
                message.textContent = "Choose a technician first.";
                select.focus();
                return;
            }
            assign(report.id, Number(select.value), button);
        });
        controls.append(select, button);
        row.append(controls);
        return row;
    }

    async function loadReports() {
        refreshButton.disabled = true;
        message.textContent = "Loading reports and technicians…";
        rows.replaceChildren();
        empty.hidden = true;
        try {
            const [reported, assigned, technicians] = await Promise.all([
                getJson("/api/faults?status=REPORTED&page=0&size=100"),
                getJson("/api/faults?status=ASSIGNED&page=0&size=100"),
                getJson("/api/users/technicians")
            ]);
            if (!Array.isArray(technicians)) throw new Error("The server returned an invalid technician list.");
            const reports = [...(reported.content || []), ...(assigned.content || [])]
                .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
            for (const report of reports) rows.append(renderReport(report, technicians));
            empty.hidden = reports.length > 0;
            message.textContent = technicians.length
                ? `${reports.length} report${reports.length === 1 ? "" : "s"} available for assignment.`
                : "No technicians are currently signed in. Ask a technician to sign in, then refresh this page.";
        } catch (error) {
            message.textContent = error.message || "Unable to load assignment data.";
        } finally {
            refreshButton.disabled = false;
        }
    }

    async function signOut() {
        logoutButton.disabled = true;
        try {
            const { token } = await getJson("/api/auth/csrf");
            await readResponse(await fetch("/api/auth/logout", {
                method: "POST",
                credentials: "include",
                headers: { "X-XSRF-TOKEN": token }
            }));
            window.location.assign("/login/login.html");
        } catch (error) {
            message.textContent = error.message || "Unable to sign out. Please try again.";
            logoutButton.disabled = false;
        }
    }

    refreshButton.addEventListener("click", loadReports);
    logoutButton?.addEventListener("click", signOut);
    loadReports();
}

if (!window.appRouterActive) mount();

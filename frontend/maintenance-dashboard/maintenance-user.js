

const API_BASE = "/api";

const usersTableBody = document.getElementById("usersTableBody");
const userDialog = document.getElementById("userDialog");
const userForm = document.getElementById("userForm");
const message = document.getElementById("message");

let users = [];
let currentUser = null;
let canManageUsers = false;

/* API request helper */

async function apiRequest(url, options = {}) {
    const response = await fetch(`${API_BASE}${url}`, {
        ...options,
        credentials: "include",
        headers: {
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...options.headers
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Request failed: ${response.status}`);
    }

    if (response.status === 204) {
        return null;
    }

    const text = await response.text();
    return text ? JSON.parse(text) : null;
}

/* User information helpers */

function getUserId(user) {
    return user.id ?? user.userId;
}

function getFullName(user) {
    return `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()
        || user.name
        || "Unnamed User";
}

function getRole(user) {
    return user.role ?? user.userRole ?? "Not assigned";
}

function getStatus(user) {
    const active = user.active ?? user.isActive ?? user.enabled;

    if (active === true) return "ACTIVE";
    if (active === false) return "INACTIVE";

    return String(user.status ?? "INACTIVE").toUpperCase();
}

function isActive(user) {
    return getStatus(user) === "ACTIVE";
}

function displayRole(role) {
    const roles = {
        ADMIN: "Administrator",
        MAINTENANCE_MANAGER: "Maintenance Manager",
        MAINTENANCE_SUPERVISOR: "Maintenance Supervisor",
        MAINTENANCE_TECHNICIAN: "Maintenance Technician",
        MACHINE_OPERATOR: "Machine Operator"
    };

    return roles[role] || String(role).replaceAll("_", " ");
}

/* Messages */

function showMessage(text, isError = false) {
    message.textContent = text;
    message.classList.toggle("error", isError);
}

function clearMessage() {
    message.textContent = "";
    message.classList.remove("error");
}

/* Summary cards */

function updateSummary() {
    const activeCount = users.filter(isActive).length;
    const inactiveCount = users.length - activeCount;

    const maintenanceCount = users.filter(user =>
        [
            "MAINTENANCE_MANAGER",
            "MAINTENANCE_SUPERVISOR",
            "MAINTENANCE_TECHNICIAN"
        ].includes(getRole(user))
    ).length;

    document.getElementById("totalUsers").textContent = users.length;
    document.getElementById("activeUsers").textContent = activeCount;
    document.getElementById("inactiveUsers").textContent = inactiveCount;
    document.getElementById("maintenanceUsers").textContent = maintenanceCount;
}

/* Render users */

function renderUsers() {
    const search = document.getElementById("searchInput")
        .value.trim().toLowerCase();

    const selectedRole = document.getElementById("roleFilter").value;
    const selectedStatus = document.getElementById("statusFilter").value;

    const filteredUsers = users.filter(user => {
        const name = getFullName(user).toLowerCase();
        const email = String(user.email ?? "").toLowerCase();
        const employeeId = String(user.employeeId ?? "").toLowerCase();

        const matchesSearch =
            name.includes(search) ||
            email.includes(search) ||
            employeeId.includes(search);

        const matchesRole =
            !selectedRole || getRole(user) === selectedRole;

        const matchesStatus =
            !selectedStatus || getStatus(user) === selectedStatus;

        return matchesSearch && matchesRole && matchesStatus;
    });

    document.getElementById("userCount").textContent =
        `${filteredUsers.length} users`;

    usersTableBody.replaceChildren();

    if (filteredUsers.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 7;
        cell.className = "empty-state";
        cell.textContent = "No users found.";

        row.appendChild(cell);
        usersTableBody.appendChild(row);
        return;
    }

    filteredUsers.forEach(user => {
        const row = document.createElement("tr");

        const employeeCell = document.createElement("td");
        employeeCell.textContent = user.employeeId ?? "Not available";

        const nameCell = document.createElement("td");
        nameCell.textContent = getFullName(user);

        const emailCell = document.createElement("td");
        emailCell.textContent = user.email ?? "Not available";

        const departmentCell = document.createElement("td");
        departmentCell.textContent = user.department ?? "Not available";

        const roleCell = document.createElement("td");
        roleCell.textContent = displayRole(getRole(user));

        const statusCell = document.createElement("td");
        const statusBadge = document.createElement("span");

        statusBadge.className = `status-badge ${
            isActive(user) ? "status-active" : "status-inactive"
        }`;

        statusBadge.textContent = isActive(user) ? "Active" : "Inactive";
        statusCell.appendChild(statusBadge);

        const actionsCell = document.createElement("td");

        if (canManageUsers) {
            const editButton = document.createElement("button");

            editButton.type = "button";
            editButton.className = "action-button";
            editButton.textContent = "Edit";

            editButton.addEventListener("click", () => openEditDialog(user));

            const toggleButton = document.createElement("button");

            toggleButton.type = "button";
            toggleButton.className = "action-button toggle-button";
            toggleButton.textContent = isActive(user)
                ? "Deactivate"
                : "Activate";

            toggleButton.addEventListener("click", () => toggleUserStatus(user));

            actionsCell.append(editButton, toggleButton);
        } else {
            actionsCell.textContent = "View only";
        }

        row.append(
            employeeCell,
            nameCell,
            emailCell,
            departmentCell,
            roleCell,
            statusCell,
            actionsCell
        );

        usersTableBody.appendChild(row);
    });
}

/* Load all users */

async function loadUsers() {
    clearMessage();

    usersTableBody.innerHTML =
        '<tr><td colspan="7" class="empty-state">Loading users...</td></tr>';

    try {
        const result = await apiRequest("/users");

        if (Array.isArray(result)) {
            users = result;
        } else if (Array.isArray(result?.users)) {
            users = result.users;
        } else if (Array.isArray(result?.data)) {
            users = result.data;
        } else {
            users = [];
        }

        updateSummary();
        renderUsers();

    } catch (error) {
        users = [];
        updateSummary();
        renderUsers();

        showMessage(`Unable to load users: ${error.message}`, true);
    }
}

/* Reset registration form */

function resetUserForm() {
    userForm.reset();

    document.getElementById("userId").value = "";
    document.getElementById("password").required = true;
    document.getElementById("passwordField").hidden = false;

    document.getElementById("dialogTitle").textContent = "Register New User";
    document.getElementById("saveButton").textContent = "Create Account";
}

/* Register new user */

function openAddDialog() {
    if (!canManageUsers) {
        showMessage("You are not authorized to register users.", true);
        return;
    }

    resetUserForm();
    clearMessage();
    userDialog.showModal();
}

/* Edit existing user */

function openEditDialog(user) {
    if (!canManageUsers) {
        showMessage("You are not authorized to edit user accounts.", true);
        return;
    }

    resetUserForm();

    document.getElementById("dialogTitle").textContent = "Update User Profile";
    document.getElementById("saveButton").textContent = "Update User";

    document.getElementById("userId").value = getUserId(user) ?? "";
    document.getElementById("firstName").value = user.firstName ?? "";
    document.getElementById("lastName").value = user.lastName ?? "";
    document.getElementById("email").value = user.email ?? "";
    document.getElementById("employeeId").value = user.employeeId ?? "";
    document.getElementById("department").value = user.department ?? "";
    document.getElementById("userRole").value = getRole(user);
    document.getElementById("accountStatus").value = getStatus(user);

    // Password changes use a separate secure process.
    document.getElementById("passwordField").hidden = true;
    document.getElementById("password").required = false;

    clearMessage();
    userDialog.showModal();
}

/* Create or update user */

userForm.addEventListener("submit", async event => {
    event.preventDefault();
    clearMessage();

    if (!canManageUsers) {
        showMessage("You are not authorized to manage user accounts.", true);
        return;
    }

    const userId = document.getElementById("userId").value;
    const password = document.getElementById("password").value;

    const userData = {
        firstName: document.getElementById("firstName").value.trim(),
        lastName: document.getElementById("lastName").value.trim(),
        email: document.getElementById("email").value.trim(),
        employeeId: document.getElementById("employeeId").value.trim(),
        department: document.getElementById("department").value,
        role: document.getElementById("userRole").value,
        status: document.getElementById("accountStatus").value
    };

    if (
        !userData.firstName ||
        !userData.lastName ||
        !userData.email ||
        !userData.employeeId ||
        !userData.department ||
        !userData.role
    ) {
        showMessage("Please complete all required fields.", true);
        return;
    }

    if (!userId && password.length < 8) {
        showMessage(
            "The temporary password must contain at least 8 characters.",
            true
        );
        return;
    }

    if (!userId) {
        userData.password = password;
    }

    const saveButton = document.getElementById("saveButton");

    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

    try {
        if (userId) {
            await apiRequest(`/users/${encodeURIComponent(userId)}`, {
                method: "PUT",
                body: JSON.stringify(userData)
            });
        } else {
            await apiRequest("/users", {
                method: "POST",
                body: JSON.stringify(userData)
            });
        }

        userDialog.close();
        resetUserForm();

        await loadUsers();

        showMessage(
            userId
                ? "User profile updated successfully."
                : "New user account created successfully."
        );

    } catch (error) {
        showMessage(`Unable to save user: ${error.message}`, true);
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = userId ? "Update User" : "Create Account";
    }
});

/* Activate or deactivate an account */

async function toggleUserStatus(user) {
    if (!canManageUsers) {
        showMessage("You are not authorized to change account status.", true);
        return;
    }

    const userId = getUserId(user);
    const newStatus = isActive(user) ? "INACTIVE" : "ACTIVE";

    const action = newStatus === "ACTIVE" ? "activate" : "deactivate";

    if (!confirm(`Are you sure you want to ${action} this account?`)) {
        return;
    }

    try {
        await apiRequest(`/users/${encodeURIComponent(userId)}/status`, {
            method: "PATCH",
            body: JSON.stringify({ status: newStatus })
        });

        await loadUsers();

        showMessage(`User account ${action}d successfully.`);

    } catch (error) {
        showMessage(
            `Unable to change account status: ${error.message}`,
            true
        );
    }
}

/* Load logged-in user and check permissions */

async function loadCurrentUser() {
    try {
        currentUser = await apiRequest("/auth/me");

        document.getElementById("userName").textContent =
            getFullName(currentUser);

        // Only administrators can manage accounts in this example.
        const currentRole = getRole(currentUser);

        canManageUsers = ["ADMIN", "MAINTENANCE_MANAGER"].includes(currentRole);

        document.getElementById("addUserButton").hidden = !canManageUsers;

        if (!canManageUsers) {
            showMessage(
                "You do not have permission to manage user accounts.",
                true
            );
        }

        renderUsers();

    } catch (error) {
        console.error("Unable to load current user:", error);

        document.getElementById("userName").textContent = "User";
        document.getElementById("addUserButton").hidden = true;

        canManageUsers = false;
    }
}

/* Event listeners */

document.getElementById("addUserButton")
    .addEventListener("click", openAddDialog);

document.getElementById("closeDialogButton")
    .addEventListener("click", () => userDialog.close());

document.getElementById("cancelButton")
    .addEventListener("click", () => userDialog.close());

document.getElementById("refreshButton")
    .addEventListener("click", loadUsers);

document.getElementById("searchInput")
    .addEventListener("input", renderUsers);

document.getElementById("roleFilter")
    .addEventListener("change", renderUsers);

document.getElementById("statusFilter")
    .addEventListener("change", renderUsers);

/* Sign out */

document.getElementById("logoutButton").addEventListener("click", async () => {
    try {
        await apiRequest("/auth/logout", {
            method: "POST"
        });
    } catch (error) {
        console.error("Sign out request failed:", error);
    } finally {
        window.location.href = "login.html";
    }
});

/* Initial page loading */

async function initializePage() {
    await loadCurrentUser();
    await loadUsers();
}

initializePage();

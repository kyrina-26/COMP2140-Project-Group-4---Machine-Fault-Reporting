import { enhanceSelects } from "/shared/scripts/styled-select.js";

export function mount() {
    const disposeDropdowns = enhanceSelects(document);
    const API_BASE = "/api";

    const usersTableBody = document.getElementById("usersTableBody");
    const userDialog = document.getElementById("userDialog");
    const deleteUserDialog = document.getElementById("deleteUserDialog");
    const deleteUserMessage = document.getElementById("deleteUserMessage");
    const closeDeleteUserDialog = document.getElementById("closeDeleteUserDialog");
    const cancelDeleteUser = document.getElementById("cancelDeleteUser");
    const confirmDeleteUser = document.getElementById("confirmDeleteUser");
    const statusDialog = document.getElementById("statusDialog");
    const statusDialogTitle = document.getElementById("statusDialogTitle");
    const statusDialogMessage = document.getElementById("statusDialogMessage");
    const closeStatusDialog = document.getElementById("closeStatusDialog");
    const cancelStatusChange = document.getElementById("cancelStatusChange");
    const confirmStatusChange = document.getElementById("confirmStatusChange");
    const userForm = document.getElementById("userForm");
    const message = document.getElementById("message");
    const formMessage = document.getElementById("formMessage");

    let users = [];
    let currentUser = null;
    let canManageUsers = false;
    let currentPage = 0;
    let totalPages = 0;
    let totalElements = 0;
    let pageSize = 10;
    let latestUsersRequest = 0;
    let searchTimer;
    let userPendingDeletion = null;
    let userPendingStatusChange = null;

    /* API request helper */

    async function apiRequest(url, options = {}) {
        const headers = {
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...options.headers
        };

        if (options.method && options.method !== "GET") {
            const csrfResponse = await fetch(`${API_BASE}/auth/csrf`, {
                credentials: "include"
            });

            const csrf = await csrfResponse.json();
            headers["X-XSRF-TOKEN"] = csrf.token;
        }

        const response = await fetch(`${API_BASE}${url}`, {
            ...options,
            credentials: "include",
            headers
        });

        if (response.status === 204) {
            return null;
        }

        const text = await response.text();
        let result = null;

        if (text) {
            try {
                result = JSON.parse(text);
            } catch {
                result = { error: text };
            }
        }

        if (!response.ok) {
            const detail = result?.fields
                ? Object.values(result.fields).join(" ")
                : result?.error ?? result?.message;

            throw new Error(detail || `Request failed (HTTP ${response.status}).`);
        }

        return result;
    }

    /* User information helpers */

    function getUserId(user) {
        return user.id ?? user.userId;
    }

    function getFullName(user) {
        return user.displayName
            || `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()
            || user.name
            || "Unnamed User";
    }

    function getRole(user) {
        return user.role ?? user.userRole ?? "Not assigned";
    }

    function getStatus(user) {
        const enabled = user.enabled ?? user.isEnabled ?? user.active ?? user.isActive;

        if (enabled === true) return "ACTIVE";
        if (enabled === false) return "INACTIVE";

        return String(user.status ?? "INACTIVE").toUpperCase();
    }

    function isActive(user) {
        return getStatus(user) === "ACTIVE";
    }

    function displayRole(role) {
        const roles = {
            SYSTEM_ADMINISTRATOR: "Administrator",
            MAINTENANCE_SUPERVISOR: "Maintenance Supervisor",
            MAINTENANCE_TECHNICIAN: "Maintenance Technician",
            PRODUCTION_WORKER: "Production Worker",
            PRODUCTION_SUPERVISOR: "Production Supervisor",
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

    function showFormMessage(text) {
        formMessage.textContent = text;
        formMessage.classList.add("is-error");
        formMessage.hidden = false;
    }

    function clearFormMessage() {
        formMessage.textContent = "";
        formMessage.classList.remove("is-error");
        formMessage.hidden = true;
    }

    /* Summary cards */

    function updateSummary() {
        const maintenanceCount = users.filter(user =>
            [
                "MAINTENANCE_SUPERVISOR",
                "MAINTENANCE_TECHNICIAN"
            ].includes(getRole(user))
        ).length;

        document.getElementById("totalUsers").textContent = totalElements;
        document.getElementById("maintenanceUsers").textContent = maintenanceCount;
    }

    /* Enable or disable a user account */

    function changeUserStatus(user) {
        if (!canManageUsers) {
            showMessage("You are not authorized to change user status.", true);
            return;
        }

        const userId = getUserId(user);
        const name = getFullName(user);
        const currentlyActive = isActive(user);
        const newStatus = !currentlyActive;

        userPendingStatusChange = { user, newStatus };
        statusDialogTitle.textContent = newStatus ? "Enable user account?" : "Disable user account?";
        statusDialogMessage.textContent = newStatus
            ? `This will restore sign-in access for ${name}.`
            : `This will prevent ${name} from signing in. Their report history will be kept.`;
        confirmStatusChange.textContent = newStatus ? "Enable account" : "Disable account";
        confirmStatusChange.classList.toggle("status-disable-confirm", !newStatus);
        statusDialog.showModal();
    }

    async function confirmUserStatusChange() {
        if (!userPendingStatusChange) return;

        const { user, newStatus } = userPendingStatusChange;
        const userId = getUserId(user);
        const name = getFullName(user);
        const action = newStatus ? "enable" : "disable";
        confirmStatusChange.disabled = true;
        try {
            await apiRequest(`/users/${encodeURIComponent(userId)}/status`, {
                method: "PATCH",
                body: JSON.stringify({
                    enabled: newStatus
                })
            });

            await loadUsers();

            showMessage(
                newStatus
                    ? `${name}'s account has been enabled successfully.`
                    : `${name}'s account has been disabled successfully.`
            );
            statusDialog.close();

        } catch (error) {
            showMessage(
                `Unable to ${action} user account: ${error.message}`,
                true
            );
        }
        finally {
            confirmStatusChange.disabled = false;
        }
    }

    /* Render users */

    function renderUsers() {
        const start = totalElements === 0 ? 0 : currentPage * pageSize + 1;
        const end = Math.min((currentPage + 1) * pageSize, totalElements);

        document.getElementById("userCount").textContent =
            totalElements === 0
                ? "0 users"
                : `Showing ${start}–${end} of ${totalElements} users`;

        document.getElementById("pageStatus").textContent =
            `Page ${totalPages === 0 ? 0 : currentPage + 1} of ${totalPages}`;

        document.getElementById("previousPage").disabled = currentPage <= 0;
        document.getElementById("nextPage").disabled =
            totalPages === 0 || currentPage >= totalPages - 1;

        usersTableBody.replaceChildren();

        if (users.length === 0) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");

            cell.colSpan = 6;
            cell.className = "empty-state";
            cell.textContent = "No users found.";

            row.appendChild(cell);
            usersTableBody.appendChild(row);
            return;
        }

        users.forEach(user => {
            const row = document.createElement("tr");

            const employeeCell = document.createElement("td");
            employeeCell.textContent =
                user.username ?? user.employeeId ?? "Not available";

            const nameCell = document.createElement("td");
            nameCell.textContent = getFullName(user);

            const emailCell = document.createElement("td");
            emailCell.textContent = user.email ?? "Not available";

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

                const statusButton = document.createElement("button");

                statusButton.type = "button";
                statusButton.className = "action-button toggle-button";
                statusButton.textContent = isActive(user) ? "Disable" : "Enable";

                statusButton.addEventListener("click", () => {
                    changeUserStatus(user);
                });

                const deleteButton = document.createElement("button");

                deleteButton.type = "button";
                deleteButton.className = "action-button toggle-button delete-button";
                deleteButton.textContent = "Delete";
                deleteButton.addEventListener("click", () => deleteUser(user));

                actionsCell.append(editButton, statusButton, deleteButton);
            } else {
                actionsCell.textContent = "View only";
            }

            row.append(
                employeeCell,
                nameCell,
                emailCell,
                roleCell,
                statusCell,
                actionsCell
            );

            usersTableBody.appendChild(row);
        });
    }

    /* Load all users */

    async function loadUsers(page = currentPage) {
        const requestId = ++latestUsersRequest;
        currentPage = page;
        pageSize = Number(document.getElementById("pageSize").value);

        clearMessage();

        usersTableBody.innerHTML =
            '<tr><td colspan="6" class="empty-state">Loading users...</td></tr>';

        try {
            const params = new URLSearchParams({
                page: String(page),
                size: String(pageSize)
            });

            const search = document.getElementById("searchInput").value.trim();
            const role = document.getElementById("roleFilter").value;
            const status = document.getElementById("statusFilter").value;

            if (search) params.set("search", search);
            if (role) params.set("role", role);
            if (status) params.set("enabled", status);

            const result = await apiRequest(`/users?${params}`);

            if (requestId !== latestUsersRequest) return;

            users = Array.isArray(result?.content) ? result.content : [];
            totalElements = result?.totalElements ?? users.length;
            totalPages = result?.totalPages ?? (users.length ? 1 : 0);

            if (totalPages > 0 && currentPage >= totalPages) {
                return loadUsers(totalPages - 1);
            }

            updateSummary();
            renderUsers();

        } catch (error) {
            if (requestId !== latestUsersRequest) return;

            users = [];
            totalElements = 0;
            totalPages = 0;

            updateSummary();
            renderUsers();

            showMessage(`Unable to load users: ${error.message}`, true);
        }
    }

    /* Reset registration form */

    function resetUserForm() {
        userForm.reset();
        clearFormMessage();

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

        const [firstName = "", ...lastName] =
            String(user.displayName ?? "").split(" ");

        document.getElementById("firstName").value = firstName;
        document.getElementById("lastName").value = lastName.join(" ");
        document.getElementById("email").value = user.email ?? "";
        document.getElementById("employeeId").value =
            user.username ?? user.employeeId ?? "";

        document.getElementById("userRole").value = getRole(user);
        document.getElementById("userRole").dispatchEvent(
            new Event("styled-select-sync")
        );

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
            showFormMessage("You are not authorized to manage user accounts.");
            return;
        }

        const userId = document.getElementById("userId").value;
        const password = document.getElementById("password").value;

        const userData = {
            displayName:
                `${document.getElementById("firstName").value.trim()} ${document.getElementById("lastName").value.trim()}`,
            email: document.getElementById("email").value.trim(),
            username: document.getElementById("employeeId").value.trim(),
            role: document.getElementById("userRole").value
        };

        if (
            !userData.displayName ||
            !userData.email ||
            !userData.username ||
            !userData.role
        ) {
            showFormMessage("Please complete all required fields.");
            return;
        }

        if (!userId && password.length < 12) {
            showFormMessage(
                "The temporary password must contain at least 12 characters."
            );
            return;
        }

        if (!userId) {
            userData.password = password;
        } else {
            delete userData.username;
        }

        const saveButton = document.getElementById("saveButton");

        saveButton.disabled = true;
        saveButton.textContent = "Saving...";

        clearFormMessage();

        try {
            if (userId) {
                await apiRequest(`/users/${encodeURIComponent(userId)}`, {
                    method: "PATCH",
                    body: JSON.stringify({
                        displayName: userData.displayName,
                        email: userData.email,
                        role: userData.role
                    })
                });
            } else {
                await apiRequest("/users", {
                    method: "POST",
                    body: JSON.stringify({
                        username: userData.username,
                        displayName: userData.displayName,
                        email: userData.email,
                        password: userData.password,
                        role: userData.role
                    })
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
            showFormMessage(
                error.message || "Unable to save user. Please try again."
            );
        } finally {
            saveButton.disabled = false;
            saveButton.textContent = userId ? "Update User" : "Create Account";
        }
    });

    /* Delete user */

    async function deleteUser(user) {
        if (!canManageUsers) {
            showMessage("You are not authorized to delete user accounts.", true);
            return;
        }

        userPendingDeletion = user;
        deleteUserMessage.textContent =
            `Delete ${getFullName(user)}'s account?`;

        deleteUserDialog.showModal();
    }

    async function confirmUserDeletion() {
        if (!userPendingDeletion) return;

        const userId = getUserId(userPendingDeletion);
        const name = getFullName(userPendingDeletion);

        confirmDeleteUser.disabled = true;

        try {
            await apiRequest(`/users/${encodeURIComponent(userId)}`, {
                method: "DELETE"
            });

            await loadUsers();

            showMessage(
                `${name}'s account was deleted. Sign-in is disabled and history was preserved.`
            );

            deleteUserDialog.close();

        } catch (error) {
            showMessage(
                `Unable to delete user account: ${error.message}`,
                true
            );
        } finally {
            confirmDeleteUser.disabled = false;
        }
    }

    closeDeleteUserDialog.addEventListener("click", () => {
        deleteUserDialog.close();
    });

    cancelDeleteUser.addEventListener("click", () => {
        deleteUserDialog.close();
    });

    confirmDeleteUser.addEventListener("click", confirmUserDeletion);

    closeStatusDialog.addEventListener("click", () => statusDialog.close());
    cancelStatusChange.addEventListener("click", () => statusDialog.close());
    confirmStatusChange.addEventListener("click", confirmUserStatusChange);
    statusDialog.addEventListener("close", () => {
        userPendingStatusChange = null;
        confirmStatusChange.disabled = false;
    });
    statusDialog.addEventListener("click", event => {
        if (event.target === statusDialog) statusDialog.close();
    });

    deleteUserDialog.addEventListener("close", () => {
        userPendingDeletion = null;
        confirmDeleteUser.disabled = false;
    });

    deleteUserDialog.addEventListener("click", event => {
        if (event.target === deleteUserDialog) {
            deleteUserDialog.close();
        }
    });

    /* Load logged-in user and check permissions */

    async function loadCurrentUser() {
        try {
            currentUser = await window.roleNavigationUserPromise;

            document.getElementById("userName").textContent =
                getFullName(currentUser);

            const currentRole = getRole(currentUser);

            canManageUsers = currentRole === "SYSTEM_ADMINISTRATOR";

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
        .addEventListener("click", () => loadUsers());

    document.getElementById("searchInput")
        .addEventListener("input", () => {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => loadUsers(0), 250);
        });

    document.getElementById("roleFilter")
        .addEventListener("change", () => loadUsers(0));

    document.getElementById("statusFilter")
        .addEventListener("change", () => loadUsers(0));

    document.getElementById("pageSize")
        .addEventListener("change", () => loadUsers(0));

    document.getElementById("previousPage")
        .addEventListener("click", () => {
            if (currentPage > 0) loadUsers(currentPage - 1);
        });

    document.getElementById("nextPage")
        .addEventListener("click", () => {
            if (currentPage < totalPages - 1) {
                loadUsers(currentPage + 1);
            }
        });

    /* Sign out */

    document.getElementById("logoutButton")
        .addEventListener("click", async () => {
            try {
                await apiRequest("/auth/logout", {
                    method: "POST"
                });
            } catch (error) {
                console.error("Sign out request failed:", error);
            } finally {
                window.location.href = "/login/login.html";
            }
        });

    /* Initial page loading */

    async function initializePage() {
        await loadCurrentUser();
        await loadUsers();
    }

    initializePage();

    return disposeDropdowns;
}

if (!window.appRouterActive) mount();

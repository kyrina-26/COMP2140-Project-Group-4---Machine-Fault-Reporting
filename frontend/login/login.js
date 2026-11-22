const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const loginButton = loginForm.querySelector('button[type="submit"]');

async function readJsonResponse(response) {
    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
        throw new Error(
            response.ok
                ? "The login service returned an unexpected response."
                : `The login service is unavailable (HTTP ${response.status}).`
        );
    }

    return response.json();
}

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    loginButton.disabled = true;
    loginMessage.textContent = "Signing in...";

    try {
        const csrfResponse = await fetch("/api/auth/csrf");
        const csrfData = await readJsonResponse(csrfResponse);

        if (!csrfResponse.ok || !csrfData.token) {
            throw new Error("Unable to start a secure login. Please try again.");
        }

        const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-XSRF-TOKEN": csrfData.token
            },
            body: JSON.stringify({
                username: document.getElementById("username").value.trim(),
                password: document.getElementById("password").value
            })
        });
        const result = await readJsonResponse(response);

        if (!response.ok) {
            throw new Error(result.error || "Login failed. Please try again.");
        }

        const role = result.user?.role;

        if (!role) {
            throw new Error("The login service did not return your account role.");
        }

        const maintenanceRoles = [
            "MAINTENANCE_TECHNICIAN",
            "MAINTENANCE_SUPERVISOR",
            "MAINTENANCE_MANAGER"
        ];
        window.location.assign(
            maintenanceRoles.includes(role)
                ? "/maintenance-dashboard/"
                : "/fault-report/"
        );
    } catch (error) {
        loginMessage.textContent = error.message || "Unable to contact the login service.";
    } finally {
        loginButton.disabled = false;
    }
});

const pageRoles = {
    "maintenance-dashboard.html": ["MAINTENANCE_SUPERVISOR", "SYSTEM_ADMINISTRATOR", "PRODUCTION_WORKER", "PRODUCTION_SUPERVISOR"],
    "technician-work.html": ["MAINTENANCE_TECHNICIAN"],
    "fault-history.html": ["MAINTENANCE_SUPERVISOR", "SYSTEM_ADMINISTRATOR"],
    "production-reports.html": ["PRODUCTION_SUPERVISOR"],
    "fault-report.html": ["PRODUCTION_WORKER"],
    "machine-management.html": ["SYSTEM_ADMINISTRATOR"],
    "maintenance-user.html": ["SYSTEM_ADMINISTRATOR"]
};

const navigationLinks = [
    { page: "maintenance-dashboard.html", label: "Notification Inbox" },
    { page: "fault-report.html", label: "Fault Reporting", href: "/fault-report/fault-report.html" },
    { page: "technician-work.html", label: "Technician Work" },
    { page: "fault-history.html", label: "Fault History" },
    { page: "production-reports.html", label: "Production Reports" },
    { page: "machine-management.html", label: "Machine Management" },
    { page: "maintenance-user.html", label: "User Management" }
];

const roleHome = {
    MAINTENANCE_TECHNICIAN: "technician-work.html",
    PRODUCTION_WORKER: "/fault-report/fault-report.html",
    PRODUCTION_SUPERVISOR: "/maintenance-dashboard/production-reports.html",
};

const pageAssets = {
    "maintenance-dashboard.html": ["maintenance-dashboard.css", "maintenance-dashboard.js"],
    "technician-work.html": ["technician-work.css", "technician-work.js"],
    "fault-history.html": ["fault-history.css", "fault-history.js"],
    "production-reports.html": ["production-reports.css", "production-reports.js"],
    "fault-report.html": ["/fault-report/fault-report.css?v=2", "/fault-report/report-fault.js?v=3"],
    "machine-management.html": ["machine-management.css", "machine-management.js"],
    "maintenance-user.html": ["maintenance-user.css", "maintenance-user.js"]
};

const prefetchedResources = new Set();

function getCachedRole() {
    try {
        return sessionStorage.getItem("userRole");
    } catch {
        return null;
    }
}

function cacheRole(role) {
    try {
        sessionStorage.setItem("userRole", role);
    } catch {
        // Navigation still works when browser storage is unavailable.
    }
}

function prefetchResource(url, as) {
    const absoluteUrl = new URL(url, window.location.href).href;
    if (prefetchedResources.has(absoluteUrl)) return;
    prefetchedResources.add(absoluteUrl);

    const hint = document.createElement("link");
    hint.rel = "prefetch";
    hint.href = absoluteUrl;
    if (as) hint.as = as;
    document.head.append(hint);
}

function prepareNavigationLink(link, item) {
    const prefetch = () => {
        prefetchResource(link.href);
        for (const asset of pageAssets[item.page] ?? []) {
            const isStyle = asset.endsWith(".css") || asset.includes(".css?");
            prefetchResource(
                item.href ? asset : `/maintenance-dashboard/${asset}`,
                isStyle ? "style" : "script"
            );
        }
    };

    link.addEventListener("pointerenter", prefetch, { once: true });
    link.addEventListener("focus", prefetch, { once: true });
}

function renderNavigation(nav, role, pageName) {
    const fragment = document.createDocumentFragment();
    for (const item of navigationLinks) {
        if (!pageRoles[item.page]?.includes(role)) continue;
        const link = document.createElement("a");
        link.className = "nav-link";
        link.href = item.href ?? item.page;
        link.textContent = item.label;
        if (item.page === pageName) {
            link.classList.add("active");
            link.setAttribute("aria-current", "page");
        }
        prepareNavigationLink(link, item);
        fragment.append(link);
    }
    nav.replaceChildren(fragment);
    nav.hidden = false;
}

// Share the session lookup with each page so navigation does not trigger a
// second identical request before loading the page's own data.
window.roleNavigationUserPromise = fetch("/api/auth/me", { credentials: "include" })
    .then(response => {
        if (!response.ok) {
            window.location.assign("/login/login.html");
            throw new Error("Unable to load the signed-in user.");
        }
        return response.json();
    });

async function initializeRoleNavigation() {
    const nav = document.querySelector(".top-navigation");
    if (!nav) return;

    const pageName = window.location.pathname.split("/").pop();
    const cachedRole = getCachedRole();
    if (pageRoles[pageName]?.includes(cachedRole)) {
        renderNavigation(nav, cachedRole, pageName);
    }

    try {
        const user = await window.roleNavigationUserPromise;
        const allowedPages = navigationLinks
            .filter(link => pageRoles[link.page]?.includes(user.role))
            .map(link => link.page);

        if (!pageRoles[pageName]?.includes(user.role)) {
            const destination = roleHome[user.role]
                ?? (allowedPages[0] ?? "/login/login.html");
            window.location.assign(destination.includes("/")
                ? destination
                : `/maintenance-dashboard/${destination}`);
            return;
        }

        cacheRole(user.role);
        renderNavigation(nav, user.role, pageName);
    } catch {
        window.location.assign("/login/login.html");
    }
}

initializeRoleNavigation();

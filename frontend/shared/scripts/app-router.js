const routeTable = {
    "/maintenance-dashboard/maintenance-dashboard.html": {
        title: "Notification Inbox",
        style: "/maintenance-dashboard/maintenance-dashboard.css?v=2",
        module: "/maintenance-dashboard/maintenance-dashboard.js?v=2",
        roles: ["MAINTENANCE_SUPERVISOR", "SYSTEM_ADMINISTRATOR", "PRODUCTION_WORKER", "PRODUCTION_SUPERVISOR"]
    },
    "/maintenance-dashboard/technician-work.html": {
        title: "Technician Work",
        style: "/maintenance-dashboard/technician-work.css",
        module: "/maintenance-dashboard/technician-work.js",
        roles: ["MAINTENANCE_TECHNICIAN"]
    },
    "/maintenance-dashboard/fault-history.html": {
        title: "Fault History",
        style: "/maintenance-dashboard/fault-history.css",
        module: "/maintenance-dashboard/fault-history.js?v=2",
        roles: ["MAINTENANCE_SUPERVISOR", "SYSTEM_ADMINISTRATOR"]
    },
    "/maintenance-dashboard/assign-technicians.html": {
        title: "Assign Technicians",
        style: "/maintenance-dashboard/assign-technicians.css",
        module: "/maintenance-dashboard/assign-technicians.js",
        roles: ["MAINTENANCE_SUPERVISOR", "SYSTEM_ADMINISTRATOR"]
    },
    "/maintenance-dashboard/production-reports.html": {
        title: "Production Report Tracking",
        style: "/maintenance-dashboard/production-reports.css",
        module: "/maintenance-dashboard/production-reports.js?v=2",
        roles: ["PRODUCTION_SUPERVISOR"]
    },
    "/maintenance-dashboard/machine-management.html": {
        title: "Machine Management",
        style: "/maintenance-dashboard/machine-management.css",
        module: "/maintenance-dashboard/machine-management.js",
        roles: ["SYSTEM_ADMINISTRATOR"]
    },
    "/maintenance-dashboard/maintenance-user.html": {
        title: "User Administration",
        style: "/maintenance-dashboard/maintenance-user.css",
        module: "/maintenance-dashboard/maintenance-user.js",
        roles: ["SYSTEM_ADMINISTRATOR"]
    },
    "/fault-report/fault-report.html": {
        title: "Report Machine Fault",
        style: "/fault-report/fault-report.css?v=2",
        module: "/fault-report/report-fault.js",
        roles: ["PRODUCTION_WORKER"]
    }
};

const navigationItems = [
    ["/maintenance-dashboard/maintenance-dashboard.html", "Notification Inbox"],
    ["/fault-report/fault-report.html", "Fault Reporting"],
    ["/maintenance-dashboard/technician-work.html", "Technician Work"],
    ["/maintenance-dashboard/fault-history.html", "Fault History"],
    ["/maintenance-dashboard/assign-technicians.html", "Assign Technicians"],
    ["/maintenance-dashboard/production-reports.html", "Production Reports"],
    ["/maintenance-dashboard/machine-management.html", "Machine Management"],
    ["/maintenance-dashboard/maintenance-user.html", "User Management"]
];

const roleHome = {
    MAINTENANCE_SUPERVISOR: "/maintenance-dashboard/maintenance-dashboard.html",
    SYSTEM_ADMINISTRATOR: "/maintenance-dashboard/maintenance-dashboard.html",
    MAINTENANCE_TECHNICIAN: "/maintenance-dashboard/technician-work.html",
    PRODUCTION_WORKER: "/fault-report/fault-report.html",
    PRODUCTION_SUPERVISOR: "/maintenance-dashboard/production-reports.html",
};

const shell = document.getElementById("appShell");
const nav = document.getElementById("appNavigation");
const content = document.getElementById("appContent");
const dialogs = document.getElementById("appDialogs");
const account = document.getElementById("appAccount");
const subtitle = document.getElementById("appSubtitle");
const errorMessage = document.getElementById("appError");
const routeStyle = document.createElement("link");
routeStyle.rel = "stylesheet";
routeStyle.id = "routeStyle";
document.head.insertBefore(routeStyle, document.getElementById("appShellStyles"));

window.appRouterActive = true;

window.roleNavigationUserPromise = fetch("/api/auth/me", { credentials: "include" })
    .then(response => {
        if (!response.ok) throw new Error("Your session has expired. Please sign in again.");
        return response.json();
    });

const templateCache = new Map();
let currentUser = null;
let currentRoute = null;
let navigationSequence = 0;
let activeRouteCleanup = null;

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.hidden = false;
}

function getRouteFromHash() {
    return decodeURIComponent(window.location.hash.slice(1));
}

function renderNavigation(activeRoute) {
    const links = navigationItems
        .filter(([route]) => routeTable[route].roles.includes(currentUser.role))
        .map(([route, label]) => {
            const link = document.createElement("a");
            link.href = `#${route}`;
            link.dataset.appRoute = route;
            link.textContent = label;
            if (route === activeRoute) link.setAttribute("aria-current", "page");
            return link;
        });
    nav.replaceChildren(...links);
}

function renderAccount(pageDocument) {
    const accountId = pageDocument.getElementById("userName") ? "userName" : "accountName";
    const accountName = document.createElement("span");
    accountName.id = accountId;
    accountName.textContent = currentUser.displayName;

    const logoutButton = document.createElement("button");
    logoutButton.type = "button";
    logoutButton.id = "logoutButton";
    logoutButton.textContent = "Sign out";

    account.replaceChildren(accountName, logoutButton);
}

async function loadTemplate(route) {
    if (templateCache.has(route)) return templateCache.get(route);

    const response = await fetch(route, { credentials: "include" });
    if (!response.ok) throw new Error(`Unable to open this page (HTTP ${response.status}).`);
    const html = await response.text();
    const pageDocument = new DOMParser().parseFromString(html, "text/html");
    if (!pageDocument.querySelector("main")) throw new Error("This page has no content to display.");
    templateCache.set(route, pageDocument);
    return pageDocument;
}

function loadStylesheet(href) {
    if (routeStyle.href === new URL(href, window.location.href).href) return Promise.resolve();
    return new Promise(resolve => {
        routeStyle.onload = () => resolve();
        routeStyle.onerror = () => resolve();
        routeStyle.href = href;
    });
}

async function showRoute(route, { replaceHistory = false } = {}) {
    const routeInfo = routeTable[route];
    if (!routeInfo || !routeInfo.roles.includes(currentUser.role)) {
        route = roleHome[currentUser.role];
    }

    const target = routeTable[route];
    const sequence = ++navigationSequence;
    errorMessage.hidden = true;
    shell.setAttribute("aria-busy", "true");

    try {
        const [pageDocument] = await Promise.all([
            loadTemplate(route),
            loadStylesheet(target.style)
        ]);
        if (sequence !== navigationSequence) return;

        activeRouteCleanup?.();
        activeRouteCleanup = null;

        const main = pageDocument.querySelector("main").cloneNode(true);
        content.replaceChildren(main);
        dialogs.replaceChildren(
            ...Array.from(pageDocument.querySelectorAll("dialog"), dialog => dialog.cloneNode(true))
        );

        const pageSubtitle = pageDocument.querySelector(".header p")?.textContent.trim();
        subtitle.textContent = pageSubtitle || "Maintenance Response System";
        renderAccount(pageDocument);
        renderNavigation(route);
        document.title = target.title;
        currentRoute = route;

        if (window.location.hash.slice(1) !== route) {
            const nextUrl = `${window.location.pathname}#${route}`;
            if (replaceHistory) history.replaceState(null, "", nextUrl);
            else history.pushState(null, "", nextUrl);
        }

        const pageModule = await import(target.module);
        if (sequence !== navigationSequence) return;
        activeRouteCleanup = await pageModule.mount();
        if (sequence !== navigationSequence) {
            activeRouteCleanup?.();
            activeRouteCleanup = null;
            return;
        }
        window.scrollTo(0, 0);
    } catch (error) {
        if (sequence === navigationSequence) showError(error.message || "Unable to open this page.");
    } finally {
        if (sequence === navigationSequence) shell.setAttribute("aria-busy", "false");
    }
}

async function startApp() {
    try {
        currentUser = await window.roleNavigationUserPromise;
        try { sessionStorage.setItem("userRole", currentUser.role); } catch { /* Optional cache. */ }
        const requestedRoute = getRouteFromHash();
        const route = routeTable[requestedRoute]?.roles.includes(currentUser.role)
            ? requestedRoute
            : roleHome[currentUser.role];
        renderNavigation(route);
        await showRoute(route, { replaceHistory: true });
    } catch {
        window.location.replace("/login/login.html");
    }
}

nav.addEventListener("click", event => {
    const link = event.target.closest("a[data-app-route]");
    if (!link) return;
    event.preventDefault();
    if (link.dataset.appRoute === currentRoute) return;
    window.location.hash = link.dataset.appRoute;
});

window.addEventListener("hashchange", () => {
    if (!currentUser) return;
    const route = getRouteFromHash();
    if (route && route !== currentRoute) showRoute(route);
});

startApp();

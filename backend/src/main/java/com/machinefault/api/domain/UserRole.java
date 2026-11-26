package com.machinefault.api.domain;

// Roles are stored as names and are also used by API authorization checks.
public enum UserRole {
    PRODUCTION_WORKER, PRODUCTION_SUPERVISOR, MAINTENANCE_SUPERVISOR,
    MAINTENANCE_TECHNICIAN, SYSTEM_ADMINISTRATOR
}

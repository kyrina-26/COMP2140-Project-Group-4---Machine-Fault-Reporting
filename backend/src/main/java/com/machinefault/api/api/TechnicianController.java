package com.machinefault.api.api;

import com.machinefault.api.api.ApiModels.FaultView;
import com.machinefault.api.domain.FaultStatus;
import com.machinefault.api.service.FaultService;
import java.util.Locale;
import org.springframework.data.domain.Page;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/technicians")
public class TechnicianController {
    private final FaultService faults;

    public TechnicianController(FaultService faults) {
        this.faults = faults;
    }

    @GetMapping("/me/faults")
    @PreAuthorize("hasAuthority('MAINTENANCE_TECHNICIAN')")
    public Page<FaultView> assignedFaults(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication auth) {
        if (page < 0 || size < 1 || size > 100) {
            throw new IllegalArgumentException("page must be >= 0 and size must be 1..100.");
        }

        FaultStatus selectedStatus = parseStatus(status);
        Long technicianId = faults.user(auth.getName()).getId();
        return faults.search(selectedStatus, null, technicianId, null, null, null, page, size)
                .map(FaultView::of);
    }

    private FaultStatus parseStatus(String status) {
        if (status == null || status.isBlank()) return null;
        try {
            return FaultStatus.valueOf(status.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Unknown report status: " + status + ".");
        }
    }
}

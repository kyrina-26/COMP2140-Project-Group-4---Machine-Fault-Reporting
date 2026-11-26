package com.machinefault.api.api;

import com.machinefault.api.api.ApiModels.*; import com.machinefault.api.service.FaultService;
import jakarta.validation.Valid; import org.springframework.http.*; import org.springframework.security.access.prepost.PreAuthorize; import org.springframework.security.core.Authentication; import org.springframework.web.bind.annotation.*;

// Routes for the maintenance work performed on a fault report.
@RestController @RequestMapping("/api/faults") public class MaintenanceController {
 private final FaultService faults;
 public MaintenanceController(FaultService faults){this.faults=faults;}
 @PutMapping("/{id}/assignment") @PreAuthorize("hasAnyAuthority('MAINTENANCE_SUPERVISOR','SYSTEM_ADMINISTRATOR')") public FaultView assign(@PathVariable Long id,@Valid @RequestBody AssignTechnician body,Authentication auth){return FaultView.of(faults.assign(id,body.technicianId(),auth.getName()));}
 @PatchMapping("/{id}/status") @PreAuthorize("hasAnyAuthority('MAINTENANCE_SUPERVISOR','MAINTENANCE_TECHNICIAN','SYSTEM_ADMINISTRATOR')") public FaultView status(@PathVariable Long id,@Valid @RequestBody ChangeStatus body,Authentication auth){return FaultView.of(faults.changeStatus(id,body.status(),auth.getName()));}
 @PostMapping("/{id}/actions") @PreAuthorize("hasAuthority('MAINTENANCE_TECHNICIAN')") public ResponseEntity<ActionView> action(@PathVariable Long id,@Valid @RequestBody CreateAction body,Authentication auth){return ResponseEntity.status(201).body(ActionView.of(faults.addAction(id,body.description(),auth.getName())));}
}

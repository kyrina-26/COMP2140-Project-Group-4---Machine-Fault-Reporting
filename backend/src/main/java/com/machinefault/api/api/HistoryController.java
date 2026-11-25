package com.machinefault.api.api;

import com.machinefault.api.api.ApiModels.*; import com.machinefault.api.domain.*; import com.machinefault.api.repo.*; import com.machinefault.api.service.FaultService;
import org.springframework.data.domain.Page; import org.springframework.format.annotation.DateTimeFormat; import org.springframework.security.core.Authentication; import org.springframework.web.bind.annotation.*;
import java.time.Instant;

// Read-only report search and lifecycle details for the history feature.
@RestController @RequestMapping("/api/faults") public class HistoryController {
 private final FaultService faults; private final StatusChangeRepository statuses; private final AssignmentChangeRepository assignments; private final MaintenanceActionRepository actions; private final AttachmentRepository attachments;
 public HistoryController(FaultService faults,StatusChangeRepository statuses,AssignmentChangeRepository assignments,MaintenanceActionRepository actions,AttachmentRepository attachments){this.faults=faults;this.statuses=statuses;this.assignments=assignments;this.actions=actions;this.attachments=attachments;}
 // Query parameters are optional filters; worker and technician searches are restricted to their own reports.
 @GetMapping public Page<FaultView> search(@RequestParam(required=false) FaultStatus status,@RequestParam(required=false) String machineIdentifier,@RequestParam(required=false) Long technicianId,@RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE_TIME) Instant from,@RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE_TIME) Instant to,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size,Authentication auth){if(page<0||size<1)throw new IllegalArgumentException("page must be >= 0 and size must be 1..100.");AppUser user=faults.user(auth.getName());UserRole role=user.getRole();Long reporter=isProductionRole(role)?user.getId():null;if(role==UserRole.MAINTENANCE_TECHNICIAN)technicianId=user.getId();return faults.search(status,machineIdentifier,technicianId,reporter,from,to,page,size).map(FaultView::of);}
 @GetMapping("/{id}") public FaultDetails get(@PathVariable Long id,Authentication auth){FaultReport r=faults.getVisible(id,auth.getName());return new FaultDetails(FaultView.of(r),statuses.findByReportIdOrderByChangedAtAsc(id).stream().map(StatusView::of).toList(),assignments.findByReportIdOrderByAssignedAtAsc(id).stream().map(AssignmentView::of).toList(),actions.findByReportIdOrderByRecordedAtAsc(id).stream().map(ActionView::of).toList(),attachments.findByReportIdOrderByUploadedAtAsc(id).stream().map(AttachmentView::of).toList());}
 private boolean isProductionRole(UserRole role){return role==UserRole.PRODUCTION_WORKER||role==UserRole.PRODUCTION_SUPERVISOR||role==UserRole.PRODUCTION_MANAGER;}
}

package com.machinefault.api.api;

import com.machinefault.api.domain.*;
import jakarta.validation.constraints.*;
import java.time.Instant;

// Request/response data shapes. These are separate from database entities so API output stays intentional.
public final class ApiModels {
 private ApiModels(){}
 public record UserView(Long id,String username,String displayName,String email,UserRole role,boolean enabled) { public static UserView of(AppUser u){return new UserView(u.getId(),u.getUsername(),u.getDisplayName(),u.getEmail(),u.getRole(),u.isEnabled());} }
 // Validation annotations are checked when a controller parameter uses @Valid.
 public record CreateUser(@NotBlank @Size(max=80) String username,@NotBlank @Size(max=120) String displayName,@NotBlank @Email @Size(max=254) String email,@NotBlank @Size(min=12,max=72) String password,@NotNull UserRole role){}
 public record UpdateUser(@NotBlank @Size(max=120) String displayName,@NotBlank @Email @Size(max=254) String email){}
 public record CreateMachine(@NotBlank @Size(max=80) String identifier,@NotBlank @Size(max=160) String name,@Size(max=120) String location){}
 public record MachineView(Long id,String identifier,String name,String location,MachineStatus status){public static MachineView of(Machine m){return new MachineView(m.getId(),m.getIdentifier(),m.getName(),m.getLocation(),m.getStatus());}}
 public record CreateFault(@NotBlank @Size(max=10000) String description,@NotBlank String machineIdentifier){}
 public record AssignTechnician(@NotNull Long technicianId){}
 public record ChangeStatus(@NotNull FaultStatus status){}
 public record CreateAction(@NotBlank @Size(max=10000) String description){}
 public record FaultView(Long id,String machineIdentifier,String machineName,String description,Long reporterId,String reporterName,Long technicianId,String technicianName,FaultStatus status,Instant submittedAt,Instant updatedAt){public static FaultView of(FaultReport f){return new FaultView(f.getId(),f.getMachine().getIdentifier(),f.getMachine().getName(),f.getDescription(),f.getReporter().getId(),f.getReporter().getDisplayName(),f.getAssignedTechnician()==null?null:f.getAssignedTechnician().getId(),f.getAssignedTechnician()==null?null:f.getAssignedTechnician().getDisplayName(),f.getStatus(),f.getSubmittedAt(),f.getUpdatedAt());}}
 public record StatusView(Long id,FaultStatus fromStatus,FaultStatus toStatus,Long changedBy,String changedByName,Instant changedAt){public static StatusView of(StatusChange s){return new StatusView(s.getId(),s.getFromStatus(),s.getToStatus(),s.getChangedBy().getId(),s.getChangedBy().getDisplayName(),s.getChangedAt());}}
 public record ActionView(Long id,Long technicianId,String technicianName,String description,Instant recordedAt){public static ActionView of(MaintenanceAction a){return new ActionView(a.getId(),a.getTechnician().getId(),a.getTechnician().getDisplayName(),a.getDescription(),a.getRecordedAt());}}
 public record AttachmentView(Long id,String originalName,String contentType,long sizeBytes,Instant uploadedAt,String downloadUrl){public static AttachmentView of(Attachment a){return new AttachmentView(a.getId(),a.getOriginalName(),a.getContentType(),a.getSizeBytes(),a.getUploadedAt(),"/api/attachments/"+a.getId());}}
 public record FaultDetails(FaultView fault,java.util.List<StatusView> statusHistory,java.util.List<AssignmentView> assignmentHistory,java.util.List<ActionView> maintenanceActions,java.util.List<AttachmentView> attachments){}
 public record NotificationView(String type,Long reportId,String message,Instant createdAt){}
 public record AssignmentView(Long id,Long previousTechnicianId,String previousTechnicianName,Long technicianId,String technicianName,Long assignedBy,String assignedByName,Instant assignedAt){public static AssignmentView of(AssignmentChange a){return new AssignmentView(a.getId(),a.getPreviousTechnician()==null?null:a.getPreviousTechnician().getId(),a.getPreviousTechnician()==null?null:a.getPreviousTechnician().getDisplayName(),a.getNewTechnician().getId(),a.getNewTechnician().getDisplayName(),a.getAssignedBy().getId(),a.getAssignedBy().getDisplayName(),a.getAssignedAt());}}
 public record NotificationItem(Long id,String type,Long reportId,String message,Instant createdAt,Instant readAt){public static NotificationItem of(FaultNotification n){return new NotificationItem(n.getId(),n.getType(),n.getReport().getId(),n.getMessage(),n.getCreatedAt(),n.getReadAt());}}
}

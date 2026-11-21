package com.machinefault.api.domain;
import jakarta.persistence.*; import java.time.Instant;
// Append-only audit entry so a reassignment does not erase the prior technician.
@Entity @Table(name="assignment_history")
public class AssignmentChange {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @ManyToOne(optional=false,fetch=FetchType.LAZY) @JoinColumn(name="fault_report_id",nullable=false) private FaultReport report;
 @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="previous_technician_id") private AppUser previousTechnician;
 @ManyToOne(optional=false,fetch=FetchType.LAZY) @JoinColumn(name="new_technician_id",nullable=false) private AppUser newTechnician;
 @ManyToOne(optional=false,fetch=FetchType.LAZY) @JoinColumn(name="assigned_by_id",nullable=false) private AppUser assignedBy;
 @Column(nullable=false,updatable=false) private Instant assignedAt=Instant.now();
 protected AssignmentChange(){}
 public AssignmentChange(FaultReport report,AppUser previous,AppUser next,AppUser by){this.report=report;previousTechnician=previous;newTechnician=next;assignedBy=by;}
 public Long getId(){return id;} public FaultReport getReport(){return report;} public AppUser getPreviousTechnician(){return previousTechnician;} public AppUser getNewTechnician(){return newTechnician;} public AppUser getAssignedBy(){return assignedBy;} public Instant getAssignedAt(){return assignedAt;}
}

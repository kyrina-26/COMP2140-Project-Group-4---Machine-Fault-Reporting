package com.machinefault.api.domain;

import jakarta.persistence.*;
import java.time.Instant;

// Main fault record. Related actions and lifecycle changes live in their own history tables.
@Entity @Table(name="fault_reports", indexes={@Index(columnList="submittedAt"),@Index(columnList="status")})
public class FaultReport {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional=false,fetch=FetchType.LAZY) @JoinColumn(nullable=false) private Machine machine;
    @Column(nullable=false,columnDefinition="TEXT") private String description;
    @ManyToOne(optional=false,fetch=FetchType.LAZY) @JoinColumn(name="reporter_id",nullable=false) private AppUser reporter;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="assigned_technician_id") private AppUser assignedTechnician;
    @Enumerated(EnumType.STRING) @Column(nullable=false,length=24) private FaultStatus status=FaultStatus.REPORTED;
    @Column(nullable=false,updatable=false) private Instant submittedAt=Instant.now();
    @Column(nullable=false) private Instant updatedAt=Instant.now();
    protected FaultReport() {}
    public FaultReport(Machine machine,String description,AppUser reporter){this.machine=machine;this.description=description;this.reporter=reporter;}
    @PreUpdate void touch(){updatedAt=Instant.now();}
    public Long getId(){return id;} public Machine getMachine(){return machine;} public String getDescription(){return description;} public AppUser getReporter(){return reporter;} public AppUser getAssignedTechnician(){return assignedTechnician;} public FaultStatus getStatus(){return status;} public Instant getSubmittedAt(){return submittedAt;} public Instant getUpdatedAt(){return updatedAt;}
    public void assign(AppUser technician){assignedTechnician=technician;status=FaultStatus.ASSIGNED;}
    public void setStatus(FaultStatus status){this.status=status;}
}

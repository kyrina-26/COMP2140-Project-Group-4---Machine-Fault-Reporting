package com.machinefault.api.domain;

import jakarta.persistence.*;
import java.time.Instant;

// A work note recorded by a technician against a fault report.
@Entity @Table(name="maintenance_actions")
public class MaintenanceAction {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional=false,fetch=FetchType.LAZY) @JoinColumn(name="fault_report_id",nullable=false) private FaultReport report;
    @ManyToOne(optional=false,fetch=FetchType.LAZY) @JoinColumn(name="technician_id",nullable=false) private AppUser technician;
    @Column(nullable=false,columnDefinition="TEXT") private String description;
    @Column(nullable=false,updatable=false) private Instant recordedAt=Instant.now();
    protected MaintenanceAction() {}
    public MaintenanceAction(FaultReport r,AppUser t,String d){report=r;technician=t;description=d;}
    public Long getId(){return id;} public FaultReport getReport(){return report;} public AppUser getTechnician(){return technician;} public String getDescription(){return description;} public Instant getRecordedAt(){return recordedAt;}
}

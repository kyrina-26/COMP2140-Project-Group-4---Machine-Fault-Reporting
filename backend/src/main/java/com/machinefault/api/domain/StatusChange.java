package com.machinefault.api.domain;

import jakarta.persistence.*;
import java.time.Instant;

// One accepted transition in a report's lifecycle, including who changed it and when.
@Entity @Table(name="status_history")
public class StatusChange {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional=false,fetch=FetchType.LAZY) @JoinColumn(name="fault_report_id",nullable=false) private FaultReport report;
    @Enumerated(EnumType.STRING) @Column(length=24) private FaultStatus fromStatus;
    @Enumerated(EnumType.STRING) @Column(nullable=false,length=24) private FaultStatus toStatus;
    @ManyToOne(optional=false,fetch=FetchType.LAZY) @JoinColumn(name="changed_by_id",nullable=false) private AppUser changedBy;
    @Column(nullable=false,updatable=false) private Instant changedAt=Instant.now();
    protected StatusChange() {}
    public StatusChange(FaultReport report,FaultStatus from,FaultStatus to,AppUser by){this.report=report;fromStatus=from;toStatus=to;changedBy=by;}
    public Long getId(){return id;} public FaultReport getReport(){return report;} public FaultStatus getFromStatus(){return fromStatus;} public FaultStatus getToStatus(){return toStatus;} public AppUser getChangedBy(){return changedBy;} public Instant getChangedAt(){return changedAt;}
}

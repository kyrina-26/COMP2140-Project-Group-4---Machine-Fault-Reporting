package com.machinefault.api.domain;

import jakarta.persistence.*;
import java.time.Instant;

// Stores file metadata and its report link; file bytes live in the upload directory, not MySQL.
@Entity @Table(name="attachments")
public class Attachment {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional=false,fetch=FetchType.LAZY) @JoinColumn(name="fault_report_id",nullable=false) private FaultReport report;
    @ManyToOne(optional=false,fetch=FetchType.LAZY) @JoinColumn(name="uploaded_by_id",nullable=false) private AppUser uploadedBy;
    @Column(nullable=false,length=255) private String originalName;
    @Column(nullable=false,length=255,unique=true) private String storageName;
    @Column(nullable=false,length=120) private String contentType;
    @Column(nullable=false) private long sizeBytes;
    @Column(nullable=false,updatable=false) private Instant uploadedAt=Instant.now();
    protected Attachment() {}
    public Attachment(FaultReport r,AppUser u,String original,String stored,String type,long size){report=r;uploadedBy=u;originalName=original;storageName=stored;contentType=type;sizeBytes=size;}
    public Long getId(){return id;} public FaultReport getReport(){return report;} public String getOriginalName(){return originalName;} public String getStorageName(){return storageName;} public String getContentType(){return contentType;} public long getSizeBytes(){return sizeBytes;} public Instant getUploadedAt(){return uploadedAt;}
}

package com.machinefault.api.domain;
import jakarta.persistence.*; import java.time.Instant;
// A notification shown inside the app to one intended recipient.
@Entity @Table(name="notifications",indexes=@Index(columnList="recipient_id,created_at"))
public class FaultNotification {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @ManyToOne(optional=false,fetch=FetchType.LAZY) @JoinColumn(name="recipient_id",nullable=false) private AppUser recipient;
 @ManyToOne(optional=false,fetch=FetchType.LAZY) @JoinColumn(name="fault_report_id",nullable=false) private FaultReport report;
 @Column(nullable=false,length=32) private String type;
 @Column(nullable=false,length=300) private String message;
 @Column(nullable=false,updatable=false) private Instant createdAt=Instant.now();
 private Instant readAt;
 protected FaultNotification(){}
 public FaultNotification(AppUser recipient,FaultReport report,String type,String message){this.recipient=recipient;this.report=report;this.type=type;this.message=message;}
 public Long getId(){return id;} public AppUser getRecipient(){return recipient;} public FaultReport getReport(){return report;} public String getType(){return type;} public String getMessage(){return message;} public Instant getCreatedAt(){return createdAt;} public Instant getReadAt(){return readAt;} public void markRead(){if(readAt==null)readAt=Instant.now();}
}

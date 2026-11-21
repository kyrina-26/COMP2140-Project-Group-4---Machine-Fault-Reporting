package com.machinefault.api.domain;
import jakarta.persistence.*; import java.time.Instant;
// Security audit record for a login, failed attempt, lockout, or logout.
@Entity @Table(name="login_events",indexes=@Index(columnList="created_at"))
public class LoginEvent {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="user_id") private AppUser user;
 @Column(nullable=false,length=80) private String attemptedUsername;
 @Column(nullable=false,length=20) private String eventType;
 @Column(nullable=false,length=45) private String ipAddress;
 @Column(nullable=false,updatable=false) private Instant createdAt=Instant.now();
 protected LoginEvent(){}
 public LoginEvent(AppUser user,String attemptedUsername,String eventType,String ipAddress){this.user=user;this.attemptedUsername=attemptedUsername;this.eventType=eventType;this.ipAddress=ipAddress;}
}

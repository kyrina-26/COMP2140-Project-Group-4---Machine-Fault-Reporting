package com.machinefault.api.domain;

import jakarta.persistence.*;
import java.time.Instant;

// A user account stored in the users table. Passwords are stored as hashes, never plain text.
@Entity @Table(name="users")
public class AppUser {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(nullable=false, unique=true, length=80) private String username;
    @Column(nullable=false, length=120) private String displayName;
    @Column(unique=true, length=254) private String email;
    @Column(nullable=false, length=100) private String passwordHash;
    @Enumerated(EnumType.STRING) @Column(nullable=false, length=40) private UserRole role;
    @Column(nullable=false) private boolean enabled=true;
    @Column(nullable=false) private Instant createdAt=Instant.now();
    // Used by login security to apply the three-failures/15-minute lockout rule.
    @Column(nullable=false) private int consecutiveFailedLogins=0;
    private Instant lockedUntil;
    protected AppUser() {}
    public AppUser(String username,String displayName,String email,String passwordHash,UserRole role){this.username=username;this.displayName=displayName;this.email=email;this.passwordHash=passwordHash;this.role=role;}
    public Long getId(){return id;} public String getUsername(){return username;} public String getDisplayName(){return displayName;} public String getEmail(){return email;} public String getPasswordHash(){return passwordHash;} public UserRole getRole(){return role;} public boolean isEnabled(){return enabled;} public Instant getLockedUntil(){return lockedUntil;}
    public void updateProfile(String displayName,String email,UserRole role){this.displayName=displayName;this.email=email;this.role=role;}
    public void setEnabled(boolean enabled){this.enabled=enabled;}
    public void recordFailedLogin(Instant now){consecutiveFailedLogins++;if(consecutiveFailedLogins>=3){lockedUntil=now.plusSeconds(900);consecutiveFailedLogins=0;}}
    public void recordSuccessfulLogin(){consecutiveFailedLogins=0;lockedUntil=null;}
}

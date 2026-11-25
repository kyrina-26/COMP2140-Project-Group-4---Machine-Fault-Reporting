package com.machinefault.api.domain;

import jakarta.persistence.*;

// A machine record; its identifier is the human-readable ID used on fault reports.
@Entity @Table(name="machines")
public class Machine {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(nullable=false,unique=true,length=80) private String identifier;
    @Column(nullable=false,length=160) private String name;
    @Column(length=120) private String location;
    @Enumerated(EnumType.STRING) @Column(nullable=false,length=32) private MachineStatus status=MachineStatus.OPERATIONAL;
    @Column(nullable=false) private boolean active=true;
    protected Machine() {}
    public Machine(String identifier,String name,String location){this.identifier=identifier;this.name=name;this.location=location;}
    public Long getId(){return id;} public String getIdentifier(){return identifier;} public String getName(){return name;} public String getLocation(){return location;} public MachineStatus getStatus(){return status;} public boolean isActive(){return active;}
    public void setStatus(MachineStatus status){this.status=status;}
    public void update(String identifier,String name,String location,MachineStatus status){this.identifier=identifier;this.name=name;this.location=location;this.status=status;}
}

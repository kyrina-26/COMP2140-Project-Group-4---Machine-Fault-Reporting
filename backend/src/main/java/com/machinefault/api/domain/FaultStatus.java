package com.machinefault.api.domain;

// Allowed report lifecycle values; FaultService controls which transitions are valid.
public enum FaultStatus { REPORTED, ASSIGNED, IN_PROGRESS, RESOLVED, CLOSED }

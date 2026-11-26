package com.machinefault.api.service;

import com.machinefault.api.domain.*;
import com.machinefault.api.repo.*;

import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import org.springframework.security.access.AccessDeniedException;

// Applies fault workflow rules and coordinates repositories and notifications.
@Service
public class FaultService {

    private final FaultReportRepository reports;
    private final MachineRepository machines;
    private final UserRepository users;
    private final StatusChangeRepository history;
    private final MaintenanceActionRepository actions;
    private final AssignmentChangeRepository assignments;
    private final NotificationService notificationService;

    public FaultService(
            FaultReportRepository r,
            MachineRepository m,
            UserRepository u,
            StatusChangeRepository h,
            MaintenanceActionRepository a,
            AssignmentChangeRepository assignments,
            NotificationService notificationService) {

        reports = r;
        machines = m;
        users = u;
        history = h;
        actions = a;
        this.assignments = assignments;
        this.notificationService = notificationService;
    }

    // Save the report, initial history, and notifications together.
    @Transactional
    public FaultReport create(
            String machineId,
            String description,
            String username) {

        Machine m = machines.findByIdentifierAndActiveTrue(machineId)
            .orElseThrow(() ->
                new NoSuchElementException("Machine identifier not found."));

        AppUser reporter = user(username);

        FaultReport r = reports.save(
            new FaultReport(m, description, reporter)
        );

        history.save(
            new StatusChange(r, null, FaultStatus.REPORTED, reporter)
        );

        refreshMachineStatus(m);
        notificationService.newFault(r);

        return r;
    }

    @Transactional(readOnly = true)
    public Page<FaultReport> search(
            FaultStatus status,
            String machine,
            Long technician,
            Long reporter,
            Instant from,
            Instant to,
            int page,
            int size) {

        if (from != null && to != null && from.isAfter(to)) {
            throw new IllegalArgumentException(
                "Choose a To date and time later than the From date and time."
            );
        }

        Sort newestFirst = Sort.by(Sort.Direction.DESC, "submittedAt")
            .and(Sort.by(Sort.Direction.DESC, "id"));

        return reports.search(
            status,
            machine,
            technician,
            reporter,
            from,
            to,
            PageRequest.of(page, Math.min(size, 100), newestFirst)
        );
    }

    @Transactional(readOnly = true)
    public FaultReport get(Long id) {
        return reports.findDetailedById(id)
            .orElseThrow(() ->
                new NoSuchElementException("Fault report not found."));
    }

    @Transactional(readOnly = true)
    public FaultReport getVisible(Long id, String username) {

        FaultReport r = get(id);
        AppUser u = user(username);
        UserRole role = u.getRole();

        if (role == UserRole.PRODUCTION_WORKER &&
                !r.getReporter().getId().equals(u.getId())) {
            throw new NoSuchElementException("Fault report not found.");
        }

        if (role == UserRole.MAINTENANCE_TECHNICIAN &&
                (r.getAssignedTechnician() == null
                || !r.getAssignedTechnician().getId().equals(u.getId()))) {
            throw new NoSuchElementException("Fault report not found.");
        }

        return r;
    }

    // Assignment changes keep their own history so reassigning
    // never erases who had the report before.
    @Transactional
    public FaultReport assign(Long id, Long techId, String actor) {

        FaultReport r = get(id);

        AppUser technician = users.findById(techId)
            .orElseThrow(() ->
                new NoSuchElementException("Technician not found."));

        // Only enabled Maintenance Technicians can be assigned.
        // The technician does not need to be currently logged in.
        if (technician.getRole() != UserRole.MAINTENANCE_TECHNICIAN
                || !technician.isEnabled()) {

            throw new IllegalArgumentException(
                "Select an active Maintenance Technician."
            );
        }

        if (r.getStatus() != FaultStatus.REPORTED
                && r.getStatus() != FaultStatus.ASSIGNED) {

            throw new IllegalArgumentException(
                "Only reported or assigned faults can be assigned."
            );
        }

        AppUser by = user(actor);
        AppUser previous = r.getAssignedTechnician();
        FaultStatus before = r.getStatus();

        r.assign(technician);
        reports.save(r);

        history.save(
            new StatusChange(r, before, r.getStatus(), by)
        );

        assignments.save(
            new AssignmentChange(r, previous, technician, by)
        );

        refreshMachineStatus(r.getMachine());
        notificationService.assigned(r, technician);

        return r;
    }

    // Technicians may update assigned work, but only a maintenance supervisor may close it.
    @Transactional
    public FaultReport changeStatus(
            Long id,
            FaultStatus next,
            String actor) {

        FaultReport r = get(id);
        AppUser by = user(actor);

        if (next == FaultStatus.CLOSED
                && by.getRole() != UserRole.MAINTENANCE_SUPERVISOR) {

            throw new AccessDeniedException(
                "Only a maintenance supervisor can close a fault report."
            );
        }

        if (by.getRole() == UserRole.MAINTENANCE_TECHNICIAN
                && (r.getAssignedTechnician() == null
                || !r.getAssignedTechnician().getId().equals(by.getId()))) {

            throw new IllegalArgumentException(
                "You can only update reports assigned to you."
            );
        }

        if (next == FaultStatus.REPORTED) {
            throw new IllegalArgumentException(
                "A maintenance update cannot return a report to Reported."
            );
        }

        FaultStatus current = r.getStatus();

        if (current == next) {
            return r;
        }

        r.setStatus(next);
        reports.save(r);

        history.save(
            new StatusChange(r, current, next, by)
        );

        refreshMachineStatus(r.getMachine());
        notificationService.statusChanged(r, next);

        return r;
    }

    private void refreshMachineStatus(Machine machine) {

        if (machine.getStatus() == MachineStatus.OUT_OF_SERVICE) {
            return;
        }

        if (reports.existsByMachineAndStatusIn(
                machine,
                List.of(FaultStatus.ASSIGNED, FaultStatus.IN_PROGRESS))) {

            machine.setStatus(MachineStatus.UNDER_MAINTENANCE);

        } else if (reports.existsByMachineAndStatus(
                machine, FaultStatus.REPORTED)) {

            machine.setStatus(MachineStatus.FAULT_REPORTED);

        } else {
            machine.setStatus(MachineStatus.OPERATIONAL);
        }
    }

    // A technician may add work notes only to a report currently assigned to them.
    @Transactional
    public MaintenanceAction addAction(
            Long reportId,
            String description,
            String actor) {

        FaultReport r = get(reportId);
        AppUser tech = user(actor);

        if (tech.getRole() != UserRole.MAINTENANCE_TECHNICIAN
                || r.getAssignedTechnician() == null
                || !r.getAssignedTechnician().getId().equals(tech.getId())) {

            throw new IllegalArgumentException(
                "You can only record actions on reports assigned to you."
            );
        }

        MaintenanceAction action = actions.save(
            new MaintenanceAction(r, tech, description)
        );

        notificationService.actionLogged(r, tech, description);

        return action;
    }

    public AppUser user(String username) {
        return users.findByUsername(username)
            .orElseThrow(() ->
                new NoSuchElementException("User not found."));
    }
}

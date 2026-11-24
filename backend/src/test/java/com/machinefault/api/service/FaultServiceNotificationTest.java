package com.machinefault.api.service;

import com.machinefault.api.domain.AppUser;
import com.machinefault.api.domain.FaultReport;
import com.machinefault.api.domain.FaultStatus;
import com.machinefault.api.domain.Machine;
import com.machinefault.api.domain.MachineStatus;
import com.machinefault.api.domain.StatusChange;
import com.machinefault.api.repo.AssignmentChangeRepository;
import com.machinefault.api.repo.FaultReportRepository;
import com.machinefault.api.repo.MachineRepository;
import com.machinefault.api.repo.MaintenanceActionRepository;
import com.machinefault.api.repo.StatusChangeRepository;
import com.machinefault.api.repo.UserRepository;
import java.util.NoSuchElementException;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FaultServiceNotificationTest {
    @Mock
    private FaultReportRepository reports;

    @Mock
    private MachineRepository machines;

    @Mock
    private UserRepository users;

    @Mock
    private StatusChangeRepository history;

    @Mock
    private MaintenanceActionRepository actions;

    @Mock
    private AssignmentChangeRepository assignments;

    @Mock
    private NotificationService notifications;

    @InjectMocks
    private FaultService service;

    @Test
    void successfulReportIsSavedBeforeNotificationIsCreated() {
        Machine machine = new Machine("MACH-01", "Press", "Line 1");
        AppUser reporter = org.mockito.Mockito.mock(AppUser.class);
        when(machines.findByIdentifierAndActiveTrue("MACH-01"))
                .thenReturn(Optional.of(machine));
        when(users.findByUsername("operator")).thenReturn(Optional.of(reporter));
        when(reports.save(any(FaultReport.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(reports.existsByMachineAndStatusIn(machine, java.util.List.of(FaultStatus.ASSIGNED, FaultStatus.IN_PROGRESS)))
                .thenReturn(false);
        when(reports.existsByMachineAndStatus(machine, FaultStatus.REPORTED))
                .thenReturn(true);

        FaultReport created = service.create("MACH-01", "Press stopped", "operator");

        InOrder order = inOrder(reports, history, notifications);
        order.verify(reports).save(any(FaultReport.class));
        order.verify(history).save(any(StatusChange.class));
        order.verify(notifications).newFault(created);
        assertSame(machine, created.getMachine());
        assertSame(MachineStatus.FAULT_REPORTED, machine.getStatus());
    }

    @Test
    void rejectedReportDoesNotCreateNotification() {
        when(machines.findByIdentifierAndActiveTrue("MISSING"))
                .thenReturn(Optional.empty());

        assertThrows(
                NoSuchElementException.class,
                () -> service.create("MISSING", "Invalid machine", "operator"));

        verify(reports, never()).save(any(FaultReport.class));
        verify(history, never()).save(any(StatusChange.class));
        verify(notifications, never()).newFault(any(FaultReport.class));
    }
}

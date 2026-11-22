package com.machinefault.api.service;

import com.machinefault.api.domain.AppUser;
import com.machinefault.api.domain.FaultNotification;
import com.machinefault.api.domain.FaultReport;
import com.machinefault.api.domain.Machine;
import com.machinefault.api.domain.UserRole;
import com.machinefault.api.repo.NotificationRepository;
import com.machinefault.api.repo.UserRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {
    @Mock
    private NotificationRepository notifications;

    @Mock
    private UserRepository users;

    @InjectMocks
    private NotificationService service;

    @Test
    void newFaultNotifiesEnabledMaintenanceRecipientsWithReportReference() {
        FaultReport report = org.mockito.Mockito.mock(FaultReport.class);
        when(report.getId()).thenReturn(42L);
        when(report.getMachine()).thenReturn(new Machine("MACH-01", "Press", "Line 1"));
        AppUser supervisor = org.mockito.Mockito.mock(AppUser.class);
        AppUser manager = org.mockito.Mockito.mock(AppUser.class);
        AppUser technician = org.mockito.Mockito.mock(AppUser.class);
        when(users.findByRole(UserRole.MAINTENANCE_SUPERVISOR))
                .thenReturn(List.of(supervisor));
        when(users.findByRole(UserRole.MAINTENANCE_MANAGER))
                .thenReturn(List.of(manager));
        when(users.findByRole(UserRole.MAINTENANCE_TECHNICIAN))
                .thenReturn(List.of(technician));

        service.newFault(report);

        ArgumentCaptor<FaultNotification> captor =
                ArgumentCaptor.forClass(FaultNotification.class);
        verify(notifications, times(3)).save(captor.capture());
        List<FaultNotification> created = captor.getAllValues();
        assertEquals(3, created.size());
        for (FaultNotification notification : created) {
            assertSame(report, notification.getReport());
            assertEquals("NEW_FAULT", notification.getType());
            assertEquals("New fault on Machine MACH-01 (report #42)", notification.getMessage());
        }
        verify(users).findByRole(UserRole.MAINTENANCE_SUPERVISOR);
        verify(users).findByRole(UserRole.MAINTENANCE_MANAGER);
        verify(users).findByRole(UserRole.MAINTENANCE_TECHNICIAN);
        verifyNoMoreInteractions(users);
    }

    @Test
    void markAsReadOnlyFindsAndUpdatesNotificationForRecipient() {
        AppUser recipient = org.mockito.Mockito.mock(AppUser.class);
        FaultReport report = org.mockito.Mockito.mock(FaultReport.class);
        FaultNotification notification =
                new FaultNotification(recipient, report, "NEW_FAULT", "New report");
        when(notifications.findByIdAndRecipientId(7L, 19L))
                .thenReturn(Optional.of(notification));
        when(notifications.save(notification)).thenReturn(notification);

        FaultNotification updated = service.markAsRead(7L, 19L);

        assertSame(notification, updated);
        assertNotNull(updated.getReadAt());
        verify(notifications).findByIdAndRecipientId(7L, 19L);
        verify(notifications).save(notification);
    }
}

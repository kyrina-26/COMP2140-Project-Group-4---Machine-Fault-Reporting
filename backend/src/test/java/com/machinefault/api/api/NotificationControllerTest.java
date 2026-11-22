package com.machinefault.api.api;

import com.machinefault.api.domain.AppUser;
import com.machinefault.api.repo.UserRepository;
import com.machinefault.api.service.NotificationService;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationControllerTest {
    @Mock
    private NotificationService notifications;

    @Mock
    private UserRepository users;

    @Mock
    private Authentication authentication;

    @InjectMocks
    private NotificationController controller;

    @Test
    void unreadNotificationsAreScopedToAuthenticatedUser() {
        AppUser recipient = org.mockito.Mockito.mock(AppUser.class);
        when(authentication.getName()).thenReturn("maintenance-tech");
        when(users.findByUsername("maintenance-tech")).thenReturn(Optional.of(recipient));
        when(recipient.getId()).thenReturn(19L);
        when(notifications.getUnreadNotifications(19L)).thenReturn(List.of());

        assertTrue(controller.unread(authentication).isEmpty());

        verify(notifications).getUnreadNotifications(19L);
        verifyNoMoreInteractions(notifications);
    }
}

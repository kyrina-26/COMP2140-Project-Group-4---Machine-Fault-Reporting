package com.machinefault.api.api;
import com.machinefault.api.api.ApiModels.NotificationItem; import com.machinefault.api.repo.UserRepository; import com.machinefault.api.service.NotificationService; import java.util.*; import org.springframework.security.access.prepost.PreAuthorize; import org.springframework.security.core.Authentication; import org.springframework.web.bind.annotation.*;
// Each request is scoped to the logged-in user's own in-app notifications.
@RestController @RequestMapping("/api/notifications") @PreAuthorize("hasAnyAuthority('MAINTENANCE_SUPERVISOR','SYSTEM_ADMINISTRATOR')") public class NotificationController {
 private final NotificationService notificationService;private final UserRepository users;
 public NotificationController(NotificationService n,UserRepository u){notificationService=n;users=u;}
 @GetMapping public List<NotificationItem> list(Authentication auth){Long id=users.findByUsername(auth.getName()).orElseThrow().getId();return notificationService.listForUser(id).stream().map(NotificationItem::of).toList();}
 @GetMapping("/unread") public List<NotificationItem> unread(Authentication auth){Long id=users.findByUsername(auth.getName()).orElseThrow().getId();return notificationService.getUnreadNotifications(id).stream().map(NotificationItem::of).toList();}
 @PatchMapping("/{id}/read") public NotificationItem markRead(@PathVariable Long id,Authentication auth){Long userId=users.findByUsername(auth.getName()).orElseThrow().getId();return NotificationItem.of(notificationService.markAsRead(id,userId));}
}

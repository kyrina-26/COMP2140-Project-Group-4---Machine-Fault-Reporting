package com.machinefault.api.api;
import com.machinefault.api.api.ApiModels.NotificationItem; import com.machinefault.api.domain.FaultNotification; import com.machinefault.api.repo.*; import java.util.*; import org.springframework.security.core.Authentication; import org.springframework.web.bind.annotation.*;
// Each request is scoped to the logged-in user's own in-app notifications.
@RestController @RequestMapping("/api/notifications") public class NotificationController {
 private final NotificationRepository notifications;private final UserRepository users;
 public NotificationController(NotificationRepository n,UserRepository u){notifications=n;users=u;}
 @GetMapping public List<NotificationItem> list(Authentication auth){Long id=users.findByUsername(auth.getName()).orElseThrow().getId();return notifications.findTop100ByRecipientIdOrderByCreatedAtDesc(id).stream().map(NotificationItem::of).toList();}
 @PatchMapping("/{id}/read") public NotificationItem markRead(@PathVariable Long id,Authentication auth){Long userId=users.findByUsername(auth.getName()).orElseThrow().getId();FaultNotification n=notifications.findByIdAndRecipientId(id,userId).orElseThrow(()->new NoSuchElementException("Notification not found."));n.markRead();return NotificationItem.of(notifications.save(n));}
}

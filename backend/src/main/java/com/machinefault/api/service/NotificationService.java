package com.machinefault.api.service;

import com.machinefault.api.domain.*; import com.machinefault.api.repo.*; import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
import java.util.*;

// Creates database-backed in-app notifications; it does not send email or push messages.
@Service public class NotificationService {
 private final NotificationRepository notifications; private final UserRepository users;
 public NotificationService(NotificationRepository notifications,UserRepository users){this.notifications=notifications;this.users=users;}
 // Maintenance leads and system administrators receive the in-app fault notifications.
 @Transactional public void newFault(FaultReport report){String message="New fault on Machine "+report.getMachine().getIdentifier()+" (report #"+report.getId()+")";notifyRole(UserRole.MAINTENANCE_SUPERVISOR,report,"NEW_FAULT",message);notifyRole(UserRole.MAINTENANCE_MANAGER,report,"NEW_FAULT",message);notifyRole(UserRole.SYSTEM_ADMINISTRATOR,report,"NEW_FAULT",message);}
 @Transactional public void assigned(FaultReport report,AppUser technician){String message="Fault report #"+report.getId()+" assigned to "+technician.getDisplayName()+".";notifyRole(UserRole.MAINTENANCE_SUPERVISOR,report,"ASSIGNMENT",message);notifyRole(UserRole.MAINTENANCE_MANAGER,report,"ASSIGNMENT",message);notifyRole(UserRole.SYSTEM_ADMINISTRATOR,report,"ASSIGNMENT",message);}
 @Transactional public void statusChanged(FaultReport report,FaultStatus status){String message="Fault report #"+report.getId()+" status changed to "+status+".";notifications.save(new FaultNotification(report.getReporter(),report,"STATUS_CHANGE",message));notifyRole(UserRole.MAINTENANCE_SUPERVISOR,report,"STATUS_CHANGE",message);notifyRole(UserRole.MAINTENANCE_MANAGER,report,"STATUS_CHANGE",message);notifyRole(UserRole.SYSTEM_ADMINISTRATOR,report,"STATUS_CHANGE",message);}
 @Transactional public void actionLogged(FaultReport report,AppUser technician,String description){String message=technician.getDisplayName()+" recorded a maintenance action for report #"+report.getId()+": "+description;if(message.length()>300)message=message.substring(0,297)+"...";notifyRole(UserRole.MAINTENANCE_SUPERVISOR,report,"MAINTENANCE_ACTION",message);notifyRole(UserRole.MAINTENANCE_MANAGER,report,"MAINTENANCE_ACTION",message);notifyRole(UserRole.SYSTEM_ADMINISTRATOR,report,"MAINTENANCE_ACTION",message);}
 @Transactional(readOnly=true) public List<FaultNotification> listForUser(Long userId){return notifications.findTop100ByRecipientIdOrderByCreatedAtDesc(userId);}
 @Transactional(readOnly=true) public List<FaultNotification> getUnreadNotifications(Long userId){return notifications.findTop100ByRecipientIdAndReadAtIsNullOrderByCreatedAtDesc(userId);}
 @Transactional public FaultNotification markAsRead(Long notificationId,Long userId){FaultNotification notification=notifications.findByIdAndRecipientId(notificationId,userId).orElseThrow(()->new NoSuchElementException("Notification not found."));notification.markRead();return notifications.save(notification);}
 @Transactional public int markAllAsRead(Long userId){return notifications.markAllReadByRecipientId(userId,java.time.Instant.now());}
 private void notifyRole(UserRole role,FaultReport report,String type,String message){for(AppUser recipient:users.findByRole(role))notifications.save(new FaultNotification(recipient,report,type,message));}
}

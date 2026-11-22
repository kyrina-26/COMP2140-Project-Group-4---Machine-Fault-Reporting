package com.machinefault.api.service;

import com.machinefault.api.domain.*; import com.machinefault.api.repo.*; import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
import java.util.*;

// Creates database-backed in-app notifications; it does not send email or push messages.
@Service public class NotificationService {
 private final NotificationRepository notifications; private final UserRepository users;
 public NotificationService(NotificationRepository notifications,UserRepository users){this.notifications=notifications;this.users=users;}
 // A new report is announced to all maintenance supervisors, managers, and technicians.
 @Transactional public void newFault(FaultReport report){String message="New fault on Machine "+report.getMachine().getIdentifier()+" (report #"+report.getId()+")";notifyRole(UserRole.MAINTENANCE_SUPERVISOR,report,"NEW_FAULT",message);notifyRole(UserRole.MAINTENANCE_MANAGER,report,"NEW_FAULT",message);notifyRole(UserRole.MAINTENANCE_TECHNICIAN,report,"NEW_FAULT",message);}
 @Transactional public void assigned(FaultReport report,AppUser technician){notifications.save(new FaultNotification(technician,report,"ASSIGNMENT","Fault report #"+report.getId()+" assigned to you."));}
 @Transactional public void statusChanged(FaultReport report,FaultStatus status){String message="Fault report #"+report.getId()+" status changed to "+status+".";notifications.save(new FaultNotification(report.getReporter(),report,"STATUS_CHANGE",message));if(report.getAssignedTechnician()!=null&&!report.getAssignedTechnician().getId().equals(report.getReporter().getId()))notifications.save(new FaultNotification(report.getAssignedTechnician(),report,"STATUS_CHANGE",message));}
 @Transactional(readOnly=true) public List<FaultNotification> listForUser(Long userId){return notifications.findTop100ByRecipientIdOrderByCreatedAtDesc(userId);}
 @Transactional(readOnly=true) public List<FaultNotification> getUnreadNotifications(Long userId){return notifications.findTop100ByRecipientIdAndReadAtIsNullOrderByCreatedAtDesc(userId);}
 @Transactional public FaultNotification markAsRead(Long notificationId,Long userId){FaultNotification notification=notifications.findByIdAndRecipientId(notificationId,userId).orElseThrow(()->new NoSuchElementException("Notification not found."));notification.markRead();return notifications.save(notification);}
 private void notifyRole(UserRole role,FaultReport report,String type,String message){for(AppUser recipient:users.findByRole(role))notifications.save(new FaultNotification(recipient,report,type,message));}
}

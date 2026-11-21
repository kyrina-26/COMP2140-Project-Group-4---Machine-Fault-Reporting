package com.machinefault.api.repo;
import com.machinefault.api.domain.FaultNotification; import java.util.*; import org.springframework.data.jpa.repository.JpaRepository;
// Notification lookups include recipient ID so users cannot retrieve each other's messages.
public interface NotificationRepository extends JpaRepository<FaultNotification,Long>{List<FaultNotification> findTop100ByRecipientIdOrderByCreatedAtDesc(Long userId);Optional<FaultNotification> findByIdAndRecipientId(Long id,Long userId);}

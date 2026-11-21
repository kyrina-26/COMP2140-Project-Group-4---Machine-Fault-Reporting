package com.machinefault.api.repo;
import com.machinefault.api.domain.LoginEvent; import org.springframework.data.jpa.repository.JpaRepository;
// Supports the scheduled cleanup of login audit events beyond their retention period.
public interface LoginEventRepository extends JpaRepository<LoginEvent,Long>{long deleteByCreatedAtBefore(java.time.Instant cutoff);}

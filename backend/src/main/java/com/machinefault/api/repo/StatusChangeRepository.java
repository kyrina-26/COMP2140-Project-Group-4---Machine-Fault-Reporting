package com.machinefault.api.repo;
import com.machinefault.api.domain.StatusChange; import java.util.*; import org.springframework.data.jpa.repository.JpaRepository;
// Loads status history in time order, including the user who made each change.
public interface StatusChangeRepository extends JpaRepository<StatusChange,Long>{@org.springframework.data.jpa.repository.EntityGraph(attributePaths="changedBy") List<StatusChange> findByReportIdOrderByChangedAtAsc(Long reportId);}

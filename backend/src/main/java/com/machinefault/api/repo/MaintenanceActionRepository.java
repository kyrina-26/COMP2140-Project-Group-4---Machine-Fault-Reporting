package com.machinefault.api.repo;
import com.machinefault.api.domain.MaintenanceAction; import java.util.*; import org.springframework.data.jpa.repository.JpaRepository;
// Loads technician names with work notes for the report-history response.
public interface MaintenanceActionRepository extends JpaRepository<MaintenanceAction,Long>{@org.springframework.data.jpa.repository.EntityGraph(attributePaths="technician") List<MaintenanceAction> findByReportIdOrderByRecordedAtAsc(Long reportId);}

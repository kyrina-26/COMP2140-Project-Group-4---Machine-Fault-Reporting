package com.machinefault.api.repo;
import com.machinefault.api.domain.AssignmentChange; import java.util.*; import org.springframework.data.jpa.repository.JpaRepository;
// Loads the assignment audit trail, including technicians and the assigning supervisor.
public interface AssignmentChangeRepository extends JpaRepository<AssignmentChange,Long>{@org.springframework.data.jpa.repository.EntityGraph(attributePaths={"previousTechnician","newTechnician","assignedBy"}) List<AssignmentChange> findByReportIdOrderByAssignedAtAsc(Long reportId);}

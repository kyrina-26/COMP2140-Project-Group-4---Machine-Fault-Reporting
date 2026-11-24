package com.machinefault.api.repo;
import com.machinefault.api.domain.*; import java.time.Instant; import org.springframework.data.jpa.repository.*; import org.springframework.data.repository.query.Param;
// Database operations for reports. EntityGraph fetches related display data with each query.
public interface FaultReportRepository extends JpaRepository<FaultReport,Long>, JpaSpecificationExecutor<FaultReport>{
 boolean existsByMachineAndStatusIn(com.machinefault.api.domain.Machine machine,java.util.Collection<FaultStatus> statuses);
 boolean existsByMachineAndStatus(com.machinefault.api.domain.Machine machine,FaultStatus status);
 // JPQL uses Java entity/field names; optional parameters let one method support multiple filters.
 @EntityGraph(attributePaths={"machine","reporter","assignedTechnician"}) @Query("select f from FaultReport f where f.id=:id") java.util.Optional<FaultReport> findDetailedById(@Param("id") Long id);
 @EntityGraph(attributePaths={"machine","reporter","assignedTechnician"}) @Query("select f from FaultReport f where (:status is null or f.status=:status) and (:machineId is null or f.machine.identifier=:machineId) and (:technicianId is null or f.assignedTechnician.id=:technicianId) and (:reporterId is null or f.reporter.id=:reporterId) and (:from is null or f.submittedAt>=:from) and (:to is null or f.submittedAt<:to)") org.springframework.data.domain.Page<FaultReport> search(@Param("status") FaultStatus status,@Param("machineId") String machineId,@Param("technicianId") Long technicianId,@Param("reporterId") Long reporterId,@Param("from") Instant from,@Param("to") Instant to,org.springframework.data.domain.Pageable pageable);
}

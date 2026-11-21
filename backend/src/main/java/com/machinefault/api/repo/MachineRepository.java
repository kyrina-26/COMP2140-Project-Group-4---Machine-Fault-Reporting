package com.machinefault.api.repo;
import com.machinefault.api.domain.Machine; import java.util.*; import org.springframework.data.jpa.repository.JpaRepository;
// Database operations for machines; Spring generates these simple queries automatically.
public interface MachineRepository extends JpaRepository<Machine,Long>{Optional<Machine> findByIdentifierAndActiveTrue(String identifier); List<Machine> findByActiveTrue();}

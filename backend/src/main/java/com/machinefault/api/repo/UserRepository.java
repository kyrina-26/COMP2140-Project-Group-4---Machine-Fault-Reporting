package com.machinefault.api.repo;
import com.machinefault.api.domain.AppUser; import java.util.*; import org.springframework.data.jpa.repository.JpaRepository; import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
// Spring implements these lookups from their names, alongside the standard save/find methods.
public interface UserRepository extends JpaRepository<AppUser,Long>, JpaSpecificationExecutor<AppUser>{Optional<AppUser> findByUsername(String username); Optional<AppUser> findByEmail(String email); List<AppUser> findByRole(com.machinefault.api.domain.UserRole role);}

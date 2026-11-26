package com.machinefault.api.repo;

import com.machinefault.api.domain.AppUser;
import com.machinefault.api.domain.UserRole;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

// Spring implements these lookups from their names,
// alongside the standard save/find methods.
public interface UserRepository extends JpaRepository<AppUser, Long>,
        JpaSpecificationExecutor<AppUser> {

    Optional<AppUser> findByUsername(String username);

    Optional<AppUser> findByEmail(String email);

    List<AppUser> findByRole(UserRole role);

    // Retrieves users by role and account status.
    List<AppUser> findByRoleAndEnabled(UserRole role, boolean enabled);

    long countByRoleAndEnabled(UserRole role, boolean enabled);
}

package com.machinefault.api.api;

import com.machinefault.api.api.ApiModels.*;
import com.machinefault.api.domain.AppUser;
import com.machinefault.api.domain.UserRole;
import com.machinefault.api.repo.UserRepository;

import jakarta.persistence.criteria.Predicate;
import jakarta.validation.Valid;

import java.util.*;

import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

// Account administration routes.
// The class-level rule protects every route below by default.
@RestController
@RequestMapping("/api/users")
@PreAuthorize("hasAuthority('SYSTEM_ADMINISTRATOR')")
public class UserController {

    private final UserRepository users;
    private final PasswordEncoder passwords;

    public UserController(UserRepository u, PasswordEncoder p) {
        users = u;
        passwords = p;
    }

    @GetMapping
    public Page<UserView> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) UserRole role,
            @RequestParam(required = false) Boolean enabled) {

        if (page < 0 || size < 1 || size > 100) {
            throw new IllegalArgumentException(
                "page must be >= 0 and size must be 1..100."
            );
        }

        Specification<AppUser> filters = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Deleted accounts are tombstones used to preserve report history;
            // disabled accounts remain manageable and can be enabled again.
            predicates.add(cb.notLike(root.get("username"), "deleted-%"));

            if (enabled != null) {
                predicates.add(cb.equal(root.get("enabled"), enabled));
            }

            if (role != null) {
                predicates.add(cb.equal(root.get("role"), role));
            }

            if (search != null && !search.isBlank()) {
                String term = "%" + search.trim().toLowerCase() + "%";

                predicates.add(cb.or(
                    cb.like(cb.lower(root.get("username")), term),
                    cb.like(cb.lower(root.get("displayName")), term),
                    cb.like(cb.lower(root.get("email")), term)
                ));
            }

            return cb.and(predicates.toArray(Predicate[]::new));
        };

        return users.findAll(
            filters,
            PageRequest.of(
                page,
                size,
                Sort.by(Sort.Direction.DESC, "id")
            )
        ).map(UserView::of);
    }

    @PostMapping
    public ResponseEntity<UserView> create(
            @Valid @RequestBody CreateUser body) {

        if (users.findByUsername(body.username()).isPresent()) {
            throw new IllegalArgumentException("Username already exists.");
        }

        if (users.findByEmail(body.email()).isPresent()) {
            throw new IllegalArgumentException("Email address already exists.");
        }

        AppUser user = new AppUser(
            body.username(),
            body.displayName(),
            body.email(),
            passwords.encode(body.password()),
            body.role()
        );

        user.setEnabled(body.enabled() == null || body.enabled());

        return ResponseEntity.status(201)
            .body(UserView.of(users.save(user)));
    }

    @PatchMapping("/{id}")
    public UserView update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUser body) {

        AppUser user = users.findById(id)
            .orElseThrow(() -> new NoSuchElementException("User not found."));

        users.findByEmail(body.email())
            .filter(existing -> !existing.getId().equals(id))
            .ifPresent(existing -> {
                throw new IllegalArgumentException(
                    "Email address already exists."
                );
            });

        user.updateProfile(
            body.displayName(),
            body.email(),
            body.role()
        );

        return UserView.of(users.save(user));
    }

    @PatchMapping("/{id}/status")
    public UserView setStatus(
            @PathVariable Long id,
            @Valid @RequestBody ChangeUserStatus body,
            org.springframework.security.core.Authentication auth) {

        AppUser user = users.findById(id)
            .orElseThrow(() -> new NoSuchElementException("User not found."));

        if (body.enabled() && user.getUsername().startsWith("deleted-")) {
            throw new IllegalArgumentException(
                "Deleted user accounts cannot be re-enabled."
            );
        }

        if (!body.enabled() && user.getUsername().equals(auth.getName())) {
            throw new IllegalArgumentException(
                "You cannot disable your own administrator account."
            );
        }

        if (!body.enabled()
                && user.getRole() == UserRole.SYSTEM_ADMINISTRATOR
                && user.isEnabled()
                && users.countByRoleAndEnabled(
                    UserRole.SYSTEM_ADMINISTRATOR, true
                ) <= 1) {

            throw new IllegalArgumentException(
                "The last active system administrator cannot be deleted."
            );
        }

        user.setEnabled(body.enabled());

        return UserView.of(users.save(user));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            org.springframework.security.core.Authentication auth) {

        AppUser user = users.findById(id)
            .orElseThrow(() -> new NoSuchElementException("User not found."));

        if (user.getUsername().equals(auth.getName())) {
            throw new IllegalArgumentException(
                "You cannot delete your own administrator account."
            );
        }

        if (user.getRole() == UserRole.SYSTEM_ADMINISTRATOR
                && user.isEnabled()
                && users.countByRoleAndEnabled(
                    UserRole.SYSTEM_ADMINISTRATOR, true
                ) <= 1) {

            throw new IllegalArgumentException(
                "The last active system administrator cannot be deleted."
            );
        }

        user.deleteAccount(
            "deleted-" + user.getId() + "-" + UUID.randomUUID()
        );

        users.save(user);

        return ResponseEntity.noContent().build();
    }

    // Returns all enabled Maintenance Technicians,
    // regardless of whether they are currently logged in.
    @GetMapping("/technicians")
    @PreAuthorize("hasAnyAuthority('MAINTENANCE_SUPERVISOR','MAINTENANCE_MANAGER','SYSTEM_ADMINISTRATOR')")
    public List<UserView> technicians() {

        return users.findByRoleAndEnabled(
            UserRole.MAINTENANCE_TECHNICIAN,
            true
        ).stream()
            .map(UserView::of)
            .toList();
    }
}

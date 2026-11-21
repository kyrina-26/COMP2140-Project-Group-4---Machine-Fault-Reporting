package com.machinefault.api.api;
import com.machinefault.api.api.ApiModels.*; import com.machinefault.api.domain.Machine; import com.machinefault.api.repo.MachineRepository; import jakarta.validation.Valid; import java.util.*; import org.springframework.http.*; import org.springframework.security.access.prepost.PreAuthorize; import org.springframework.web.bind.annotation.*;
// Routes for listing active machines and adding a machine as an administrator.
@RestController @RequestMapping("/api/machines") public class MachineController {
 private final MachineRepository machines; public MachineController(MachineRepository m){machines=m;}
 @GetMapping public List<MachineView> list(){return machines.findByActiveTrue().stream().map(MachineView::of).toList();}
 @PostMapping @PreAuthorize("hasAuthority('SYSTEM_ADMINISTRATOR')") public ResponseEntity<MachineView> create(@Valid @RequestBody CreateMachine body){if(machines.findByIdentifierAndActiveTrue(body.identifier()).isPresent())throw new IllegalArgumentException("Machine identifier already exists.");return ResponseEntity.status(201).body(MachineView.of(machines.save(new Machine(body.identifier(),body.name(),body.location()))));}
}

package com.machinefault.api.api;

import com.machinefault.api.api.ApiModels.*; import com.machinefault.api.service.*;
import jakarta.validation.Valid; import java.io.IOException; import java.util.List; import org.springframework.http.*; import org.springframework.security.access.prepost.PreAuthorize; import org.springframework.security.core.Authentication; import org.springframework.web.bind.annotation.*; import org.springframework.web.multipart.MultipartFile;

// HTTP routes for submitting reports and attaching evidence.
@RestController @RequestMapping("/api/faults") public class FaultController {
 private final FaultService service; private final AttachmentService attachments; private final FaultSubmissionService submissions;
 public FaultController(FaultService s,AttachmentService attachments,FaultSubmissionService submissions){service=s;this.attachments=attachments;this.submissions=submissions;}
 // @RequestBody reads JSON; @Valid checks its fields; Authentication identifies the logged-in reporter.
 @PostMapping @PreAuthorize("hasAnyAuthority('PRODUCTION_WORKER','PRODUCTION_SUPERVISOR','PRODUCTION_MANAGER','SYSTEM_ADMINISTRATOR')") public ResponseEntity<FaultView> create(@Valid @RequestBody CreateFault body,Authentication auth){return ResponseEntity.status(201).body(FaultView.of(service.create(body.machineIdentifier(),body.description(),auth.getName())));}
 // Multipart submissions commit the report only if every attachment also succeeds.
 @PostMapping(consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
 @PreAuthorize("hasAnyAuthority('PRODUCTION_WORKER','PRODUCTION_SUPERVISOR','PRODUCTION_MANAGER','SYSTEM_ADMINISTRATOR')")
 public ResponseEntity<FaultView> createWithAttachments(@RequestParam String machineIdentifier,
         @RequestParam String description,@RequestParam("files") List<MultipartFile> files,
         Authentication auth)throws IOException {
  if(machineIdentifier.isBlank())throw new IllegalArgumentException("Machine identifier is required.");
  if(description.isBlank())throw new IllegalArgumentException("Please describe the machine fault.");
  if(description.length()>10000)throw new IllegalArgumentException("Fault description is too long.");
  return ResponseEntity.status(201).body(FaultView.of(submissions.create(machineIdentifier,description,auth.getName(),files)));
 }
 // The file bytes go to file storage; AttachmentService saves their report link and metadata in MySQL.
 @PostMapping(value="/{id}/attachments",consumes=MediaType.MULTIPART_FORM_DATA_VALUE) @PreAuthorize("hasAnyAuthority('PRODUCTION_WORKER','PRODUCTION_SUPERVISOR','SYSTEM_ADMINISTRATOR')") public ResponseEntity<AttachmentView> attach(@PathVariable Long id,@RequestPart("file") MultipartFile file,Authentication auth)throws IOException{return ResponseEntity.status(201).body(AttachmentView.of(attachments.upload(id,file,auth.getName())));}
}

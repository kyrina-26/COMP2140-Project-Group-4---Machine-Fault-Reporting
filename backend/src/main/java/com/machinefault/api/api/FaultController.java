package com.machinefault.api.api;

import com.machinefault.api.api.ApiModels.*; import com.machinefault.api.service.*;
import jakarta.validation.Valid; import java.io.IOException; import org.springframework.http.*; import org.springframework.security.access.prepost.PreAuthorize; import org.springframework.security.core.Authentication; import org.springframework.web.bind.annotation.*; import org.springframework.web.multipart.MultipartFile;

// HTTP routes for submitting reports and attaching evidence.
@RestController @RequestMapping("/api/faults") public class FaultController {
 private final FaultService service; private final AttachmentService attachments;
 public FaultController(FaultService s,AttachmentService attachments){service=s;this.attachments=attachments;}
 // @RequestBody reads JSON; @Valid checks its fields; Authentication identifies the logged-in reporter.
 @PostMapping @PreAuthorize("hasAnyAuthority('PRODUCTION_WORKER','PRODUCTION_SUPERVISOR','SYSTEM_ADMINISTRATOR')") public ResponseEntity<FaultView> create(@Valid @RequestBody CreateFault body,Authentication auth){return ResponseEntity.status(201).body(FaultView.of(service.create(body.machineIdentifier(),body.description(),auth.getName())));}
 // The file bytes go to file storage; AttachmentService saves their report link and metadata in MySQL.
 @PostMapping(value="/{id}/attachments",consumes=MediaType.MULTIPART_FORM_DATA_VALUE) @PreAuthorize("hasAnyAuthority('PRODUCTION_WORKER','PRODUCTION_SUPERVISOR','SYSTEM_ADMINISTRATOR')") public ResponseEntity<AttachmentView> attach(@PathVariable Long id,@RequestPart("file") MultipartFile file,Authentication auth)throws IOException{return ResponseEntity.status(201).body(AttachmentView.of(attachments.upload(id,file,auth.getName())));}
}

package com.machinefault.api.api;
import com.machinefault.api.domain.Attachment; import com.machinefault.api.service.AttachmentService; import java.io.IOException; import org.springframework.core.io.Resource; import org.springframework.http.*; import org.springframework.security.core.Authentication; import org.springframework.web.bind.annotation.*;
// Streams an uploaded file back only after the caller passes the report visibility check.
@RestController @RequestMapping("/api") public class AttachmentController {
 private final AttachmentService service;public AttachmentController(AttachmentService s){service=s;}
 @GetMapping("/attachments/{id}") public ResponseEntity<Resource> download(@PathVariable Long id,Authentication auth)throws IOException{Attachment a=service.getVisible(id,auth.getName());return ResponseEntity.ok().contentType(MediaType.parseMediaType(a.getContentType())).header(HttpHeaders.CONTENT_DISPOSITION,ContentDisposition.attachment().filename(a.getOriginalName()).build().toString()).body(service.resource(a));}
}

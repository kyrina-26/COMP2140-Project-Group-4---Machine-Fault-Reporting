package com.machinefault.api.service;

import com.machinefault.api.domain.*; import com.machinefault.api.repo.*; import org.springframework.beans.factory.annotation.Value; import org.springframework.core.io.*; import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional; import org.springframework.web.multipart.MultipartFile;
import java.io.*; import java.nio.file.*; import java.util.*;

// Validates uploaded media and stores file bytes separately from their MySQL metadata.
@Service public class AttachmentService {
 // Keep accepted content types in one place so uploads use a clear allowlist.
 private static final Set<String> ALLOWED=Set.of("image/jpeg","image/png","image/webp","audio/mpeg","audio/wav","audio/ogg","video/mp4","video/webm","video/quicktime");
 private final AttachmentRepository attachments; private final FaultService faults; private final UserRepository users; private final Path root;
 public AttachmentService(AttachmentRepository a,FaultService f,UserRepository u,@Value("${app.uploads.directory}") String directory)throws IOException{attachments=a;faults=f;users=u;root=Path.of(directory).toAbsolutePath().normalize();Files.createDirectories(root);}
 // Check permission and file type, write under a random name, then save the link in MySQL.
 @Transactional public Attachment upload(Long reportId,MultipartFile file,String username)throws IOException{if(file==null||file.isEmpty())throw new IllegalArgumentException("Choose a non-empty file.");String type=Optional.ofNullable(file.getContentType()).orElse("").toLowerCase(Locale.ROOT);if(!ALLOWED.contains(type))throw new IllegalArgumentException("Unsupported file type. Upload JPEG, PNG, WebP, MP3, WAV, OGG, MP4, WebM, or MOV.");FaultReport report=faults.getVisible(reportId,username);AppUser uploader=users.findByUsername(username).orElseThrow();String safe=UUID.randomUUID().toString();Path target=root.resolve(safe).normalize();if(!target.startsWith(root))throw new IllegalArgumentException("Invalid upload path.");Files.copy(file.getInputStream(),target,StandardCopyOption.REPLACE_EXISTING);try{return attachments.save(new Attachment(report,uploader,Path.of(Optional.ofNullable(file.getOriginalFilename()).orElse("upload")).getFileName().toString(),safe,type,file.getSize()));}catch(RuntimeException ex){Files.deleteIfExists(target);throw ex;}}
 @Transactional(readOnly=true) public Attachment get(Long id){return attachments.findById(id).orElseThrow(()->new NoSuchElementException("Attachment not found."));}
 @Transactional(readOnly=true) public Attachment getVisible(Long id,String username){Attachment a=get(id);faults.getVisible(a.getReport().getId(),username);return a;}
 public Resource resource(Attachment a)throws IOException{Path file=root.resolve(a.getStorageName()).normalize();if(!file.startsWith(root)||!Files.isRegularFile(file))throw new NoSuchElementException("Attachment file is unavailable.");return new UrlResource(file.toUri());}
}

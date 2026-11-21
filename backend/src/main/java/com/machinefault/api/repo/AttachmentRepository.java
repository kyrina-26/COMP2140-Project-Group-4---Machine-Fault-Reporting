package com.machinefault.api.repo;
import com.machinefault.api.domain.Attachment; import java.util.*; import org.springframework.data.jpa.repository.JpaRepository;
// Finds a report's uploaded-file metadata in upload order.
public interface AttachmentRepository extends JpaRepository<Attachment,Long>{@org.springframework.data.jpa.repository.EntityGraph(attributePaths="report") List<Attachment> findByReportIdOrderByUploadedAtAsc(Long reportId);}

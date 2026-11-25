package com.machinefault.api.service;

import com.machinefault.api.domain.FaultReport;
import java.io.IOException;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

// Creates the report and all of its attachments in one database transaction.
@Service
public class FaultSubmissionService {
    private final FaultService faults;
    private final AttachmentService attachments;

    public FaultSubmissionService(FaultService faults, AttachmentService attachments) {
        this.faults = faults;
        this.attachments = attachments;
    }

    @Transactional(rollbackFor = Exception.class)
    public FaultReport create(String machineIdentifier, String description, String username,
                              List<MultipartFile> files) throws IOException {
        FaultReport report = faults.create(machineIdentifier, description, username);
        attachments.uploadAll(report.getId(), files, username);
        return report;
    }
}

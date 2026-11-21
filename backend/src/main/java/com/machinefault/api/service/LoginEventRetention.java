package com.machinefault.api.service;
import com.machinefault.api.repo.LoginEventRepository; import java.time.Instant; import org.springframework.scheduling.annotation.Scheduled; import org.springframework.stereotype.Component; import org.springframework.transaction.annotation.Transactional;
// Scheduled housekeeping: retain login audit records for the SRS's 12-month period.
@Component public class LoginEventRetention {
 private final LoginEventRepository events; public LoginEventRetention(LoginEventRepository events){this.events=events;}
 // Runs daily at 03:15 UTC; @Transactional groups the database delete as one operation.
 @Scheduled(cron="0 15 3 * * *") @Transactional public void removeExpiredEvents(){events.deleteByCreatedAtBefore(java.time.ZonedDateTime.now(java.time.ZoneOffset.UTC).minusMonths(12).toInstant());}
}

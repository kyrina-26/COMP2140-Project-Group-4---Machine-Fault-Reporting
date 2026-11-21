package com.machinefault.api.config;

import com.machinefault.api.domain.*; import com.machinefault.api.repo.UserRepository;
import org.springframework.beans.factory.annotation.Value; import org.springframework.boot.CommandLineRunner; import org.springframework.context.annotation.*; import org.springframework.security.crypto.password.PasswordEncoder;

// Creates the first administrator so the team can log in and add other accounts.
@Configuration
public class BootstrapAdmin {
 // Reads bootstrap details from environment variables and hashes the password before saving.
 @Bean CommandLineRunner bootstrapAdministrator(UserRepository users,PasswordEncoder encoder,@Value("${APP_BOOTSTRAP_ADMIN_USERNAME:}") String username,@Value("${APP_BOOTSTRAP_ADMIN_PASSWORD:}") String password,@Value("${APP_BOOTSTRAP_ADMIN_NAME:System Administrator}") String name,@Value("${APP_BOOTSTRAP_ADMIN_EMAIL:}") String email){return args->{if(username.isBlank()&&password.isBlank())return;if(username.isBlank()||password.length()<12||email.isBlank()||!email.contains("@"))throw new IllegalStateException("Set an administrator username, email, and a password of at least 12 characters.");if(users.findByUsername(username).isEmpty())users.save(new AppUser(username,name,email,encoder.encode(password),UserRole.SYSTEM_ADMINISTRATOR));};}
}

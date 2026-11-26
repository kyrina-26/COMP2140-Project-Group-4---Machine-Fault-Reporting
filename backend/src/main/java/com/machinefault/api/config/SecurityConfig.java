package com.machinefault.api.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.*;
import org.springframework.security.web.context.*;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.boot.web.servlet.ServletListenerRegistrationBean;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import jakarta.servlet.http.HttpSessionEvent;
import jakarta.servlet.http.HttpSessionListener;
import org.springframework.web.cors.*;
import com.machinefault.api.repo.UserRepository;
import java.util.*;

// Sets up sessions, CSRF protection, role checks, and allowed browser origins.
@Configuration @EnableMethodSecurity
public class SecurityConfig {
 // Hashes passwords before storage and checks them during login.
 @Bean PasswordEncoder passwordEncoder(){return new BCryptPasswordEncoder();}
 // Stores the authenticated user's security context in a server-side HTTP session.
 @Bean SecurityContextRepository securityContextRepository(){return new HttpSessionSecurityContextRepository();}
 @Bean EnabledAccountFilter enabledAccountFilter(UserRepository users){return new EnabledAccountFilter(users);}
 @Bean FilterRegistrationBean<EnabledAccountFilter> enabledAccountFilterRegistration(EnabledAccountFilter filter){FilterRegistrationBean<EnabledAccountFilter> registration=new FilterRegistrationBean<>(filter);registration.setEnabled(false);return registration;}
 // Remove a user from the online list when the session logs out or expires.
 @Bean ServletListenerRegistrationBean<HttpSessionListener> userPresenceSessionListener(com.machinefault.api.service.UserPresence presence){return new ServletListenerRegistrationBean<>(new HttpSessionListener(){@Override public void sessionDestroyed(HttpSessionEvent event){presence.unregister(event.getSession().getId());}});}
 // Basic Auth is disabled; browser requests that change data must include a CSRF token.
 @Bean SecurityFilterChain securityFilterChain(HttpSecurity http,SecurityContextRepository contexts,EnabledAccountFilter enabledAccountFilter)throws Exception{return http.csrf(c->c.csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())).cors(Customizer.withDefaults()).securityContext(c->c.securityContextRepository(contexts)).sessionManagement(s->s.sessionCreationPolicy(org.springframework.security.config.http.SessionCreationPolicy.IF_REQUIRED)).formLogin(f->f.disable()).httpBasic(b->b.disable()).authorizeHttpRequests(a->a.requestMatchers("/actuator/health","/api/auth/login","/api/auth/csrf").permitAll().anyRequest().authenticated()).addFilterAfter(enabledAccountFilter,org.springframework.security.web.context.SecurityContextHolderFilter.class).build();}
 // Reads the frontend address list from application settings.
 @Bean CorsConfigurationSource corsConfigurationSource(@Value("${app.cors.allowed-origins}") String origins){CorsConfiguration c=new CorsConfiguration();c.setAllowedOrigins(Arrays.stream(origins.split(",")).map(String::trim).toList());c.setAllowedMethods(List.of("GET","POST","PUT","PATCH","DELETE","OPTIONS"));c.setAllowedHeaders(List.of("Content-Type","X-XSRF-TOKEN"));c.setAllowCredentials(true);UrlBasedCorsConfigurationSource s=new UrlBasedCorsConfigurationSource();s.registerCorsConfiguration("/**",c);return s;}
}

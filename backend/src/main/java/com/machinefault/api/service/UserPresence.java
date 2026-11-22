package com.machinefault.api.service;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

// Tracks authenticated HTTP sessions so assignment can require an online technician.
@Component
public class UserPresence {
    private final ConcurrentHashMap<Long, Set<String>> sessionsByUser = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Long> usersBySession = new ConcurrentHashMap<>();

    public synchronized void register(Long userId, String sessionId) {
        Long oldUser = usersBySession.put(sessionId, userId);
        if (oldUser != null && !oldUser.equals(userId)) remove(oldUser, sessionId);
        sessionsByUser.computeIfAbsent(userId, ignored -> ConcurrentHashMap.newKeySet()).add(sessionId);
    }

    public synchronized boolean isOnline(Long userId) {
        Set<String> sessions = sessionsByUser.get(userId);
        return sessions != null && !sessions.isEmpty();
    }

    public synchronized void unregister(String sessionId) {
        Long userId = usersBySession.remove(sessionId);
        if (userId != null) remove(userId, sessionId);
    }

    private void remove(Long userId, String sessionId) {
        Set<String> sessions = sessionsByUser.get(userId);
        if (sessions != null) {
            sessions.remove(sessionId);
            if (sessions.isEmpty()) sessionsByUser.remove(userId, sessions);
        }
    }
}

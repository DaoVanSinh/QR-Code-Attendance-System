package com.qrcode.backend.repository;

import com.qrcode.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Integer> {
    Optional<User> findByEmail(String email);
    Optional<User> findByUsername(String username);
    Optional<User> findByResetPasswordToken(String token);
    Optional<User> findByRefreshToken(String refreshToken);
    boolean existsByEmail(String email);
    boolean existsByUsername(String username);
    boolean existsByEmailAndIdNot(String email, Integer id); // Kiểm tra email trùng (trừ user hiện tại)
    boolean existsByUsernameAndIdNot(String username, Integer id); // Kiểm tra mã SV trùng (trừ user hiện tại)
}



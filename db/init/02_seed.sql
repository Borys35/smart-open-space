INSERT INTO roles (name) VALUES ('SUPER_ADMIN') ON CONFLICT (name) DO NOTHING;
INSERT INTO roles (name) VALUES ('MANAGER') ON CONFLICT (name) DO NOTHING;
INSERT INTO roles (name) VALUES ('USER') ON CONFLICT (name) DO NOTHING;

INSERT INTO users (username, email, password_hash, role_id, is_active)
VALUES (
    'admin',
    'admin@test.com',
    '$2b$12$hkjBmyAseezFBF6C3ecG/OnJF2ZhIENG1b1GC7lH8EZWS6jCDWvdq', -- password: Password1!
    (SELECT id FROM roles WHERE name = 'SUPER_ADMIN'),
    true
)
ON CONFLICT (email) DO NOTHING;
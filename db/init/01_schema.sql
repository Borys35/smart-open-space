CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ENUMS
-- status biurka
CREATE TYPE desk_status AS ENUM ('AVAILABLE', 'MAINTENANCE', 'INACTIVE');

-- role użytkowników
CREATE TYPE role_enum AS ENUM ('SUPER_ADMIN', 'MANAGER', 'USER');

-- status rezerwacji
CREATE TYPE reservation_status AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'DONE', 'NO_SHOW');

-- status zaproszenia
CREATE TYPE invitation_status AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- status członkostwa
CREATE TYPE membership_status AS ENUM ('ACTIVE', 'BLOCKED', 'LEFT');

-- typy transakcji
CREATE TYPE credit_transaction_type AS ENUM ('TOP_UP', 'RESERVATION_CHARGE', 'REFUND', 'MANUAL_ADJUSTMENT', 'LATE_CHECKOUT_PENALTY', 'NO_SHOW_PENALTY');

-- rodzaj identyfikatora dostępu
CREATE TYPE access_credential_type AS ENUM ('NFC_CARD', 'PHONE');

-- dostępne akcje przy czytniku
CREATE TYPE access_action AS ENUM ('CHECK_IN', 'CHECK_OUT', 'ENTRY', 'IDENTITY_VERIFICATION');

-- dostępne wyniki przy czytniku
CREATE TYPE access_result AS ENUM ('SUCCESS', 'DENIED');

CREATE TYPE credit_reset_period_enum AS ENUM ('WEEKLY', 'MONTHLY');

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TABLES
-- role
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name role_enum NOT NULL UNIQUE
);

-- użytkownicy
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username varchar(50) NOT NULL,
    email varchar(255) NOT NULL UNIQUE,
    password_hash varchar(100) NOT NULL,
    role_id int NOT NULL REFERENCES roles(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- open-spaces
CREATE TABLE open_spaces (
    id SERIAL PRIMARY KEY,
    name varchar(100) NOT NULL,
    floor int NOT NULL,
    building varchar(50) NOT NULL,
    address TEXT,
    place_name TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    image_url TEXT,
    opened_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    credits_per_hour int NOT NULL DEFAULT 2 CHECK (credits_per_hour > 0),
    max_daily_hours int NOT NULL DEFAULT 8 CHECK (max_daily_hours > 0),
    late_checkout_penalty_hours int CHECK (late_checkout_penalty_hours IS NULL OR late_checkout_penalty_hours > 0),
    no_show_penalty_hours int CHECK (no_show_penalty_hours IS NULL OR no_show_penalty_hours > 0),
    period_credits int NOT NULL DEFAULT 80 CHECK (period_credits >= 0),
    credit_reset_period credit_reset_period_enum NOT NULL DEFAULT 'WEEKLY',
    last_credit_reset_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    UNIQUE (building, name)
);

-- managerowie open-spaców
CREATE TABLE open_space_managers (
    id SERIAL PRIMARY KEY,
    open_space_id int NOT NULL REFERENCES open_spaces(id),
    user_id int NOT NULL REFERENCES users(id),
    assigned_by int REFERENCES users(id),
    assigned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    unassigned_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- indeks do pilnowania zasady: open-space ma tylko jednego managera
CREATE UNIQUE INDEX unique_active_manager_per_open_space
ON open_space_managers(open_space_id, user_id)
WHERE is_active = TRUE;

-- biurka
CREATE TABLE desks (
    id SERIAL PRIMARY KEY,
    open_space_id int NOT NULL REFERENCES open_spaces(id),
    label varchar(32),
    x float NOT NULL,
    y float NOT NULL,
    width float NOT NULL CHECK (width > 0),
    height float NOT NULL CHECK (height > 0),
    status desk_status NOT NULL DEFAULT 'AVAILABLE',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- zaproszenia
CREATE TABLE invitations (
    id SERIAL PRIMARY KEY,
    open_space_id int NOT NULL REFERENCES open_spaces(id),
    invited_email varchar(255) NOT NULL,
    invited_user_id int REFERENCES users(id),
    invited_by int NOT NULL REFERENCES users(id),
    status invitation_status NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),

    CHECK (invited_user_id IS NULL OR invited_user_id <> invited_by)
);

CREATE UNIQUE INDEX unique_pending_invitation_per_email
ON invitations(open_space_id, invited_email)
WHERE status = 'PENDING';

-- członkostwo
CREATE TABLE memberships (
    id SERIAL PRIMARY KEY,
    user_id int NOT NULL REFERENCES users(id),
    open_space_id int NOT NULL REFERENCES open_spaces(id),
    credits_balance int NOT NULL CHECK (credits_balance >= 0),
    pending_penalty_credits int NOT NULL DEFAULT 0 CHECK (pending_penalty_credits >= 0),
    status membership_status NOT NULL DEFAULT 'ACTIVE',
    joined_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (user_id, open_space_id)
);

-- transakcje
CREATE TABLE credit_transactions (
    id SERIAL PRIMARY KEY,
    membership_id int NOT NULL REFERENCES memberships(id),
    amount int NOT NULL CHECK (amount <> 0),
    type credit_transaction_type NOT NULL,
    description varchar(255),
    created_by int REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- rezerwacje
CREATE TABLE reservations (
    id SERIAL PRIMARY KEY,
    desk_id int NOT NULL REFERENCES desks(id),
    user_id int NOT NULL REFERENCES users(id),
    membership_id int NOT NULL REFERENCES memberships(id),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    credit_cost int NOT NULL,
    late_checkout_penalty_cost int NOT NULL DEFAULT 0 CHECK (late_checkout_penalty_cost >= 0),
    no_show_penalty_cost int NOT NULL DEFAULT 0 CHECK (no_show_penalty_cost >= 0),
    status reservation_status NOT NULL DEFAULT 'CONFIRMED',
    checked_in_at TIMESTAMPTZ,
    checked_out_at TIMESTAMPTZ,
    late_checkout_penalty_applied_at TIMESTAMPTZ,
    no_show_penalty_applied_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CHECK (end_time > start_time),
    CHECK (credit_cost >= 0)
);

CREATE INDEX idx_reservation_desk_time
ON reservations(desk_id, start_time, end_time);

CREATE INDEX idx_reservation_user
ON reservations(user_id);

CREATE INDEX idx_reservations_membership
ON reservations(membership_id);

-- urządzenia dostępu
CREATE TABLE access_devices (
    id SERIAL PRIMARY KEY,
    open_space_id int NOT NULL REFERENCES open_spaces(id),
    name varchar(100) NOT NULL,
    device_key varchar(100) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- identyfikator dostępu użytkowników
CREATE TABLE access_credentials (
    id SERIAL PRIMARY KEY,
    user_id int NOT NULL REFERENCES users(id),
    type access_credential_type NOT NULL,
    uid varchar(100) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    assigned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deactivated_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX unique_active_nfc_card_per_user
ON access_credentials(user_id)
WHERE type = 'NFC_CARD' AND is_active = TRUE;

-- logi użycia identyfikatorów
CREATE TABLE access_logs (
    id SERIAL PRIMARY KEY,
    access_credential_id int NOT NULL REFERENCES access_credentials(id),
    access_device_id int NOT NULL REFERENCES access_devices(id),
    user_id int NOT NULL REFERENCES users(id),
    open_space_id int NOT NULL REFERENCES open_spaces(id),
    reservation_id int REFERENCES reservations(id),
    scanned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    action access_action NOT NULL,
    result access_result NOT NULL
);

CREATE TABLE push_tokens (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    user_id INT NOT NULL REFERENCES users(id),
    token TEXT NOT NULL,
    device_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CHECK (LENGTH(token) > 0 AND LENGTH(token) < 64),
    CHECK (LENGTH(device_id) = 32),
    UNIQUE (user_id, device_id)
);

CREATE OR REPLACE TRIGGER tg_set_updated_at_push_tokens
    BEFORE INSERT OR UPDATE ON push_tokens
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_push_token_id ON push_tokens(user_id);

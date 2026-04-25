-- ENUMS
-- status biurka
CREATE TYPE desk_status AS ENUM ('AVAILABLE', 'MAINTENANCE', 'INACTIVE');

-- role użytkowników
CREATE TYPE role_enum AS ENUM ('SUPER_ADMIN', 'MANAGER', 'USER');

-- status rezerwacji 
CREATE TYPE reservation_status AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'DONE');

-- status zaproszenia
CREATE TYPE invitation_status AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- status członkostwa 
CREATE TYPE membership_status AS ENUM ('ACTIVE', 'BLOCKED', 'LEFT');

-- typy transakcji 
CREATE TYPE credit_transaction_type AS ENUM ('TOP_UP', 'RESERVATION_CHARGE', 'REFUND', 'MANUAL_ADJUSTMENT');

-- rodzaj identyfikatora dostępu
CREATE TYPE access_credential_type AS ENUM ('NFC_CARD', 'PHONE');

-- dostępne akcje przy czytniku
CREATE TYPE access_action AS ENUM ('CHECK_IN', 'CHECK_OUT', 'ENTRY', 'IDENTITY_VERIFICATION');

-- dostępne wyniki przy czytniku
CREATE TYPE access_result AS ENUM ('SUCCESS', 'DENIED');

-- TABLES
-- role
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name role_enum NOT NULL UNIQUE
);

-- użytkownicy
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username varchar(25) NOT NULL UNIQUE,
    email varchar(255) NOT NULL UNIQUE,
    password_hash varchar(100) NOT NULL,
    role_id int NOT NULL REFERENCES roles(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- open-spaces
CREATE TABLE open_spaces (
    id SERIAL PRIMARY KEY,
    name varchar(100) NOT NULL,
    floor int NOT NULL,
    building varchar(50),
    manager_id int NOT NULL REFERENCES users(id),
    credits_per_hour int NOT NULL CHECK (credits_per_hour > 0),
    max_daily_hours int NOT NULL CHECK (max_daily_hours > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- biurka 
CREATE TABLE desks (
    id SERIAL PRIMARY KEY,
    open_space_id int NOT NULL REFERENCES open_spaces(id),
    name varchar(50) NOT NULL,
    status desk_status NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (open_space_id, name)
);

-- zaproszenia 
CREATE TABLE invitations (
    id SERIAL PRIMARY KEY,
    open_space_id int NOT NULL REFERENCES open_spaces(id),
    invited_user_id int NOT NULL REFERENCES users(id),
    invited_by int NOT NULL REFERENCES users(id),
    status invitation_status NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP,
    expires_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),

    CHECK (invited_user_id <> invited_by)
);

-- członkostwo
CREATE TABLE memberships (
    id SERIAL PRIMARY KEY,
    user_id int NOT NULL REFERENCES users(id),
    open_space_id int NOT NULL REFERENCES open_spaces(id),
    credits_balance int NOT NULL CHECK (credits_balance >= 0),
    status membership_status NOT NULL DEFAULT 'ACTIVE',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
);

-- rezerwacje 
CREATE TABLE reservations (
    id SERIAL PRIMARY KEY,
    desk_id int NOT NULL REFERENCES desks(id),
    user_id int NOT NULL REFERENCES users(id),
    membership_id int NOT NULL REFERENCES memberships(id),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    credit_cost int NOT NULL,
    status reservation_status NOT NULL DEFAULT 'PENDING',
    checked_in_at TIMESTAMP,
    checked_out_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CHECK (end_time > start_time),
    CHECK (credit_cost >= 0)
);

-- identyfikator dostępu użytkowników
CREATE TABLE access_credentials (
    id SERIAL PRIMARY KEY,
    user_id int NOT NULL REFERENCES users(id),
    type access_credential_type NOT NULL,
    uid varchar(100) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deactivated_at TIMESTAMP
);

-- logi użycia identyfikatorów 
CREATE TABLE access_logs (
    id SERIAL PRIMARY KEY,
    access_credential_id int NOT NULL REFERENCES access_credentials(id),
    user_id int NOT NULL REFERENCES users(id),
    open_space_id int NOT NULL REFERENCES open_spaces(id),
    reservation_id int REFERENCES reservations(id),
    scanned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    action access_action NOT NULL,
    result access_result NOT NULL
);
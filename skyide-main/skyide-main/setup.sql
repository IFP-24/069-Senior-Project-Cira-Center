-- -----------------------------
-- Accounts Table
-- -----------------------------
CREATE TABLE accounts (
    id SERIAL PRIMARY KEY,
    username VARCHAR(15) NOT NULL UNIQUE,
    passhash VARCHAR(256) NOT NULL,
    email VARCHAR(256) UNIQUE
);

-- -----------------------------
-- Projects Table
-- -----------------------------
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    account_id INT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    code JSONB,
    UNIQUE(account_id, name)
);

-- -----------------------------
-- Insert Test Accounts
-- -----------------------------
INSERT INTO accounts (username, passhash, email)
VALUES ('dev1', 'pass1', 'dev1@email.com');

INSERT INTO accounts (username, passhash, email)
VALUES ('dev2', 'pass2', 'dev2@email.com');

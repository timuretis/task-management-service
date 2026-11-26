-- Runs once, when the database volume is first created (docker-entrypoint-initdb.d).
-- The e2e suite for real Postgres uses this database and refuses any name not ending in _test.
CREATE DATABASE tasks_test OWNER tasks;

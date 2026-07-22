-- Runs automatically the first time the mysql container initializes its data volume.
-- (Won't re-run on later starts unless the mysql_data volume is deleted.)
CREATE DATABASE IF NOT EXISTS auth_db;
CREATE DATABASE IF NOT EXISTS task_db;

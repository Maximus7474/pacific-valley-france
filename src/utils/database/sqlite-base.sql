/* Tables */

CREATE TABLE IF NOT EXISTS `settings` (
    `name`          TEXT        PRIMARY KEY,
    `data_type`     TEXT        NOT NULL,
    `value`         TEXT        NOT NULL
);

CREATE TABLE IF NOT EXISTS `sessions` (
    `id`            INTEGER     PRIMARY KEY AUTOINCREMENT,
    `timestamp`     DATETIME    NOT NULL,
    `details`       TEXT        NULL,
    `active`        INTEGER     DEFAULT 1,
    `message_id`    TEXT        NULL,
    `created_by`    TEXT        NOT NULL,
    `created_at`    DATETIME    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `session_groups` (
    `session`       INTEGER     NOT NULL,
    `group`         INTEGER     NOT NULL,

    PRIMARY KEY (`session`, `group`),
    FOREIGN KEY (`session`) REFERENCES `sessions`(`id`),
    FOREIGN KEY (`group`) REFERENCES `player_groups`(`id`)
);

CREATE TABLE IF NOT EXISTS `session_participants` (
    `session`       INTEGER     NOT NULL,
    `user`          TEXT        NOT NULL,
    `absent`        INTEGER     DEFAULT 0,
    `late`          INTEGER     DEFAULT 0,
    `group`         INTEGER     NULL,
    `updated_at`    DATETIME    DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`user`, `session`),
    FOREIGN KEY (`session`) REFERENCES `sessions`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`group`) REFERENCES `player_groups`(`id`) ON DELETE NO ACTION
);

CREATE TABLE IF NOT EXISTS `player_groups` (
    `id`            INTEGER     PRIMARY KEY AUTOINCREMENT,
    `name`          TEXT        UNIQUE NOT NULL,
    `acronym`       TEXT        NOT NULL,
    `emoji`         TEXT        NOT NULL,
    `description`   TEXT        NULL,
    `added_by`      TEXT        NOT NULL,
    `added_at`      DATETIME    DEFAULT CURRENT_TIMESTAMP
);

/* Triggers */

CREATE TRIGGER IF NOT EXISTS `set_participant_group_to_civil`
BEFORE UPDATE ON `session_participants`
FOR EACH ROW
BEGIN
    UPDATE `session_participants`
    SET `updated_at` = CURRENT_TIMESTAMP
    WHERE ROWID = NEW.ROWID;
END;

CREATE TRIGGER IF NOT EXISTS `update_player_session_date`
BEFORE DELETE ON `player_groups`
FOR EACH ROW
BEGIN
    UPDATE `session_participants`
    SET `group` = (SELECT `id` FROM `player_groups` WHERE `name` = 'Civil' LIMIT 1)
    WHERE `group` = OLD.id;
END;

/* Default required data */

INSERT OR IGNORE INTO `player_groups` (`name`, `acronym`, `emoji`, `added_by`)
    VALUES ('Civil', 'Civil', '👤', 'System');

INSERT OR IGNORE INTO `settings` (`name`, `data_type`, `value`)
    VALUES ('session_channel', 'string', '1258888271262388444');
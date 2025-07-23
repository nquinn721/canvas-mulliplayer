-- Leaderboard table creation
-- Add this to your database setup

-- Create leaderboard table
CREATE TABLE IF NOT EXISTS leaderboard (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    userId VARCHAR(36) NOT NULL,
    type ENUM('daily', 'weekly', 'monthly', 'all_time', 'seasonal') NOT NULL,
    category ENUM('total_score', 'kills', 'survival_time', 'win_rate', 'experience', 'level', 'kill_death_ratio') NOT NULL,
    score BIGINT DEFAULT 0,
    rank INT DEFAULT 0,
    gamesPlayed INT DEFAULT 0,
    wins INT DEFAULT 0,
    kills INT DEFAULT 0,
    deaths INT DEFAULT 0,
    survivalTime BIGINT DEFAULT 0,
    averageScore DECIMAL(10,2) DEFAULT 0.00,
    winRate DECIMAL(5,2) DEFAULT 0.00,
    killDeathRatio DECIMAL(5,2) DEFAULT 0.00,
    periodStart DATETIME NOT NULL,
    periodEnd DATETIME NOT NULL,
    metadata JSON NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    CONSTRAINT fk_leaderboard_user FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE,
    
    -- Unique constraint to prevent duplicate entries
    CONSTRAINT uk_leaderboard_user_period UNIQUE (userId, type, category, periodStart, periodEnd),
    
    -- Indexes for performance
    INDEX idx_leaderboard_ranking (type, category, score DESC, updatedAt ASC),
    INDEX idx_leaderboard_user_category (userId, type, category),
    INDEX idx_leaderboard_period (periodStart, periodEnd),
    INDEX idx_leaderboard_type (type),
    INDEX idx_leaderboard_category (category),
    INDEX idx_leaderboard_score (score DESC),
    INDEX idx_leaderboard_rank (rank),
    INDEX idx_leaderboard_updated (updatedAt)
);

-- Add some sample data (optional)
-- This will be populated automatically when games are played

-- Create a view for easy leaderboard queries
CREATE OR REPLACE VIEW v_leaderboard_with_users AS
SELECT 
    l.*,
    u.username,
    u.displayName,
    u.email,
    u.role,
    u.playerLevel as userLevel,
    u.experience as userExperience,
    u.gamesPlayed as totalGamesPlayed,
    u.gamesWon as totalGamesWon,
    u.totalKills as userTotalKills,
    u.totalDeaths as userTotalDeaths,
    u.totalScore as userTotalScore
FROM leaderboard l
JOIN user u ON l.userId = u.id
WHERE u.isActive = TRUE;

-- Create indexes on the view for better performance
CREATE INDEX idx_view_leaderboard_ranking ON v_leaderboard_with_users (type, category, score DESC, updatedAt ASC);
CREATE INDEX idx_view_leaderboard_user ON v_leaderboard_with_users (userId);
CREATE INDEX idx_view_leaderboard_username ON v_leaderboard_with_users (username);

-- Stored procedure to get leaderboard with pagination
DELIMITER //
CREATE PROCEDURE GetLeaderboard(
    IN p_type VARCHAR(50),
    IN p_category VARCHAR(50),
    IN p_period_start DATETIME,
    IN p_period_end DATETIME,
    IN p_limit INT DEFAULT 100,
    IN p_offset INT DEFAULT 0
)
BEGIN
    SELECT 
        (@row_number := @row_number + 1) AS calculated_rank,
        l.*,
        u.username,
        u.displayName
    FROM leaderboard l
    JOIN user u ON l.userId = u.id
    CROSS JOIN (SELECT @row_number := p_offset) AS r
    WHERE l.type = p_type
        AND l.category = p_category
        AND l.periodStart = p_period_start
        AND l.periodEnd = p_period_end
        AND l.gamesPlayed >= 5  -- Minimum games for ranking
        AND u.isActive = TRUE
    ORDER BY l.score DESC, l.updatedAt ASC
    LIMIT p_limit OFFSET p_offset;
END //
DELIMITER ;

-- Stored procedure to update user rank
DELIMITER //
CREATE PROCEDURE UpdateUserRank(
    IN p_user_id VARCHAR(36),
    IN p_type VARCHAR(50),
    IN p_category VARCHAR(50),
    IN p_period_start DATETIME,
    IN p_period_end DATETIME
)
BEGIN
    SET @rank = 0;
    UPDATE leaderboard l1
    JOIN (
        SELECT 
            id,
            (@rank := @rank + 1) AS new_rank
        FROM leaderboard l2
        WHERE l2.type = p_type
            AND l2.category = p_category
            AND l2.periodStart = p_period_start
            AND l2.periodEnd = p_period_end
            AND l2.gamesPlayed >= 5
        ORDER BY l2.score DESC, l2.updatedAt ASC
    ) ranked ON l1.id = ranked.id
    SET l1.rank = ranked.new_rank
    WHERE l1.userId = p_user_id
        AND l1.type = p_type
        AND l1.category = p_category
        AND l1.periodStart = p_period_start
        AND l1.periodEnd = p_period_end;
END //
DELIMITER ;

-- Event to automatically clean up old leaderboard entries
-- Note: Enable event scheduler with SET GLOBAL event_scheduler = ON;
DELIMITER //
CREATE EVENT IF NOT EXISTS cleanup_old_leaderboard_entries
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP
DO
BEGIN
    -- Clean up daily entries older than 7 days
    DELETE FROM leaderboard 
    WHERE type = 'daily' 
        AND periodEnd < DATE_SUB(NOW(), INTERVAL 7 DAY);
    
    -- Clean up weekly entries older than 30 days
    DELETE FROM leaderboard 
    WHERE type = 'weekly' 
        AND periodEnd < DATE_SUB(NOW(), INTERVAL 30 DAY);
    
    -- Clean up monthly entries older than 365 days
    DELETE FROM leaderboard 
    WHERE type = 'monthly' 
        AND periodEnd < DATE_SUB(NOW(), INTERVAL 365 DAY);
    
    -- Clean up seasonal entries older than 2 years
    DELETE FROM leaderboard 
    WHERE type = 'seasonal' 
        AND periodEnd < DATE_SUB(NOW(), INTERVAL 730 DAY);
    
    -- all_time entries are never cleaned up
END //
DELIMITER ;

-- Create trigger to automatically update user statistics when leaderboard is updated
DELIMITER //
CREATE TRIGGER update_user_stats_after_leaderboard_update
AFTER UPDATE ON leaderboard
FOR EACH ROW
BEGIN
    -- Update user's best rank if this is better
    IF NEW.type = 'all_time' AND NEW.category = 'total_score' THEN
        UPDATE user 
        SET 
            totalScore = GREATEST(totalScore, NEW.score),
            gamesPlayed = NEW.gamesPlayed,
            gamesWon = NEW.wins,
            totalKills = NEW.kills,
            totalDeaths = NEW.deaths
        WHERE id = NEW.userId;
    END IF;
END //
DELIMITER ;

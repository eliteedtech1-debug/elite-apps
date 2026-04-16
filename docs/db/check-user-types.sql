-- Check all unique user_type values in the database
SELECT DISTINCT user_type, COUNT(*) as count
FROM users
WHERE user_type IS NOT NULL
GROUP BY user_type
ORDER BY user_type;

-- Check YOUR specific user (replace with your email)
-- SELECT id, name, email, user_type
-- FROM users
-- WHERE email = 'your@email.com';

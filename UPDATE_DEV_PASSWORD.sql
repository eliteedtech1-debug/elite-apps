UPDATE users 
SET password = '$2a$10$LbCsVjadmuN0Fkl.b0q2Q.Wxyz1P.UHaAOGzkMDkRYy3w8sYXs6/i'
WHERE id = 1;

SELECT id, email, 'Dev123' as new_password FROM users WHERE id = 1;

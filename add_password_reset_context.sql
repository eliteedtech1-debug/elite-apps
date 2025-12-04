-- Migration to add password reset information to chatbot_knowledge_base table
-- This will help the chatbot answer questions about resetting passwords

-- Insert password reset related data
INSERT INTO chatbot_knowledge_base (category, question, answer, keywords, intent, priority, is_active) VALUES
('Password Management', 'How do I reset my password?', 'To reset your password, go to the login page and click "Forgot Password". Enter your email or username, and you will receive instructions to reset your password. For additional help, visit the "Forgot Password" page directly.', 'password,reset,change,forgot,lost,forget,help,account', 'password.reset', 12, true);

INSERT INTO chatbot_knowledge_base (category, question, answer, keywords, intent, priority, is_active) VALUES
('Password Management', 'Where is the forgot password link?', 'The "Forgot Password" link is located on the login page. You can also access it directly by visiting the "Forgot Password" page. It''s usually positioned below the login button.', 'forgot,password,link,where,is,located,find,login page', 'password.forgot.link', 11, true);

INSERT INTO chatbot_knowledge_base (category, question, answer, keywords, intent, priority, is_active) VALUES
('Password Management', 'I forgot my password, what do I do?', 'If you forgot your password, click on the "Forgot Password" link on the login page. Enter your email or username, and you will receive instructions to create a new password. Check your spam folder if you don''t see the email.', 'forgot,password,what,do,i,reset,help', 'password.forgot.help', 12, true);

INSERT INTO chatbot_knowledge_base (category, question, answer, keywords, intent, priority, is_active) VALUES
('Password Management', 'How do I change my password?', 'To change your password, log in to your account and navigate to Settings > Security Settings. Look for "Change Password" or "Password Settings". You will typically need your current password to set a new one.', 'change,password,update,settings,security,account,modify', 'password.change', 11, true);

INSERT INTO chatbot_knowledge_base (category, question, answer, keywords, intent, priority, is_active) VALUES
('Password Management', 'Can I reset my password without email?', 'Currently, password resets require access to your registered email address. If you''ve forgotten your password, you must use the "Forgot Password" feature which sends a reset link to your email. If you don''t have access to your email, contact your system administrator for assistance.', 'reset,password,without,email,alternative,contact,admin,administrator', 'password.reset.no.email', 10, true);

INSERT INTO chatbot_knowledge_base (category, question, answer, keywords, intent, priority, is_active) VALUES
('Password Management', 'How do I access the password reset page?', 'You can access the password reset page by clicking the "Forgot Password?" link on the login page. Alternatively, you can visit the dedicated password reset page directly from the main navigation or by following the link provided in the password reset email.', 'password,reset,page,access,reach,forgot', 'password.reset.page', 11, true);

INSERT INTO chatbot_knowledge_base (category, question, answer, keywords, intent, priority, is_active) VALUES
('Password Management', 'What if I didn''t receive the password reset email?', 'If you didn''t receive the password reset email, check your spam or junk folder. Make sure you entered the correct email address associated with your account. If you still don''t receive it, try resending the request or contact your system administrator.', 'password,reset,email,not,received,spam,junk,trouble', 'password.reset.email.trouble', 10, true);

INSERT INTO chatbot_knowledge_base (category, question, answer, keywords, intent, priority, is_active) VALUES
('Password Management', 'How long is the password reset link valid?', 'The password reset link is typically valid for 24 hours. If the link expires, you will need to request a new password reset. Make sure to reset your password promptly after receiving the link.', 'password,reset,link,valid,expire,expiration,time,deadline', 'password.reset.validity', 9, true);

INSERT INTO chatbot_knowledge_base (category, question, answer, keywords, intent, priority, is_active) VALUES
('Password Management', 'What if I need to reset someone else''s password?', 'As an admin, you may be able to reset other users'' passwords. Navigate to the user management section, find the user''s profile, and look for a "Reset Password" option. For security, this may require additional authorization.', 'password,reset,admin,another,user,employee,student,parent,teacher', 'password.reset.others', 9, true);

INSERT INTO chatbot_knowledge_base (category, question, answer, keywords, intent, priority, is_active) VALUES
('Password Management', 'Is there a minimum password strength requirement?', 'Yes, passwords must meet certain requirements which often include a minimum length of 8 characters, at least one uppercase letter, one lowercase letter, one number, and sometimes a special character. Choose a strong, unique password that you don''t use for other sites.', 'password,stength,requirement,minimum,complexity,secure,strong,security', 'password.strength.requirement', 8, true);
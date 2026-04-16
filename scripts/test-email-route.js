const express = require('express');
const app = express();

app.use(express.json());

// Test the email change route
app.post('/users/request-email-change', (req, res) => {
  console.log('📧 Email change request received:', req.body);
  
  const { user_id, new_email, current_password, user_type } = req.body;
  
  // Validate input
  if (!user_id || !new_email || !current_password || !user_type) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: user_id, new_email, current_password, user_type'
    });
  }
  
  // Validate email format
  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  if (!emailRegex.test(new_email)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid email format'
    });
  }
  
  // Mock successful response
  res.json({
    success: true,
    message: 'Email change request submitted successfully. Please check your new email for verification code.',
    data: {
      user_id,
      old_email: 'current@example.com',
      new_email,
      expires_at: new Date(Date.now() + 10 * 60 * 1000),
      verification_sent: true,
      test_mode: true
    }
  });
});

app.listen(34567, () => {
  console.log('🚀 Test server running on port 34567');
  console.log('✅ Route /users/request-email-change is available for testing');
});
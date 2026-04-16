const express = require('express');
const app = express();

app.use(express.json());

// Test route
app.post('/users/request-email-change', (req, res) => {
  console.log('📧 Route hit with data:', req.body);
  res.json({
    success: true,
    message: 'Route is working!',
    data: req.body
  });
});

app.listen(34567, () => {
  console.log('🚀 Test server running on port 34567');
  console.log('✅ Route /users/request-email-change is available');
});
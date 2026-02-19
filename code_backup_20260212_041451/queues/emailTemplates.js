/**
 * Email Templates for Queue System
 * Centralized email template management
 */

const EMAIL_TEMPLATES = {
  EMAIL_CHANGE_VERIFICATION: {
    subject: 'Email Change Verification Required - School Management System',
    template: (data) => `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <title>Email Change Verification - School Management System</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                  <h1 style="margin: 0;">📧 Email Change Verification</h1>
              </div>

              <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                  <h2>Hello ${data.user_name},</h2>

                  <p>You have requested to change your email address from <strong>${data.old_email}</strong> to <strong>${data.new_email}</strong>.</p>

                  <p>Please use the verification code below to confirm this change:</p>

                  <div style="background: white; border: 2px dashed #667eea; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
                      <h1 style="color: #667eea; font-size: 32px; margin: 0; letter-spacing: 5px;">${data.verification_code}</h1>
                  </div>

                  <div style="background: #e8f4fd; border-left: 4px solid #1890ff; padding: 15px; margin: 20px 0;">
                      <h4 style="margin: 0 0 10px 0; color: #1890ff;">🔒 Important Security Information:</h4>
                      <ul style="margin: 0; padding-left: 20px;">
                          <li>This code will expire in <strong>10 minutes</strong></li>
                          <li>You can continue using your current email (<strong>${data.old_email}</strong>) to login until verification is complete</li>
                          <li>After verification, your email will be updated to <strong>${data.new_email}</strong></li>
                          <li>If you didn't request this change, please contact your administrator immediately</li>
                      </ul>
                  </div>

                  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666;">
                      <p>This is an automated message from School Management System</p>
                      <p>Please do not reply to this email</p>
                  </div>
              </div>
          </div>
      </body>
      </html>
    `
  },

  EMAIL_VERIFICATION: {
    subject: 'Email Verification Required - School Management System',
    template: (data) => `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <title>Email Verification - School Management System</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                  <h1 style="margin: 0;">✉️ Email Verification Required</h1>
              </div>

              <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                  <h2>Hello ${data.user_name},</h2>

                  <p>Please verify your email address to complete your account setup.</p>

                  <p>Use the verification code below:</p>

                  <div style="background: white; border: 2px dashed #667eea; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
                      <h1 style="color: #667eea; font-size: 32px; margin: 0; letter-spacing: 5px;">${data.verification_code}</h1>
                  </div>

                  <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
                      <h4 style="color: #856404; margin: 0 0 10px 0;">⚠️ Important:</h4>
                      <ul style="color: #856404; margin: 0; padding-left: 20px;">
                          <li>This code will expire in <strong>24 hours</strong></li>
                          <li>After verification, you'll be able to access all system features</li>
                          <li>If you didn't create this account, please ignore this email</li>
                      </ul>
                  </div>

                  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666;">
                      <p>This is an automated message from School Management System</p>
                      <p>If you have any questions, please contact your system administrator</p>
                  </div>
              </div>
          </div>
      </body>
      </html>
    `
  },

  PASSWORD_RESET: {
    subject: 'Password Reset Request - School Management System',
    template: (data) => `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <title>Password Reset - School Management System</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                  <h1 style="margin: 0;">🔐 Password Reset Request</h1>
              </div>

              <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                  <h2>Hello ${data.user_name},</h2>

                  <p>We received a request to reset your password for your ${data.user_type} account.</p>

                  <p>Click the button below to reset your password:</p>

                  <div style="text-align: center; margin: 30px 0;">
                      <a href="${data.reset_url}" style="background: #ff6b6b; color: white; padding: 15px 30px; border-radius: 5px; text-decoration: none; display: inline-block; font-weight: bold;">
                          Reset Password
                      </a>
                  </div>

                  <p>If the button doesn't work, copy and paste this link into your browser:</p>
                  <p style="background: #f1f1f1; padding: 10px; border-radius: 3px; word-break: break-all; font-family: monospace; font-size: 12px;">
                      ${data.reset_url}
                  </p>

                  <div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 20px 0;">
                      <h4 style="color: #721c24; margin: 0 0 10px 0;">🔒 Security Information:</h4>
                      <ul style="color: #721c24; margin: 0; padding-left: 20px;">
                          <li>This link will expire in <strong>1 hour</strong></li>
                          <li>If you didn't request this reset, please ignore this email</li>
                          <li>Your password will remain unchanged until you create a new one</li>
                      </ul>
                  </div>

                  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666;">
                      <p>This is an automated message from School Management System</p>
                      <p>If you have any questions, please contact your system administrator</p>
                  </div>
              </div>
          </div>
      </body>
      </html>
    `
  },

  PASSWORD_RESET_OTP: {
    subject: 'Password Reset OTP - School Management System',
    template: (data) => `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <title>Password Reset OTP - School Management System</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                  <h1 style="margin: 0;">🔐 Password Reset OTP</h1>
              </div>

              <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                  <h2>Hello ${data.user_name},</h2>

                  <p>Your password reset request has been received for your ${data.user_type} account.</p>

                  <p>Your password reset OTP code is:</p>

                  <div style="background: white; border: 2px dashed #ff6b6b; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
                      <h1 style="color: #ff6b6b; font-size: 32px; margin: 0; letter-spacing: 5px;">${data.otp_code}</h1>
                  </div>

                  <p>Alternatively, you can use the link below to reset your password:</p>

                  <div style="text-align: center; margin: 20px 0;">
                      <a href="${data.reset_url}" style="background: #ff6b6b; color: white; padding: 12px 24px; border-radius: 5px; text-decoration: none; display: inline-block; font-weight: bold; font-size: 14px;">
                          Reset Password
                      </a>
                  </div>

                  <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
                      <h4 style="color: #856404; margin: 0 0 10px 0;">🔒 Important Security Information:</h4>
                      <ul style="color: #856404; margin: 0; padding-left: 20px;">
                          <li>This OTP will expire in <strong>30 minutes</strong></li>
                          <li>If you didn't request this reset, please ignore this email</li>
                          <li>Enter the OTP code on the reset page or click the link above</li>
                      </ul>
                  </div>

                  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666;">
                      <p>This is an automated message from School Management System</p>
                      <p>If you have any questions, please contact your system administrator</p>
                  </div>
              </div>
          </div>
      </body>
      </html>
    `
  },

  WELCOME_EMAIL: {
    subject: 'Welcome to School Management System',
    template: (data) => `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <title>Welcome - School Management System</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #00b894 0%, #00cec9 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                  <h1 style="margin: 0;">🎉 Welcome to ${data.school_name || 'School Management System'}</h1>
              </div>

              <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                  <h2>Hello ${data.user_name},</h2>

                  <p>Welcome to our School Management System! Your ${data.user_type} account has been successfully created.</p>

                  <div style="background: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin: 20px 0;">
                      <h4 style="color: #0c5460; margin: 0 0 10px 0;">🚀 Getting Started:</h4>
                      <ul style="color: #0c5460; margin: 0; padding-left: 20px;">
                          <li>Login to your account using your credentials</li>
                          <li>Complete your profile information</li>
                          <li>Explore the available features</li>
                          <li>Contact support if you need assistance</li>
                      </ul>
                  </div>

                  <div style="text-align: center; margin: 30px 0;">
                      <a href="${data.login_url || '#'}" style="background: #00b894; color: white; padding: 15px 30px; border-radius: 5px; text-decoration: none; display: inline-block; font-weight: bold;">
                          Login to Your Account
                      </a>
                  </div>

                  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666;">
                      <p>This is an automated message from School Management System</p>
                      <p>If you have any questions, please contact your system administrator</p>
                  </div>
              </div>
          </div>
      </body>
      </html>
    `
  },

  NOTIFICATION: {
    subject: (data) => data.subject || 'Notification - School Management System',
    template: (data) => `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <title>Notification - School Management System</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                  <h1 style="margin: 0;">🔔 ${data.subject || 'Notification'}</h1>
              </div>

              <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                  <h2>Hello ${data.user_name},</h2>

                  <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
                      ${data.message}
                  </div>

                  ${data.notification_type ? `
                  <div style="background: #e8f4fd; border-left: 4px solid #1890ff; padding: 15px; margin: 20px 0;">
                      <p style="margin: 0; color: #1890ff; font-weight: bold;">Notification Type: ${data.notification_type}</p>
                  </div>
                  ` : ''}

                  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666;">
                      <p>This is an automated message from School Management System</p>
                      <p>Please do not reply to this email</p>
                  </div>
              </div>
          </div>
      </body>
      </html>
    `
  },

  BULK_EMAIL: {
    subject: (data) => data.subject || 'Important Update - School Management System',
    template: (data) => `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <title>${data.subject} - School Management System</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #fd79a8 0%, #fdcb6e 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                  <h1 style="margin: 0;">📢 ${data.subject}</h1>
              </div>

              <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                  <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
                      ${data.message}
                  </div>

                  ${data.sender_name ? `
                  <div style="text-align: right; margin: 20px 0; color: #666;">
                      <p>Best regards,<br><strong>${data.sender_name}</strong></p>
                  </div>
                  ` : ''}

                  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666;">
                      <p>This is a bulk message from School Management System</p>
                      ${data.campaign_id ? `<p style="font-size: 12px;">Campaign ID: ${data.campaign_id}</p>` : ''}
                  </div>
              </div>
          </div>
      </body>
      </html>
    `
  }
};

/**
 * Get email template by type
 */
function getEmailTemplate(type, data) {
  // Convert job type names to template names
  const typeMap = {
    'email-change-verification': 'EMAIL_CHANGE_VERIFICATION',
    'email-verification': 'EMAIL_VERIFICATION',
    'password-reset': 'PASSWORD_RESET',
    'password-reset-otp': 'PASSWORD_RESET_OTP',
    'welcome-email': 'WELCOME_EMAIL',
    'notification': 'NOTIFICATION',
    'bulk-email': 'BULK_EMAIL'
  };

  const templateType = typeMap[type] || type;
  const template = EMAIL_TEMPLATES[templateType];
  
  if (!template) {
    throw new Error(`Email template '${type}' not found (mapped to ${templateType})`);
  }
  
  const subject = typeof template.subject === 'function' 
    ? template.subject(data) 
    : template.subject;
    
  const html = template.template(data);
  
  return {
    subject,
    html
  };
}

/**
 * Validate template data
 */
function validateTemplateData(type, data) {
  // Convert job type names to template names
  const typeMap = {
    'email-change-verification': 'EMAIL_CHANGE_VERIFICATION',
    'email-verification': 'EMAIL_VERIFICATION',
    'password-reset': 'PASSWORD_RESET',
    'password-reset-otp': 'PASSWORD_RESET_OTP',
    'welcome-email': 'WELCOME_EMAIL',
    'notification': 'NOTIFICATION',
    'bulk-email': 'BULK_EMAIL'
  };

  const templateType = typeMap[type] || type;

  const requiredFields = {
    EMAIL_CHANGE_VERIFICATION: ['user_name', 'verification_code', 'old_email', 'new_email'],
    EMAIL_VERIFICATION: ['user_name', 'verification_code'],
    PASSWORD_RESET: ['user_name', 'reset_url', 'user_type'],
    PASSWORD_RESET_OTP: ['user_name', 'otp_code', 'reset_url', 'user_type'],
    WELCOME_EMAIL: ['user_name', 'user_type'],
    NOTIFICATION: ['user_name', 'message'],
    BULK_EMAIL: ['subject', 'message']
  };
  
  const required = requiredFields[templateType];
  if (!required) {
    throw new Error(`Unknown template type: ${type} (mapped to ${templateType})`);
  }
  
  const missing = required.filter(field => !data[field]);
  if (missing.length > 0) {
    throw new Error(`Missing required fields for ${type}: ${missing.join(', ')}`);
  }
  
  return true;
}

module.exports = {
  EMAIL_TEMPLATES,
  getEmailTemplate,
  validateTemplateData
};
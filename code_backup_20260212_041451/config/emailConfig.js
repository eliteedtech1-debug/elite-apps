/**
 * Enhanced Email Configuration with Production Support
 * Fixes the email configuration issues
 */

const nodemailer = require('nodemailer');

// Enhanced email configuration with better error handling
const createEmailTransporter = () => {
  // Ensure environment variables are loaded
  const config = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USERNAME,
      pass: process.env.SMTP_PASSWORD
    },
    tls: {
      rejectUnauthorized: false // Accept self-signed certificates
    },
    connectionTimeout: 15000, // 15 seconds
    greetingTimeout: 10000, // 10 seconds
    socketTimeout: 15000, // 15 seconds
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    rateLimit: 10
  };
  
  // Enhanced logging with better error detection
  console.log('📧 Email config:', {
    host: config.host,
    port: config.port,
    user: config.auth.user || 'undefined',
    hasPassword: !!config.auth.pass,
    environment: process.env.NODE_ENV || 'development'
  });
  
  // Check for missing configuration
  if (!config.auth.user) {
    console.warn('⚠️ SMTP_USERNAME is not configured');
  }
  if (!config.auth.pass) {
    console.warn('⚠️ SMTP_PASSWORD is not configured');
  }
  
  return nodemailer.createTransport(config);
};

// Fallback email transporter for production
const createFallbackTransporter = () => {
  const fallbackConfig = {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'eliteedtech1@gmail.com',
      pass: 'ELITE-2006'
    },
    tls: {
      rejectUnauthorized: false
    },
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    pool: true,
    maxConnections: 3,
    maxMessages: 50,
    rateLimit: 5
  };
  
  console.log('📧 Fallback email config:', {
    host: fallbackConfig.host,
    port: fallbackConfig.port,
    user: fallbackConfig.auth.user,
    hasPassword: !!fallbackConfig.auth.pass
  });
  
  return nodemailer.createTransport(fallbackConfig);
};

// Test email connection
const testEmailConnection = async (transporter, name = 'primary') => {
  try {
    console.log(`🔍 Testing ${name} email connection...`);
    await transporter.verify();
    console.log(`✅ ${name} email connection verified successfully`);
    return true;
  } catch (error) {
    console.error(`❌ ${name} email connection failed:`, error.message);
    return false;
  }
};

// Initialize transporters
const primaryTransporter = createEmailTransporter();
const fallbackTransporter = createFallbackTransporter();

// Test connections on startup
const initializeEmailSystem = async () => {
  console.log('🚀 Initializing email system...');
  
  const primaryWorking = await testEmailConnection(primaryTransporter, 'primary');
  const fallbackWorking = await testEmailConnection(fallbackTransporter, 'fallback');
  
  if (!primaryWorking && !fallbackWorking) {
    console.error('❌ Both primary and fallback email systems failed');
    return false;
  } else if (!primaryWorking) {
    console.warn('⚠️ Primary email system failed, fallback available');
  } else {
    console.log('✅ Email system initialized successfully');
  }
  
  return true;
};

// Enhanced send email function with fallback
const sendEmailWithFallback = async (mailOptions, maxRetries = 2) => {
  // Try primary transporter first
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📤 Sending email via primary (attempt ${attempt}/${maxRetries})...`);
      const result = await primaryTransporter.sendMail(mailOptions);
      console.log('✅ Email sent successfully via primary:', result.messageId);
      return { success: true, messageId: result.messageId, usedFallback: false };
    } catch (error) {
      console.log(`❌ Primary email attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        console.log('🔄 Attempting fallback email system...');
        break;
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // Try fallback transporter
  try {
    const fallbackMailOptions = {
      ...mailOptions,
      from: {
        name: 'Elite Scholar System',
        address: 'eliteedtech1@gmail.com'
      }
    };
    
    const result = await fallbackTransporter.sendMail(fallbackMailOptions);
    console.log('✅ Email sent successfully via fallback:', result.messageId);
    return { success: true, messageId: result.messageId, usedFallback: true };
  } catch (fallbackError) {
    console.error('❌ Fallback email also failed:', fallbackError.message);
    throw new Error(`Both primary and fallback email systems failed. Primary: ${error.message}, Fallback: ${fallbackError.message}`);
  }
};

module.exports = {
  primaryTransporter,
  fallbackTransporter,
  createEmailTransporter,
  createFallbackTransporter,
  testEmailConnection,
  initializeEmailSystem,
  sendEmailWithFallback
};

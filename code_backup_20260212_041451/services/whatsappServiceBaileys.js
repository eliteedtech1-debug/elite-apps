const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const EventEmitter = require('events');

/**
 * WhatsApp Service using Baileys
 * 80% less memory usage compared to whatsapp-web.js (Chromium-based)
 *
 * Memory comparison:
 * - whatsapp-web.js: 200-400MB per school (uses Chromium)
 * - Baileys: 40-80MB per school (pure Node.js)
 *
 * Advantages of Baileys:
 * 1. No Chromium dependency - pure Node.js
 * 2. Much lower memory footprint
 * 3. Faster connection times
 * 4. Better for multiple simultaneous schools
 * 5. More stable for long-running processes
 */
class WhatsAppServiceBaileys extends EventEmitter {
  constructor() {
    super();
    this.sockets = new Map(); // Store multiple school WhatsApp sockets
    this.qrCodes = new Map(); // Store QR codes for scanning
    this.connectionStates = new Map(); // Track connection states
    this.sessionPath = path.join(__dirname, '../../.baileys_auth');

    // Ensure session directory exists
    if (!fs.existsSync(this.sessionPath)) {
      fs.mkdirSync(this.sessionPath, { recursive: true });
    }

    // Configure logger to reduce noise
    this.logger = pino({ level: 'warn' }); // Only show warnings and errors
  }

  /**
   * Sanitize school ID for safe file system usage
   */
  sanitizeSchoolId(schoolId) {
    return schoolId.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  /**
   * Initialize WhatsApp connection for a school
   * @param {string} schoolId - School identifier
   * @returns {Promise<Object>} WhatsApp socket instance
   */
  async initializeConnection(schoolId) {
    try {
      const sanitizedId = this.sanitizeSchoolId(schoolId);

      // Check if already connected
      if (this.sockets.has(schoolId)) {
        const existingSocket = this.sockets.get(schoolId);
        const state = this.connectionStates.get(schoolId);

        if (state === 'open') {
          console.log(`✅ WhatsApp already connected for school: ${schoolId}`);
          return existingSocket;
        }
      }

      console.log(`🔄 Initializing Baileys WhatsApp for school: ${schoolId}`);

      // Setup auth state (stores session credentials)
      const authFolder = path.join(this.sessionPath, `school_${sanitizedId}`);
      if (!fs.existsSync(authFolder)) {
        fs.mkdirSync(authFolder, { recursive: true });
      }

      const { state, saveCreds } = await useMultiFileAuthState(authFolder);

      // Get latest Baileys version for compatibility
      const { version, isLatest } = await fetchLatestBaileysVersion();
      console.log(`📱 Using WA v${version.join('.')}, isLatest: ${isLatest}`);

      // Create socket connection
      const sock = makeWASocket({
        version,
        logger: this.logger,
        printQRInTerminal: false, // We'll handle QR code ourselves
        auth: state,
        browser: ['Elite School Management', 'Chrome', '10.0'], // Browser identification
        getMessage: async (key) => {
          // Handle message retry (optional)
          return { conversation: 'Message not available' };
        },
      });

      // Store socket
      this.sockets.set(schoolId, sock);
      this.connectionStates.set(schoolId, 'connecting');

      // Setup event handlers
      this.setupEventHandlers(sock, schoolId, saveCreds);

      return sock;
    } catch (error) {
      console.error(`❌ Failed to initialize WhatsApp for ${schoolId}:`, error);
      throw error;
    }
  }

  /**
   * Setup event handlers for the socket
   */
  setupEventHandlers(sock, schoolId, saveCreds) {
    // Connection updates (QR code, connecting, open, close)
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      // Handle QR code generation
      if (qr) {
        console.log(`📱 QR Code generated for school: ${schoolId}`);

        try {
          // Generate QR code as data URL
          const qrDataUrl = await QRCode.toDataURL(qr);
          this.qrCodes.set(schoolId, qrDataUrl);
          this.emit('qr', { schoolId, qr: qrDataUrl });
        } catch (err) {
          console.error('Failed to generate QR code:', err);
        }
      }

      // Handle connection state changes
      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error instanceof Boom)
          ? lastDisconnect.error.output?.statusCode !== DisconnectReason.loggedOut
          : true;

        console.log(`⚠️ Connection closed for ${schoolId}, reconnecting:`, shouldReconnect);
        this.connectionStates.set(schoolId, 'closed');
        this.emit('disconnected', { schoolId });

        if (shouldReconnect) {
          // Reconnect after 5 seconds
          setTimeout(() => {
            this.initializeConnection(schoolId);
          }, 5000);
        } else {
          // Logged out - remove socket
          this.sockets.delete(schoolId);
          this.qrCodes.delete(schoolId);
          this.connectionStates.delete(schoolId);
        }
      } else if (connection === 'open') {
        console.log(`✅ WhatsApp connected successfully for school: ${schoolId}`);
        this.connectionStates.set(schoolId, 'open');
        this.qrCodes.delete(schoolId); // Clear QR code after connection
        this.emit('connected', { schoolId });
      } else if (connection === 'connecting') {
        console.log(`🔄 Connecting WhatsApp for school: ${schoolId}`);
        this.connectionStates.set(schoolId, 'connecting');
      }
    });

    // Save credentials whenever they update
    sock.ev.on('creds.update', saveCreds);

    // Handle incoming messages (optional - for future features)
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      // You can handle incoming messages here if needed
      // For now, we're just sending messages
    });
  }

  /**
   * Get QR code for a school
   * @param {string} schoolId - School identifier
   * @returns {string|null} QR code data URL
   */
  getQRCode(schoolId) {
    return this.qrCodes.get(schoolId) || null;
  }

  /**
   * Get connection status for a school
   * @param {string} schoolId - School identifier
   * @returns {string} Connection status
   */
  getConnectionStatus(schoolId) {
    return this.connectionStates.get(schoolId) || 'disconnected';
  }

  /**
   * Send message to a phone number
   * @param {string} schoolId - School identifier
   * @param {string} phoneNumber - Phone number in international format (e.g., 2348012345678)
   * @param {string} message - Message text
   * @returns {Promise<Object>} Send result
   */
  async sendMessage(schoolId, phoneNumber, message) {
    try {
      const sock = this.sockets.get(schoolId);
      const state = this.connectionStates.get(schoolId);

      if (!sock || state !== 'open') {
        throw new Error('WhatsApp not connected for this school');
      }

      // Format phone number for WhatsApp (add @s.whatsapp.net)
      const jid = `${phoneNumber}@s.whatsapp.net`;

      // Send message
      const result = await sock.sendMessage(jid, { text: message });

      console.log(`✅ Message sent to ${phoneNumber} for school ${schoolId}`);
      return {
        success: true,
        messageId: result.key.id,
        timestamp: result.messageTimestamp
      };
    } catch (error) {
      console.error(`❌ Failed to send message for ${schoolId}:`, error);
      throw error;
    }
  }

  /**
   * Send message with PDF attachment
   * @param {string} schoolId - School identifier
   * @param {string} phoneNumber - Phone number
   * @param {string} caption - Message caption
   * @param {Buffer} pdfBuffer - PDF file buffer
   * @param {string} filename - PDF filename
   * @returns {Promise<Object>} Send result
   */
  async sendMessageWithPDF(schoolId, phoneNumber, caption, pdfBuffer, filename) {
    try {
      const sock = this.sockets.get(schoolId);
      const state = this.connectionStates.get(schoolId);

      if (!sock || state !== 'open') {
        throw new Error('WhatsApp not connected for this school');
      }

      const jid = `${phoneNumber}@s.whatsapp.net`;

      // Send PDF document
      const result = await sock.sendMessage(jid, {
        document: pdfBuffer,
        mimetype: 'application/pdf',
        fileName: filename,
        caption: caption || ''
      });

      console.log(`✅ PDF sent to ${phoneNumber} for school ${schoolId}`);
      return {
        success: true,
        messageId: result.key.id,
        timestamp: result.messageTimestamp
      };
    } catch (error) {
      console.error(`❌ Failed to send PDF for ${schoolId}:`, error);
      throw error;
    }
  }

  /**
   * Disconnect WhatsApp for a school
   * @param {string} schoolId - School identifier
   */
  async disconnect(schoolId) {
    try {
      const sock = this.sockets.get(schoolId);

      if (sock) {
        await sock.logout();
        this.sockets.delete(schoolId);
        this.qrCodes.delete(schoolId);
        this.connectionStates.delete(schoolId);
        console.log(`✅ WhatsApp disconnected for school: ${schoolId}`);
      }
    } catch (error) {
      console.error(`❌ Failed to disconnect WhatsApp for ${schoolId}:`, error);
      throw error;
    }
  }

  /**
   * Clean up session files for a school
   * @param {string} schoolId - School identifier
   */
  async cleanupSession(schoolId) {
    try {
      await this.disconnect(schoolId);

      const sanitizedId = this.sanitizeSchoolId(schoolId);
      const authFolder = path.join(this.sessionPath, `school_${sanitizedId}`);

      if (fs.existsSync(authFolder)) {
        fs.rmSync(authFolder, { recursive: true, force: true });
        console.log(`✅ Session cleaned up for school: ${schoolId}`);
      }
    } catch (error) {
      console.error(`❌ Failed to cleanup session for ${schoolId}:`, error);
      throw error;
    }
  }

  /**
   * Get all active connections
   * @returns {Array} List of connected schools
   */
  getActiveConnections() {
    const connections = [];
    for (const [schoolId, state] of this.connectionStates.entries()) {
      connections.push({
        schoolId,
        status: state,
        hasQR: this.qrCodes.has(schoolId)
      });
    }
    return connections;
  }
}

// Export singleton instance
module.exports = new WhatsAppServiceBaileys();

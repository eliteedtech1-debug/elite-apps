const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const pino = require('pino');
const { EventEmitter } = require('events');
const path = require('path');

class BaileysWhatsAppService extends EventEmitter {
  constructor() {
    super();
    this.clients = new Map();
    this.qrCodes = new Map();
    this.initializingClients = new Map();
    this.authPath = path.join(process.cwd(), '.baileys_auth');

    console.log('📱 Baileys WhatsApp Service initialized (Low-memory mode)');
  }

  /**
   * Initialize WhatsApp client for a school
   * @param {string} schoolId - School identifier
   * @param {string} clientIdentifier - Optional client identifier (for display)
   * @param {boolean} waitForConnection - If false, returns immediately after QR generation (default: true)
   */
  async initializeClient(schoolId, clientIdentifier = null, waitForConnection = true) {
    // Check if already initializing
    if (this.initializingClients.has(schoolId)) {
      console.log(`🔄 WhatsApp client initialization already in progress for school ${schoolId}, waiting...`);
      return this.initializingClients.get(schoolId);
    }

    // Check if already initialized
    if (this.clients.has(schoolId)) {
      const sock = this.clients.get(schoolId);
      if (sock.user) {
        console.log(`✅ WhatsApp client already connected for school ${schoolId}`);
        return sock;
      }
    }

    // Create a promise that will be resolved when initialization completes
    let resolvePromise, rejectPromise;
    const initPromise = new Promise((resolve, reject) => {
      resolvePromise = resolve;
      rejectPromise = reject;
    });

    this.initializingClients.set(schoolId, initPromise);

    try {
      const sanitizedId = (clientIdentifier || schoolId).replace(/[^a-zA-Z0-9_-]/g, '_');
      // console.log(`🔄 Initializing Baileys WhatsApp client for school: ${schoolId} (identifier: ${clientIdentifier}, sanitized: ${sanitizedId})`);

      // Use multi-file auth state
      const authFolder = path.join(this.authPath, `session-school_${sanitizedId}`);
      const { state, saveCreds } = await useMultiFileAuthState(authFolder);

      // Get latest Baileys version for compatibility
      const { version } = await fetchLatestBaileysVersion();

      // Create WhatsApp socket
      const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }), // Silent logging for production
        browser: ['Elite School System', 'Chrome', '1.0.0'],
        defaultQueryTimeoutMs: 30000, // Reduced timeout to make connection more responsive
        connectTimeoutMs: 30000, // Reduced timeout
        keepAliveIntervalMs: 30000,
        getMessage: async (key) => {
          // Return undefined for messages we don't have cached
          return undefined;
        }
      });

      // Track QR generation count
      let qrGenerationCount = 0;
      const maxQRGenerations = 5;
      const maxQRRegenerations = 10; // Absolute limit before forcing disconnect

      // Handle credentials update
      sock.ev.on('creds.update', saveCreds);

      // Handle connection updates
      sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          qrGenerationCount++;

          // Check if QR regeneration limit exceeded - force disconnect
          if (qrGenerationCount > maxQRRegenerations) {
            console.error(`❌ QR code regeneration limit exceeded for school ${schoolId} (${qrGenerationCount} attempts). Forcing disconnect to prevent infinite loop.`);

            try {
              await sock.end();
            } catch (err) {
              console.error(`⚠️ Error ending socket after QR limit:`, err.message);
            }

            // Clean up
            this.clients.delete(schoolId);
            this.qrCodes.delete(schoolId);
            this.initializingClients.delete(schoolId);

            // Reject initialization
            if (rejectPromise) {
              rejectPromise(new Error(`QR code regenerated too many times (${qrGenerationCount}). Please try reconnecting.`));
            }

            return;
          }

          // Only log for first few generations to avoid spam
          if (qrGenerationCount <= maxQRGenerations) {
            console.log(`📱 QR Code generated for school: ${schoolId} (attempt ${qrGenerationCount})`);
          } else if (qrGenerationCount === maxQRGenerations + 1) {
            console.log(`📱 QR Code continues to regenerate for school: ${schoolId} - further logs suppressed`);
          }

          try {
            // Generate QR code as data URL
            const qrDataUrl = await QRCode.toDataURL(qr);

            // Check if QR code has changed
            const existingQR = this.qrCodes.get(schoolId);
            if (!existingQR || existingQR.qr !== qr) {
              this.qrCodes.set(schoolId, {
                qr: qr,
                qrDataUrl: qrDataUrl,
                timestamp: Date.now(),
                attempt: qrGenerationCount
              });

              // Emit event for real-time updates
              this.emit('qr', { schoolId, qrDataUrl, attempt: qrGenerationCount });

              if (qrGenerationCount <= maxQRGenerations) {
                console.log(`✅ New QR code stored for school: ${schoolId}`);
              }
            }
          } catch (err) {
            console.error('❌ Error generating QR code:', err);
          }

          // If not waiting for connection, resolve immediately after first QR generation
          if (!waitForConnection && qrGenerationCount === 1) {
            console.log(`✅ Resolving immediately after QR generation for school: ${schoolId}`);
            if (resolvePromise) {
              resolvePromise({ qrGenerated: true, sock });
              this.initializingClients.delete(schoolId);
            }
          }
        }

        if (connection === 'close') {
          const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
          const statusCode = lastDisconnect?.error?.output?.statusCode;

          console.log(`❌ Connection closed for school ${schoolId}, status: ${statusCode}, reconnecting: ${shouldReconnect}`);

          // Clean up in-memory state
          this.clients.delete(schoolId);
          this.initializingClients.delete(schoolId);

          if (shouldReconnect) {
            // Auto-reconnect after a delay
            setTimeout(() => {
              console.log(`🔄 Attempting to reconnect WhatsApp for school: ${schoolId}`);
              this.initializeClient(schoolId, clientIdentifier, waitForConnection).catch(err => {
                console.error(`❌ Reconnection failed for ${schoolId}:`, err.message);
              });
            }, 5000);
          } else {
            // User logged out - delete session files to allow fresh connection
            console.log(`🔌 User logged out, cleaning up session for school: ${schoolId}`);
            this.qrCodes.delete(schoolId);
            await this.deleteSessionFiles(schoolId);
            this.emit('disconnected', { schoolId, reason: 'logged_out' });
          }

          // Reject the initialization promise if connection failed and we were waiting for it
          if (rejectPromise && waitForConnection) {
            rejectPromise(new Error(`Connection closed: ${statusCode}`));
          }
          // Clean up the initializing clients map regardless
          this.initializingClients.delete(schoolId);

        } else if (connection === 'open') {
          console.log(`✅ WhatsApp connected for school: ${schoolId}`);
          console.log(`📞 Connected number: ${sock.user?.id}`);

          // Clear QR code
          this.qrCodes.delete(schoolId);
          qrGenerationCount = 0;

          // Emit events
          this.emit('authenticated', { schoolId });
          this.emit('ready', { schoolId });

          // Store the connected client
          this.clients.set(schoolId, sock);

          // Resolve the initialization promise
          if (resolvePromise) {
            resolvePromise(sock);
            // Clean up the initializing clients map
            this.initializingClients.delete(schoolId);
          }
        } else if (connection === 'connecting') {
          console.log(`🔄 Connecting WhatsApp for school: ${schoolId}...`);
        }
      });

      // Handle incoming messages
      sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type === 'notify') {
          for (const msg of messages) {
            if (!msg.key.fromMe && msg.message) {
              console.log(`📨 New message from ${msg.key.remoteJid} for school ${schoolId}`);
              this.emit('message', { schoolId, message: msg });
            }
          }
        }
      });

      // Store client
      this.clients.set(schoolId, sock);

      // If not waiting for connection, return immediately after setting up the socket
      if (!waitForConnection) {
        console.log(`✅ Returning immediately after setup for school: ${schoolId}`);
        return { qrGenerated: true, sock };
      }

      // Wait for connection to be established or return socket if already connected
      if (sock.user) {
        // Already connected, resolve immediately
        resolvePromise(sock);
        this.initializingClients.delete(schoolId);
        return sock;
      }

      // Add timeout to prevent infinite waiting for QR scan
      const initTimeout = 45000; // 45 seconds timeout for initial connection (reduced from 60)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(async () => {
          // Clean up on timeout
          console.log(`⏱️ WhatsApp initialization timed out for school ${schoolId}, cleaning up...`);

          try {
            // End the socket connection
            if (sock) {
              await sock.end();
            }
          } catch (err) {
            console.error(`⚠️ Error ending socket on timeout:`, err.message);
          }

          // Clean up maps
          this.clients.delete(schoolId);
          this.qrCodes.delete(schoolId);
          this.initializingClients.delete(schoolId);

          reject(new Error(`WhatsApp initialization timed out after ${initTimeout/1000} seconds. Please scan the QR code within the time limit.`));
        }, initTimeout);
      });

      // Only use timeout when waiting for connection
      if (waitForConnection) {
        return Promise.race([initPromise, timeoutPromise]);
      } else {
        // When not waiting for connection, just return the setup result
        return { qrGenerated: true, sock };
      }

    } catch (error) {
      console.error(`❌ Error initializing Baileys for ${schoolId}:`, error);
      this.initializingClients.delete(schoolId);

      if (rejectPromise) {
        rejectPromise(error);
      }

      throw error;
    }
  }

  /**
   * Send WhatsApp message
   * @param {string} schoolId - School identifier
   * @param {string} phoneNumber - Phone number (with country code)
   * @param {string} message - Message text
   */
  async sendMessage(schoolId, phoneNumber, message) {
    const sock = this.clients.get(schoolId);
    if (!sock) {
      throw new Error('WhatsApp not connected for this school');
    }

    // Format phone number (must include country code, e.g., 234801234567)
    let formattedNumber = phoneNumber.replace(/[^0-9]/g, '');
    // Add Nigeria country code if starts with 0
    if (formattedNumber.startsWith('0')) {
      formattedNumber = '234' + formattedNumber.substring(1);
    }
    const jid = `${formattedNumber}@s.whatsapp.net`;

    try {
      await sock.sendMessage(jid, { text: message });
      console.log(`✅ Message sent to ${phoneNumber} from school ${schoolId}`);
      return { success: true, phone: phoneNumber };
    } catch (error) {
      console.error(`❌ Failed to send message to ${phoneNumber}:`, error);
      throw error;
    }
  }

  /**
   * Send WhatsApp message with PDF attachment
   * @param {string} schoolId - School identifier
   * @param {string} phoneNumber - Phone number (with country code)
   * @param {string} message - Message text
   * @param {Buffer} pdfBuffer - PDF file buffer
   * @param {string} filename - PDF filename
   */
  async sendMessageWithPDF(schoolId, phoneNumber, message, pdfBuffer, filename) {
    const sock = this.clients.get(schoolId);
    if (!sock) {
      throw new Error('WhatsApp not connected for this school');
    }

    if (!sock.user) {
      throw new Error('WhatsApp not authenticated for this school');
    }

    const formattedNumber = phoneNumber.replace(/[^0-9]/g, '');
    const jid = `${formattedNumber}@s.whatsapp.net`;

    try {
      await sock.sendMessage(jid, {
        document: pdfBuffer,
        mimetype: 'application/pdf',
        fileName: filename || 'document.pdf',
        caption: message
      });

      console.log(`✅ Message with PDF sent to ${phoneNumber} from school ${schoolId}`);
      return { success: true, phone: phoneNumber };
    } catch (error) {
      console.error(`❌ Failed to send message with PDF to ${phoneNumber}:`, error);
      throw error;
    }
  }

  /**
   * Send bulk messages
   * @param {string} schoolId - School identifier
   * @param {Array} recipients - Array of {phone, message}
   */
  async sendBulkMessages(schoolId, recipients) {
    const results = {
      totalSent: 0,
      totalFailed: 0,
      successful: [],
      failed: []
    };

    for (const recipient of recipients) {
      try {
        const phone = recipient.phone || recipient.msidn;
        const message = recipient.message;

        await this.sendMessage(schoolId, phone, message);

        results.totalSent++;
        results.successful.push({ phone, status: 'sent' });

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        results.totalFailed++;
        results.failed.push({
          phone: recipient.phone,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Get QR code for a school
   * @param {string} schoolId - School identifier
   */
  getQRCode(schoolId) {
    return this.qrCodes.get(schoolId);
  }

  /**
   * Get client status
   * @param {string} schoolId - School identifier
   */
  async getClientStatus(schoolId) {
    const sock = this.clients.get(schoolId);

    if (!sock) {
      return 'NOT_INITIALIZED';
    }

    if (sock.user) {
      return 'CONNECTED';
    }

    if (this.qrCodes.has(schoolId)) {
      return 'QR_READY';
    }

    return 'INITIALIZING';
  }

  /**
   * Get connected phone number
   * @param {string} schoolId - School identifier
   */
  async getConnectedNumber(schoolId) {
    const sock = this.clients.get(schoolId);

    if (!sock || !sock.user) {
      return null;
    }

    return sock.user.id.split(':')[0];
  }

  /**
   * Check if school is connected
   * @param {string} schoolId - School identifier
   */
  async isConnected(schoolId) {
    const status = await this.getClientStatus(schoolId);
    return status === 'CONNECTED';
  }

  /**
   * Disconnect WhatsApp for a school
   * @param {string} schoolId - School identifier
   */
  async disconnect(schoolId) {
    const sock = this.clients.get(schoolId);

    if (sock) {
      try {
        // Use end() instead of logout() to properly disconnect the socket
        await sock.end();
        console.log(`🔌 Disconnected WhatsApp for school: ${schoolId}`);
      } catch (error) {
        console.error(`⚠️ Error during disconnection for ${schoolId}:`, error.message);
      }
    }

    // Clean up in-memory state
    this.clients.delete(schoolId);
    this.qrCodes.delete(schoolId);
    this.initializingClients.delete(schoolId);
    
    // Delete session files to allow fresh connection
    await this.deleteSessionFiles(schoolId);
    
    this.emit('disconnected', { schoolId, reason: 'manual_disconnect' });
  }

  /**
   * Delete session files for a school
   * @param {string} schoolId - School identifier
   */
  async deleteSessionFiles(schoolId) {
    try {
      const sessionDir = path.join(this.authPath, schoolId);
      
      if (fs.existsSync(sessionDir)) {
        console.log(`🗑️ Deleting session files for school: ${schoolId}`);
        fs.rmSync(sessionDir, { recursive: true, force: true });
        console.log(`✅ Session files deleted for school: ${schoolId}`);
      }
    } catch (error) {
      console.error(`⚠️ Error deleting session files for ${schoolId}:`, error.message);
    }
  }

  /**
   * Clean up stuck or inactive WhatsApp sessions
   * @param {string} schoolId - School identifier (optional, cleans all if not provided)
   */
  async cleanupSessions(schoolId = null) {
    try {
      if (schoolId) {
        console.log(`🧹 Cleaning up WhatsApp session for school: ${schoolId}`);
        await this.disconnect(schoolId);
        console.log(`✅ Session cleaned up for school: ${schoolId}`);
      } else {
        console.log(`🧹 Cleaning up all WhatsApp sessions`);
        const schoolIds = Array.from(this.clients.keys());

        for (const sid of schoolIds) {
          try {
            await this.disconnect(sid);
          } catch (err) {
            console.error(`⚠️ Error cleaning up session for ${sid}:`, err.message);
          }
        }

        console.log(`✅ All sessions cleaned up`);
      }
    } catch (error) {
      console.error('❌ Error during session cleanup:', error);
      throw error;
    }
  }

  /**
   * Get all active connections
   */
  getActiveConnections() {
    const connections = [];

    for (const [schoolId, sock] of this.clients.entries()) {
      connections.push({
        schoolId,
        connected: !!sock.user,
        phoneNumber: sock.user ? sock.user.id.split(':')[0] : null
      });
    }

    return connections;
  }
}

// Singleton instance
const baileysWhatsappService = new BaileysWhatsAppService();

module.exports = baileysWhatsappService;

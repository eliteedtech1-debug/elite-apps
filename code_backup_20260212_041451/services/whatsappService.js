const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const EventEmitter = require('events');
const path = require('path');
const fs = require('fs');

class WhatsAppService extends EventEmitter {
  constructor() {
    super();
    this.clients = new Map(); // Store multiple school WhatsApp clients
    this.qrCodes = new Map(); // Store QR codes for scanning
    this.initializingClients = new Map(); // Track initialization in progress to prevent race conditions
    this.sessionPath = path.join(__dirname, '../../.wwebjs_auth');

    // Ensure session directory exists
    if (!fs.existsSync(this.sessionPath)) {
      fs.mkdirSync(this.sessionPath, { recursive: true });
    }
  }

  /**
   * Set up heartbeat mechanism to maintain connection stability
   * @param {Client} client - WhatsApp client
   * @param {string} schoolId - School identifier
   */
  setupHeartbeat(client, schoolId) {
    let heartbeatInterval;

    const startHeartbeat = () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }

      // Send a simple ping every 30 seconds to maintain connection
      heartbeatInterval = setInterval(async () => {
        try {
          // Check if client is still valid
          if (!client.pupBrowser || !client.pupBrowser.isConnected()) {
            console.log(`⚠️ Browser connection lost for school ${schoolId}, attempting reconnection`);
            clearInterval(heartbeatInterval);
            return;
          }

          // Simple ping to keep connection alive
          await client.getState();
          console.log(`💓 Heartbeat ping successful for school ${schoolId}`);
        } catch (error) {
          console.log(`⚠️ Heartbeat failed for school ${schoolId}:`, error.message);

          // If heartbeat fails, try to reinitialize
          try {
            await client.destroy();
            await client.initialize();
            console.log(`✅ Heartbeat reinitialized for school ${schoolId}`);
          } catch (reinitError) {
            console.error(`❌ Failed to reinitialize client ${schoolId}:`, reinitError.message);
          }
        }
      }, 30000); // 30 seconds
    };

    // Start heartbeat when client is ready
    client.on('ready', () => {
      console.log(` heartbeat started for school ${schoolId}`);
      startHeartbeat();
    });

    // Stop heartbeat when disconnected
    client.on('disconnected', () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        console.log(` heartbeat stopped for school ${schoolId}`);
      }
    });
  }

  /**
   * Sanitize school ID to be safe for use as clientId
   * Only alphanumeric characters, underscores and hyphens are allowed
   * @param {string} schoolId - Original school ID
   * @returns {string} Sanitized school ID
   */
  sanitizeSchoolId(schoolId) {
    // Replace forward slashes, spaces, and other special chars with underscores
    return schoolId.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  /**
   * Initialize WhatsApp client for a school
   * @param {string} schoolId - School identifier (for storage key)
   * @param {string} clientIdentifier - Client identifier (short_name or school_id, for clientId)
   * @returns {Client} WhatsApp client instance
   */
  async initializeClient(schoolId, clientIdentifier = null) {
    try {
      // Use clientIdentifier if provided, otherwise use schoolId
      const identifier = clientIdentifier || schoolId;

      // Sanitize identifier for use as clientId
      const sanitizedId = this.sanitizeSchoolId(identifier);

      // Check if client already exists and is valid
      if (this.clients.has(schoolId)) {
        const existingClient = this.clients.get(schoolId);
        
        try {
          // Check if the client is still valid before calling getState
          if (existingClient.pupBrowser && !existingClient.pupBrowser.isConnected()) {
            // Browser is not connected, remove client
            console.log(`⚠️ Client browser is not connected for school ${schoolId}, removing from cache`);
            this.clients.delete(schoolId);
          } else if (existingClient.pupPage && (!existingClient.pupPage.evaluate || existingClient.pupPage.isClosed())) {
            // Page is closed or evaluate method doesn't exist, remove client
            console.log(`⚠️ Client page is closed or evaluate method is not available for school ${schoolId}, removing from cache`);
            this.clients.delete(schoolId);
          } else {
            const state = await existingClient.getState();
            
            if (state === 'CONNECTED') {
              console.log(`✅ WhatsApp client for school ${schoolId} already connected`);
              return existingClient;
            }
          }
        } catch (error) {
          // If getState fails, the client is likely in an invalid state
          console.log(`⚠️ Existing client for school ${schoolId} is in invalid state, removing from cache:`, error.message);
          this.clients.delete(schoolId);
        }
      }

      // Check if initialization is already in progress for this school
      if (this.initializingClients.has(schoolId)) {
        console.log(`🔄 WhatsApp client initialization already in progress for school ${schoolId}, waiting...`);
        // Wait for the existing initialization to complete
        return await this.initializingClients.get(schoolId);
      }

      console.log(`🔄 Initializing WhatsApp client for school: ${schoolId} (identifier: ${identifier}, sanitized: ${sanitizedId})`);

      // Mark that initialization is in progress
      let resolvePromise, rejectPromise;
      const initializationPromise = new Promise((resolve, reject) => {
        resolvePromise = resolve;
        rejectPromise = reject;
      });
      
      this.initializingClients.set(schoolId, initializationPromise);

      try {
        const client = new Client({
          authStrategy: new LocalAuth({
            clientId: `school_${sanitizedId}`,
            dataPath: this.sessionPath
          }),
          puppeteer: {
            headless: true,
            args: [
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--disable-dev-shm-usage',
              '--disable-gpu',
              '--disable-software-rasterizer',
              '--disable-extensions',
              '--no-first-run',
              '--no-zygote',
              '--single-process', // Run in single process to save memory
              '--disable-background-networking',
              '--disable-default-apps',
              '--disable-sync',
              '--disable-translate',
              '--hide-scrollbars',
              '--metrics-recording-only',
              '--mute-audio',
              '--no-first-run',
              '--safebrowsing-disable-auto-update',
              '--ignore-certificate-errors',
              '--ignore-ssl-errors',
              '--ignore-certificate-errors-spki-list',
              '--disable-web-security',
              '--disable-features=VizDisplayCompositor',
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--disable-dev-shm-usage',
              '--disable-accelerated-2d-canvas',
              '--no-first-run',
              '--no-zygote',
              '--disable-gpu',
              '--disable-webgl',
              '--disable-threaded-animation',
              '--disable-threaded-scrolling',
              '--disable-in-process-stack-traces',
              '--disable-logging',
              '--disable-background-timer-throttling',
              '--disable-renderer-backgrounding',
              '--disable-ipc-flooding-protection',
              '--disable-backgrounding-occluded-windows',
              '--disable-restore-session-state',
              '--disable-session-crashed-bubble',
              '--disable-crash-reporter',
              '--no-default-browser-check',
              '--disable-extensions-http-throttling',
              '--disable-ipc-flooding-protection',
              '--memory-pressure-off',
              '--max_old_space_size=4096',
            ],
            executablePath: '/usr/bin/chromium-browser',
            timeout: 120000, // Increased timeout to 2 minutes
            handleSIGINT: false,
            handleSIGTERM: false,
            handleSIGHUP: false,
          },
          // Additional connection settings to handle low connectivity
          takeoverOnConflict: true,
          takeoverTimeoutMs: 60000,
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.67 Safari/537.36',
          authTimeoutMs: 60000, // Authentication timeout
          qrMaxRetries: 3, // Limit QR retries
          chromiumArgs: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-first-run',
            '--no-zygote',
            '--disable-extensions',
            '--disable-plugins',
            '--disable-translate',
            '--disable-voice-input',
            '--no-default-browser-check',
            '--no-first-run',
            '--disable-default-apps',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-webgl',
            '--disable-threaded-animation',
            '--disable-threaded-scrolling',
            '--disable-in-process-stack-traces',
            '--disable-logging',
            '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding',
            '--disable-ipc-flooding-protection',
            '--disable-backgrounding-occluded-windows',
            '--disable-restore-session-state',
            '--disable-session-crashed-bubble',
            '--disable-crash-reporter',
            '--no-default-browser-check',
            '--disable-extensions-http-throttling',
            '--disable-ipc-flooding-protection',
            '--memory-pressure-off',
            '--max_old_space_size=4096',
          ]
        });

        // QR Code generation with prevention of QR code regeneration loops
        let qrGenerationCount = 0;
        let lastQRTime = 0;
        const minQRTimeGap = 30000; // Prevent QR regenerations within 30 seconds
        const maxQRGenerations = 3; // Limit to 3 QR generations before pausing

        client.on('qr', async (qr) => {
          const currentTime = Date.now();
          qrGenerationCount++;

          // Only proceed if enough time has passed since the last QR
          if (currentTime - lastQRTime < minQRTimeGap) {
            console.log(`⏰ Skipping QR code generation for school ${schoolId} - too frequent (${qrGenerationCount})`);
            return;
          }

          lastQRTime = currentTime;

          // Only log for first few generations to avoid spam
          if (qrGenerationCount <= maxQRGenerations) {
            console.log(`📱 QR Code generated for school: ${schoolId} (attempt ${qrGenerationCount})`);
          } else if (qrGenerationCount === maxQRGenerations + 1) {
            console.log(`📱 QR Code continues to regenerate for school: ${schoolId} - further logs suppressed`);
          }

          try {
            // Generate QR code as data URL
            const qrDataUrl = await qrcode.toDataURL(qr);

            // Check if QR code has changed (to avoid unnecessary updates)
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

              // Resolve immediately after QR generation for faster feedback
              console.log(`✅ Resolving immediately after QR generation for school: ${schoolId}`);
              this.emit('qr_resolved', { schoolId });
            }
          } catch (err) {
            console.error('❌ Error generating QR code:', err);
          }

          // If too many QR attempts, pause and suggest user to check connection
          if (qrGenerationCount > maxQRGenerations) {
            console.log(`⚠️  Too many QR attempts for school ${schoolId}. Consider restarting or checking connection.`);
          }
        });

        // Authentication success
        client.on('authenticated', () => {
          console.log(`✅ WhatsApp authenticated for school: ${schoolId}`);
          this.qrCodes.delete(schoolId); // Clear QR code
          qrGenerationCount = 0; // Reset QR generation count
          this.emit('authenticated', { schoolId });
        });

        // Ready to use
        client.on('ready', () => {
          console.log(`✅ WhatsApp client ready for school: ${schoolId}`);
          this.qrCodes.delete(schoolId); // Ensure QR code is cleared
          this.emit('ready', { schoolId });
        });

        // Authentication failure
        client.on('auth_failure', (msg) => {
          console.error(`❌ Authentication failed for school ${schoolId}:`, msg);
          this.qrCodes.delete(schoolId); // Clear QR code on failure
          this.emit('auth_failure', { schoolId, error: msg });

          // Clean up the failed client
          this.clients.delete(schoolId);
        });

        // Loading screen (shows connection progress)
        client.on('loading_screen', (percent, message) => {
          if (percent % 20 === 0) { // Log every 20% to avoid spam
            console.log(`🔄 WhatsApp loading for school ${schoolId}: ${percent}% - ${message}`);
          }
        });

        // Disconnection
        client.on('disconnected', (reason) => {
          console.log(`⚠️ WhatsApp disconnected for school ${schoolId}:`, reason);
          this.clients.delete(schoolId);
          this.emit('disconnected', { schoolId, reason });
        });

        // Store client before initialization to prevent duplicate attempts
        this.clients.set(schoolId, client);

        // Add reconnection handling
        let reconnectAttempts = 0;
        const maxReconnectAttempts = 3;

        client.on('disconnected', async (reason) => {
          console.log(`⚠️ WhatsApp disconnected for school ${schoolId}:`, reason);

          // Attempt to reconnect if not explicitly disconnected
          if (reason !== 'NAVIGATION' && reconnectAttempts < maxReconnectAttempts) {
            console.log(`🔄 Attempting to reconnect for school ${schoolId} (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`);
            reconnectAttempts++;

            // Wait before reconnecting (exponential backoff)
            const waitTime = Math.min(30000, 5000 * Math.pow(2, reconnectAttempts)); // 5s, 10s, 20s, max 30s
            console.log(`⏳ Waiting ${waitTime/1000}s before reconnecting for school ${schoolId}`);

            await new Promise(resolve => setTimeout(resolve, waitTime));

            try {
              // Reinitialize the client
              await client.initialize();
              console.log(`✅ Reconnected successfully for school ${schoolId}`);
              reconnectAttempts = 0; // Reset on successful reconnection
            } catch (reconnectError) {
              console.error(`❌ Reconnection failed for school ${schoolId}:`, reconnectError.message);

              if (reconnectAttempts >= maxReconnectAttempts) {
                console.log(`❌ Max reconnection attempts reached for school ${schoolId}, removing client`);
                this.clients.delete(schoolId);
              }
            }
          } else {
            this.clients.delete(schoolId);
            this.emit('disconnected', { schoolId, reason });
          }
        });

        try {
          // Initialize client with timeout wrapper
          const initTimeout = 60000; // Increased timeout to 1 minute
          const initPromise = client.initialize();

          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
              reject(new Error(`WhatsApp initialization timed out after ${initTimeout/1000} seconds`));
            }, initTimeout);
          });

          // Race between initialization and timeout
          await Promise.race([initPromise, timeoutPromise]);

          console.log(`✅ WhatsApp client initialized for school: ${schoolId}`);

          // Add a small delay to let events stabilize
          await new Promise(resolve => setTimeout(resolve, 2000));

          // Verify browser and page are available after initialization
          if (!client.pupBrowser || !client.pupBrowser.isConnected()) {
            throw new Error('Browser is not properly connected after initialization');
          }

          if (!client.pupPage || !client.pupPage.evaluate || client.pupPage.isClosed()) {
            throw new Error('Browser page is not properly available after initialization');
          }

          // Set up a heartbeat mechanism to maintain connection stability
          this.setupHeartbeat(client, schoolId);
        } catch (initError) {
          // If initialization fails, remove the client from the map and re-throw
          console.error(`❌ Error during client initialization for ${schoolId}:`, initError.message);

          // Clean up the failed client
          this.clients.delete(schoolId);

          // Try to destroy the client if it exists
          try {
            if (client && client.pupBrowser) {
              await client.destroy();
            }
          } catch (destroyErr) {
            console.error(`⚠️ Error destroying failed client:`, destroyErr.message);
          }

          throw initError;
        }

        // Resolve the promise with the client
        resolvePromise(client);
        return client;
      } catch (error) {
        // If there's an error during setup, reject the promise
        rejectPromise(error);
        throw error;
      } finally {
        // Remove the initialization promise regardless of success/failure
        this.initializingClients.delete(schoolId);
      }
    } catch (error) {
      console.error(`❌ Error initializing WhatsApp client for school ${schoolId}:`, error);
      // Make sure to remove from initialization tracking in case of error
      this.initializingClients.delete(schoolId);
      throw error;
    }
  }

  /**
   * Get QR code for school
   * @param {string} schoolId - School identifier
   * @returns {Object} QR code data
   */
  getQRCode(schoolId) {
    return this.qrCodes.get(schoolId);
  }

  /**
   * Get client status
   * @param {string} schoolId - School identifier
   * @returns {string} Connection status
   */
  async getClientStatus(schoolId) {
    try {
      const client = this.clients.get(schoolId);

      if (!client) {
        return 'NOT_INITIALIZED';
      }

      // Check if the client is still valid before calling getState
      if (!client.pupBrowser) {
        console.log(`⚠️ Client browser is not available for school ${schoolId}, removing from cache`);
        this.clients.delete(schoolId);
        return 'NOT_INITIALIZED';
      }

      if (!client.pupBrowser.isConnected()) {
        console.log(`⚠️ Client browser is not connected for school ${schoolId}, removing from cache`);
        this.clients.delete(schoolId);
        return 'NOT_INITIALIZED';
      }

      if (!client.pupPage) {
        console.log(`⚠️ Client page is not available for school ${schoolId}, removing from cache`);
        this.clients.delete(schoolId);
        return 'NOT_INITIALIZED';
      }

      if (client.pupPage.isClosed()) {
        console.log(`⚠️ Client page is closed for school ${schoolId}, removing from cache`);
        this.clients.delete(schoolId);
        return 'NOT_INITIALIZED';
      }

      // Add timeout to getState to avoid hanging in low connectivity
      const getStateWithTimeout = async (timeoutMs = 10000) => {
        return Promise.race([
          client.getState(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('getState timed out')), timeoutMs)
          )
        ]);
      };

      const state = await getStateWithTimeout();
      return state; // CONNECTED, OPENING, CONFLICT, UNPAIRED, etc.
    } catch (error) {
      console.error('❌ Error getting client status:', error.message);
      // If getState fails, the client is likely in an invalid state
      this.clients.delete(schoolId);
      return 'ERROR';
    }
  }

  /**
   * Get connected phone number
   * @param {string} schoolId - School identifier
   * @returns {string} Phone number
   */
  async getConnectedNumber(schoolId) {
    try {
      const client = this.clients.get(schoolId);

      if (!client) {
        throw new Error('Client not initialized');
      }

      // Check if the client is still valid before calling getState
      if (!client.pupBrowser || !client.pupBrowser.isConnected()) {
        console.log(`⚠️ Client browser is not connected for school ${schoolId}, removing from cache`);
        this.clients.delete(schoolId);
        throw new Error('Client not connected');
      } else if (!client.pupPage || (!client.pupPage.evaluate || client.pupPage.isClosed())) {
        console.log(`⚠️ Client page is closed or evaluate method is not available for school ${schoolId}, removing from cache`);
        this.clients.delete(schoolId);
        throw new Error('Client not connected');
      }

      const state = await client.getState();
      if (state !== 'CONNECTED') {
        throw new Error('Client not connected');
      }

      const info = client.info;
      return info.wid.user; // Phone number
    } catch (error) {
      console.error('❌ Error getting connected number:', error);
      // If getState fails, the client is likely in an invalid state
      if (error.message.includes('evaluate')) {
        this.clients.delete(schoolId);
      }
      throw error;
    }
  }

  /**
   * Send WhatsApp message
   * @param {string} schoolId - School identifier
   * @param {string} phoneNumber - Recipient phone number
   * @param {string} message - Message text
   * @returns {Object} Send result
   */
  async sendMessage(schoolId, phoneNumber, message) {
    try {
      const client = this.clients.get(schoolId);

      if (!client) {
        throw new Error('WhatsApp not connected. Please scan QR code first.');
      }

      // Check if the client is still valid before calling getState
      if (!client.pupBrowser || !client.pupBrowser.isConnected()) {
        console.log(`⚠️ Client browser is not connected for school ${schoolId}, removing from cache`);
        this.clients.delete(schoolId);
        throw new Error('WhatsApp not connected. Please scan QR code first.');
      } else if (!client.pupPage || (!client.pupPage.evaluate || client.pupPage.isClosed())) {
        console.log(`⚠️ Client page is closed or evaluate method is not available for school ${schoolId}, removing from cache`);
        this.clients.delete(schoolId);
        throw new Error('WhatsApp not connected. Please scan QR code first.');
      }

      const state = await client.getState();
      if (state !== 'CONNECTED') {
        throw new Error(`WhatsApp not connected. Current state: ${state}`);
      }

      // Format phone number (WhatsApp format: country code + number + @c.us)
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      const chatId = `${formattedNumber}@c.us`;

      // Check if number is registered on WhatsApp
      const isRegistered = await client.isRegisteredUser(chatId);

      if (!isRegistered) {
        throw new Error(`Phone number ${phoneNumber} is not registered on WhatsApp`);
      }

      // Send message
      const sentMessage = await client.sendMessage(chatId, message);

      console.log(`✅ WhatsApp message sent to ${phoneNumber} from school ${schoolId}`);

      return {
        success: true,
        messageId: sentMessage.id.id,
        timestamp: sentMessage.timestamp,
        recipient: phoneNumber
      };
    } catch (error) {
      console.error('❌ Error sending WhatsApp message:', error);
      throw error;
    }
  }

  /**
   * Send WhatsApp message with PDF attachment
   * @param {string} schoolId - School identifier
   * @param {string} phoneNumber - Recipient phone number
   * @param {string} message - Message text
   * @param {Buffer} pdfBuffer - PDF file as buffer
   * @param {string} filename - PDF filename
   * @returns {Object} Send result
   */
  async sendMessageWithPDF(schoolId, phoneNumber, message, pdfBuffer, filename) {
    try {
      const client = this.clients.get(schoolId);

      if (!client) {
        throw new Error('WhatsApp not connected. Please scan QR code first.');
      }

      // Check if the client is still valid before calling getState
      if (!client.pupBrowser || !client.pupBrowser.isConnected()) {
        console.log(`⚠️ Client browser is not connected for school ${schoolId}, removing from cache`);
        this.clients.delete(schoolId);
        throw new Error('WhatsApp not connected. Please scan QR code first.');
      } else if (!client.pupPage || (!client.pupPage.evaluate || client.pupPage.isClosed())) {
        console.log(`⚠️ Client page is closed or evaluate method is not available for school ${schoolId}, removing from cache`);
        this.clients.delete(schoolId);
        throw new Error('WhatsApp not connected. Please scan QR code first.');
      }

      const state = await client.getState();
      if (state !== 'CONNECTED') {
        throw new Error(`WhatsApp not connected. Current state: ${state}`);
      }

      // Format phone number (WhatsApp format: country code + number + @c.us)
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      const chatId = `${formattedNumber}@c.us`;

      // Check if number is registered on WhatsApp
      const isRegistered = await client.isRegisteredUser(chatId);

      if (!isRegistered) {
        throw new Error(`Phone number ${phoneNumber} is not registered on WhatsApp`);
      }

      // Create media from buffer
      const base64Data = pdfBuffer.toString('base64');

      // ✅ Verify base64 data before creating MessageMedia
      console.log(`📊 Creating MessageMedia with ${base64Data.length} characters of base64 data`);
      console.log(`📁 MIME type: application/pdf, Filename: ${filename}`);

      const media = new MessageMedia('application/pdf', base64Data, filename);

      // ✅ Verify MessageMedia object
      console.log(`📎 MessageMedia created:`, {
        mimetype: media.mimetype,
        filename: media.filename,
        dataLength: media.data?.length || 0
      });

      // Send message with PDF attachment
      console.log(`📤 Sending message to ${chatId}...`);
      const sentMessage = await client.sendMessage(chatId, media, { caption: message });
      console.log(`✅ Message sent successfully!`);

      console.log(`✅ WhatsApp message with PDF sent to ${phoneNumber} from school ${schoolId}`);

      return {
        success: true,
        messageId: sentMessage.id.id,
        timestamp: sentMessage.timestamp,
        recipient: phoneNumber,
        hasMedia: true
      };
    } catch (error) {
      console.error('❌ Error sending WhatsApp message with PDF:', error);
      throw error;
    }
  }

  /**
   * Send bulk WhatsApp messages
   * @param {string} schoolId - School identifier
   * @param {Array} recipients - Array of {phone, message} objects
   * @returns {Object} Send results
   */
  async sendBulkMessages(schoolId, recipients) {
    const results = {
      successful: [],
      failed: [],
      totalSent: 0,
      totalFailed: 0
    };

    for (const recipient of recipients) {
      try {
        const result = await this.sendMessage(
          schoolId,
          recipient.phone,
          recipient.message
        );

        results.successful.push({
          phone: recipient.phone,
          messageId: result.messageId
        });
        results.totalSent++;

        // Add delay between messages to avoid rate limiting
        await this.delay(1000); // 1 second delay
      } catch (error) {
        results.failed.push({
          phone: recipient.phone,
          error: error.message
        });
        results.totalFailed++;
      }
    }

    return results;
  }

  /**
   * Disconnect WhatsApp client
   * @param {string} schoolId - School identifier
   */
  async disconnect(schoolId) {
    try {
      const client = this.clients.get(schoolId);

      if (client) {
        try {
          // Check if the client browser is still available before destroying
          if (client.pupBrowser && client.pupBrowser.isConnected()) {
            await client.destroy();
          } else if (client.pupPage && client.pupPage.evaluate && !client.pupPage.isClosed()) {
            await client.destroy();
          }
        } catch (destroyError) {
          console.log(`⚠️ Error destroying client for school ${schoolId}:`, destroyError.message);
          // Continue with cleanup even if destroy fails
        }
        this.clients.delete(schoolId);
        this.qrCodes.delete(schoolId);
        console.log(`✅ WhatsApp disconnected for school: ${schoolId}`);
      }
    } catch (error) {
      console.error('❌ Error disconnecting WhatsApp:', error);
      throw error;
    }
  }

  /**
   * Format phone number to WhatsApp format
   * @param {string} phone - Phone number
   * @returns {string} Formatted number
   */
  formatPhoneNumber(phone) {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');

    // Handle Nigerian numbers
    if (cleaned.length === 11 && cleaned.startsWith('0')) {
      cleaned = '234' + cleaned.substring(1);
    } else if (cleaned.length === 10) {
      cleaned = '234' + cleaned;
    } else if (!cleaned.startsWith('234') && cleaned.length === 13) {
      // Already has country code, keep as is
    }

    return cleaned;
  }

  /**
   * Delay helper function
   * @param {number} ms - Milliseconds to delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get all active connections
   * @returns {Array} List of connected schools
   */
  getActiveConnections() {
    const connections = [];

    for (const [schoolId, client] of this.clients.entries()) {
      connections.push({
        schoolId,
        status: 'active'
      });
    }

    return connections;
  }

  /**
   * Check if school is connected
   * @param {string} schoolId - School identifier
   * @returns {boolean} Connection status
   */
  async isConnected(schoolId) {
    try {
      const status = await this.getClientStatus(schoolId);
      return status === 'CONNECTED';
    } catch (error) {
      return false;
    }
  }

  /**
   * Clean up stuck or inactive WhatsApp sessions
   * Useful for resolving QR code generation loops
   * @param {string} schoolId - School identifier (optional, cleans all if not provided)
   */
  async cleanupSessions(schoolId = null) {
    try {
      if (schoolId) {
        // Clean up specific school session
        console.log(`🧹 Cleaning up WhatsApp session for school: ${schoolId}`);
        await this.disconnect(schoolId);

        // Also clear initialization tracking
        this.initializingClients.delete(schoolId);

        console.log(`✅ Session cleaned up for school: ${schoolId}`);
      } else {
        // Clean up all sessions
        console.log(`🧹 Cleaning up all WhatsApp sessions`);
        const schoolIds = Array.from(this.clients.keys());

        for (const sid of schoolIds) {
          try {
            await this.disconnect(sid);
            this.initializingClients.delete(sid);
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
   * Restart WhatsApp service for a specific school with enhanced connection handling
   * @param {string} schoolId - School identifier
   */
  async restartForSchool(schoolId) {
    console.log(`🔄 Restarting WhatsApp service for school: ${schoolId}`);

    try {
      // First, disconnect the existing client
      await this.disconnect(schoolId);

      // Clean up any initialization tracking
      this.initializingClients.delete(schoolId);

      // Wait a moment before reinitializing
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Reinitialize the client
      const client = await this.initializeClient(schoolId);

      console.log(`✅ WhatsApp service restarted for school: ${schoolId}`);
      return client;
    } catch (error) {
      console.error(`❌ Error restarting WhatsApp service for school ${schoolId}:`, error);
      throw error;
    }
  }
}

// Singleton instance
const whatsappService = new WhatsAppService();

module.exports = whatsappService;

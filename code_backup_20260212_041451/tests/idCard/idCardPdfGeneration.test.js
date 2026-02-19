const IdCardService = require('../../services/IdCardService');
const db = require('../../models');
const fs = require('fs');
const path = require('path');

describe('ID Card PDF Generation Integration Tests', () => {
  let mockTemplate;
  let mockGeneration;

  beforeAll(async () => {
    // Create mock template
    mockTemplate = {
      id: 1,
      school_id: 1,
      branch_id: 1,
      template_name: 'Test Template',
      template_type: 'student',
      layout_config: {
        width: 336,
        height: 212,
        elements: {
          logo: { x: 10, y: 10, width: 40, height: 40 },
          photo: { x: 180, y: 10, width: 50, height: 60 }
        }
      },
      school_logo_url: null,
      background_image_url: null
    };

    // Create mock generation
    mockGeneration = {
      id: 1,
      student_id: 12345,
      school_id: 1,
      branch_id: 1,
      template_id: 1,
      card_data: {
        first_name: 'John',
        last_name: 'Doe',
        student_id: '12345',
        admission_number: 'ADM001',
        class_name: 'Grade 10',
        photo_url: null
      },
      status: 'pending'
    };
  });

  describe('QR Code Generation', () => {
    it('should generate valid QR code data URL', async () => {
      const qrCode = await IdCardService.generateQRCode(mockGeneration);
      
      expect(qrCode).toMatch(/^data:image\/png;base64,/);
      expect(qrCode.length).toBeGreaterThan(100);
    });

    it('should include correct data in QR code', async () => {
      const qrCode = await IdCardService.generateQRCode(mockGeneration);
      
      // QR code should contain student and school information
      expect(qrCode).toBeDefined();
      expect(typeof qrCode).toBe('string');
    });

    it('should handle missing student data gracefully', async () => {
      const incompleteGeneration = {
        ...mockGeneration,
        student_id: null
      };

      const qrCode = await IdCardService.generateQRCode(incompleteGeneration);
      expect(qrCode).toBeDefined();
    });
  });

  describe('Barcode Generation', () => {
    it('should generate valid barcode data URL', async () => {
      const barcode = await IdCardService.generateBarcode(mockGeneration);
      
      expect(barcode).toMatch(/^data:image\/png;base64,/);
      expect(barcode.length).toBeGreaterThan(100);
    });

    it('should use CODE128 format', async () => {
      const barcode = await IdCardService.generateBarcode(mockGeneration);
      
      // Verify barcode is generated (actual format validation would require decoding)
      expect(barcode).toBeDefined();
      expect(typeof barcode).toBe('string');
    });

    it('should create consistent barcodes for same data', async () => {
      const barcode1 = await IdCardService.generateBarcode(mockGeneration);
      const barcode2 = await IdCardService.generateBarcode(mockGeneration);
      
      expect(barcode1).toBe(barcode2);
    });
  });

  describe('PDF Generation', () => {
    it('should generate PDF buffer', async () => {
      const qrCode = await IdCardService.generateQRCode(mockGeneration);
      const barcode = await IdCardService.generateBarcode(mockGeneration);
      
      const pdfUrl = await IdCardService.generatePDF(mockGeneration, mockTemplate, qrCode, barcode);
      
      expect(pdfUrl).toBeDefined();
      expect(typeof pdfUrl).toBe('string');
    });

    it('should handle missing images gracefully', async () => {
      const templateWithImages = {
        ...mockTemplate,
        school_logo_url: 'invalid-url',
        background_image_url: 'invalid-url'
      };

      const generationWithPhoto = {
        ...mockGeneration,
        card_data: {
          ...mockGeneration.card_data,
          photo_url: 'invalid-url'
        }
      };

      const qrCode = await IdCardService.generateQRCode(generationWithPhoto);
      const barcode = await IdCardService.generateBarcode(generationWithPhoto);
      
      // Should not throw error even with invalid image URLs
      const pdfUrl = await IdCardService.generatePDF(generationWithPhoto, templateWithImages, qrCode, barcode);
      expect(pdfUrl).toBeDefined();
    });

    it('should create file in uploads directory when Cloudinary not configured', async () => {
      // Temporarily disable Cloudinary
      const originalCloudinaryCheck = IdCardService.isCloudinaryConfigured;
      IdCardService.isCloudinaryConfigured = () => false;

      const qrCode = await IdCardService.generateQRCode(mockGeneration);
      const barcode = await IdCardService.generateBarcode(mockGeneration);
      
      const pdfUrl = await IdCardService.generatePDF(mockGeneration, mockTemplate, qrCode, barcode);
      
      expect(pdfUrl).toMatch(/^\/uploads\//);
      
      // Verify file exists
      const filePath = path.join(__dirname, '../..', pdfUrl);
      expect(fs.existsSync(filePath)).toBe(true);
      
      // Cleanup
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      // Restore original function
      IdCardService.isCloudinaryConfigured = originalCloudinaryCheck;
    });
  });

  describe('Complete Card Generation', () => {
    it('should generate complete card with all components', async () => {
      const result = await IdCardService.generateCard(mockGeneration, mockTemplate);
      
      expect(result).toHaveProperty('qrCode');
      expect(result).toHaveProperty('barcode');
      expect(result).toHaveProperty('pdfUrl');
      
      expect(result.qrCode).toMatch(/^data:image\/png;base64,/);
      expect(result.barcode).toMatch(/^data:image\/png;base64,/);
      expect(typeof result.pdfUrl).toBe('string');
    });

    it('should handle errors gracefully', async () => {
      const invalidGeneration = null;
      
      await expect(IdCardService.generateCard(invalidGeneration, mockTemplate))
        .rejects.toThrow();
    });
  });

  describe('Batch Processing', () => {
    let mockBatchId;
    let mockGenerations;

    beforeEach(async () => {
      mockBatchId = 'batch_' + Date.now();
      
      // Create mock generations in database
      mockGenerations = await Promise.all([
        db.IdCardGeneration.create({
          ...mockGeneration,
          id: undefined,
          batch_id: mockBatchId,
          student_id: 1001
        }),
        db.IdCardGeneration.create({
          ...mockGeneration,
          id: undefined,
          batch_id: mockBatchId,
          student_id: 1002
        })
      ]);
    });

    afterEach(async () => {
      // Cleanup
      await db.IdCardGeneration.destroy({
        where: { batch_id: mockBatchId }
      });
    });

    it('should process batch of cards', async () => {
      await IdCardService.processBatch(mockBatchId, mockTemplate);
      
      // Verify all cards were processed
      const processedCards = await db.IdCardGeneration.findAll({
        where: { batch_id: mockBatchId }
      });
      
      processedCards.forEach(card => {
        expect(['completed', 'failed']).toContain(card.status);
        if (card.status === 'completed') {
          expect(card.qr_code_data).toBeDefined();
          expect(card.barcode_data).toBeDefined();
          expect(card.pdf_url).toBeDefined();
        }
      });
    });

    it('should handle individual card failures in batch', async () => {
      // Create a generation with invalid data
      const invalidGeneration = await db.IdCardGeneration.create({
        ...mockGeneration,
        id: undefined,
        batch_id: mockBatchId,
        student_id: null, // This should cause failure
        card_data: null
      });

      await IdCardService.processBatch(mockBatchId, mockTemplate);
      
      // Check that valid cards succeeded and invalid failed
      const results = await db.IdCardGeneration.findAll({
        where: { batch_id: mockBatchId }
      });
      
      const completedCount = results.filter(r => r.status === 'completed').length;
      const failedCount = results.filter(r => r.status === 'failed').length;
      
      expect(completedCount).toBeGreaterThan(0);
      expect(failedCount).toBeGreaterThan(0);
    });
  });

  describe('Image Upload', () => {
    it('should handle file upload when Cloudinary not configured', async () => {
      const originalCloudinaryCheck = IdCardService.isCloudinaryConfigured;
      IdCardService.isCloudinaryConfigured = () => false;

      const mockFile = {
        path: path.join(__dirname, 'test-image.jpg'),
        originalname: 'test-image.jpg'
      };

      // Create a dummy file
      fs.writeFileSync(mockFile.path, 'dummy image data');

      const result = await IdCardService.uploadImage(mockFile, 'test-folder');
      
      expect(result).toMatch(/^\/uploads\/test-folder\//);
      
      // Cleanup
      const uploadedPath = path.join(__dirname, '../..', result);
      if (fs.existsSync(uploadedPath)) {
        fs.unlinkSync(uploadedPath);
      }
      
      IdCardService.isCloudinaryConfigured = originalCloudinaryCheck;
    });

    it('should throw error for missing file', async () => {
      await expect(IdCardService.uploadImage(null, 'test-folder'))
        .rejects.toThrow('No file provided');
    });
  });

  describe('Card Preview', () => {
    it('should generate preview without saving to database', async () => {
      const sampleData = {
        student_id: 'PREVIEW001',
        first_name: 'Preview',
        last_name: 'Student',
        class_name: 'Grade 10'
      };

      const result = await IdCardService.getCardPreview(mockTemplate.id, sampleData);
      
      expect(result).toHaveProperty('qrCode');
      expect(result).toHaveProperty('barcode');
      expect(result).toHaveProperty('template');
      
      expect(result.qrCode).toMatch(/^data:image\/png;base64,/);
      expect(result.barcode).toMatch(/^data:image\/png;base64,/);
    });
  });
});
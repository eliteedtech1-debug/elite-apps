const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const JsBarcode = require('jsbarcode');
const { Canvas } = require('canvas');
const cloudinary = require('cloudinary').v2;
const db = require('../models');
const fs = require('fs');
const path = require('path');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

class IdCardService {
  static async generateCard(generation, template) {
    try {
      console.log('🎯 Generating ID card for generation:', generation.id);
      
      const qrCode = await this.generateQRCode(generation);
      const barcode = await this.generateBarcode(generation);
      const pdfUrl = await this.generatePDF(generation, template, qrCode, barcode);

      return { qrCode, barcode, pdfUrl };
    } catch (error) {
      console.error('Card generation failed:', error);
      throw new Error(`Card generation failed: ${error.message}`);
    }
  }

  static async generateQRCode(generation) {
    try {
      const qrData = {
        student_id: generation.student_id,
        school_id: generation.school_id,
        branch_id: generation.branch_id,
        card_id: generation.id,
        issued_date: new Date().toISOString().split('T')[0]
      };
      
      return await QRCode.toDataURL(JSON.stringify(qrData), {
        width: 100,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
    } catch (error) {
      console.error('QR code generation failed:', error);
      throw error;
    }
  }

  static async generateBarcode(generation) {
    try {
      const canvas = new Canvas(200, 50);
      const barcodeData = `${generation.school_id}${String(generation.student_id).padStart(6, '0')}`;
      
      JsBarcode(canvas, barcodeData, {
        format: "CODE128",
        width: 2,
        height: 40,
        displayValue: false
      });
      
      return canvas.toDataURL();
    } catch (error) {
      console.error('Barcode generation failed:', error);
      throw error;
    }
  }

  static async generatePDF(generation, template, qrCode, barcode) {
    try {
      console.log('📄 Generating PDF for card:', generation.id);
      
      // Create a simple PDF using basic approach for now
      // This will be enhanced with React-PDF in future iterations
      const pdfBuffer = await this.createSimplePDF(generation, template, qrCode, barcode);
      
      // Upload to Cloudinary if configured
      if (this.isCloudinaryConfigured()) {
        const result = await cloudinary.uploader.upload(
          `data:application/pdf;base64,${pdfBuffer.toString('base64')}`,
          {
            resource_type: 'raw',
            folder: `id-cards/${generation.school_id}`,
            public_id: `card_${generation.id}_${Date.now()}`
          }
        );
        return result.secure_url;
      } else {
        // Save locally for development
        const fileName = `card_${generation.id}_${Date.now()}.pdf`;
        const filePath = path.join(__dirname, '../../uploads', fileName);
        
        // Ensure uploads directory exists
        const uploadsDir = path.dirname(filePath);
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        fs.writeFileSync(filePath, pdfBuffer);
        return `/uploads/${fileName}`;
      }
    } catch (error) {
      console.error('PDF generation failed:', error);
      throw error;
    }
  }

  static async createSimplePDF(generation, template, qrCode, barcode) {
    // For Phase 1, create a simple PDF structure
    // This will be replaced with React-PDF components in future phases
    const PDFDocument = require('pdfkit');
    
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ 
          size: [243, 153], // Standard ID card size in points
          margins: { top: 5, bottom: 5, left: 5, right: 5 }
        });
        
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });

        const { card_data } = generation;
        const { layout_config } = template;

        // Background
        if (template.background_image_url) {
          try {
            doc.image(template.background_image_url, 0, 0, { width: 243, height: 153 });
          } catch (err) {
            console.warn('Background image failed to load:', err.message);
          }
        } else {
          doc.rect(0, 0, 243, 153).fill('#ffffff');
        }

        // School logo
        if (template.school_logo_url) {
          try {
            doc.image(template.school_logo_url, 10, 10, { width: 40, height: 40 });
          } catch (err) {
            console.warn('School logo failed to load:', err.message);
          }
        }

        // Student photo
        if (card_data.photo_url) {
          try {
            doc.image(card_data.photo_url, 180, 10, { width: 50, height: 60 });
          } catch (err) {
            console.warn('Student photo failed to load:', err.message);
          }
        }

        // Student information
        doc.fillColor('#000000');
        doc.fontSize(12).font('Helvetica-Bold');
        const fullName = `${card_data.first_name || ''} ${card_data.last_name || ''}`.trim();
        doc.text(fullName, 10, 60, { width: 160 });
        
        doc.fontSize(10).font('Helvetica');
        doc.text(`ID: ${card_data.student_id || card_data.admission_number || 'N/A'}`, 10, 80);
        doc.text(`Class: ${card_data.class_name || 'N/A'}`, 10, 95);

        // QR Code
        if (qrCode) {
          try {
            const qrImage = qrCode.replace(/^data:image\/png;base64,/, '');
            doc.image(Buffer.from(qrImage, 'base64'), 10, 110, { width: 30, height: 30 });
          } catch (err) {
            console.warn('QR code failed to render:', err.message);
          }
        }

        // Barcode
        if (barcode) {
          try {
            const barcodeImage = barcode.replace(/^data:image\/png;base64,/, '');
            doc.image(Buffer.from(barcodeImage, 'base64'), 50, 120, { width: 80, height: 20 });
          } catch (err) {
            console.warn('Barcode failed to render:', err.message);
          }
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  static async processBatch(batchId, template) {
    try {
      console.log('🔄 Processing batch:', batchId);
      
      const generations = await db.IdCardGeneration.findAll({
        where: { batch_id: batchId, status: 'pending' }
      });

      console.log(`📊 Found ${generations.length} cards to process`);

      for (const generation of generations) {
        try {
          await generation.update({ status: 'processing' });
          const result = await this.generateCard(generation, template);
          
          await generation.update({
            qr_code_data: result.qrCode,
            barcode_data: result.barcode,
            pdf_url: result.pdfUrl,
            status: 'completed'
          });
          
          console.log(`✅ Completed card for generation ${generation.id}`);
        } catch (error) {
          console.error(`❌ Failed card for generation ${generation.id}:`, error);
          await generation.update({ status: 'failed' });
        }
      }
      
      console.log('🎉 Batch processing completed:', batchId);
    } catch (error) {
      console.error('Batch processing failed:', error);
      throw error;
    }
  }

  static async uploadImage(file, folder) {
    try {
      if (!file) {
        throw new Error('No file provided');
      }

      if (this.isCloudinaryConfigured()) {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: `id-cards/${folder}`,
          resource_type: 'image',
          allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp']
        });
        
        // Clean up local file
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
        
        return result.secure_url;
      } else {
        // For development, move file to uploads directory
        const fileName = `${Date.now()}_${file.originalname}`;
        const uploadsDir = path.join(__dirname, '../../uploads', folder);
        
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        const newPath = path.join(uploadsDir, fileName);
        fs.renameSync(file.path, newPath);
        
        return `/uploads/${folder}/${fileName}`;
      }
    } catch (error) {
      console.error('Image upload failed:', error);
      throw error;
    }
  }

  static isCloudinaryConfigured() {
    return !!(
      process.env.CLOUDINARY_CLOUD_NAME && 
      process.env.CLOUDINARY_API_KEY && 
      process.env.CLOUDINARY_API_SECRET
    );
  }

  static async getCardPreview(templateId, sampleData) {
    try {
      const template = await db.IdCardTemplate.findByPk(templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      // Create a mock generation for preview
      const mockGeneration = {
        id: 'preview',
        student_id: sampleData.student_id || 'SAMPLE001',
        school_id: template.school_id,
        branch_id: template.branch_id,
        card_data: sampleData
      };

      const qrCode = await this.generateQRCode(mockGeneration);
      const barcode = await this.generateBarcode(mockGeneration);
      
      return { qrCode, barcode, template };
    } catch (error) {
      console.error('Preview generation failed:', error);
      throw error;
    }
  }
}

module.exports = IdCardService;
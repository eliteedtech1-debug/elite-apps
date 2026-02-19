const QRCode = require('qrcode');
const cloudinary = require('cloudinary').v2;
const db = require('../models');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

class IdCardService {
  static async generateCardData(generation, template) {
    try {
      console.log('🎯 Generating ID card data for generation:', generation.id);
      
      const qrCode = await this.generateQRCode(generation);
      const barcode = await this.generateBarcode(generation);

      return { 
        qrCode, 
        barcode, 
        cardData: generation.card_data,
        template: template 
      };
    } catch (error) {
      console.error('Card data generation failed:', error);
      throw new Error(`Card data generation failed: ${error.message}`);
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
      const barcodeData = `${generation.school_id}${String(generation.student_id).padStart(6, '0')}`;
      
      // Return barcode data for frontend to generate the actual barcode
      return {
        data: barcodeData,
        format: 'CODE128',
        options: {
          width: 2,
          height: 40,
          displayValue: false
        }
      };
    } catch (error) {
      console.error('Barcode generation failed:', error);
      throw error;
    }
  }

  static async batchGenerate(templateId, studentIds, schoolId, branchId) {
    try {
      const results = [];
      const template = await db.IdCardTemplate.findByPk(templateId);
      
      if (!template) {
        throw new Error('Template not found');
      }

      for (const studentId of studentIds) {
        try {
          // Create generation record
          const generation = await db.IdCardGeneration.create({
            school_id: schoolId,
            branch_id: branchId,
            student_id: studentId,
            template_id: templateId,
            card_number: `${schoolId}-${Date.now()}-${studentId}`,
            generation_status: 'processing',
            card_data: {
              student_id: studentId,
              school_id: schoolId,
              student_name: `Student ${studentId}`,
              class: 'N/A'
            }
          });

          // Generate card data (QR, barcode)
          const cardData = await this.generateCardData(generation, template);
          
          // Update generation record
          await generation.update({
            qr_code_data: cardData.qrCode,
            barcode_data: cardData.barcode,
            generation_status: 'ready_for_pdf'
          });

          results.push({
            student_id: studentId,
            status: 'success',
            generation_id: generation.id,
            cardData
          });
        } catch (error) {
          console.error(`Failed to generate card data for student ${studentId}:`, error);
          results.push({
            student_id: studentId,
            status: 'failed',
            error: error.message
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Batch generation failed:', error);
      throw error;
    }
  }

  static async uploadImage(file, folder) {
    try {
      if (this.isCloudinaryConfigured()) {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: `id-cards/${folder}`,
          resource_type: 'image'
        });
        return result.secure_url;
      } else {
        // For development, return a placeholder
        return `/uploads/${file.filename}`;
      }
    } catch (error) {
      console.error('Image upload failed:', error);
      throw error;
    }
  }

  static isCloudinaryConfigured() {
    return !!(process.env.CLOUDINARY_CLOUD_NAME && 
              process.env.CLOUDINARY_API_KEY && 
              process.env.CLOUDINARY_API_SECRET);
  }
}

module.exports = IdCardService;

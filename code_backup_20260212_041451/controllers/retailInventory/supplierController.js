const { generateId } = require('../../utils/idGenerator');
const { successResponse, errorResponse } = require('../../utils/responseHandler');

// In-memory storage for suppliers (by school_id)
const supplierStorage = {};

class SupplierController {
  // Create new supplier
  async createSupplier(req, res) {
    try {
      const { 
        supplier_id, supplier_name, contact_person, phone, email, address, 
        payment_terms, rating, notes 
      } = req.body;
      const { school_id } = req.user;

      // Initialize storage for school if not exists
      if (!supplierStorage[school_id]) {
        supplierStorage[school_id] = [];
      }

      const finalSupplierId = supplier_id || generateId('SUP');

      const supplierData = {
        supplier_id: finalSupplierId,
        supplier_name,
        contact_person,
        phone,
        email,
        address,
        payment_terms,
        rating,
        is_active: true,
        school_id,
        notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Store the supplier
      supplierStorage[school_id].push(supplierData);

      return successResponse(res, 'Supplier created successfully', { supplier_id: finalSupplierId }, 201);
    } catch (error) {
      console.error('Create supplier error:', error);
      return errorResponse(res, 'Failed to create supplier', 500);
    }
  }

  // Get all suppliers with filters
  async getSuppliers(req, res) {
    try {
      const { school_id } = req.user;
      
      // Get suppliers for this school from storage
      const schoolSuppliers = supplierStorage[school_id] || [];
      
      // If no suppliers created yet, return default mock data
      const suppliers = schoolSuppliers.length > 0 ? schoolSuppliers : [
        {
          supplier_id: 'SUP-001',
          supplier_name: 'ABC Educational Supplies Ltd',
          contact_person: 'John Smith',
          phone: '+234-1234-5678',
          email: 'contact@abc-edu.com',
          address: '123 Education Street, Lagos',
          payment_terms: 'Net 30',
          rating: 'Excellent',
          is_active: true,
          notes: 'Reliable supplier of uniforms'
        }
      ];

      return successResponse(res, 'Suppliers retrieved successfully', suppliers);
    } catch (error) {
      console.error('Get suppliers error:', error);
      return errorResponse(res, 'Failed to retrieve suppliers', 500);
    }
  }

  // Get single supplier by ID
  async getSupplierById(req, res) {
    try {
      const { supplier_id } = req.params;
      const { school_id } = req.user;

      // Find supplier in storage
      const schoolSuppliers = supplierStorage[school_id] || [];
      const supplier = schoolSuppliers.find(s => s.supplier_id === supplier_id);

      if (!supplier) {
        return errorResponse(res, 'Supplier not found', 404);
      }

      return successResponse(res, 'Supplier retrieved successfully', supplier);
    } catch (error) {
      console.error('Get supplier error:', error);
      return errorResponse(res, 'Failed to retrieve supplier', 500);
    }
  }

  // Update supplier
  async updateSupplier(req, res) {
    try {
      const { supplier_id } = req.params;
      const { school_id } = req.user;
      const updateData = req.body;

      // Find supplier in storage
      const schoolSuppliers = supplierStorage[school_id] || [];
      const supplierIndex = schoolSuppliers.findIndex(s => s.supplier_id === supplier_id);

      if (supplierIndex === -1) {
        return errorResponse(res, 'Supplier not found', 404);
      }

      // Update the supplier
      schoolSuppliers[supplierIndex] = {
        ...schoolSuppliers[supplierIndex],
        ...updateData,
        supplier_id, // Keep original ID
        school_id,   // Keep original school_id
        updatedAt: new Date().toISOString()
      };

      return successResponse(res, 'Supplier updated successfully');
    } catch (error) {
      console.error('Update supplier error:', error);
      return errorResponse(res, 'Failed to update supplier', 500);
    }
  }

  // Delete supplier (soft delete)
  async deleteSupplier(req, res) {
    try {
      const { supplier_id } = req.params;

      const result = await Supplier.delete(supplier_id);

      if (result.affectedRows === 0) {
        return errorResponse(res, 'Supplier not found', 404);
      }

      return successResponse(res, 'Supplier deleted successfully');
    } catch (error) {
      console.error('Delete supplier error:', error);
      return errorResponse(res, 'Failed to delete supplier', 500);
    }
  }
}

module.exports = new SupplierController();
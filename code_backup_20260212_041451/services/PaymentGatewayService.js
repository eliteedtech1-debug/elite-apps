const crypto = require('crypto');
const axios = require('axios');
const db = require('../models');

class PaymentGatewayService {
  async getSchoolGatewayConfig(schoolId, gatewayName = null) {
    // For app-level config, check for NULL school_id first
    let query = `SELECT * FROM payment_gateway_config WHERE is_active = 1`;
    let replacements = {};
    
    if (schoolId) {
      query += ` AND school_id = :school_id`;
      replacements.school_id = schoolId;
    } else {
      query += ` AND school_id IS NULL`;
    }
    
    if (gatewayName) {
      query += ` AND gateway_name = :gateway_name`;
      replacements.gateway_name = gatewayName;
    } else {
      query += ` AND is_default = 1`;
    }
    
    query += ` LIMIT 1`;

    const [config] = await db.sequelize.query(query, {
      replacements,
      type: db.Sequelize.QueryTypes.SELECT
    });

    // Return default test config if none exists
    if (!config) {
      return {
        gateway_name: 'remita',
        is_active: 1,
        is_test_mode: 1,
        config_data: JSON.stringify({
          merchant_id: 'DEMO_MERCHANT_ID',
          service_type_id: '4430731',
          api_key: 'DEMO_API_KEY',
          api_token: 'DEMO_TOKEN',
          api_base_url: 'https://remitademo.net/remita/exapp/api/v1/send',
          environment: 'test'
        })
      };
    }

    return config;
  }

  async getSchoolPaymentIntegration(schoolId) {
    const [config] = await db.sequelize.query(
      `SELECT school_payment_integration FROM payment_gateway_config WHERE school_id = ? LIMIT 1`,
      {
        replacements: [schoolId],
        type: db.Sequelize.QueryTypes.SELECT
      }
    );

    return config?.school_payment_integration || 'full';
  }

  generateRemitaHash(merchantId, serviceTypeId, orderId, totalAmount, apiKey) {
    const hashString = `${merchantId}${serviceTypeId}${orderId}${totalAmount}${apiKey}`;
    return crypto.createHash('sha512').update(hashString).digest('hex');
  }

  async disburseSalaryViaRemita(staffData, schoolId) {
    const config = await this.getSchoolGatewayConfig(schoolId, 'remita');
    if (!config) throw new Error('Remita not configured for this school');

    const configData = JSON.parse(config.config_data);
    const staffId = staffData.staff_id || staffData.id;
    const orderId = `PAY-${Date.now()}-${staffId}`;
    const amount = parseFloat(staffData.net_pay);

    const hash = this.generateRemitaHash(
      configData.merchant_id,
      configData.service_type_id,
      orderId,
      amount,
      configData.api_key
    );

    const payload = {
      serviceTypeId: configData.service_type_id,
      amount: amount,
      orderId: orderId,
      payerName: staffData.name,
      payerEmail: staffData.email || `staff${staffData.staff_id}@school.com`,
      payerPhone: staffData.phone || '08000000000',
      description: `Salary payment for ${staffData.name}`,
      hash: hash
    };

    try {
      const response = await axios.post(
        `${configData.api_base_url}/echannelsvc/merchant/api/paymentinit`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `remitaConsumerKey=${configData.merchant_id},remitaConsumerToken=${configData.api_token}`
          }
        }
      );

      await db.sequelize.query(
        `INSERT INTO payment_gateway_transactions 
        (school_id, gateway_name, transaction_type, reference, amount, status, request_payload, response_payload, staff_id)
        VALUES (:school_id, :gateway_name, :transaction_type, :reference, :amount, :status, :request_payload, :response_payload, :staff_id)`,
        {
          replacements: {
            school_id: schoolId,
            gateway_name: 'remita',
            transaction_type: 'disbursement',
            reference: response.data.RRR || orderId,
            amount: amount,
            status: response.data.status === '00' ? 'success' : 'pending',
            request_payload: JSON.stringify(payload),
            response_payload: JSON.stringify(response.data),
            staff_id: staffId
          }
        }
      );

      return {
        success: response.data.status === '00',
        reference: response.data.RRR,
        message: response.data.statusMessage,
        data: response.data
      };
    } catch (error) {
      await db.sequelize.query(
        `INSERT INTO payment_gateway_transactions 
        (school_id, gateway_name, transaction_type, reference, amount, status, request_payload, error_message, staff_id)
        VALUES (:school_id, :gateway_name, :transaction_type, :reference, :amount, :status, :request_payload, :error_message, :staff_id)`,
        {
          replacements: {
            school_id: schoolId,
            gateway_name: 'remita',
            transaction_type: 'disbursement',
            reference: orderId,
            amount: amount,
            status: 'failed',
            request_payload: JSON.stringify(payload),
            error_message: error.message,
            staff_id: staffId
          }
        }
      );

      throw error;
    }
  }

  async checkRemitaPaymentStatus(reference, schoolId) {
    const config = await this.getSchoolGatewayConfig(schoolId, 'remita');
    if (!config) throw new Error('Remita not configured');

    const configData = JSON.parse(config.config_data);
    const hashString = `${reference}${configData.api_key}${configData.merchant_id}`;
    const hash = crypto.createHash('sha512').update(hashString).digest('hex');

    try {
      const response = await axios.get(
        `${configData.api_base_url}/echannelsvc/merchant/api/paymentstatus/${reference}/${configData.merchant_id}/${hash}`,
        {
          headers: {
            'Authorization': `remitaConsumerKey=${configData.merchant_id},remitaConsumerToken=${configData.api_token}`
          }
        }
      );

      return {
        success: true,
        status: response.data.status,
        message: response.data.message,
        data: response.data
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new PaymentGatewayService();

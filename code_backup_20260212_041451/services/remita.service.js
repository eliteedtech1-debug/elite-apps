const crypto = require('crypto');
const axios = require('axios');

class RemitaService {
  /**
   * Generate unique payment reference
   * @returns {string} Payment reference
   */
  generatePaymentRef() {
    const prefix = 'SF' + new Date().getFullYear().toString().slice(-2);
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `${prefix}${timestamp}${random}`;
  }

  /**
   * Generate SHA-512 hash for Remita authentication
   * @param {string} merchantId 
   * @param {string} serviceTypeId 
   * @param {string} orderId 
   * @param {number} amount 
   * @param {string} apiKey 
   * @returns {string} SHA-512 hash
   */
  generateHash(merchantId, serviceTypeId, orderId, amount, apiKey) {
    const hashString = `${merchantId}${serviceTypeId}${orderId}${amount}${apiKey}`;
    return crypto.createHash('sha512').update(hashString).digest('hex');
  }

  /**
   * Generate RRR (Remita Retrieval Reference) for payment
   * @param {Object} config - Remita configuration
   * @param {Object} paymentData - Payment details
   * @returns {Promise<Object>} RRR generation result
   */
  async generateRRR(config, paymentData) {
    const { paymentRef, amount, payerName, payerEmail, payerPhone, lineItems } = paymentData;

    // Generate authentication hash
    const hash = this.generateHash(
      config.merchantId,
      config.serviceTypeId,
      paymentRef,
      amount,
      config.apiKey
    );

    // Prepare request payload
    const payload = {
      serviceTypeId: config.serviceTypeId,
      amount: amount.toString(),
      hash,
      orderId: paymentRef,
      payerName,
      payerEmail,
      payerPhone,
      lineItems
    };

    try {
      const response = await axios.post(config.gatewayUrl, payload, {
        headers: {
          'Authorization': `remitaConsumerKey=${config.merchantId},remitaConsumerToken=${hash}`,
          'Content-Type': 'application/json',
          'cache-control': 'no-cache'
        },
        timeout: 30000
      });

      // Parse JSONP response
      let data;
      if (typeof response.data === 'string') {
        const jsonpMatch = response.data.match(/jsonp\s*\((.*)\)/);
        data = jsonpMatch ? JSON.parse(jsonpMatch[1]) : JSON.parse(response.data);
      } else {
        data = response.data;
      }

      return {
        success: true,
        rrr: data.RRR.trim(),
        statusCode: data.statuscode,
        status: data.status,
        paymentRef
      };
    } catch (error) {
      console.error('Remita RRR Generation Error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to generate RRR');
    }
  }

  /**
   * Verify payment status with Remita
   * @param {Object} config - Remita configuration
   * @param {string} rrr - Remita Retrieval Reference
   * @returns {Promise<Object>} Payment verification result
   */
  async verifyPayment(config, rrr) {
    const hash = crypto.createHash('sha512')
      .update(`${rrr}${config.apiKey}${config.merchantId}`)
      .digest('hex');

    const verifyUrl = `${config.verifyUrl}/${config.merchantId}/${rrr}/${hash}/status.reg`;

    try {
      const response = await axios.get(verifyUrl, { timeout: 30000 });
      
      return {
        success: true,
        status: response.data.status,
        amount: response.data.amount,
        message: response.data.message,
        data: response.data
      };
    } catch (error) {
      console.error('Remita Payment Verification Error:', error.message);
      throw new Error('Failed to verify payment');
    }
  }

  /**
   * Prepare line items for split payment
   * @param {number} totalAmount - Total payment amount
   * @param {Object} schoolAccount - School revenue account
   * @param {Object} platformAccount - Platform fee account
   * @param {number} platformFee - Platform fee amount (default 500)
   * @returns {Array} Line items for Remita
   */
  prepareLineItems(totalAmount, schoolAccount, platformAccount, platformFee = 500) {
    const timestamp = Date.now();
    const schoolAmount = totalAmount - platformFee;

    return [
      {
        lineItemsId: `SCH${timestamp}`,
        beneficiaryName: schoolAccount.account_name,
        beneficiaryAccount: schoolAccount.account_number,
        bankCode: schoolAccount.bank_code,
        beneficiaryAmount: schoolAmount.toString(),
        deductFeeFrom: "1" // School pays Remita transaction fee
      },
      {
        lineItemsId: `PLT${timestamp}`,
        beneficiaryName: platformAccount.account_name,
        beneficiaryAccount: platformAccount.account_number,
        bankCode: platformAccount.bank_code,
        beneficiaryAmount: platformFee.toString(),
        deductFeeFrom: "0"
      }
    ];
  }
}

module.exports = new RemitaService();

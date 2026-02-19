const { Zainpay, serviceTypes } = require('zainpay-nodejs-sdk');

const initializePayment = async ({ amount, email, reference, callbackUrl, metadata }) => {
  try {
    const payload = {
      amount: String(amount * 100), // Convert to kobo
      txnRef: reference,
      mobileNumber: metadata?.phone || '08000000000',
      zainboxCode: process.env.ZAINPAY_BOX_CODE,
      emailAddress: email,
      successCallBackUrl: callbackUrl,
      failureCallBackUrl: callbackUrl.replace('success', 'failed')
    };
    console.log('Zainpay payload:', payload);
    
    const response = await Zainpay({
      publicKey: process.env.ZAINPAY_PUBLIC_KEY,
      serviceType: serviceTypes.INITIALIZE_PAYMENT,
      sandbox: process.env.ZAINPAY_SANDBOX === 'true',
      data: payload
    });
    console.log('Zainpay response:', JSON.stringify(response));

    if (response.code === '00') {
      return {
        success: true,
        authorization_url: response.data,
        reference: reference
      };
    }
    throw new Error(response.description || 'Failed to initialize Zainpay payment');
  } catch (error) {
    console.error('Zainpay init error:', error.message, error.response?.data || error);
    throw error;
  }
};

const verifyPayment = async (reference) => {
  try {
    const response = await Zainpay({
      publicKey: process.env.ZAINPAY_PUBLIC_KEY,
      serviceType: serviceTypes.GET_CARD_PAYMENT_STATUS,
      sandbox: process.env.ZAINPAY_SANDBOX === 'true',
      params: reference
    });

    return {
      success: response.code === '00',
      status: response.data?.txnType,
      amount: response.data?.amount?.amount,
      reference: reference,
      data: response.data
    };
  } catch (error) {
    console.error('Zainpay verify error:', error.message);
    throw error;
  }
};

module.exports = { initializePayment, verifyPayment };

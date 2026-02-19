const { Queue } = require('bullmq');
const { connection } = require('./whatsappQueue');

const emailQueue = new Queue('email', { 
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 }
  }
});

const addEmailWithPDFJob = async (data) => {
  return await emailQueue.add('email-with-pdf', {
    type: 'email-with-pdf',
    ...data
  }, {
    priority: 1
  });
};

const addEmailJob = async (data) => {
  return await emailQueue.add('send-email', {
    type: 'send-email',
    ...data
  });
};

module.exports = { 
  emailQueue, 
  addEmailWithPDFJob,
  addEmailJob
};

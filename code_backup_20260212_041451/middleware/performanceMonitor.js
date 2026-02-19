const performanceMonitor = (req, res, next) => {
  const start = Date.now();
  const path = req.path;
  const method = req.method;
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    
    if (duration > 1000) {
      console.warn(`⚠️  SLOW REQUEST: ${method} ${path} - ${duration}ms (${status})`);
    } else if (duration > 500) {
      console.log(`⏱️  ${method} ${path} - ${duration}ms (${status})`);
    }
    
    res.setHeader('X-Response-Time', `${duration}ms`);
  });
  
  next();
};

const logSlowQueries = (query, duration, model) => {
  if (duration > 1000) {
    console.warn(`🐌 SLOW QUERY: ${model} - ${duration}ms`);
    console.warn(`   Query: ${query.substring(0, 200)}...`);
  }
};

module.exports = { 
  performanceMonitor,
  logSlowQueries
};

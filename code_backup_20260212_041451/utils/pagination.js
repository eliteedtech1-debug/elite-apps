const paginate = (query, { page = 1, limit = 50, maxLimit = 500 } = {}) => {
  const safePage = Math.max(1, parseInt(page));
  const safeLimit = Math.min(Math.max(1, parseInt(limit)), maxLimit);
  const offset = (safePage - 1) * safeLimit;
  
  return {
    ...query,
    limit: safeLimit,
    offset,
    subQuery: false
  };
};

const paginationResponse = (data, total, page, limit) => {
  const safePage = parseInt(page) || 1;
  const safeLimit = parseInt(limit) || 50;
  const totalPages = Math.ceil(total / safeLimit);
  
  return {
    success: true,
    data,
    pagination: {
      total: parseInt(total),
      page: safePage,
      limit: safeLimit,
      pages: totalPages,
      hasNext: safePage < totalPages,
      hasPrev: safePage > 1,
      nextPage: safePage < totalPages ? safePage + 1 : null,
      prevPage: safePage > 1 ? safePage - 1 : null
    }
  };
};

const extractPagination = (req) => {
  return {
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 50
  };
};

module.exports = { 
  paginate, 
  paginationResponse,
  extractPagination
};

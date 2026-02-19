const multer= require ("multer");
const { storage } = require ("./cloudinaryComfig");

const upload = multer({ storage: storage });

module.exports = { upload };
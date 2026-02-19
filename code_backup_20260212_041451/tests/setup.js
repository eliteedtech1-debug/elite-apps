const { Sequelize } = require('sequelize');
const db = require('../models');

// Test database configuration
const testDb = new Sequelize({
  dialect: 'sqlite',
  storage: ':memory:',
  logging: false,
  define: {
    timestamps: true,
    underscored: true
  }
});

// Mock authentication middleware
const mockAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const schoolId = req.headers['x-school-id'];
  const branchId = req.headers['x-branch-id'];

  if (!authHeader) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  if (!schoolId || !branchId) {
    return res.status(400).json({ success: false, error: 'School context required' });
  }

  // Mock user data based on token
  const token = authHeader.replace('Bearer ', '');
  let userData = {};

  switch (token) {
    case 'school1-jwt-token':
      userData = { id: 101, school_id: 1, branch_id: 1, role: 'admin' };
      break;
    case 'school2-jwt-token':
      userData = { id: 201, school_id: 2, branch_id: 2, role: 'admin' };
      break;
    case 'school3-jwt-token':
      userData = { id: 301, school_id: 3, branch_id: 3, role: 'admin' };
      break;
    default:
      userData = { id: 1, school_id: parseInt(schoolId), branch_id: parseInt(branchId), role: 'admin' };
  }

  // Validate school context matches token
  if (userData.school_id !== parseInt(schoolId)) {
    return res.status(403).json({ success: false, error: 'Unauthorized access' });
  }

  req.user = userData;
  next();
};

// Setup test environment
beforeAll(async () => {
  // Initialize test database
  await testDb.authenticate();
  
  // Create tables
  await testDb.sync({ force: true });
  
  // Mock authentication middleware
  jest.doMock('../middleware/auth', () => mockAuth);
  
  // Mock Cloudinary
  jest.doMock('cloudinary', () => ({
    v2: {
      config: jest.fn(),
      uploader: {
        upload: jest.fn().mockResolvedValue({
          secure_url: 'https://mock-cloudinary.com/test-image.jpg',
          public_id: 'test-image'
        })
      }
    }
  }));

  // Mock file system operations
  jest.doMock('fs', () => ({
    ...jest.requireActual('fs'),
    writeFileSync: jest.fn(),
    unlinkSync: jest.fn(),
    existsSync: jest.fn().mockReturnValue(true),
    mkdirSync: jest.fn(),
    renameSync: jest.fn()
  }));

  // Mock QR code generation
  jest.doMock('qrcode', () => ({
    toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,mock-qr-code')
  }));

  // Mock barcode generation
  jest.doMock('jsbarcode', () => jest.fn());

  // Mock Canvas
  jest.doMock('canvas', () => ({
    Canvas: jest.fn().mockImplementation(() => ({
      toDataURL: jest.fn().mockReturnValue('data:image/png;base64,mock-barcode')
    }))
  }));

  // Mock PDFKit
  jest.doMock('pdfkit', () => {
    return jest.fn().mockImplementation(() => ({
      on: jest.fn((event, callback) => {
        if (event === 'end') {
          setTimeout(() => callback(), 10);
        }
      }),
      rect: jest.fn().mockReturnThis(),
      fill: jest.fn().mockReturnThis(),
      image: jest.fn().mockReturnThis(),
      fillColor: jest.fn().mockReturnThis(),
      fontSize: jest.fn().mockReturnThis(),
      font: jest.fn().mockReturnThis(),
      text: jest.fn().mockReturnThis(),
      end: jest.fn()
    }));
  });
});

// Cleanup after tests
afterAll(async () => {
  await testDb.close();
  jest.restoreAllMocks();
});

// Reset database between tests
beforeEach(async () => {
  // Clear all tables
  const models = Object.keys(db.sequelize.models);
  for (const modelName of models) {
    await db.sequelize.models[modelName].destroy({ 
      where: {},
      truncate: true,
      cascade: true 
    });
  }
});

// Test utilities
global.testUtils = {
  createMockFile: (filename, content = 'mock-file-content', mimetype = 'image/jpeg') => ({
    fieldname: 'file',
    originalname: filename,
    encoding: '7bit',
    mimetype,
    destination: '/tmp',
    filename: `test-${Date.now()}-${filename}`,
    path: `/tmp/test-${Date.now()}-${filename}`,
    size: content.length,
    buffer: Buffer.from(content)
  }),

  createMockTemplate: async (schoolId = 1, branchId = 1) => {
    return await db.IdCardTemplate.create({
      school_id: schoolId,
      branch_id: branchId,
      template_name: `Test Template ${schoolId}-${branchId}`,
      template_type: 'student',
      layout_config: { width: 336, height: 212 },
      created_by: schoolId * 100 + 1
    });
  },

  createMockGeneration: async (templateId, schoolId = 1, branchId = 1, studentId = 1001) => {
    return await db.IdCardGeneration.create({
      school_id: schoolId,
      branch_id: branchId,
      template_id: templateId,
      student_id: studentId,
      card_data: {
        first_name: 'Test',
        last_name: 'Student',
        student_id: studentId.toString(),
        class_name: 'Grade 10'
      },
      status: 'pending'
    });
  },

  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms))
};

// Console override for cleaner test output
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn()
};

// Restore console after tests if needed
afterAll(() => {
  global.console = originalConsole;
});
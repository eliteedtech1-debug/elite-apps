# Remote Qur'an Recitation Feature

A complete real-time audio recitation system for the Elite Scholar School Management System, enabling teachers to post audio recitations and students to respond with their own recordings.

## 🎯 Features

### Teacher Features
- **Audio Upload & Recording**: Upload audio files or record directly in browser
- **Class Management**: Post recitations to specific classes
- **Student Monitoring**: View all student replies and submission status
- **Grading System**: Grade student recitations with comments (0-100 scale)
- **Due Date Management**: Set optional due dates for submissions
- **Real-time Notifications**: Instant notifications when students submit replies

### Student Features
- **Audio Playback**: Listen to teacher recitations with full audio controls
- **Voice Recording**: Record responses directly in browser using MediaRecorder API
- **File Upload**: Upload pre-recorded audio files
- **Progress Tracking**: View submission status and grades
- **Real-time Updates**: Instant notifications for new recitations and grades

### Technical Features
- **Cloudinary Integration**: Secure audio storage with CDN delivery
- **Socket.IO Real-time**: Live notifications and status updates
- **Mobile Responsive**: Works on all devices with touch-friendly controls
- **Audio Validation**: Format and size validation (6MB limit)
- **Progress Tracking**: Upload progress indicators
- **Error Handling**: Comprehensive error handling and user feedback

## 🏗️ Architecture

```
Frontend (React)          Backend (Node.js)         Storage & Services
├── Teacher Panel         ├── Express API           ├── MySQL Database
├── Student Inbox         ├── Socket.IO Server      ├── Cloudinary CDN
├── Audio Player          ├── JWT Authentication    ├── Redis (optional)
├── Media Recorder        ├── Multer Upload         └── File System
└── Real-time Updates     └── Sequelize ORM
```

## 📋 Prerequisites

- Node.js 18+ 
- MySQL 8.0+
- Cloudinary Account (Required)
- Redis (Optional, for sessions)
- Modern browser with MediaRecorder API support

## 🚀 Quick Start

### 1. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

**Required Environment Variables:**
```env
# Database
DB_HOST=localhost
DB_NAME=skcooly_db
DB_USERNAME=root
DB_PASSWORD=your_password

# Cloudinary (REQUIRED)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# JWT
JWT_SECRET=your_jwt_secret
```

### 2. Database Setup

```bash
# Run the complete schema
mysql -u root -p skcooly_db < sql/remote_recitation_schema.sql

# Or run Sequelize migrations
cd elscholar-api
npx sequelize-cli db:migrate
```

### 3. Backend Setup

```bash
cd elscholar-api
npm install
npm run dev
```

### 4. Frontend Setup

```bash
cd elscholar-ui
npm install
npm start
```

### 5. Docker Setup (Alternative)

```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f app
```

## 🗄️ Database Schema

### Tables Created

1. **recitations**
   - Teacher audio posts with metadata
   - Class targeting and due dates
   - Cloudinary audio URLs and formats

2. **recitation_replies** 
   - Student audio responses
   - Submission status tracking
   - AI scoring placeholder

3. **recitation_feedbacks**
   - Teacher grades and comments
   - Grade validation (0-100)

### Key Relationships
```sql
recitations (1) -> (many) recitation_replies
recitation_replies (1) -> (1) recitation_feedbacks
```

## 🔧 API Endpoints

### Teacher Endpoints
```http
POST   /api/recitations              # Create recitation
GET    /api/recitations              # List recitations  
GET    /api/recitations/:id          # Get single recitation
GET    /api/recitations/:id/replies  # Get student replies
POST   /api/replies/:id/feedback     # Grade student reply
```

### Student Endpoints
```http
GET    /api/recitations              # List available recitations
GET    /api/recitations/:id          # View recitation details
POST   /api/recitations/:id/replies  # Submit audio reply
```

### Request Examples

**Create Recitation:**
```javascript
const formData = new FormData();
formData.append('title', 'Surah Al-Fatiha');
formData.append('description', 'Practice the opening chapter');
formData.append('class_id', 'class-1');
formData.append('audio', audioFile);
formData.append('due_date', '2024-12-31T23:59:59');

fetch('/api/recitations', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});
```

**Submit Reply:**
```javascript
const formData = new FormData();
formData.append('audio', recordedAudioFile);
formData.append('transcript', 'Optional transcription');

fetch(`/api/recitations/${recitationId}/replies`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});
```

## 🔌 Socket.IO Events

### Server -> Client Events
```javascript
// New recitation posted
socket.on('recitation:new', (data) => {
  // { recitation_id, title, teacher_id, class_id, due_date }
});

// Student submitted reply
socket.on('recitation:reply', (data) => {
  // { reply_id, recitation_id, student_id, recitation_title }
});

// Teacher graded reply
socket.on('recitation:graded', (data) => {
  // { reply_id, recitation_id, grade, has_comment }
});
```

### Client -> Server Events
```javascript
// Join class room (teachers)
socket.emit('join:class', classId);

// Audio playback status
socket.emit('audio:playing', { recitation_id, position });

// Typing indicator for feedback
socket.emit('feedback:typing', { reply_id, is_typing });
```

## 🎵 Audio Handling

### Supported Formats
- **webm** (preferred for recording)
- **mp3** (widely supported)
- **m4a** (Apple devices)
- **ogg** (open source)
- **wav** (uncompressed)

### File Constraints
- **Maximum Size**: 6MB (configurable)
- **Quality**: 44.1kHz sample rate recommended
- **Encoding**: Opus codec for webm

### Cloudinary Configuration
```javascript
// Upload settings
{
  resource_type: 'video',  // Required for audio files
  folder: 'recitations',
  allowed_formats: ['webm', 'mp3', 'm4a', 'ogg', 'wav'],
  max_file_size: 6 * 1024 * 1024
}
```

## 🧪 Testing

### Backend Tests
```bash
cd elscholar-api
npm test

# Run specific test suite
npm test -- --grep "recitations"

# Test with coverage
npm run test:coverage
```

### Frontend Tests
```bash
cd elscholar-ui
npm test

# Run E2E tests
npm run test:e2e
```

### Manual Testing Checklist

**Teacher Flow:**
- [ ] Create recitation with audio upload
- [ ] Create recitation with browser recording
- [ ] View student replies
- [ ] Grade student submissions
- [ ] Receive real-time notifications

**Student Flow:**
- [ ] View available recitations
- [ ] Play teacher audio
- [ ] Record audio reply
- [ ] Upload audio file
- [ ] View grades and feedback

## 🚀 Deployment

### Production Deployment

1. **Environment Setup**
```bash
# Set production environment
export NODE_ENV=production

# Configure Cloudinary
export CLOUDINARY_CLOUD_NAME=your_prod_cloud
export CLOUDINARY_API_KEY=your_prod_key
export CLOUDINARY_API_SECRET=your_prod_secret
```

2. **Database Migration**
```bash
# Run production migrations
NODE_ENV=production npx sequelize-cli db:migrate
```

3. **Docker Deployment**
```bash
# Build production image
docker build -t elite-recitations .

# Run with docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

### Performance Optimization

**Backend:**
- Enable Redis for session storage
- Configure Cloudinary CDN
- Set up database connection pooling
- Enable gzip compression

**Frontend:**
- Lazy load audio components
- Implement audio caching
- Optimize bundle size
- Use service workers for offline support

## 🔒 Security Considerations

### Authentication & Authorization
- JWT token validation on all endpoints
- Role-based access control (Teacher/Student)
- File upload validation and sanitization

### Audio Security
- File type validation
- Size limit enforcement
- Cloudinary secure URLs
- Audio content scanning (future)

### Data Protection
- Encrypted audio storage
- GDPR compliance ready
- Audit trail logging
- Secure file deletion

## 🐛 Troubleshooting

### Common Issues

**Audio Recording Not Working:**
```javascript
// Check browser support
if (!navigator.mediaDevices || !window.MediaRecorder) {
  console.error('Browser does not support audio recording');
}

// Check microphone permissions
navigator.mediaDevices.getUserMedia({ audio: true })
  .then(stream => console.log('Microphone access granted'))
  .catch(err => console.error('Microphone access denied:', err));
```

**Cloudinary Upload Errors:**
```bash
# Verify credentials
curl -X POST \
  https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/image/upload \
  -F "upload_preset=YOUR_PRESET" \
  -F "file=@test.jpg"
```

**Socket.IO Connection Issues:**
```javascript
// Debug connection
socket.on('connect', () => console.log('Connected to server'));
socket.on('disconnect', () => console.log('Disconnected from server'));
socket.on('connect_error', (error) => console.error('Connection error:', error));
```

### Performance Issues

**Large Audio Files:**
- Implement audio compression
- Use progressive upload
- Add upload resumption

**Database Performance:**
- Add proper indexes
- Implement query optimization
- Use database connection pooling

## 📊 Monitoring & Analytics

### Key Metrics
- Audio upload success rate
- Average recording duration
- Student participation rate
- Teacher grading response time

### Logging
```javascript
// Enable debug logging
DEBUG=elite:* npm start

// Monitor upload performance
console.time('audio-upload');
// ... upload logic
console.timeEnd('audio-upload');
```

## 🔄 Future Enhancements

### Planned Features
- [ ] AI-powered pronunciation scoring
- [ ] Audio transcription with speech-to-text
- [ ] Offline recording capability
- [ ] Audio waveform visualization
- [ ] Batch grading interface
- [ ] Advanced analytics dashboard
- [ ] Mobile app integration
- [ ] Multi-language support

### Technical Improvements
- [ ] WebRTC for real-time audio streaming
- [ ] Progressive Web App (PWA) support
- [ ] Advanced audio processing
- [ ] Automated backup system
- [ ] Load balancing for high traffic
- [ ] CDN optimization

## 📞 Support

### Documentation
- API Documentation: `/docs/api`
- Component Documentation: `/docs/components`
- Database Schema: `/docs/database`

### Getting Help
- GitHub Issues: Report bugs and feature requests
- Email Support: support@elitescholar.com
- Documentation: https://docs.elitescholar.com

### Contributing
1. Fork the repository
2. Create feature branch
3. Add tests for new functionality
4. Submit pull request with detailed description

---

**Built with ❤️ for Elite Scholar School Management System**

*Last Updated: December 2024*

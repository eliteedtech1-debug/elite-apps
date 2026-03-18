# Smart Chatbot Update Plan - Elite Scholar

> **Goal:** Enable chatbot to intelligently answer "how-to" questions about school management tasks
> 
> **Example:** "How to add subject" → Provide step-by-step guide with navigation links

---

## 📋 Overview

Transform the chatbot from a generic responder to an intelligent assistant that:
1. Understands school management terminology
2. Provides step-by-step instructions
3. Links directly to relevant pages
4. Offers contextual help based on user role

---

## 🎯 Phase 1: Knowledge Base Creation

### 1.1 Route-to-Task Mapping Database

Create a comprehensive mapping of common tasks to routes:

```sql
CREATE TABLE chatbot_task_routes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  task_name VARCHAR(255) NOT NULL,
  task_keywords TEXT, -- JSON array of keywords
  route_path VARCHAR(255) NOT NULL,
  route_name VARCHAR(100),
  user_roles TEXT, -- JSON array: ["admin", "teacher", "parent"]
  category VARCHAR(50), -- "academic", "financial", "hrm", "student"
  steps TEXT, -- JSON array of step-by-step instructions
  prerequisites TEXT, -- What needs to be done first
  related_tasks TEXT, -- JSON array of related task IDs
  video_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_keywords (task_keywords(100)),
  INDEX idx_category (category),
  INDEX idx_roles (user_roles(100))
);
```

### 1.2 Initial Knowledge Base Entries

**Academic Tasks:**
```json
{
  "task_name": "Add Subject",
  "task_keywords": ["add subject", "create subject", "new subject", "subject setup"],
  "route_path": "/academic/subjects",
  "route_name": "Subjects",
  "user_roles": ["admin", "branch_admin"],
  "category": "academic",
  "steps": [
    "Navigate to Academic → Subjects",
    "Click the 'Add Subject' button",
    "Fill in subject name and code",
    "Select subject category (if applicable)",
    "Click 'Save' to create the subject"
  ],
  "prerequisites": "Ensure classes are already set up",
  "related_tasks": ["assign_subject_to_class", "assign_teacher_to_subject"]
}
```

```json
{
  "task_name": "Assign Subject to Teacher",
  "task_keywords": ["assign subject", "teacher subject", "subject assignment", "give teacher subject"],
  "route_path": "/teacher/teacher-list",
  "route_name": "teacherList",
  "user_roles": ["admin", "branch_admin"],
  "category": "academic",
  "steps": [
    "Navigate to Personal Data Mngr → Staff List",
    "Find the teacher in the list",
    "Click the three-dot menu (⋮) next to the teacher",
    "Select 'Assign Subjects'",
    "View current subject assignments at the top",
    "Select a class from the dropdown to add more subjects",
    "Check the subjects you want to assign",
    "Click 'Assign' to save",
    "To remove a subject, click the red X on the subject tag"
  ],
  "prerequisites": "Teacher must be added, Classes and Subjects must exist",
  "related_tasks": ["add_teacher", "add_subject", "create_class"]
}
```

**Student Management:**
```json
{
  "task_name": "Add Student",
  "task_keywords": ["add student", "register student", "new student", "enroll student"],
  "route_path": "/student/add-student",
  "route_name": "addStudent",
  "user_roles": ["admin", "branch_admin"],
  "category": "student",
  "steps": [
    "Navigate to Personal Data Mngr → Add Student",
    "Fill in student personal information",
    "Select class and section",
    "Add parent/guardian details",
    "Upload student photo (optional)",
    "Set admission date and student ID",
    "Click 'Submit' to register"
  ],
  "prerequisites": "Classes must be set up, Fee structure should be configured",
  "related_tasks": ["student_promotion", "assign_fees"]
}
```

**Financial Tasks:**
```json
{
  "task_name": "Collect Fees",
  "task_keywords": ["collect fees", "payment", "receive payment", "fee collection"],
  "route_path": "/management/collect-fees",
  "route_name": "collectFees",
  "user_roles": ["admin", "branch_admin", "accountant"],
  "category": "financial",
  "steps": [
    "Navigate to Management → Collect Fees",
    "Search for student by name or ID",
    "View outstanding bills",
    "Enter payment amount",
    "Select payment method (Cash/Bank/Card)",
    "Add payment reference (optional)",
    "Click 'Process Payment'",
    "Print receipt if needed"
  ],
  "prerequisites": "Student must have bills generated",
  "related_tasks": ["generate_bills", "view_payment_history"]
}
```

**Staff Management:**
```json
{
  "task_name": "Add Teacher/Staff",
  "task_keywords": ["add teacher", "add staff", "new teacher", "register teacher", "hire teacher"],
  "route_path": "/teacher/add-teacher",
  "route_name": "addTeacher",
  "user_roles": ["admin", "branch_admin"],
  "category": "hrm",
  "steps": [
    "Navigate to Personal Data Mngr → Add Teacher",
    "Fill in personal information",
    "Select staff type (Teaching/Non-Teaching)",
    "Select staff role (Teacher/Admin/etc)",
    "Add contact details and email",
    "Set employment date",
    "Upload passport photo",
    "Add bank details for payroll",
    "Click 'Submit' to create staff account"
  ],
  "prerequisites": "Departments should be set up",
  "related_tasks": ["assign_subjects", "set_salary", "assign_role"]
}
```

---

## 🧠 Phase 2: Natural Language Processing

### 2.1 Intent Recognition Service

Create `chatbotNLPService.js`:

```javascript
const natural = require('natural');
const tokenizer = new natural.WordTokenizer();
const TfIdf = natural.TfIdf;

class ChatbotNLPService {
  constructor() {
    this.tfidf = new TfIdf();
    this.taskDatabase = [];
  }

  // Load tasks from database
  async loadTasks(db) {
    const tasks = await db.sequelize.query(
      `SELECT * FROM chatbot_task_routes WHERE 1=1`,
      { type: db.sequelize.QueryTypes.SELECT }
    );
    
    this.taskDatabase = tasks;
    
    // Build TF-IDF index
    tasks.forEach(task => {
      const keywords = JSON.parse(task.task_keywords || '[]');
      this.tfidf.addDocument(keywords.join(' '));
    });
  }

  // Match user query to task
  matchQuery(userQuery, userRole = null) {
    const tokens = tokenizer.tokenize(userQuery.toLowerCase());
    const queryText = tokens.join(' ');
    
    const scores = [];
    this.tfidf.tfidfs(queryText, (i, measure) => {
      const task = this.taskDatabase[i];
      
      // Filter by user role
      if (userRole) {
        const allowedRoles = JSON.parse(task.user_roles || '[]');
        if (!allowedRoles.includes(userRole)) {
          return;
        }
      }
      
      scores.push({
        task,
        score: measure,
        confidence: this.calculateConfidence(tokens, task)
      });
    });
    
    // Sort by score
    scores.sort((a, b) => b.score - a.score);
    
    return scores[0] || null;
  }

  // Calculate confidence based on keyword matching
  calculateConfidence(tokens, task) {
    const keywords = JSON.parse(task.task_keywords || '[]');
    let matches = 0;
    
    tokens.forEach(token => {
      if (keywords.some(kw => kw.includes(token) || token.includes(kw))) {
        matches++;
      }
    });
    
    return matches / tokens.length;
  }

  // Extract entities (class names, subject names, etc.)
  extractEntities(query) {
    const entities = {
      class: null,
      subject: null,
      student: null,
      teacher: null
    };
    
    // Simple pattern matching (can be enhanced with NER)
    const classMatch = query.match(/class\s+(\w+)/i);
    if (classMatch) entities.class = classMatch[1];
    
    const subjectMatch = query.match(/subject\s+(\w+)/i);
    if (subjectMatch) entities.subject = subjectMatch[1];
    
    return entities;
  }
}

module.exports = new ChatbotNLPService();
```

### 2.2 Response Generator

Create `chatbotResponseService.js`:

```javascript
class ChatbotResponseService {
  // Generate step-by-step response
  generateTaskResponse(matchedTask, userQuery, baseUrl = 'http://localhost:3000') {
    if (!matchedTask || matchedTask.confidence < 0.3) {
      return this.generateFallbackResponse(userQuery);
    }

    const task = matchedTask.task;
    const steps = JSON.parse(task.steps || '[]');
    const prerequisites = task.prerequisites;
    
    let response = `### How to ${task.task_name}\n\n`;
    
    // Add prerequisites if any
    if (prerequisites) {
      response += `**Prerequisites:** ${prerequisites}\n\n`;
    }
    
    // Add navigation link
    response += `**Quick Access:** [Go to ${task.task_name}](${baseUrl}${task.route_path})\n\n`;
    
    // Add steps
    response += `**Steps:**\n`;
    steps.forEach((step, index) => {
      response += `${index + 1}. ${step}\n`;
    });
    
    // Add related tasks
    if (task.related_tasks) {
      response += `\n**Related Tasks:**\n`;
      const relatedIds = JSON.parse(task.related_tasks);
      // Fetch and display related tasks
      response += `- View related help topics\n`;
    }
    
    // Add video if available
    if (task.video_url) {
      response += `\n**Video Tutorial:** [Watch here](${task.video_url})\n`;
    }
    
    response += `\n---\n*Need more help? Type "help" or ask another question.*`;
    
    return {
      success: true,
      message: response,
      task_name: task.task_name,
      route: task.route_path,
      confidence: matchedTask.confidence
    };
  }

  // Fallback response with suggestions
  generateFallbackResponse(userQuery) {
    return {
      success: false,
      message: `I'm not sure I understand that. Could you please rephrase your question?\n\n**Try asking:**\n- "How to add a subject?"\n- "How to assign subjects to teacher?"\n- "How to collect fees?"\n- "How to add a student?"\n\nOr type "help" to see all available topics.`,
      suggestions: [
        'How to add a subject?',
        'How to assign subjects to teacher?',
        'How to collect fees?',
        'How to add a student?'
      ]
    };
  }

  // Generate help menu
  generateHelpMenu(userRole = null) {
    const categories = {
      academic: 'Academic Management',
      student: 'Student Management',
      financial: 'Financial Management',
      hrm: 'Staff Management'
    };
    
    let response = `### Available Help Topics\n\n`;
    
    Object.entries(categories).forEach(([key, label]) => {
      response += `**${label}**\n`;
      response += `- Type "help ${key}" to see ${key} tasks\n\n`;
    });
    
    return {
      success: true,
      message: response
    };
  }
}

module.exports = new ChatbotResponseService();
```

---

## 🔌 Phase 3: API Integration

### 3.1 Chatbot Controller

Create/Update `chatbotController.js`:

```javascript
const nlpService = require('../services/chatbotNLPService');
const responseService = require('../services/chatbotResponseService');
const db = require('../models');

// Initialize NLP service on server start
let isInitialized = false;

const initializeChatbot = async () => {
  if (!isInitialized) {
    await nlpService.loadTasks(db);
    isInitialized = true;
    console.log('✅ Chatbot NLP service initialized');
  }
};

// Main chat endpoint
exports.chat = async (req, res) => {
  try {
    await initializeChatbot();
    
    const { message, conversation_id } = req.body;
    const userRole = req.user?.user_type?.toLowerCase();
    const school_id = req.user?.school_id;
    
    // Log conversation
    await db.sequelize.query(
      `INSERT INTO chatbot_conversations (user_id, school_id, message, user_role, conversation_id)
       VALUES (:user_id, :school_id, :message, :user_role, :conversation_id)`,
      {
        replacements: {
          user_id: req.user?.id,
          school_id,
          message,
          user_role: userRole,
          conversation_id: conversation_id || null
        }
      }
    );
    
    // Handle special commands
    if (message.toLowerCase() === 'help') {
      const helpResponse = responseService.generateHelpMenu(userRole);
      return res.json(helpResponse);
    }
    
    // Match query to task
    const matchedTask = nlpService.matchQuery(message, userRole);
    
    // Generate response
    const response = responseService.generateTaskResponse(
      matchedTask,
      message,
      req.headers.origin || 'http://localhost:3000'
    );
    
    // Log bot response
    await db.sequelize.query(
      `INSERT INTO chatbot_conversations (user_id, school_id, message, user_role, conversation_id, is_bot)
       VALUES (:user_id, :school_id, :message, :user_role, :conversation_id, 1)`,
      {
        replacements: {
          user_id: req.user?.id,
          school_id,
          message: response.message,
          user_role: 'bot',
          conversation_id: conversation_id || null
        }
      }
    );
    
    res.json(response);
    
  } catch (error) {
    console.error('Chatbot error:', error);
    res.status(500).json({
      success: false,
      message: 'Sorry, I encountered an error. Please try again.',
      error: error.message
    });
  }
};

// Get conversation history
exports.getConversationHistory = async (req, res) => {
  try {
    const { conversation_id } = req.params;
    const user_id = req.user?.id;
    
    const history = await db.sequelize.query(
      `SELECT * FROM chatbot_conversations 
       WHERE conversation_id = :conversation_id 
       AND (user_id = :user_id OR is_bot = 1)
       ORDER BY created_at ASC`,
      {
        replacements: { conversation_id, user_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );
    
    res.json({
      success: true,
      data: history
    });
    
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversation history'
    });
  }
};

// Admin: Add/Update task
exports.manageTask = async (req, res) => {
  try {
    const {
      task_name,
      task_keywords,
      route_path,
      route_name,
      user_roles,
      category,
      steps,
      prerequisites,
      related_tasks,
      video_url
    } = req.body;
    
    await db.sequelize.query(
      `INSERT INTO chatbot_task_routes 
       (task_name, task_keywords, route_path, route_name, user_roles, category, steps, prerequisites, related_tasks, video_url)
       VALUES (:task_name, :task_keywords, :route_path, :route_name, :user_roles, :category, :steps, :prerequisites, :related_tasks, :video_url)
       ON DUPLICATE KEY UPDATE
       task_keywords = VALUES(task_keywords),
       route_path = VALUES(route_path),
       steps = VALUES(steps),
       updated_at = CURRENT_TIMESTAMP`,
      {
        replacements: {
          task_name,
          task_keywords: JSON.stringify(task_keywords),
          route_path,
          route_name,
          user_roles: JSON.stringify(user_roles),
          category,
          steps: JSON.stringify(steps),
          prerequisites,
          related_tasks: JSON.stringify(related_tasks || []),
          video_url
        }
      }
    );
    
    // Reload NLP service
    isInitialized = false;
    await initializeChatbot();
    
    res.json({
      success: true,
      message: 'Task added/updated successfully'
    });
    
  } catch (error) {
    console.error('Error managing task:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to manage task'
    });
  }
};
```

### 3.2 Routes

Add to `chatbot.js` routes:

```javascript
const express = require('express');
const router = express.Router();
const passport = require('passport');
const chatbotController = require('../controllers/chatbotController');

module.exports = (app) => {
  // Chat endpoint
  app.post(
    '/api/chatbot/chat',
    passport.authenticate('jwt', { session: false }),
    chatbotController.chat
  );
  
  // Get conversation history
  app.get(
    '/api/chatbot/conversation/:conversation_id',
    passport.authenticate('jwt', { session: false }),
    chatbotController.getConversationHistory
  );
  
  // Admin: Manage tasks
  app.post(
    '/api/chatbot/tasks',
    passport.authenticate('jwt', { session: false }),
    chatbotController.manageTask
  );
};
```

---

## 🎨 Phase 4: Frontend Integration

### 4.1 Enhanced Chatbot Component

Create `SmartChatbot.tsx`:

```typescript
import React, { useState, useEffect, useRef } from 'react';
import { Input, Button, Card, Avatar, Spin, Tag } from 'antd';
import { SendOutlined, RobotOutlined, UserOutlined } from '@ant-design/icons';
import { _post, _get } from '../../Utils/Helper';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
  route?: string;
  confidence?: number;
}

const SmartChatbot: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId] = useState(() => `conv_${Date.now()}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Welcome message
    setMessages([{
      id: '1',
      text: 'Hello! I\'m your Elite Scholar assistant. Ask me how to do something, like "How to add a subject?" or type "help" to see what I can do.',
      isBot: true,
      timestamp: new Date()
    }]);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      isBot: false,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    _post(
      'api/chatbot/chat',
      { message: input, conversation_id: conversationId },
      (res) => {
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: res.message,
          isBot: true,
          timestamp: new Date(),
          route: res.route,
          confidence: res.confidence
        };
        setMessages(prev => [...prev, botMessage]);
        setLoading(false);
      },
      (err) => {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: 'Sorry, I encountered an error. Please try again.',
          isBot: true,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
        setLoading(false);
      }
    );
  };

  const handleQuickAction = (route: string) => {
    navigate(route);
  };

  return (
    <Card 
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <RobotOutlined style={{ fontSize: 20 }} />
          <span>Elite Scholar Assistant</span>
        </div>
      }
      style={{ height: '600px', display: 'flex', flexDirection: 'column' }}
    >
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', marginBottom: '16px' }}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              justifyContent: msg.isBot ? 'flex-start' : 'flex-end',
              marginBottom: '16px'
            }}
          >
            <div style={{ display: 'flex', gap: 8, maxWidth: '70%' }}>
              {msg.isBot && <Avatar icon={<RobotOutlined />} />}
              <div>
                <Card
                  size="small"
                  style={{
                    backgroundColor: msg.isBot ? '#f0f0f0' : '#1890ff',
                    color: msg.isBot ? '#000' : '#fff'
                  }}
                >
                  {msg.isBot ? (
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  ) : (
                    <p style={{ margin: 0 }}>{msg.text}</p>
                  )}
                  {msg.route && (
                    <Button
                      type="link"
                      size="small"
                      onClick={() => handleQuickAction(msg.route!)}
                      style={{ padding: 0, marginTop: 8 }}
                    >
                      Go to page →
                    </Button>
                  )}
                </Card>
                {msg.confidence && msg.confidence < 0.5 && (
                  <Tag color="orange" style={{ marginTop: 4 }}>
                    Low confidence - verify steps
                  </Tag>
                )}
              </div>
              {!msg.isBot && <Avatar icon={<UserOutlined />} />}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ textAlign: 'center' }}>
            <Spin />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Input
          placeholder="Ask me anything..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onPressEnter={handleSend}
          disabled={loading}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSend}
          loading={loading}
        >
          Send
        </Button>
      </div>
    </Card>
  );
};

export default SmartChatbot;
```

---

## 📊 Phase 5: Analytics & Improvement

### 5.1 Track Common Questions

```sql
CREATE TABLE chatbot_analytics (
  id INT PRIMARY KEY AUTO_INCREMENT,
  query TEXT,
  matched_task_id INT,
  confidence DECIMAL(3,2),
  user_role VARCHAR(50),
  was_helpful BOOLEAN,
  feedback TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_task (matched_task_id),
  INDEX idx_confidence (confidence)
);
```

### 5.2 Admin Dashboard for Chatbot Management

Show:
- Most asked questions
- Low confidence matches (need improvement)
- Unmatched queries (add new tasks)
- User feedback

---

## 🚀 Implementation Timeline

### Week 1: Database & Knowledge Base
- [ ] Create database tables
- [ ] Populate initial 50+ common tasks
- [ ] Test data structure

### Week 2: Backend Services
- [ ] Implement NLP service
- [ ] Create response generator
- [ ] Build API endpoints
- [ ] Test matching accuracy

### Week 3: Frontend Integration
- [ ] Build smart chatbot component
- [ ] Add markdown rendering
- [ ] Implement quick actions
- [ ] Mobile responsive design

### Week 4: Testing & Refinement
- [ ] User testing
- [ ] Improve matching algorithms
- [ ] Add more tasks based on feedback
- [ ] Performance optimization

---

## 📦 Required Dependencies

```json
{
  "natural": "^6.0.0",
  "react-markdown": "^8.0.0"
}
```

Install:
```bash
cd elscholar-api && npm install natural
cd ../elscholar-ui && npm install react-markdown
```

---

## 🎯 Success Metrics

- **Match Accuracy:** >80% of queries correctly matched
- **User Satisfaction:** >4/5 rating
- **Task Completion:** Users successfully complete tasks after chatbot guidance
- **Response Time:** <500ms for query matching

---

## 🔄 Continuous Improvement

1. **Weekly Review:** Analyze unmatched queries
2. **Monthly Updates:** Add new tasks based on user needs
3. **Quarterly Training:** Retrain NLP model with new data
4. **User Feedback:** Collect and implement suggestions

---

*Last Updated: 2026-03-05*
*Version: 1.0*

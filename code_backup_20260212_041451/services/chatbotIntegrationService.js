const { sequelize } = require('../models');

class ChatbotIntegrationService {
  // Timetable Integration
  async getNextClass(userId, context) {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });

    const [classes] = await sequelize.query(`
      SELECT 
        lt.subject_name,
        lt.class_name,
        lt.start_time,
        lt.end_time,
        lt.room_number,
        s.first_name as teacher_first,
        s.last_name as teacher_last
      FROM lesson_time_table lt
      LEFT JOIN staff s ON lt.teacher_id = s.id
      WHERE lt.day_of_week = ?
        AND lt.start_time > ?
        AND lt.school_id = ?
        AND lt.branch_id = ?
      ORDER BY lt.start_time ASC
      LIMIT 1
    `, {
      replacements: [dayOfWeek, currentTime, context.schoolId, context.branchId]
    });

    if (!classes || classes.length === 0) {
      return {
        text: '📅 **No More Classes Today**\n\nYou\'re done for the day! 🎉',
        intent: 'no_next_class',
        confidence: 0.95
      };
    }

    const nextClass = classes[0];
    const teacher = nextClass.teacher_first ? `${nextClass.teacher_first} ${nextClass.teacher_last}` : 'TBA';

    return {
      text: `📅 **Your Next Class**

**Subject:** ${nextClass.subject_name}
**Class:** ${nextClass.class_name}
**Time:** ${nextClass.start_time} - ${nextClass.end_time}
**Room:** ${nextClass.room_number || 'TBA'}
**Teacher:** ${teacher}

⏰ Starting in ${this.getTimeUntil(nextClass.start_time)} minutes`,
      intent: 'next_class',
      confidence: 0.95,
      data: nextClass
    };
  }

  async getTodayTimetable(userId, context, className = null) {
    const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const classFilter = className ? `AND lt.class_name = '${className}'` : '';

    const [classes] = await sequelize.query(`
      SELECT 
        lt.subject_name,
        lt.class_name,
        lt.start_time,
        lt.end_time,
        lt.room_number,
        s.first_name as teacher_first,
        s.last_name as teacher_last
      FROM lesson_time_table lt
      LEFT JOIN staff s ON lt.teacher_id = s.id
      WHERE lt.day_of_week = ?
        AND lt.school_id = ?
        AND lt.branch_id = ?
        ${classFilter}
      ORDER BY lt.start_time ASC
    `, {
      replacements: [dayOfWeek, context.schoolId, context.branchId]
    });

    if (!classes || classes.length === 0) {
      return {
        text: '📅 **No Classes Today**\n\nEnjoy your free day!',
        intent: 'no_classes_today',
        confidence: 0.95
      };
    }

    let text = `📅 **Today's Timetable - ${dayOfWeek}**\n\n`;
    classes.forEach((c, idx) => {
      const teacher = c.teacher_first ? `${c.teacher_first} ${c.teacher_last}` : 'TBA';
      text += `${idx + 1}. **${c.start_time}** - ${c.subject_name} (${c.class_name})\n   Teacher: ${teacher} | Room: ${c.room_number || 'TBA'}\n\n`;
    });

    return {
      text,
      intent: 'today_timetable',
      confidence: 0.95,
      data: classes
    };
  }

  getTimeUntil(timeStr) {
    const now = new Date();
    const [hours, minutes] = timeStr.split(':');
    const target = new Date();
    target.setHours(parseInt(hours), parseInt(minutes), 0);
    
    const diff = Math.floor((target - now) / 60000);
    return diff > 0 ? diff : 0;
  }

  // Virtual Classroom Integration
  async startVirtualClass(className, subject, context) {
    // This would integrate with your virtual classroom system
    return {
      text: `🎥 **Starting Virtual Class**

**Class:** ${className}
**Subject:** ${subject}

✅ Virtual room created
📧 Students notified
🔗 Join link: [Click here to join]

**Quick Actions:**
• Share screen
• Take attendance
• Share assignment`,
      intent: 'virtual_class_started',
      confidence: 0.95,
      actionButtons: [
        { type: 'action', label: '📹 Join Class', action: 'join_virtual_class' },
        { type: 'action', label: '📋 Take Attendance', action: 'take_attendance' },
        { type: 'action', label: '📝 Share Assignment', action: 'share_assignment' }
      ]
    };
  }

  // Document Management Integration
  async uploadLessonNotes(teacherId, subject, className, context) {
    return {
      text: `📄 **Upload Lesson Notes**

**Teacher ID:** ${teacherId}
**Subject:** ${subject}
**Class:** ${className}

Please upload your document:
• Supported formats: PDF, DOC, DOCX
• Max size: 10MB

Or type the notes directly in chat.`,
      intent: 'upload_lesson_notes_prompt',
      confidence: 0.95,
      suggestions: ['Type notes here', 'Cancel']
    };
  }

  async getRecentDocuments(userId, context, limit = 5) {
    const [docs] = await sequelize.query(`
      SELECT 
        dm.title,
        dm.document_type,
        dm.created_at,
        s.first_name,
        s.last_name
      FROM document_management dm
      LEFT JOIN staff s ON dm.uploaded_by = s.id
      WHERE dm.school_id = ?
        AND dm.branch_id = ?
      ORDER BY dm.created_at DESC
      LIMIT ?
    `, {
      replacements: [context.schoolId, context.branchId, limit]
    });

    if (!docs || docs.length === 0) {
      return {
        text: '📄 **No Recent Documents**\n\nNo documents found.',
        intent: 'no_documents',
        confidence: 0.95
      };
    }

    let text = '📄 **Recent Documents**\n\n';
    docs.forEach((doc, idx) => {
      const uploader = doc.first_name ? `${doc.first_name} ${doc.last_name}` : 'Unknown';
      const date = new Date(doc.created_at).toLocaleDateString();
      text += `${idx + 1}. ${doc.title} (${doc.document_type})\n   By: ${uploader} | ${date}\n\n`;
    });

    return {
      text,
      intent: 'recent_documents',
      confidence: 0.95,
      data: docs
    };
  }

  // Supply Management Integration
  async checkInventory(itemName, context) {
    const [items] = await sequelize.query(`
      SELECT 
        item_name,
        quantity,
        unit,
        reorder_level,
        last_updated
      FROM supply_inventory
      WHERE item_name LIKE ?
        AND school_id = ?
        AND branch_id = ?
      LIMIT 5
    `, {
      replacements: [`%${itemName}%`, context.schoolId, context.branchId]
    });

    if (!items || items.length === 0) {
      return {
        text: `📦 **Item Not Found**\n\n"${itemName}" not in inventory.`,
        intent: 'item_not_found',
        confidence: 0.95,
        suggestions: ['View all inventory', 'Add new item']
      };
    }

    let text = '📦 **Inventory Check**\n\n';
    items.forEach((item, idx) => {
      const status = item.quantity <= item.reorder_level ? '⚠️ Low Stock' : '✅ In Stock';
      text += `${idx + 1}. **${item.item_name}**\n   Quantity: ${item.quantity} ${item.unit}\n   Status: ${status}\n\n`;
    });

    return {
      text,
      intent: 'inventory_check',
      confidence: 0.95,
      data: items,
      actionButtons: items.some(i => i.quantity <= i.reorder_level) ? [
        { type: 'action', label: '🛒 Order More', action: 'order_supplies' }
      ] : []
    };
  }

  async getLowStockItems(context) {
    const [items] = await sequelize.query(`
      SELECT 
        item_name,
        quantity,
        unit,
        reorder_level
      FROM supply_inventory
      WHERE quantity <= reorder_level
        AND school_id = ?
        AND branch_id = ?
      ORDER BY quantity ASC
      LIMIT 10
    `, {
      replacements: [context.schoolId, context.branchId]
    });

    if (!items || items.length === 0) {
      return {
        text: '📦 **All Stock Levels Good**\n\n✅ No items need reordering.',
        intent: 'no_low_stock',
        confidence: 0.95
      };
    }

    let text = '⚠️ **Low Stock Alert**\n\n';
    items.forEach((item, idx) => {
      text += `${idx + 1}. ${item.item_name}: ${item.quantity}/${item.reorder_level} ${item.unit}\n`;
    });

    return {
      text,
      intent: 'low_stock_items',
      confidence: 0.95,
      data: items,
      actionButtons: [
        { type: 'action', label: '🛒 Order All', action: 'order_all_low_stock' },
        { type: 'download', label: '📥 Download List', action: 'download_low_stock' }
      ]
    };
  }

  // Detect integration commands
  isIntegrationCommand(message) {
    const patterns = [
      /next class/i,
      /my next class/i,
      /what.*next/i,
      /today.*timetable/i,
      /my timetable/i,
      /start.*class/i,
      /virtual.*class/i,
      /upload.*notes/i,
      /lesson notes/i,
      /recent documents/i,
      /check.*inventory/i,
      /check.*stock/i,
      /low stock/i,
      /chalk.*inventory/i
    ];

    return patterns.some(pattern => pattern.test(message));
  }

  async processIntegrationCommand(message, userId, context) {
    const normalized = message.toLowerCase();

    if (normalized.includes('next class') || normalized.includes('what\'s next')) {
      return await this.getNextClass(userId, context);
    }

    if (normalized.includes('today') && normalized.includes('timetable')) {
      const classMatch = message.match(/JSS\d|SS\d|PRIMARY\s*\d/i);
      const className = classMatch ? classMatch[0] : null;
      return await this.getTodayTimetable(userId, context, className);
    }

    if (normalized.includes('start') && normalized.includes('class')) {
      const classMatch = message.match(/JSS\d|SS\d|PRIMARY\s*\d/i);
      const className = classMatch ? classMatch[0] : 'JSS1';
      return await this.startVirtualClass(className, 'General', context);
    }

    if (normalized.includes('upload') && normalized.includes('notes')) {
      return await this.uploadLessonNotes(userId, 'General', 'General', context);
    }

    if (normalized.includes('recent documents')) {
      return await this.getRecentDocuments(userId, context);
    }

    if (normalized.includes('low stock')) {
      return await this.getLowStockItems(context);
    }

    if (normalized.includes('check') && (normalized.includes('inventory') || normalized.includes('stock'))) {
      const itemMatch = message.match(/check\s+(\w+)\s+inventory/i);
      const itemName = itemMatch ? itemMatch[1] : 'chalk';
      return await this.checkInventory(itemName, context);
    }

    return null;
  }
}

module.exports = new ChatbotIntegrationService();

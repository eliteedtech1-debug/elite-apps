#!/bin/bash
# Create missing Sequelize models from database tables

set -e

DB_USER="root"
SOURCE_DB="full_skcooly"
MODELS_DIR="elscholar-api/src/models/content"

echo "=== Creating Missing Content Models ==="
echo ""

# Function to create model from table schema
create_model() {
  local table_name=$1
  local model_name=$2
  local output_file="$MODELS_DIR/$model_name.js"
  
  if [ -f "$output_file" ]; then
    echo "⚠️  $model_name.js already exists, skipping"
    return
  fi
  
  echo "Creating $model_name.js from $table_name..."
  
  # Get table schema
  local schema=$(mysql -u$DB_USER -e "DESCRIBE $SOURCE_DB.$table_name" 2>/dev/null || echo "")
  
  if [ -z "$schema" ]; then
    echo "❌ Table $table_name not found"
    return
  fi
  
  # Create basic model file
  cat > "$output_file" << EOF
module.exports = (sequelize, DataTypes) => {
  const $model_name = sequelize.define('$model_name', {
    // Auto-generated from $table_name table
    // TODO: Add proper field definitions based on schema
  }, {
    tableName: '$table_name',
    timestamps: true,
    underscored: true
  });

  $model_name.associate = (models) => {
    // TODO: Define associations
  };

  return $model_name;
};
EOF
  
  echo "✓ Created $model_name.js"
}

# Create missing content models
echo "[1/2] Creating content models..."

create_model "lesson_comments" "LessonComment"
create_model "lesson_time_table" "LessonTimeTable"
create_model "syllabus_suggestions" "SyllabusSuggestion"
create_model "student_subjects" "StudentSubject"
create_model "school_subject_mapping" "SchoolSubjectMapping"
create_model "subject_streams" "SubjectStream"
create_model "student_assignments" "StudentAssignment"
create_model "assignment_responses" "AssignmentResponse"
create_model "assignment_question_options" "AssignmentQuestionOption"
create_model "virtual_classroom_participants" "VirtualClassroomParticipant"
create_model "virtual_classroom_attendance" "VirtualClassroomAttendance"
create_model "virtual_classroom_chat_messages" "VirtualClassroomChatMessage"
create_model "virtual_classroom_recordings" "VirtualClassroomRecording"
create_model "virtual_classroom_notifications" "VirtualClassroomNotification"
create_model "teacher_classes" "TeacherClass"
create_model "class_timing" "ClassTiming"

echo ""
echo "[2/2] Creating content/index.js..."

cat > "$MODELS_DIR/index.js" << 'EOF'
const { contentDB } = require('../../config/databases');

// Lessons & Planning
const LessonPlan = require('./LessonPlan')(contentDB, contentDB.Sequelize.DataTypes);
const LessonNote = require('./LessonNote')(contentDB, contentDB.Sequelize.DataTypes);
const LessonPlanReview = require('./LessonPlanReview')(contentDB, contentDB.Sequelize.DataTypes);
const LessonComment = require('./LessonComment')(contentDB, contentDB.Sequelize.DataTypes);
const LessonTimeTable = require('./LessonTimeTable')(contentDB, contentDB.Sequelize.DataTypes);

// Syllabus
const Syllabus = require('./Syllabus')(contentDB, contentDB.Sequelize.DataTypes);
const SyllabusTracker = require('./SyllabusTracker')(contentDB, contentDB.Sequelize.DataTypes);
const SyllabusSuggestion = require('./SyllabusSuggestion')(contentDB, contentDB.Sequelize.DataTypes);

// Subjects
const Subject = require('./Subject')(contentDB, contentDB.Sequelize.DataTypes);
const PredefinedSubject = require('./PredefinedSubject')(contentDB, contentDB.Sequelize.DataTypes);
const StudentSubject = require('./StudentSubject')(contentDB, contentDB.Sequelize.DataTypes);
const SchoolSubjectMapping = require('./SchoolSubjectMapping')(contentDB, contentDB.Sequelize.DataTypes);
const SubjectStream = require('./SubjectStream')(contentDB, contentDB.Sequelize.DataTypes);

// Assignments
const Assignment = require('./Assignment')(contentDB, contentDB.Sequelize.DataTypes);
const StudentAssignment = require('./StudentAssignment')(contentDB, contentDB.Sequelize.DataTypes);
const AssignmentQuestion = require('./AssignmentQuestion')(contentDB, contentDB.Sequelize.DataTypes);
const AssignmentResponse = require('./AssignmentResponse')(contentDB, contentDB.Sequelize.DataTypes);
const AssignmentQuestionOption = require('./AssignmentQuestionOption')(contentDB, contentDB.Sequelize.DataTypes);

// Recitations
const Recitation = require('./Recitation')(contentDB, contentDB.Sequelize.DataTypes);
const RecitationReply = require('./RecitationReply')(contentDB, contentDB.Sequelize.DataTypes);
const RecitationFeedback = require('./RecitationFeedback')(contentDB, contentDB.Sequelize.DataTypes);

// Virtual Classroom
const VirtualClassroom = require('./VirtualClassroom')(contentDB, contentDB.Sequelize.DataTypes);
const VirtualClassroomParticipant = require('./VirtualClassroomParticipant')(contentDB, contentDB.Sequelize.DataTypes);
const VirtualClassroomAttendance = require('./VirtualClassroomAttendance')(contentDB, contentDB.Sequelize.DataTypes);
const VirtualClassroomChatMessage = require('./VirtualClassroomChatMessage')(contentDB, contentDB.Sequelize.DataTypes);
const VirtualClassroomRecording = require('./VirtualClassroomRecording')(contentDB, contentDB.Sequelize.DataTypes);
const VirtualClassroomNotification = require('./VirtualClassroomNotification')(contentDB, contentDB.Sequelize.DataTypes);

// Knowledge Domains
const KnowledgeDomainEnhanced = require('./KnowledgeDomainEnhanced')(contentDB, contentDB.Sequelize.DataTypes);

// Teacher Assignment
const TeacherClass = require('./TeacherClass')(contentDB, contentDB.Sequelize.DataTypes);
const ClassTiming = require('./ClassTiming')(contentDB, contentDB.Sequelize.DataTypes);

const models = {
  LessonPlan,
  LessonNote,
  LessonPlanReview,
  LessonComment,
  LessonTimeTable,
  Syllabus,
  SyllabusTracker,
  SyllabusSuggestion,
  Subject,
  PredefinedSubject,
  StudentSubject,
  SchoolSubjectMapping,
  SubjectStream,
  Assignment,
  StudentAssignment,
  AssignmentQuestion,
  AssignmentResponse,
  AssignmentQuestionOption,
  Recitation,
  RecitationReply,
  RecitationFeedback,
  VirtualClassroom,
  VirtualClassroomParticipant,
  VirtualClassroomAttendance,
  VirtualClassroomChatMessage,
  VirtualClassroomRecording,
  VirtualClassroomNotification,
  KnowledgeDomainEnhanced,
  TeacherClass,
  ClassTiming
};

// Define associations
Object.values(models).forEach(model => {
  if (model.associate) {
    model.associate(models);
  }
});

module.exports = {
  sequelize: contentDB,
  ...models
};
EOF

echo "✓ Created content/index.js"
echo ""
echo "=== Complete ===" 
echo ""
echo "Created models in: $MODELS_DIR"
echo ""
echo "Next steps:"
echo "1. Move existing models to content/ directory"
echo "2. Update field definitions in new models"
echo "3. Define associations"
echo "4. Update config/databases.js to add contentDB"

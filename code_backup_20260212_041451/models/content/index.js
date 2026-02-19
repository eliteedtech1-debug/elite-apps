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
// REMOVED: KnowledgeDomainEnhanced (table dropped, no longer in use)

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

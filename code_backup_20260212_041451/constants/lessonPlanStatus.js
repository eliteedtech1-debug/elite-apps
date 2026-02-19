// Lesson Plan Status Constants
export const LESSON_PLAN_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  REJECTED: 'rejected'
};

export const REVIEW_STATUS = {
  APPROVED: 'approved',
  REJECTED: 'rejected'
};

export const VALID_STATUSES = Object.values(LESSON_PLAN_STATUS);
export const VALID_REVIEW_STATUSES = Object.values(REVIEW_STATUS);

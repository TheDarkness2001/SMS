const EventEmitter = require('events');

class NotificationEmitter extends EventEmitter {}

// Single shared emitter instance for notification-related events
const notificationEmitter = new NotificationEmitter();

/**
 * Helper to emit notification events from controllers/services
 *
 * @param {('ATTENDANCE_LATE'|'ATTENDANCE_ABSENT'|'TEACHER_FEEDBACK')} eventType
 * @param {Object} envelope - Generic event envelope containing studentId, payload, etc.
 */
function emitNotificationEvent(eventType, envelope) {
  notificationEmitter.emit(eventType, envelope);
}

module.exports = {
  notificationEmitter,
  emitNotificationEvent
};

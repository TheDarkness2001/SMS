const { notificationEmitter } = require('./notificationEvents');
const ParentNotificationSettings = require('../models/ParentNotificationSettings');
const NotificationLog = require('../models/NotificationLog');
const Student = require('../models/Student');
const { sendPushNotification } = require('./pushProvider');
const { sendSMS } = require('./smsProvider');

// Uzbek month names for date formatting like "23-yanvar"
const UZBEK_MONTHS = [
  'yanvar',
  'fevral',
  'mart',
  'aprel',
  'may',
  'iyun',
  'iyul',
  'avgust',
  'sentyabr',
  'oktyabr',
  'noyabr',
  'dekabr'
];

function formatDateUzbek(dateInput) {
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '';
  const day = d.getDate();
  const monthName = UZBEK_MONTHS[d.getMonth()] || '';
  return `${day}-${monthName}`;
}

function isQuietHours(now, start = '21:00', end = '08:00') {
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);

  const minutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  // Quiet window crosses midnight (21:00–08:00)
  if (startMinutes > endMinutes) {
    return minutes >= startMinutes || minutes < endMinutes;
  }
  return minutes >= startMinutes && minutes < endMinutes;
}

async function handleNotification(eventType, envelope) {
  try {
    const { studentId, payload } = envelope || {};
    if (!studentId || !payload) return;

    const student = await Student.findById(studentId);
    if (!student) return;

    const settings = await ParentNotificationSettings.findOne({ student: studentId });
    if (!settings || !settings.notificationsEnabled) {
      // Skip silently but optionally log
      await NotificationLog.create({
        student: studentId,
        eventType,
        subject: payload.subjectName,
        date: payload.date || new Date(),
        lessonId: payload.lessonId,
        channel: 'push',
        status: 'skipped_disabled'
      }).catch(() => {});
      return;
    }

    const now = new Date();
    if (isQuietHours(now, settings.quietHoursStart, settings.quietHoursEnd)) {
      await NotificationLog.create({
        student: studentId,
        eventType,
        subject: payload.subjectName,
        date: payload.date || new Date(),
        lessonId: payload.lessonId,
        channel: 'push',
        status: 'skipped_quiet_hours'
      }).catch(() => {});
      return;
    }

    // Build Uzbek message text
    const formattedDateUzbek = formatDateUzbek(payload.date || new Date());
    let titleUz;
    let bodyUz;

    if (eventType === 'ATTENDANCE_LATE') {
      titleUz = '⏰ Kechikdi';
      bodyUz = [
        '⏰ Ogohlantirish',
        `${payload.studentFullName} bugun darsga kechikib keldi`,
        `🕘 Kirish vaqti: ${payload.attendanceTime || ''}`,
        `📘 Fan: ${payload.subjectName || ''}`
      ].join('\n');
    } else if (eventType === 'ATTENDANCE_ABSENT') {
      titleUz = '❗ Darsga kelmadi';
      bodyUz = [
        '❗ Darsga kelmadi',
        `${payload.studentFullName} bugun darsda qatnashmadi`,
        `📅 Sana: ${formattedDateUzbek}`,
        `📘 Fan: ${payload.subjectName || ''}`
      ].join('\n');
    } else if (eventType === 'TEACHER_FEEDBACK') {
      titleUz = '💬 O‘qituvchi izohi';
      bodyUz = [
        '💬 O‘qituvchi izohi',
        `“${payload.teacherComment || ''}”`
      ].join('\n');
    } else {
      return;
    }

    // Dedup via NotificationLog unique index
    const logBase = {
      student: studentId,
      eventType,
      subject: payload.subjectName,
      date: payload.date || new Date(),
      lessonId: payload.lessonId
    };

    try {
      await NotificationLog.create({
        ...logBase,
        channel: 'push',
        status: 'sent',
        messageBody: bodyUz
      });
    } catch (err) {
      // Duplicate or other error – do not send again
      return;
    }

    const hasPush = settings.notificationChannels.includes('push') && settings.deviceTokens.length > 0;
    const hasSms = settings.notificationChannels.includes('sms') && student.parentPhone;

    let pushSuccess = false;

    // 5) Send Push Notification (Real Web Push)
    if (hasPush) {
      const pushResponse = await sendPushNotification(settings.deviceTokens, {
        title: titleUz,
        body: bodyUz,
        data: {
          eventType,
          studentId: student._id.toString()
        }
      });

      if (pushResponse.success) {
        pushSuccess = true;
      } else {
        // Log push failure but proceed to SMS fallback
        await NotificationLog.updateOne(
          { student: studentId, eventType, subject: payload.subjectName, date: payload.date || new Date(), channel: 'push' },
          { status: 'failed', errorMessage: pushResponse.error }
        ).catch(() => {});
      }
    }

    // 6) SMS fallback: If push failed or unavailable, and SMS is enabled
    if (hasSms && (!hasPush || !pushSuccess)) {
      let smsText;
      if (eventType === 'ATTENDANCE_ABSENT') {
        smsText = `${payload.studentFullName} bugun ${payload.subjectName} darsiga kelmadi. Sana: ${formattedDateUzbek}.`;
      } else if (eventType === 'ATTENDANCE_LATE') {
        smsText = `${payload.studentFullName} bugun ${payload.subjectName} darsiga kechikdi. Kirish: ${payload.attendanceTime || ''}.`;
      } else {
        smsText = `O‘qituvchi izohi: "${payload.teacherComment || ''}"`;
      }

      try {
        const smsResponse = await sendSMS(student.parentPhone, smsText);
        
        await NotificationLog.create({
          ...logBase,
          channel: 'sms',
          status: smsResponse.success ? 'sent' : 'failed',
          messageBody: smsText,
          errorMessage: smsResponse.success ? '' : smsResponse.error
        }).catch(() => {});
      } catch (err) {
        // log failure if you want
      }
    }
  } catch (error) {
    // Fail silently – do not throw back into attendance/feedback flows
    // Optional: console.error('Notification worker error:', error);
  }
}

notificationEmitter.on('ATTENDANCE_LATE', (env) => {
  handleNotification('ATTENDANCE_LATE', env);
});

notificationEmitter.on('ATTENDANCE_ABSENT', (env) => {
  handleNotification('ATTENDANCE_ABSENT', env);
});

notificationEmitter.on('TEACHER_FEEDBACK', (env) => {
  handleNotification('TEACHER_FEEDBACK', env);
});

module.exports = {
  // Exporting for clarity, though simply requiring this file is enough to register listeners
  handleNotification
};

export const DEFAULT_START_HOUR = 7;
export const DEFAULT_END_HOUR = 21;
export const DEFAULT_HOUR_HEIGHT = 100;

export const SUBJECT_THEMES = [
  { accent: '#22c55e', bg: '#ecfdf5' },
  { accent: '#3b82f6', bg: '#eff6ff' },
  { accent: '#a855f7', bg: '#faf5ff' },
  { accent: '#f97316', bg: '#fff7ed' },
  { accent: '#ec4899', bg: '#fdf2f8' },
  { accent: '#14b8a6', bg: '#f0fdfa' },
  { accent: '#6366f1', bg: '#eef2ff' },
  { accent: '#eab308', bg: '#fefce8' }
];

function getSubjectName(schedule) {
  const subject = schedule?.subject?.name || schedule?.subjectGroup?.subject || schedule?.subject || '';
  return typeof subject === 'string' ? subject : 'Class';
}

export function getSubjectTheme(schedule, themes = SUBJECT_THEMES) {
  const name = getSubjectName(schedule);
  const index = name ? name.charCodeAt(0) % themes.length : 0;
  return themes[index];
}

export function getGroupLabel(schedule) {
  if (schedule?.className) return schedule.className;
  if (schedule?.section) return `Section ${schedule.section}`;
  if (schedule?.groupName) return schedule.groupName;
  return '';
}

export function getWeekDates(referenceDate = new Date()) {
  const date = new Date(referenceDate);
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(date.getDate() + mondayOffset);

  return Array.from({ length: 7 }, (_, i) => {
    const next = new Date(monday);
    next.setDate(monday.getDate() + i);
    return next;
  });
}

export function getTimetableSummary(schedules) {
  let totalClasses = 0;
  let totalMinutes = 0;
  const subjects = new Set();
  const groups = new Set();

  (schedules || []).forEach((schedule) => {
    const days = schedule.scheduledDays?.length || 0;
    totalClasses += days;

    const start = parseTimeToMinutes(schedule.startTime);
    const end = parseTimeToMinutes(schedule.endTime);
    if (end > start) {
      totalMinutes += (end - start) * days;
    }

    const subject = getSubjectName(schedule);
    if (subject) subjects.add(subject);

    const group = schedule.className || schedule.section || schedule.groupName;
    if (group) groups.add(String(group));
  });

  return {
    totalClasses,
    subjectCount: subjects.size,
    groupCount: groups.size,
    hoursScheduled: Math.round(totalMinutes / 60)
  };
}

function parseTimeToMinutes(timeStr) {
  const [hours, minutes] = String(timeStr || '0:0').split(':').map(Number);
  return hours * 60 + (minutes || 0);
}

export function getTimetableBounds(schedules, startHour = DEFAULT_START_HOUR, endHour = DEFAULT_END_HOUR) {
  let minMinutes = startHour * 60;
  let maxMinutes = endHour * 60;

  (schedules || []).forEach((schedule) => {
    if (!schedule?.startTime || !schedule?.endTime) return;
    const start = parseTimeToMinutes(schedule.startTime);
    const end = parseTimeToMinutes(schedule.endTime);
    if (end > start) {
      minMinutes = Math.min(minMinutes, start);
      maxMinutes = Math.max(maxMinutes, end);
    }
  });

  const resolvedStartHour = Math.max(0, Math.floor(minMinutes / 60));
  const resolvedEndHour = Math.min(24, Math.max(resolvedStartHour + 1, Math.ceil(maxMinutes / 60)));

  return {
    startHour: resolvedStartHour,
    endHour: resolvedEndHour
  };
}

export function timeToOffset(timeStr, startHour, hourHeight = DEFAULT_HOUR_HEIGHT) {
  const totalMinutes = parseTimeToMinutes(timeStr) - startHour * 60;
  return Math.max(0, (totalMinutes / 60) * hourHeight);
}

function assignOverlapColumns(events) {
  if (events.length === 0) return [];

  const sorted = [...events].sort(
    (a, b) => a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes
  );

  const clusters = [];
  let currentCluster = [sorted[0]];
  let clusterEnd = sorted[0].endMinutes;

  for (let i = 1; i < sorted.length; i += 1) {
    const event = sorted[i];
    if (event.startMinutes < clusterEnd) {
      currentCluster.push(event);
      clusterEnd = Math.max(clusterEnd, event.endMinutes);
    } else {
      clusters.push(currentCluster);
      currentCluster = [event];
      clusterEnd = event.endMinutes;
    }
  }
  clusters.push(currentCluster);

  const laidOut = [];

  clusters.forEach((cluster) => {
    const columns = [];

    cluster.forEach((event) => {
      let placedColumn = -1;

      for (let col = 0; col < columns.length; col += 1) {
        const columnEvents = columns[col];
        const lastEvent = columnEvents[columnEvents.length - 1];
        if (lastEvent.endMinutes <= event.startMinutes) {
          columnEvents.push(event);
          placedColumn = col;
          break;
        }
      }

      if (placedColumn === -1) {
        placedColumn = columns.length;
        columns.push([event]);
      }

      event.columnIndex = placedColumn;
    });

    const columnCount = Math.max(columns.length, 1);
    const widthPercent = 100 / columnCount;
    const gapPercent = columnCount > 1 ? 1 : 0;

    cluster.forEach((event) => {
      laidOut.push({
        ...event,
        columnCount,
        leftPercent: event.columnIndex * widthPercent + gapPercent / 2,
        widthPercent: widthPercent - gapPercent
      });
    });
  });

  return laidOut;
}

export function layoutDayClasses(daySchedules, startHour, hourHeight = DEFAULT_HOUR_HEIGHT) {
  const events = (daySchedules || [])
    .filter((schedule) => schedule?.startTime && schedule?.endTime)
    .map((schedule) => {
      const startMinutes = parseTimeToMinutes(schedule.startTime);
      const endMinutes = parseTimeToMinutes(schedule.endTime);
      const top = timeToOffset(schedule.startTime, startHour, hourHeight);
      const bottom = timeToOffset(schedule.endTime, startHour, hourHeight);
      const duration = bottom - top;
      const minHeight = Math.min(hourHeight - 6, hourHeight * 0.88);

      return {
        ...schedule,
        startMinutes,
        endMinutes,
        top,
        height: Math.max(duration - 4, minHeight)
      };
    })
    .filter((event) => event.endMinutes > event.startMinutes);

  return assignOverlapColumns(events);
}

export function getClassesForDay(schedules, day, startHour, hourHeight) {
  return layoutDayClasses(
    (schedules || []).filter((schedule) => schedule.scheduledDays?.includes(day)),
    startHour,
    hourHeight
  ).map((schedule) => ({
    ...schedule,
    theme: getSubjectTheme(schedule)
  }));
}

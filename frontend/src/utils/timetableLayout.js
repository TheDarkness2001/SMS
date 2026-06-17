export const DEFAULT_START_HOUR = 7;
export const DEFAULT_END_HOUR = 21;
export const BASE_HOUR_HEIGHT = 72;
export const DEFAULT_HOUR_HEIGHT = BASE_HOUR_HEIGHT;
export const CARD_GAP = 4;
export const MIN_CARD_HEIGHT = 44;

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

function countClassesInHourRange(schedules, day, hourStartMin, hourEndMin) {
  return (schedules || []).filter((schedule) => {
    if (!schedule.scheduledDays?.includes(day)) return false;
    const start = parseTimeToMinutes(schedule.startTime);
    const end = parseTimeToMinutes(schedule.endTime);
    return start < hourEndMin && end > hourStartMin;
  }).length;
}

export function computeHourHeights(
  schedules,
  days,
  startHour,
  endHour,
  baseHeight = BASE_HOUR_HEIGHT
) {
  const slotCount = endHour - startHour;
  const heights = [];

  for (let i = 0; i < slotCount; i += 1) {
    const hourStart = (startHour + i) * 60;
    const hourEnd = hourStart + 60;
    let maxInHour = 1;

    (days || []).forEach((day) => {
      const count = countClassesInHourRange(schedules, day, hourStart, hourEnd);
      maxInHour = Math.max(maxInHour, count);
    });

    heights.push(baseHeight * maxInHour);
  }

  return heights;
}

export function getTotalScheduleHeight(hourHeights) {
  return (hourHeights || []).reduce((sum, height) => sum + height, 0);
}

export function getHourSlotOffsets(hourHeights) {
  const offsets = [0];
  for (let i = 0; i < hourHeights.length; i += 1) {
    offsets.push(offsets[i] + hourHeights[i]);
  }
  return offsets;
}

export function minutesToOffset(minutes, startHour, hourHeights) {
  let offset = 0;

  for (let i = 0; i < hourHeights.length; i += 1) {
    const hourStart = (startHour + i) * 60;
    const hourEnd = hourStart + 60;

    if (minutes <= hourStart) break;

    if (minutes >= hourEnd) {
      offset += hourHeights[i];
      continue;
    }

    offset += ((minutes - hourStart) / 60) * hourHeights[i];
    break;
  }

  return Math.max(0, offset);
}

export function timeToOffset(timeStr, startHour, hourHeights) {
  return minutesToOffset(parseTimeToMinutes(timeStr), startHour, hourHeights);
}

function assignOverlapRows(events) {
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
    const rows = [];

    cluster.forEach((event) => {
      let placedRow = -1;

      for (let row = 0; row < rows.length; row += 1) {
        const rowEvents = rows[row];
        const lastEvent = rowEvents[rowEvents.length - 1];
        if (lastEvent.endMinutes <= event.startMinutes) {
          rowEvents.push(event);
          placedRow = row;
          break;
        }
      }

      if (placedRow === -1) {
        placedRow = rows.length;
        rows.push([event]);
      }

      event.rowIndex = placedRow;
    });

    const rowCount = Math.max(rows.length, 1);
    const clusterTop = Math.min(...cluster.map((event) => event.layoutTop));
    const clusterBottom = Math.max(...cluster.map((event) => event.layoutBottom));
    const clusterHeight = Math.max(clusterBottom - clusterTop, MIN_CARD_HEIGHT);
    const totalGap = CARD_GAP * (rowCount - 1);
    const rowHeight = Math.max((clusterHeight - totalGap) / rowCount, MIN_CARD_HEIGHT);

    cluster.forEach((event) => {
      if (rowCount === 1) {
        laidOut.push({
          ...event,
          top: event.layoutTop,
          height: Math.max(event.layoutHeight - CARD_GAP, MIN_CARD_HEIGHT),
          leftPercent: 0,
          widthPercent: 100,
          rowCount: 1,
          rowIndex: 0
        });
        return;
      }

      laidOut.push({
        ...event,
        top: clusterTop + event.rowIndex * (rowHeight + CARD_GAP),
        height: rowHeight,
        leftPercent: 0,
        widthPercent: 100,
        rowCount,
        rowIndex: event.rowIndex
      });
    });
  });

  return laidOut;
}

export function layoutDayClasses(daySchedules, startHour, hourHeights) {
  const events = (daySchedules || [])
    .filter((schedule) => schedule?.startTime && schedule?.endTime)
    .map((schedule) => {
      const startMinutes = parseTimeToMinutes(schedule.startTime);
      const endMinutes = parseTimeToMinutes(schedule.endTime);
      const layoutTop = timeToOffset(schedule.startTime, startHour, hourHeights);
      const layoutBottom = timeToOffset(schedule.endTime, startHour, hourHeights);
      const layoutHeight = layoutBottom - layoutTop;

      return {
        ...schedule,
        startMinutes,
        endMinutes,
        layoutTop,
        layoutBottom,
        layoutHeight
      };
    })
    .filter((event) => event.endMinutes > event.startMinutes);

  return assignOverlapRows(events);
}

export function getClassesForDay(schedules, day, startHour, hourHeights) {
  return layoutDayClasses(
    (schedules || []).filter((schedule) => schedule.scheduledDays?.includes(day)),
    startHour,
    hourHeights
  ).map((schedule) => ({
    ...schedule,
    theme: getSubjectTheme(schedule)
  }));
}

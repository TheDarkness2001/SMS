import React, { useMemo } from 'react';
import {
  AiOutlineCalendar,
  AiOutlineCheckSquare,
  AiOutlineTeam,
  AiOutlineClockCircle
} from 'react-icons/ai';
import {
  BASE_HOUR_HEIGHT,
  DEFAULT_END_HOUR,
  DEFAULT_START_HOUR,
  getTimetableBounds,
  getClassesForDay,
  getWeekDates,
  getTimetableSummary,
  getSubjectTheme,
  computeHourHeights,
  getTotalScheduleHeight,
  getHourSlotOffsets
} from '../utils/timetableLayout';

function resolveTheme(classItem, getClassColor) {
  if (getClassColor) {
    const color = getClassColor(classItem);
    if (color && typeof color === 'object') return color;
    if (typeof color === 'string') {
      return { accent: color, bg: `${color}18` };
    }
  }
  return classItem.theme || getSubjectTheme(classItem);
}

function getLocale() {
  const language = localStorage.getItem('language');
  if (language === 'uz') return 'uz-UZ';
  if (language === 'ru') return 'ru-RU';
  return 'en-GB';
}

const WeeklyTimetableGrid = ({
  schedules,
  daysOfWeek,
  getClassColor,
  t,
  baseHourHeight = BASE_HOUR_HEIGHT,
  minStartHour = DEFAULT_START_HOUR,
  maxEndHour = DEFAULT_END_HOUR,
  showSummary = true
}) => {
  const { startHour, endHour } = useMemo(
    () => getTimetableBounds(schedules, minStartHour, maxEndHour),
    [schedules, minStartHour, maxEndHour]
  );

  const hourHeights = useMemo(
    () => computeHourHeights(schedules, daysOfWeek, startHour, endHour, baseHourHeight),
    [schedules, daysOfWeek, startHour, endHour, baseHourHeight]
  );

  const hourSlotOffsets = useMemo(() => getHourSlotOffsets(hourHeights), [hourHeights]);
  const weekDates = useMemo(() => getWeekDates(), []);
  const summary = useMemo(() => getTimetableSummary(schedules), [schedules]);
  const locale = getLocale();
  const scheduleHeight = getTotalScheduleHeight(hourHeights);

  const formatDayDate = (date) =>
    date.toLocaleDateString(locale, { day: 'numeric', month: 'short' });

  const getSubjectTitle = (classItem) =>
    classItem.subject?.name || classItem.subjectGroup?.subject || classItem.subject || t('common.unknown');

  return (
    <div className="weekly-timetable">
      <div className="timetable-grid">
        <div className="time-column">
          <div className="time-header">{t('timetable.time')}</div>
          {hourHeights.map((slotHeight, i) => (
            <div
              key={i}
              className="time-slot"
              style={{ height: `${slotHeight}px` }}
            >
              {String(startHour + i).padStart(2, '0')}:00
            </div>
          ))}
        </div>

        {daysOfWeek.map((day, dayIndex) => {
          const dayClasses = getClassesForDay(schedules, day, startHour, hourHeights);
          const headerClass = dayIndex === 5
            ? 'day-header day-header--saturday'
            : dayIndex === 6
              ? 'day-header day-header--sunday'
              : 'day-header';

          return (
            <div key={day} className="day-column">
              <div className={headerClass}>
                <span className="day-header-name">{day}</span>
                <span className="day-header-date">{formatDayDate(weekDates[dayIndex])}</span>
              </div>
              <div className="day-schedule" style={{ height: `${scheduleHeight}px` }}>
                {hourHeights.map((slotHeight, i) => (
                  <div
                    key={`grid-${i}`}
                    className="grid-line"
                    style={{
                      top: `${hourSlotOffsets[i]}px`,
                      height: `${slotHeight}px`
                    }}
                  />
                ))}

                {dayClasses.map((classItem) => {
                  const theme = resolveTheme(classItem, getClassColor);
                  const groupLabel = classItem.className
                    || (classItem.section ? `${t('studentTimetable.section')} ${classItem.section}` : '')
                    || classItem.groupName
                    || '';

                  return (
                    <div
                      key={`${classItem._id || classItem.id}-${day}-${classItem.startTime}-${classItem.rowIndex}`}
                      className="class-block"
                      style={{
                        top: `${classItem.top + 3}px`,
                        height: `${classItem.height}px`,
                        left: 'calc(4px)',
                        width: 'calc(100% - 8px)',
                        backgroundColor: theme.bg,
                        borderLeftColor: theme.accent,
                        zIndex: classItem.rowCount > 1 ? classItem.rowIndex + 2 : 2
                      }}
                      title={`${getSubjectTitle(classItem)}\n${classItem.startTime} - ${classItem.endTime}${groupLabel ? `\n${groupLabel}` : ''}`}
                    >
                      <div className="class-block-top">
                        <span
                          className="class-dot"
                          style={{ backgroundColor: theme.accent }}
                          aria-hidden="true"
                        />
                        <span className="class-menu" aria-hidden="true">⋮</span>
                      </div>
                      <div className="class-name" style={{ color: theme.accent }}>
                        {getSubjectTitle(classItem)}
                      </div>
                      <div className="class-time">
                        {classItem.startTime} - {classItem.endTime}
                      </div>
                      {groupLabel && (
                        <div className="class-group">{groupLabel}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {showSummary && (
        <div className="timetable-summary">
          <div className="timetable-summary-card timetable-summary-card--blue">
            <div className="timetable-summary-icon"><AiOutlineCalendar /></div>
            <div>
              <div className="timetable-summary-label">{t('timetable.totalClasses')}</div>
              <div className="timetable-summary-value">{summary.totalClasses}</div>
              <div className="timetable-summary-sub">{t('timetable.thisWeek')}</div>
            </div>
          </div>
          <div className="timetable-summary-card timetable-summary-card--green">
            <div className="timetable-summary-icon"><AiOutlineCheckSquare /></div>
            <div>
              <div className="timetable-summary-label">{t('timetable.subjects')}</div>
              <div className="timetable-summary-value">{summary.subjectCount}</div>
              <div className="timetable-summary-sub">{t('timetable.differentSubjects')}</div>
            </div>
          </div>
          <div className="timetable-summary-card timetable-summary-card--purple">
            <div className="timetable-summary-icon"><AiOutlineTeam /></div>
            <div>
              <div className="timetable-summary-label">{t('timetable.groups')}</div>
              <div className="timetable-summary-value">{summary.groupCount}</div>
              <div className="timetable-summary-sub">{t('timetable.activeGroups')}</div>
            </div>
          </div>
          <div className="timetable-summary-card timetable-summary-card--orange">
            <div className="timetable-summary-icon"><AiOutlineClockCircle /></div>
            <div>
              <div className="timetable-summary-label">{t('timetable.hoursScheduled')}</div>
              <div className="timetable-summary-value">{summary.hoursScheduled}h</div>
              <div className="timetable-summary-sub">{t('timetable.thisWeek')}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklyTimetableGrid;

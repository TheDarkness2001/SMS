import React, { useMemo } from 'react';
import {
  DEFAULT_HOUR_HEIGHT,
  DEFAULT_END_HOUR,
  DEFAULT_START_HOUR,
  getTimetableBounds,
  getClassesForDay
} from '../utils/timetableLayout';

const WeeklyTimetableGrid = ({
  schedules,
  daysOfWeek,
  getClassColor,
  t,
  hourHeight = DEFAULT_HOUR_HEIGHT,
  minStartHour = DEFAULT_START_HOUR,
  maxEndHour = DEFAULT_END_HOUR
}) => {
  const { startHour, endHour } = useMemo(
    () => getTimetableBounds(schedules, minStartHour, maxEndHour),
    [schedules, minStartHour, maxEndHour]
  );

  const hourSlots = endHour - startHour;
  const scheduleHeight = hourSlots * hourHeight;

  return (
    <div className="weekly-timetable">
      <div className="timetable-grid">
        <div className="time-column">
          <div className="time-header">{t('timetable.time')}</div>
          {Array.from({ length: hourSlots }, (_, i) => (
            <div
              key={i}
              className="time-slot"
              style={{ height: `${hourHeight}px` }}
            >
              {String(startHour + i).padStart(2, '0')}:00
            </div>
          ))}
        </div>

        {daysOfWeek.map((day) => {
          const dayClasses = getClassesForDay(schedules, day, startHour, hourHeight, getClassColor);

          return (
            <div key={day} className="day-column">
              <div className="day-header">{day}</div>
              <div className="day-schedule" style={{ height: `${scheduleHeight}px` }}>
                {Array.from({ length: hourSlots }, (_, i) => (
                  <div
                    key={`grid-${i}`}
                    className="grid-line"
                    style={{
                      top: `${i * hourHeight}px`,
                      height: `${hourHeight}px`
                    }}
                  />
                ))}

                {dayClasses.map((classItem) => (
                  <div
                    key={`${classItem._id || classItem.id}-${day}-${classItem.startTime}-${classItem.columnIndex}`}
                    className="class-block"
                    style={{
                      top: `${classItem.top}px`,
                      height: `${classItem.height}px`,
                      left: `calc(${classItem.leftPercent}% + 2px)`,
                      width: `calc(${classItem.widthPercent}% - 4px)`,
                      backgroundColor: classItem.color,
                      borderLeft: `4px solid ${classItem.color}`,
                      zIndex: classItem.columnCount > 1 ? classItem.columnIndex + 1 : 1
                    }}
                    title={`${classItem.subject?.name || classItem.subjectGroup?.subject || classItem.subject} - ${classItem.className}\n${classItem.startTime} - ${classItem.endTime}\n${t('timetable.roomLabel', { room: classItem.roomNumber || t('common.unknown') })}`}
                  >
                    <div className="class-name">
                      {classItem.subject?.name || classItem.subjectGroup?.subject || classItem.subject}
                    </div>
                    <div className="class-time">
                      {classItem.startTime} - {classItem.endTime}
                    </div>
                    {classItem.roomNumber && (
                      <div className="class-room">
                        {t('timetable.roomLabel', { room: classItem.roomNumber })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WeeklyTimetableGrid;

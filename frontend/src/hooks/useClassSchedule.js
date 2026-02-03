import { useState } from 'react';
import { getClassSchedules, getClasses } from '../api/classes';

export const useClassSchedule = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      // First, get class schedules
      const scheduleResponse = await getClassSchedules();
      const schedules = scheduleResponse.data.data;
      
      // Then, get actual classes for today and future dates
      const classResponse = await getClasses({ 
        startDate: new Date().toISOString().split('T')[0],
        status: 'scheduled' 
      });
      const actualClasses = classResponse.data.data;
      
      // Combine schedules and actual classes as needed
      setClasses([...schedules, ...actualClasses]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentClasses = async (studentId) => {
    try {
      setLoading(true);
      // This would fetch classes specific to a student
      const response = await getClasses({ student: studentId });
      setClasses(response.data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    classes,
    loading,
    error,
    fetchClasses,
    fetchStudentClasses
  };
};
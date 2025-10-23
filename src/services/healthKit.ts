// HealthKit and Health Connect integration service
import { Health } from '@capgo/capacitor-health';
import type { HealthData, HeartRateZone, HeartRateSample, SleepData, WorkoutSummary, HealthPermission } from '@/types/health';

/**
 * Calculate heart rate zones based on age
 * Uses Karvonen formula: Target HR = ((max HR − resting HR) × %Intensity) + resting HR
 */
export const calculateHeartRateZones = (age: number, restingHR: number = 60): HeartRateZone[] => {
  const maxHR = 220 - age;
  
  return [
    {
      zone: 1,
      name: 'Recovery',
      color: '#22c55e', // green
      min: Math.round(maxHR * 0.50),
      max: Math.round(maxHR * 0.60),
      description: 'Easy recovery, warm-up'
    },
    {
      zone: 2,
      name: 'Aerobic',
      color: '#3b82f6', // blue
      min: Math.round(maxHR * 0.60),
      max: Math.round(maxHR * 0.70),
      description: 'Base building, fat burning'
    },
    {
      zone: 3,
      name: 'Tempo',
      color: '#eab308', // yellow
      min: Math.round(maxHR * 0.70),
      max: Math.round(maxHR * 0.80),
      description: 'Aerobic endurance'
    },
    {
      zone: 4,
      name: 'Threshold',
      color: '#f97316', // orange
      min: Math.round(maxHR * 0.80),
      max: Math.round(maxHR * 0.90),
      description: 'Lactate threshold'
    },
    {
      zone: 5,
      name: 'Max Effort',
      color: '#ef4444', // red
      min: Math.round(maxHR * 0.90),
      max: maxHR,
      description: 'Maximum effort'
    }
  ];
};

/**
 * Get the zone for a given heart rate
 */
export const getHeartRateZone = (heartRate: number, zones: HeartRateZone[]): HeartRateZone => {
  for (const zone of zones) {
    if (heartRate >= zone.min && heartRate <= zone.max) {
      return zone;
    }
  }
  // Default to max zone if above all zones
  return zones[zones.length - 1];
};

/**
 * Check if Health APIs are available on this device
 */
export const isHealthAvailable = async (): Promise<{ available: boolean; reason?: string }> => {
  try {
    const result = await Health.isAvailable();
    return result;
  } catch (error) {
    console.error('Health availability check failed:', error);
    return { available: false, reason: 'Error checking availability' };
  }
};

/**
 * Request permissions for health data
 */
export const requestHealthPermissions = async (
  permissions: HealthPermission[] = ['steps', 'heartRate', 'restingHeartRate', 'sleepAnalysis', 'activeEnergyBurned']
): Promise<boolean> => {
  try {
    const { available } = await isHealthAvailable();
    if (!available) {
      console.warn('Health APIs not available');
      return false;
    }

    await Health.requestAuthorization({
      read: permissions,
      write: ['workouts'] // Allow writing workout data back
    });

    return true;
  } catch (error) {
    console.error('Failed to request health permissions:', error);
    return false;
  }
};

/**
 * Get sleep data for the last N days
 */
export const getSleepData = async (days: number = 7): Promise<SleepData[]> => {
  try {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const endDate = new Date();

    const { samples } = await Health.readSamples({
      dataType: 'sleepAnalysis',
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      limit: 200
    });

    // Group by date and calculate totals
    const sleepByDate: { [key: string]: SleepData } = {};
    
    samples.forEach((sample: any) => {
      const date = new Date(sample.startDate).toISOString().split('T')[0];
      const durationHours = (new Date(sample.endDate).getTime() - new Date(sample.startDate).getTime()) / (1000 * 60 * 60);
      
      if (!sleepByDate[date]) {
        sleepByDate[date] = {
          date,
          duration: 0,
          quality: 3 // Default quality
        };
      }
      
      sleepByDate[date].duration += durationHours;
    });

    return Object.values(sleepByDate);
  } catch (error) {
    console.error('Failed to get sleep data:', error);
    return [];
  }
};

/**
 * Get average sleep hours over the last N days
 */
export const getAverageSleepHours = async (days: number = 7): Promise<number | null> => {
  const sleepData = await getSleepData(days);
  if (sleepData.length === 0) return null;
  
  const total = sleepData.reduce((sum, day) => sum + day.duration, 0);
  return Math.round(total / sleepData.length);
};

/**
 * Get resting heart rate (average over last 7 days)
 */
export const getRestingHeartRate = async (): Promise<number | null> => {
  try {
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const endDate = new Date();

    const { samples } = await Health.readSamples({
      dataType: 'restingHeartRate',
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      limit: 50
    });

    if (samples.length === 0) return null;

    const total = samples.reduce((sum: number, sample: any) => sum + sample.value, 0);
    return Math.round(total / samples.length);
  } catch (error) {
    console.error('Failed to get resting heart rate:', error);
    return null;
  }
};

/**
 * Get real-time heart rate (most recent reading)
 */
export const getCurrentHeartRate = async (): Promise<number | null> => {
  try {
    const startDate = new Date(Date.now() - 5 * 60 * 1000); // Last 5 minutes
    const endDate = new Date();

    const { samples } = await Health.readSamples({
      dataType: 'heartRate',
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      limit: 1
    });

    if (samples.length === 0) return null;
    return Math.round(samples[0].value);
  } catch (error) {
    console.error('Failed to get current heart rate:', error);
    return null;
  }
};

/**
 * Get heart rate samples for a time period (for zone tracking during workout)
 */
export const getHeartRateSamples = async (startDate: Date, endDate: Date): Promise<HeartRateSample[]> => {
  try {
    const { samples } = await Health.readSamples({
      dataType: 'heartRate',
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      limit: 500
    });

    // We'll need age to calculate zones - for now use a default
    const zones = calculateHeartRateZones(30);

    return samples.map((sample: any) => ({
      value: Math.round(sample.value),
      timestamp: new Date(sample.startDate),
      zone: getHeartRateZone(Math.round(sample.value), zones)
    }));
  } catch (error) {
    console.error('Failed to get heart rate samples:', error);
    return [];
  }
};

/**
 * Get steps for today
 */
export const getTodaySteps = async (): Promise<number | null> => {
  try {
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date();

    const { samples } = await Health.readSamples({
      dataType: 'steps',
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      limit: 100
    });

    if (samples.length === 0) return null;

    const total = samples.reduce((sum: number, sample: any) => sum + sample.value, 0);
    return Math.round(total);
  } catch (error) {
    console.error('Failed to get steps:', error);
    return null;
  }
};

/**
 * Get comprehensive health data for assessment
 */
export const getHealthDataForAssessment = async (): Promise<HealthData> => {
  const healthData: HealthData = {};

  try {
    // Request permissions first
    const hasPermission = await requestHealthPermissions();
    if (!hasPermission) {
      console.warn('Health permissions not granted');
      return healthData;
    }

    // Get sleep data
    const avgSleep = await getAverageSleepHours(7);
    if (avgSleep !== null) {
      healthData.sleepHours = avgSleep;
      // Estimate sleep quality based on duration
      if (avgSleep >= 8) healthData.sleepQuality = 5;
      else if (avgSleep >= 7) healthData.sleepQuality = 4;
      else if (avgSleep >= 6) healthData.sleepQuality = 3;
      else if (avgSleep >= 5) healthData.sleepQuality = 2;
      else healthData.sleepQuality = 1;
    }

    // Get resting heart rate
    const restingHR = await getRestingHeartRate();
    if (restingHR !== null) {
      healthData.restingHeartRate = restingHR;
    }

    // Get today's steps
    const steps = await getTodaySteps();
    if (steps !== null) {
      healthData.steps = steps;
    }

    return healthData;
  } catch (error) {
    console.error('Failed to get health data:', error);
    return healthData;
  }
};

/**
 * Save workout to HealthKit/Health Connect
 */
export const saveWorkout = async (workout: WorkoutSummary): Promise<boolean> => {
  try {
    await Health.writeData({
      dataType: 'workouts',
      value: {
        activityType: 'FunctionalStrengthTraining',
        startDate: workout.date.toISOString(),
        endDate: new Date(workout.date.getTime() + workout.duration * 60 * 1000).toISOString(),
        totalEnergyBurned: workout.calories,
        metadata: {
          workout_type: 'HYROX Training'
        }
      }
    });
    return true;
  } catch (error) {
    console.error('Failed to save workout:', error);
    return false;
  }
};

/**
 * Start monitoring heart rate (for real-time zone tracking)
 * Returns a cleanup function to stop monitoring
 */
export const startHeartRateMonitoring = (
  callback: (heartRate: number, zone: HeartRateZone) => void,
  age: number = 30
): (() => void) => {
  const zones = calculateHeartRateZones(age);
  
  const intervalId = setInterval(async () => {
    const hr = await getCurrentHeartRate();
    if (hr !== null) {
      const zone = getHeartRateZone(hr, zones);
      callback(hr, zone);
    }
  }, 5000); // Check every 5 seconds

  // Return cleanup function
  return () => clearInterval(intervalId);
};


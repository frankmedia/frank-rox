/**
 * Unit Tests for Type Conversions and Utilities
 */

import {
  parseDistanceToMeters,
  parseDurationToSeconds,
  metersToDisplayString,
  secondsToDisplayString,
  calculateRunDuration,
  validateExerciseParams,
} from '../types';

describe('parseDistanceToMeters', () => {
  test('converts km to meters', () => {
    expect(parseDistanceToMeters('5km')).toBe(5000);
    expect(parseDistanceToMeters('7.5km')).toBe(7500);
    expect(parseDistanceToMeters('10km')).toBe(10000);
  });

  test('handles meters', () => {
    expect(parseDistanceToMeters('500m')).toBe(500);
    expect(parseDistanceToMeters('1000m')).toBe(1000);
  });

  test('handles ranges (averages)', () => {
    expect(parseDistanceToMeters('8-10km')).toBe(9000); // Average of 8 and 10
    expect(parseDistanceToMeters('400-600m')).toBe(500);
  });

  test('handles invalid input', () => {
    expect(parseDistanceToMeters('')).toBe(0);
    expect(parseDistanceToMeters('invalid')).toBe(0);
  });
});

describe('parseDurationToSeconds', () => {
  test('converts minutes to seconds', () => {
    expect(parseDurationToSeconds('45min')).toBe(2700);
    expect(parseDurationToSeconds('60min')).toBe(3600);
    expect(parseDurationToSeconds('10min')).toBe(600);
  });

  test('handles seconds', () => {
    expect(parseDurationToSeconds('90s')).toBe(90);
    expect(parseDurationToSeconds('120sec')).toBe(120);
  });

  test('handles ranges (averages)', () => {
    expect(parseDurationToSeconds('45-60min')).toBe(3150); // Average of 45 and 60 = 52.5 * 60
    expect(parseDurationToSeconds('30-45s')).toBe(38); // Average rounded
  });

  test('handles invalid input', () => {
    expect(parseDurationToSeconds('')).toBe(0);
    expect(parseDurationToSeconds('invalid')).toBe(0);
  });
});

describe('metersToDisplayString', () => {
  test('converts to km when appropriate', () => {
    expect(metersToDisplayString(5000)).toBe('5km');
    expect(metersToDisplayString(7500)).toBe('7.5km');
    expect(metersToDisplayString(10000)).toBe('10km');
  });

  test('keeps meters for short distances', () => {
    expect(metersToDisplayString(500)).toBe('500m');
    expect(metersToDisplayString(800)).toBe('800m');
  });
});

describe('secondsToDisplayString', () => {
  test('converts to minutes when appropriate', () => {
    expect(secondsToDisplayString(2700)).toBe('45min');
    expect(secondsToDisplayString(3600)).toBe('60min');
    expect(secondsToDisplayString(600)).toBe('10min');
  });

  test('keeps seconds for short durations', () => {
    expect(secondsToDisplayString(90)).toBe('90s');
    expect(secondsToDisplayString(45)).toBe('45s');
  });

  test('rounds to minutes for non-exact values', () => {
    expect(secondsToDisplayString(2730)).toBe('46min'); // 45.5 min rounded
  });
});

describe('calculateRunDuration', () => {
  test('calculates duration at 6 min/km pace', () => {
    expect(calculateRunDuration(5000)).toBe(1800); // 5km * 6 min = 30 min = 1800s
    expect(calculateRunDuration(6000)).toBe(2160); // 6km * 6 min = 36 min = 2160s
    expect(calculateRunDuration(8000)).toBe(2880); // 8km * 6 min = 48 min = 2880s
    expect(calculateRunDuration(10000)).toBe(3600); // 10km * 6 min = 60 min = 3600s
  });

  test('handles custom pace', () => {
    expect(calculateRunDuration(5000, 5)).toBe(1500); // 5km * 5 min = 25 min = 1500s
    expect(calculateRunDuration(10000, 7)).toBe(4200); // 10km * 7 min = 70 min = 4200s
  });
});

describe('validateExerciseParams', () => {
  test('validates correct params', () => {
    const errors = validateExerciseParams({
      durationSeconds: 2700,
      distanceMeters: 5000,
      weightKg: 20,
      sets: 3,
      reps: 10,
    });
    expect(errors).toEqual([]);
  });

  test('catches negative duration', () => {
    const errors = validateExerciseParams({ durationSeconds: -100 });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('Invalid duration');
  });

  test('catches negative distance', () => {
    const errors = validateExerciseParams({ distanceMeters: -500 });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('Invalid distance');
  });

  test('catches negative weight', () => {
    const errors = validateExerciseParams({ weightKg: -20 });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('Invalid weight');
  });

  test('catches negative sets', () => {
    const errors = validateExerciseParams({ sets: -3 });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('Invalid sets');
  });

  test('catches negative reps', () => {
    const errors = validateExerciseParams({ reps: -10 });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('Invalid reps');
  });
});

console.log('✅ All type conversion tests passed!');


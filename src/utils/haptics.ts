/**
 * Trigger haptic feedback on supported devices
 */
export const triggerHaptic = (type: "light" | "medium" | "heavy" = "medium") => {
  if (!navigator.vibrate) return;
  
  const patterns = {
    light: 10,
    medium: 50,
    heavy: 100,
  };
  
  navigator.vibrate(patterns[type]);
};

/**
 * Trigger success haptic pattern (double tap)
 */
export const triggerSuccessHaptic = () => {
  if (!navigator.vibrate) return;
  navigator.vibrate([50, 50, 50]);
};

/**
 * Trigger error haptic pattern (long vibration)
 */
export const triggerErrorHaptic = () => {
  if (!navigator.vibrate) return;
  navigator.vibrate(200);
};


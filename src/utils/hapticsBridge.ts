export enum ImpactStyle {
  Heavy = "HEAVY",
  Medium = "MEDIUM",
  Light = "LIGHT",
}

type ImpactOptions = {
  style: ImpactStyle;
};

function getCapacitorHaptics(): { impact: (options: ImpactOptions) => Promise<void> } | null {
  const capacitor = (window as any)?.Capacitor;
  const plugin = capacitor?.Plugins?.Haptics;
  if (plugin?.impact) {
    return plugin;
  }
  return null;
}

export const Haptics = {
  async impact(options: ImpactOptions): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      const plugin = getCapacitorHaptics();
      if (plugin) {
        await plugin.impact(options);
      }
    } catch (error) {
      console.warn("Haptics impact failed", error);
    }
  },
};


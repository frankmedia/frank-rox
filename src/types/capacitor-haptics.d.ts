declare module "@capacitor/haptics" {
  export enum ImpactStyle {
    Heavy = "HEAVY",
    Medium = "MEDIUM",
    Light = "LIGHT",
  }

  export interface HapticsImpactOptions {
    style: ImpactStyle;
  }

  export const Haptics: {
    impact(options: HapticsImpactOptions): Promise<void>;
  };
}


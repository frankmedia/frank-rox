import { supabase } from "@/utils/supabaseClient";

export type WelcomeVideoSetting = {
  url: string;
  title?: string | null;
  updatedAt?: string;
  updatedBy?: string | null;
};

const WELCOME_VIDEO_KEY = "welcome_video";

export async function fetchWelcomeVideoSetting(): Promise<WelcomeVideoSetting | null> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", WELCOME_VIDEO_KEY)
    .maybeSingle();

  if (error) {
    console.error("Failed to load welcome video setting:", error);
    throw error;
  }

  if (!data?.value) {
    return null;
  }

  const value = data.value as WelcomeVideoSetting;
  return value?.url ? value : null;
}

export async function saveWelcomeVideoSetting(setting: WelcomeVideoSetting & { updatedBy?: string }) {
  const payload = {
    key: WELCOME_VIDEO_KEY,
    value: {
      url: setting.url || null,
      title: setting.title || null,
      updatedBy: setting.updatedBy || null,
      updatedAt: new Date().toISOString(),
    },
  };

  const { error } = await supabase.from("app_settings").upsert(payload, { onConflict: "key" });

  if (error) {
    console.error("Failed to save welcome video setting:", error);
    throw error;
  }
}


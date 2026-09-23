export const DEFAULT_ENABLED_FEATURES: Record<string, boolean> = {
  overview: true,
  ai_assistant: true,
  inbox: true,
  outbox: true,
  admin_docs: true,
  draft_docs: true,
  folders: true,
  logs: true,
  draft: true,
  aiscan: true,
  order: true,
  customorder: true,
  speech: true,
  meeting: true,
  summary: true,
  workflow: true,
  workflow_sla: true,
  version_control: true,
  qr_generator: true,
  vehicles: true,
};

export function parseEnabledFeatures(data: any): Record<string, boolean> {
  if (!data) return { ...DEFAULT_ENABLED_FEATURES };

  let raw = data;
  if (typeof raw === 'object' && raw !== null && raw.enabledFeatures !== undefined) {
    raw = raw.enabledFeatures;
  }

  let parsed: any = raw;
  let attempts = 0;
  while (typeof parsed === 'string' && attempts < 5) {
    try {
      const temp = JSON.parse(parsed);
      parsed = temp;
      attempts++;
    } catch (e) {
      break;
    }
  }

  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    return {
      ...DEFAULT_ENABLED_FEATURES,
      ...parsed
    };
  }

  return { ...DEFAULT_ENABLED_FEATURES };
}

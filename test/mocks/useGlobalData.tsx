let pluginData: unknown = undefined;

export function __setPluginData(data: unknown): void {
  pluginData = data;
}

export function usePluginData(_pluginName: string, _pluginId?: string): unknown {
  return pluginData;
}

export default function useGlobalData(): unknown {
  return {};
}

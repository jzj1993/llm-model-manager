import { EnvWrappedExporter } from './env-wrapped-exporter'
import { OpenClawManualExporter } from './openclaw-manual-exporter'
import { OpenClawCliExporter } from './openclaw-cli-exporter'
import { CCSwitchDeepLinkExporter } from './cc-switch-deeplink-exporter'
import { ClaudeCodeEnvExporter } from './claude-code-env-exporter'
import { CodexEnvExporter } from './codex-env-exporter'
import { CodexCliExporter } from './codex-cli-exporter'
import { CherryStudioDeeplinkExporter } from './cherry-studio-deeplink-exporter'
import { AionUIDeeplinkExporter } from './aionui-deeplink-exporter'
import { OpenCatDeeplinkExporter } from './opencat-deeplink-exporter'

function wrapExporter(exporter) {
  if (exporter instanceof EnvWrappedExporter) return exporter
  if (exporter?.entryType !== 'env') return exporter
  return new EnvWrappedExporter(exporter)
}

export const exporters = [
  new OpenClawManualExporter(),
  new OpenClawCliExporter(),
  new CCSwitchDeepLinkExporter(),
  new ClaudeCodeEnvExporter(),
  new CodexEnvExporter(),
  new CodexCliExporter(),
  new CherryStudioDeeplinkExporter(),
  new AionUIDeeplinkExporter(),
  new OpenCatDeeplinkExporter()
].map(wrapExporter)

export function getExporterById(id) {
  return exporters.find(item => item.id === id)
}

import { TooltipProvider } from '@/components/ui/tooltip'
import { AppToolbar } from '@/components/app/app-toolbar'
import { ExportDialog } from '@/components/app/export-dialog'
import { ModelDialog } from '@/components/app/model-dialog'
import { ProviderDialog } from '@/components/app/provider-dialog'
import { ModelListDialog } from '@/components/app/model-list-dialog'
import { ProviderList } from '@/components/app/provider-list'
import { useAppState } from '@/hooks/use-app-state'

export default function App() {
  const app = useAppState()

  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex h-screen flex-col overflow-hidden p-4">
        <AppToolbar
          onAddProvider={() => app.openProviderDialog()}
          onCollapseAll={app.collapseAllProviders}
          onExpandAll={app.expandAllProviders}
          totalModelCount={app.totalModelCount}
          selectedSize={app.selected.size}
          onToggleAllSelection={app.toggleAllSelection}
          onCheckSelected={() => void app.checkSelected()}
          onOpenExport={app.openExport}
          onExportJson={() => void app.exportJsonConfigs()}
          onImportJson={app.importJsonConfigs}
        />

        <ProviderList
          providers={app.providers}
          selected={app.selected}
          setSelected={app.setSelected}
          checkingModelKeys={app.checkingModelKeys}
          isProviderCollapsed={app.isProviderCollapsed}
          toggleProviderCollapsed={app.toggleProviderCollapsed}
          getProviderSelectionState={app.getProviderSelectionState}
          toggleProviderSelection={app.toggleProviderSelection}
          openProviderWebsite={app.openProviderWebsite}
          copyText={app.copyText}
          loadModelList={(i) => void app.loadModelList(i)}
          openModelDialog={app.openModelDialog}
          openProviderDialog={app.openProviderDialog}
          deleteProvider={(i) => void app.deleteProvider(i)}
          deleteModel={(pi, mi) => void app.deleteModel(pi, mi)}
          modelCheckKey={app.modelCheckKey}
          checkModel={(pi, mi) => void app.checkModel(pi, mi)}
          onProviderDragEnd={app.onProviderDragEnd}
          onModelDragEnd={app.onModelDragEnd}
        />

        <ProviderDialog
          open={app.providerDialog.open}
          onOpenChange={(open) => app.setProviderDialog((prev) => ({ ...prev, open }))}
          index={app.providerDialog.index}
          providerForm={app.providerForm}
          setProviderForm={app.setProviderForm}
          providerPresetOptions={app.providerPresetOptions}
          providerPresets={app.providerPresets}
          urlPresetOptions={app.urlPresetOptions}
          endpointPresetOptions={app.endpointPresetOptions}
          onSave={() => void app.onSaveProvider()}
        />

        <ModelDialog
          open={app.modelDialog.open}
          onOpenChange={(open) => app.setModelDialog((prev) => ({ ...prev, open }))}
          providerIndex={app.modelDialog.providerIndex}
          modelIndex={app.modelDialog.modelIndex}
          modelForm={app.modelForm}
          setModelForm={app.setModelForm}
          providers={app.providers}
          providerPresets={app.providerPresets}
          modelPresets={app.modelPresets}
          modelIdComboOptions={app.modelIdComboOptions}
          onSave={() => void app.onSaveModel()}
        />

        <ModelListDialog
          state={app.modelListDialog}
          provider={app.modelListDialog != null ? app.providers[app.modelListDialog.providerIndex] : undefined}
          onClose={app.closeModelListDialog}
          onRetry={app.retryLoadModelList}
          onAdd={(models) => void app.addSelectedModelsFromList(models)}
        />

        <ExportDialog
          open={app.exportOpen}
          onOpenChange={app.setExportOpen}
          exporterId={app.exporterId}
          onSelectExporter={app.selectExportFormat}
          exportEntries={app.exportEntries}
          selectedCount={app.selectedConfigs.length}
          onCopy={app.copyText}
          onRunEntry={(entry) => void app.runEntry(entry)}
        />

        {app.toastMessage && (
          <div className="fixed bottom-4 right-4 z-[100] rounded-md bg-foreground px-3 py-2 text-sm text-background shadow-lg">
            {app.toastMessage}
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}

// Components Index - CYSMIC Phase 1-4

// Ingestion
export { FileIngestionWidget } from './ingestion/FileIngestionWidget';

// Analysis - Phase 1
export { DeclineCurveChart, DeclineParameterPanel } from './analysis/DeclineCurve';
export { ParameterPanel, defaultAnalysisParameters } from './analysis/ParameterPanel';
export type { Parameter } from './analysis/ParameterPanel';

// Analysis - Phase 2
export { MonteCarloChart, VolumetricInputPanel, VolumetricSummary } from './analysis/MonteCarlo';
export { WellTestChart, WellTestResults, WellTestInputPanel } from './analysis/WellTest';
export { MaterialBalanceChart, DriveMechanismPanel, ReservesSummary } from './analysis/MaterialBalance';

// Viewers
export { LogViewer, generateDemoLogData } from './viewers/LogViewer';
export { TelemetryStrip } from './viewers/TelemetryStrip';
export { SubsurfaceViewer } from './viewers/SubsurfaceViewer';

// Phase 4 - Collaboration
export { AnnotationPanel, NotificationBell, ChatSearch } from './collaboration/AnnotationComponents';

// Phase 4 - Report Builder
export { ReportBuilder, ExportButton } from './reports/ReportBuilder';

// Phase 4 - Integration
export { IntegrationPanel } from './integration/IntegrationPanel';

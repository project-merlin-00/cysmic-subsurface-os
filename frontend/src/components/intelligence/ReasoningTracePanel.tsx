/**
 * Phase 3 Intelligence Components
 * Reasoning Trace Panel & Monitoring Dashboard
 * Uses CYSMIC design system: Terracotta #d44211, Sandstone scale
 */

import React, { useState, useEffect } from 'react';
import { 
  Lightbulb, 
  ChevronDown, 
  ChevronRight, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Database,
  FileText,
  Activity,
  Clock,
  Bell,
  Settings,
  Eye,
  X
} from 'lucide-react';

// ================== Types ==================

interface ReasoningStep {
  step_number: number;
  step_type: 'observation' | 'analysis' | 'inference' | 'decision';
  description: string;
  input_data?: Record<string, unknown>;
  output_data?: Record<string, unknown>;
  confidence: number;
}

interface DataSource {
  source_type: string;
  source_name?: string;
  data_extracted?: Record<string, unknown>;
  relevance_score: number;
}

interface ReasoningTrace {
  id: number;
  decision_type: string;
  decision_summary: string;
  reasoning_chain: ReasoningStep[];
  data_sources: DataSource[];
  confidence: number;
  alternatives_considered: Array<{ option: string; reason: string }>;
  is_verified: boolean;
  verified_at?: string;
  created_at: string;
}

interface AlertHistory {
  id: number;
  alert_id: number;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  triggered_at: string;
  acknowledged: boolean;
}

interface MonitoringStatus {
  active_alerts: number;
  pending_alerts: number;
  scheduled_tasks: number;
  recent_triggers: AlertHistory[];
  system_health: string;
}

// ================== Reasoning Trace Panel ==================

interface ReasoningTracePanelProps {
  traces: ReasoningTrace[];
  onVerify?: (traceId: number) => void;
}

export function ReasoningTracePanel({ traces, onVerify }: ReasoningTracePanelProps) {
  const [expandedTrace, setExpandedTrace] = useState<number | null>(null);
  const [selectedTrace, setSelectedTrace] = useState<ReasoningTrace | null>(null);

  if (!traces || traces.length === 0) {
    return (
      <div className="bg-[#F7F5F2] border border-[#C7C0B0] rounded-lg p-4 text-center text-[#706859]">
        <Lightbulb className="w-6 h-6 mx-auto mb-2 opacity-50" />
        <p>No reasoning traces available</p>
        <p className="text-xs mt-1 opacity-70">AI decisions will appear here</p>
      </div>
    );
  }

  const toggleExpand = (id: number) => {
    setExpandedTrace(expandedTrace === id ? null : id);
  };

  const getStepIcon = (type: string) => {
    switch (type) {
      case 'observation': return <Eye className="w-4 h-4" />;
      case 'analysis': return <Activity className="w-4 h-4" />;
      case 'inference': return <Lightbulb className="w-4 h-4" />;
      case 'decision': return <CheckCircle className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50';
    if (confidence >= 0.5) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="bg-[#F7F5F2] border border-[#C7C0B0] rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-[#221510] text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-[#d44211]" />
          <h3 className="font-semibold">AI Decision Reasoning</h3>
        </div>
        <span className="text-xs bg-[#d44211] px-2 py-1 rounded">
          {traces.length} decisions
        </span>
      </div>

      {/* Trace List */}
      <div className="divide-y divide-[#C7C0B0]">
        {traces.map((trace) => (
          <div key={trace.id} className="border-b border-[#C7C0B0] last:border-b-0">
            {/* Trace Summary */}
            <button
              onClick={() => toggleExpand(trace.id)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-[#EBE8E1] transition-colors"
            >
              <div className="flex items-center gap-3 text-left">
                {expandedTrace === trace.id ? (
                  <ChevronDown className="w-4 h-4 text-[#706859]" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-[#706859]" />
                )}
                <div>
                  <p className="font-medium text-[#221510] text-sm">{trace.decision_summary}</p>
                  <p className="text-xs text-[#706859]">{trace.decision_type}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded ${getConfidenceColor(trace.confidence)}`}>
                  {Math.round(trace.confidence * 100)}%
                </span>
                {trace.is_verified && (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                )}
              </div>
            </button>

            {/* Expanded Details */}
            {expandedTrace === trace.id && (
              <div className="px-4 py-3 bg-[#EBE8E1] space-y-4">
                {/* Reasoning Chain */}
                <div>
                  <h4 className="text-xs font-semibold text-[#454037] uppercase tracking-wider mb-2">
                    Reasoning Chain
                  </h4>
                  <div className="space-y-2">
                    {trace.reasoning_chain.map((step, idx) => (
                      <div key={idx} className="flex gap-3 text-sm">
                        <div className="flex-shrink-0 w-6 h-6 bg-[#d44211] text-white rounded-full flex items-center justify-center text-xs">
                          {step.step_number}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[#d44211]">{getStepIcon(step.step_type)}</span>
                            <span className="font-medium text-[#221510]">{step.step_type}</span>
                          </div>
                          <p className="text-[#454037] mt-1">{step.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Data Sources */}
                <div>
                  <h4 className="text-xs font-semibold text-[#454037] uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Database className="w-3 h-3" /> Data Sources
                  </h4>
                  <div className="grid gap-2">
                    {trace.data_sources.map((source, idx) => (
                      <div key={idx} className="bg-white p-2 rounded border border-[#C7C0B0] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-[#706859]" />
                          <span className="text-sm text-[#221510]">{source.source_name || source.source_type}</span>
                        </div>
                        <span className="text-xs text-[#706859]">
                          {Math.round(source.relevance_score * 100)}% relevant
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Alternatives */}
                {trace.alternatives_considered.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-[#454037] uppercase tracking-wider mb-2">
                      Alternatives Considered
                    </h4>
                    <div className="space-y-1">
                      {trace.alternatives_considered.map((alt, idx) => (
                        <div key={idx} className="text-sm text-[#706859] flex items-start gap-2">
                          <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                          <span>
                            <strong className="text-[#221510]">{alt.option}</strong> - {alt.reason}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  {!trace.is_verified && onVerify && (
                    <button
                      onClick={() => onVerify(trace.id)}
                      className="px-3 py-1.5 bg-[#d44211] text-white text-sm rounded hover:bg-[#b8380e] transition-colors flex items-center gap-1"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Verify Decision
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedTrace(trace)}
                    className="px-3 py-1.5 border border-[#C7C0B0] text-[#454037] text-sm rounded hover:bg-white transition-colors"
                  >
                    View Full Details
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Full Details Modal */}
      {selectedTrace && (
        <TraceDetailsModal 
          trace={selectedTrace} 
          onClose={() => setSelectedTrace(null)} 
        />
      )}
    </div>
  );
}

// ================== Trace Details Modal ==================

function TraceDetailsModal({ trace, onClose }: { trace: ReasoningTrace; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#F7F5F2] rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-xl">
        <div className="bg-[#221510] text-white px-6 py-4 flex items-center justify-between">
          <h2 className="font-semibold">Reasoning Trace Details</h2>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Decision Summary */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-[#454037] uppercase tracking-wider mb-2">
              Decision
            </h3>
            <p className="text-[#221510] text-lg">{trace.decision_summary}</p>
            <div className="flex gap-3 mt-2">
              <span className="text-xs bg-[#C7C0B0] px-2 py-1 rounded text-[#454037]">
                {trace.decision_type}
              </span>
              <span className={`text-xs px-2 py-1 rounded ${trace.confidence >= 0.8 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                {Math.round(trace.confidence * 100)}% confidence
              </span>
            </div>
          </div>

          {/* Reasoning Chain */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-[#454037] uppercase tracking-wider mb-3">
              Step-by-Step Reasoning
            </h3>
            <div className="space-y-4">
              {trace.reasoning_chain.map((step, idx) => (
                <div key={idx} className="bg-white p-4 rounded border border-[#C7C0B0]">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 bg-[#d44211] text-white rounded-full flex items-center justify-center text-sm">
                      {step.step_number}
                    </span>
                    <span className="font-semibold text-[#d44211] capitalize">{step.step_type}</span>
                  </div>
                  <p className="text-[#454037]">{step.description}</p>
                  {Object.keys(step.input_data || {}).length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-[#706859] cursor-pointer">Input Data</summary>
                      <pre className="mt-1 p-2 bg-[#F7F5F2] rounded text-xs overflow-x-auto">
                        {JSON.stringify(step.input_data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Data Sources */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-[#454037] uppercase tracking-wider mb-3">
              Data Sources Used
            </h3>
            <div className="space-y-2">
              {trace.data_sources.map((source, idx) => (
                <div key={idx} className="bg-white p-3 rounded border border-[#C7C0B0]">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[#221510]">{source.source_name || source.source_type}</span>
                    <span className="text-xs text-[#706859]">
                      {Math.round(source.relevance_score * 100)}% relevance
                    </span>
                  </div>
                  {source.data_extracted && Object.keys(source.data_extracted).length > 0 && (
                    <pre className="mt-2 p-2 bg-[#F7F5F2] rounded text-xs overflow-x-auto">
                      {JSON.stringify(source.data_extracted, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Verification Status */}
          {trace.is_verified && (
            <div className="bg-green-50 border border-green-200 rounded p-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-green-700">Verified by human</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ================== Monitoring Dashboard ==================

interface MonitoringDashboardProps {
  status: MonitoringStatus;
  alerts: AlertHistory[];
  onAcknowledge?: (id: number) => void;
  onConfigure?: () => void;
}

export function MonitoringDashboard({ status, alerts, onAcknowledge, onConfigure }: MonitoringDashboardProps) {
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      default: return <Bell className="w-5 h-5 text-blue-500" />;
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-600 bg-green-50';
      case 'degraded': return 'text-amber-600 bg-amber-50';
      case 'unhealthy': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="bg-[#F7F5F2] border border-[#C7C0B0] rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-[#221510] text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-[#d44211]" />
          <h3 className="font-semibold">Monitoring Dashboard</h3>
        </div>
        <div className={`px-3 py-1 rounded text-sm font-medium ${getHealthColor(status.system_health)}`}>
          {status.system_health}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 p-4 border-b border-[#C7C0B0]">
        <div className="bg-white p-4 rounded border border-[#C7C0B0] text-center">
          <div className="text-2xl font-bold text-[#d44211]">{status.active_alerts}</div>
          <div className="text-xs text-[#706859] uppercase tracking-wider">Active Alerts</div>
        </div>
        <div className="bg-white p-4 rounded border border-[#C7C0B0] text-center">
          <div className="text-2xl font-bold text-amber-600">{status.pending_alerts}</div>
          <div className="text-xs text-[#706859] uppercase tracking-wider">Pending</div>
        </div>
        <div className="bg-white p-4 rounded border border-[#C7C0B0] text-center">
          <div className="text-2xl font-bold text-[#2d6a4f]">{status.scheduled_tasks}</div>
          <div className="text-xs text-[#706859] uppercase tracking-wider">Scheduled Tasks</div>
        </div>
      </div>

      {/* Recent Alerts */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-[#454037]">Recent Alerts</h4>
          <button 
            onClick={onConfigure}
            className="text-xs text-[#d44211] hover:underline flex items-center gap-1"
          >
            <Settings className="w-3 h-3" />
            Configure
          </button>
        </div>
        
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-[#706859]">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No alerts triggered</p>
            <p className="text-xs opacity-70">All systems operating normally</p>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div 
                key={alert.id} 
                className={`p-3 rounded border flex items-center justify-between ${
                  alert.severity === 'critical' 
                    ? 'border-red-300 bg-red-50' 
                    : alert.severity === 'warning'
                    ? 'border-amber-300 bg-amber-50'
                    : 'border-blue-300 bg-blue-50'
                } ${alert.acknowledged ? 'opacity-60' : ''}`}
              >
                <div className="flex items-center gap-3">
                  {getSeverityIcon(alert.severity)}
                  <div>
                    <p className="text-sm text-[#221510]">{alert.message}</p>
                    <p className="text-xs text-[#706859] flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(alert.triggered_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                {!alert.acknowledged && onAcknowledge && (
                  <button
                    onClick={() => onAcknowledge(alert.id)}
                    className="px-3 py-1 text-xs bg-[#d44211] text-white rounded hover:bg-[#b8380e] transition-colors"
                  >
                    Acknowledge
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ================== User Preferences Panel ==================

interface Preference {
  id: number;
  category: string;
  key: string;
  value: unknown;
  description?: string;
}

interface PreferencesPanelProps {
  preferences: Preference[];
  onUpdate: (category: string, key: string, value: unknown) => void;
  onDelete: (id: number) => void;
}

export function PreferencesPanel({ preferences, onUpdate, onDelete }: PreferencesPanelProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [editingPref, setEditingPref] = useState<Preference | null>(null);

  const categories = [...new Set(preferences.map(p => p.category))];
  const filtered = activeCategory 
    ? preferences.filter(p => p.category === activeCategory)
    : preferences;

  return (
    <div className="bg-[#F7F5F2] border border-[#C7C0B0] rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-[#221510] text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-[#d44211]" />
          <h3 className="font-semibold">User Preferences</h3>
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-2 p-3 border-b border-[#C7C0B0] overflow-x-auto">
        <button
          onClick={() => setActiveCategory(null)}
          className={`px-3 py-1.5 text-sm rounded whitespace-nowrap transition-colors ${
            !activeCategory 
              ? 'bg-[#d44211] text-white' 
              : 'bg-white border border-[#C7C0B0] text-[#454037] hover:bg-[#EBE8E1]'
          }`}
        >
          All
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 text-sm rounded whitespace-nowrap transition-colors ${
              activeCategory === cat 
                ? 'bg-[#d44211] text-white' 
                : 'bg-white border border-[#C7C0B0] text-[#454037] hover:bg-[#EBE8E1]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Preferences List */}
      <div className="divide-y divide-[#C7C0B0] max-h-96 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-[#706859]">
            <Settings className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>No preferences configured</p>
          </div>
        ) : (
          filtered.map(pref => (
            <div key={pref.id} className="p-4 hover:bg-[#EBE8E1] transition-colors">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[#221510]">{pref.key}</span>
                    <span className="text-xs bg-[#C7C0B0] px-2 py-0.5 rounded text-[#454037]">
                      {pref.category}
                    </span>
                  </div>
                  {pref.description && (
                    <p className="text-sm text-[#706859] mt-1">{pref.description}</p>
                  )}
                  <p className="text-xs font-mono text-[#454037] mt-2 p-2 bg-white rounded border border-[#C7C0B0]">
                    {JSON.stringify(pref.value)}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setEditingPref(pref)}
                    className="p-1.5 text-[#706859] hover:text-[#d44211] hover:bg-white rounded"
                    title="Edit"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(pref.id)}
                    className="p-1.5 text-[#706859] hover:text-red-600 hover:bg-white rounded"
                    title="Delete"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default { ReasoningTracePanel, MonitoringDashboard, PreferencesPanel };

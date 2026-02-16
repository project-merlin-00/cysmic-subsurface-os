import { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2, Box } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';
import {
  FileIngestionWidget,
  DeclineCurveChart,
  DeclineParameterPanel,
  ParameterPanel,
  LogViewer,
  generateDemoLogData,
  TelemetryStrip,
  SubsurfaceViewer,
  MonteCarloChart,
  VolumetricSummary,
  WellTestChart,
  WellTestResults,
  MaterialBalanceChart,
  DriveMechanismPanel,
  ReservesSummary
} from './components';

// Card System Imports
import { CardRenderer, useCardState, createDeclineCurveCard, createLogViewerCard, createMonteCarloCard, createWellTestCard, createVolumetricsCard, createTelemetryCard } from './cards';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  component?: string;
}

type ViewMode = 'chat' | 'demo';

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('chat');
  
  // Card System State
  const {
    cards,
    activeCardId,
    maximizedCardId,
    spawnCard,
    closeCard,
    minimizeCard,
    maximizeCard,
    setActiveCard,
    updateCard,
  } = useCardState({ maxCards: 10 });
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m CYSMIC, your subsurface operations assistant. Try the demo mode to explore Phase 1 components, or ask me to analyze wells, logs, or production data.',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Demo state
  const [declineParams, setDeclineParams] = useState({
    qi: 500,
    Di: 0.1,
    b: 0.5
  });
  const [declineModel, setDeclineModel] = useState<'hyperbolic' | 'exponential' | 'harmonic'>('hyperbolic');

  // Generate decline curve data
  const generateDeclineData = () => {
    const data = [];
    for (let t = 0; t <= 60; t++) {
      let q;
      if (declineModel === 'exponential') {
        q = declineParams.qi * Math.exp(-declineParams.Di * t);
      } else if (declineModel === 'harmonic') {
        q = declineParams.qi / (1 + declineParams.Di * t);
      } else {
        q = declineParams.qi / Math.pow(1 + declineParams.b * declineParams.Di * t, 1 / declineParams.b);
      }
      data.push({ time: t, rate: q });
    }
    return data;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      const responses: Record<string, string> = {
        'las': 'LAS file detected! I can see you have Gamma Ray, Resistivity, and Density curves. Would you like me to visualize these in the Log Viewer?',
        'decline': 'I\'ll create a decline curve analysis for you. Let me fit an Arps model to your production data.',
        'default': 'I understand your request. In Phase 1, we\'ve built the core components: File Ingestion, Decline Curve Analysis, Log Viewer, Telemetry Strip, and 3D Viewer. Try the demo mode to see them in action!'
      };

      const content = input.toLowerCase();
      let response = responses.default;
      if (content.includes('las') || content.includes('log')) response = responses.las;
      else if (content.includes('decline') || content.includes('production')) response = responses.decline;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-screen bg-background-light">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 px-6 flex items-center justify-between border-b border-sandstone-200 bg-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <Bot className="w-5 h-5 text-primary-600" />
            <h1 className="text-lg font-semibold text-sandstone-900">CYSMIC Subsurface OS</h1>
            <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-medium rounded">
              Phase 2
            </span>
          </div>
          
          {/* View Toggle */}
          <div className="flex items-center gap-2 bg-sandstone-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('chat')}
              className={`px-3 py-1 text-sm rounded flex items-center gap-2 transition-colors ${
                viewMode === 'chat' 
                  ? 'bg-white text-sandstone-900 shadow-sm' 
                  : 'text-sandstone-600 hover:text-sandstone-800'
              }`}
            >
              <Bot className="w-4 h-4" />
              Chat
            </button>
            <button
              onClick={() => setViewMode('demo')}
              className={`px-3 py-1 text-sm rounded flex items-center gap-2 transition-colors ${
                viewMode === 'demo' 
                  ? 'bg-white text-sandstone-900 shadow-sm' 
                  : 'text-sandstone-600 hover:text-sandstone-800'
              }`}
            >
              <Box className="w-4 h-4" />
              Demo
            </button>
          </div>
          
          <div className="text-sm text-sandstone-500">
            Subsurface Operations Assistant
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex">
          {viewMode === 'chat' ? (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        message.role === 'user'
                          ? 'bg-primary-100 text-primary-600'
                          : 'bg-sandstone-200 text-sandstone-700'
                      }`}
                    >
                      {message.role === 'user' ? (
                        <User className="w-4 h-4" />
                      ) : (
                        <Bot className="w-4 h-4" />
                      )}
                    </div>

                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-primary-600 text-white'
                          : 'bg-white border border-sandstone-200 text-sandstone-900'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <div
                        className={`text-xs mt-1 ${
                          message.role === 'user' ? 'text-primary-100' : 'text-sandstone-400'
                        }`}
                      >
                        {message.timestamp.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-sandstone-200 text-sandstone-700 flex items-center justify-center">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="bg-white border border-sandstone-200 rounded-2xl px-4 py-3">
                      <div className="flex items-center gap-2 text-sandstone-500">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 border-t border-sandstone-200 bg-white">
                <div className="flex gap-3 max-w-4xl mx-auto">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Ask about wells, logs, decline curves..."
                    className="flex-1"
                    disabled={isLoading}
                  />
                  <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-center text-xs text-sandstone-400 mt-2">
                  Try: "analyze LAS file" or "show decline curve" or "view logs"
                </p>
              </div>
            </>
          ) : (
            /* Demo Mode - Phase 1 & 2 Components */
            <div className="flex-1 overflow-auto p-6 space-y-6 bg-sandstone-50">
              {/* Card System Demo */}
              <div className="bg-white border border-sandstone-300 rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                      <Box className="w-4 h-4 text-primary-600" />
                    </div>
                    <div>
                      <h2 className="font-space font-semibold text-sandstone-900">Card System Demo</h2>
                      <p className="text-xs text-sandstone-500">Click to spawn interactive cards</p>
                    </div>
                  </div>
                  <div className="text-xs text-sandstone-500">
                    Active cards: {cards.length}
                  </div>
                </div>
                
                {/* Card Spawn Buttons */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => spawnCard('declineCurve', 'Well A-1 Decline', {
                      type: 'declineCurve',
                      declineType: 'hyperbolic',
                      qi: 2000,
                      Di: 0.15,
                      b: 0.5,
                      wellName: 'Well A-1'
                    } as any)}
                    className="px-3 py-2 bg-primary-100 text-primary-700 rounded-lg text-sm font-medium hover:bg-primary-200 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>
                    Decline Curve
                  </button>
                  
                  <button
                    onClick={() => spawnCard('logViewer', 'Well A-1 Logs', {
                      type: 'logViewer',
                      wellName: 'Well A-1',
                      topDepth: 1500,
                      bottomDepth: 3500
                    } as any)}
                    className="px-3 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Log Viewer
                  </button>
                  
                  <button
                    onClick={() => spawnCard('monteCarlo', 'STOIIP Monte Carlo', {
                      type: 'monteCarlo',
                      iterations: 5000
                    } as any)}
                    className="px-3 py-2 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-200 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Monte Carlo
                  </button>
                  
                  <button
                    onClick={() => spawnCard('wellTest', 'Well A-1 Test', {
                      type: 'wellTest',
                      testType: 'drawdown',
                      wellName: 'Well A-1'
                    } as any)}
                    className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Well Test
                  </button>
                  
                  <button
                    onClick={() => spawnCard('volumetrics', 'Reservoir A Volumetrics', {
                      type: 'volumetrics',
                      reservoirName: 'Reservoir A'
                    } as any)}
                    className="px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    Volumetrics
                  </button>
                  
                  <button
                    onClick={() => spawnCard('telemetry', 'Well A-1 Live', {
                      type: 'telemetry',
                      wellName: 'Well A-1'
                    } as any)}
                    className="px-3 py-2 bg-cyan-100 text-cyan-700 rounded-lg text-sm font-medium hover:bg-cyan-200 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Telemetry
                  </button>
                </div>
              </div>

              {/* Card Renderer Container - Overlays on demo */}
              {cards.length > 0 && (
                <div className="fixed inset-0 pointer-events-none z-50">
                  <CardRenderer
                    cards={cards}
                    activeCardId={activeCardId}
                    maximizedCardId={maximizedCardId}
                    onClose={closeCard}
                    onMinimize={minimizeCard}
                    onMaximize={maximizeCard}
                    onFocus={setActiveCard}
                    onUpdate={updateCard}
                    draggable={true}
                    animated={true}
                  />
                </div>
              )}

              {/* File Ingestion + Parameter Panel Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <FileIngestionWidget />
                <ParameterPanel
                  title="Analysis Parameters"
                  parameters={[
                    { id: 'porosity', name: 'Porosity', value: 0.2, min: 0, max: 0.4, step: 0.01, unit: 'fraction', category: 'reservoir' },
                    { id: 'sw', name: 'Water Saturation', value: 0.3, min: 0, max: 1, step: 0.05, unit: 'fraction', category: 'reservoir' },
                    { id: 'thickness', name: 'Net Thickness', value: 50, min: 0, max: 200, step: 1, unit: 'ft', category: 'reservoir' },
                    { id: 'bo', name: 'Oil FVF', value: 1.2, min: 1, max: 2, step: 0.01, unit: 'rbbl/stb', category: 'fluid' },
                    { id: 'qi', name: 'Initial Rate', value: 500, min: 0, max: 5000, step: 10, unit: 'bbl/d', category: 'production' },
                    { id: 'di', name: 'Decline Rate', value: 0.15, min: 0.01, max: 0.5, step: 0.01, unit: '1/mo', category: 'production' },
                  ]}
                  onChange={() => {}}
                />
              </div>

              {/* Decline Curve - Phase 1 */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <DeclineCurveChart
                    data={generateDeclineData()}
                    model={declineModel}
                    parameters={declineParams}
                  />
                </div>
                <DeclineParameterPanel
                  parameters={declineParams}
                  onChange={setDeclineParams}
                  model={declineModel}
                  onModelChange={setDeclineModel}
                />
              </div>

              {/* Phase 2: Volumetric Analysis (Monte Carlo) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <MonteCarloChart
                    data={{
                      stoiip: 45.2e6,
                      stoiip_p10: 52.1e6,
                      stoiip_p50: 44.8e6,
                      stoiip_p90: 38.5e6,
                      mean: 45.2e6,
                      std: 5.1e6,
                      samples: Array.from({length: 500}, () => 38e6 + Math.random() * 20e6)
                    }}
                  />
                </div>
                <VolumetricSummary
                  data={{
                    stoiip: 45.2e6,
                    stoiip_p10: 52.1e6,
                    stoiip_p50: 44.8e6,
                    stoiip_p90: 38.5e6,
                    mean: 45.2e6,
                    std: 5.1e6
                  }}
                />
              </div>

              {/* Phase 2: Well Test Analysis */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <WellTestChart
                    data={{
                      time: [0.1, 0.5, 1, 2, 5, 10, 20, 50, 100, 200],
                      pressure: [4500, 4200, 3950, 3720, 3510, 3380, 3250, 3100, 2980, 2850],
                      derivative: [120, 85, 62, 45, 32, 28, 25, 22, 20, 18]
                    }}
                  />
                </div>
                <WellTestResults
                  results={{
                    permeability: 45.2,
                    skin: 2.5,
                    reservoir_pressure: 3200,
                    flow_capacity: 2260,
                    model: 'homogeneous',
                    diagnostics: {
                      identified_regimes: [
                        { regime: 'wellbore_storage', description: 'Wellbore storage dominant at early times' },
                        { regime: 'radial_flow', description: 'Infinite acting radial flow' }
                      ]
                    }
                  }}
                />
              </div>

              {/* Phase 2: Material Balance */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <MaterialBalanceChart
                  data={{
                    drive_mechanism: 'solution_gas',
                    original_oil_in_place: 25e6,
                    original_gas_in_place: 15e9,
                    energy_index: 0.65,
                    drive_indicators: {
                      pressure_decline_rate: 15.2,
                      gor_trend: 2.5,
                      pressure_retained: 0.68,
                      final_gor: 850
                    },
                    p_over_z_data: [
                      { pressure: 3000, z_factor: 0.85, p_over_z: 3529, cumulative_gas: 0 },
                      { pressure: 2500, z_factor: 0.82, p_over_z: 3049, cumulative_gas: 1.2e9 },
                      { pressure: 2000, z_factor: 0.79, p_over_z: 2532, cumulative_gas: 2.5e9 },
                      { pressure: 1500, z_factor: 0.76, p_over_z: 1974, cumulative_gas: 3.9e9 },
                      { pressure: 1000, z_factor: 0.73, p_over_z: 1370, cumulative_gas: 5.2e9 }
                    ]
                  }}
                  type="p/z"
                />
                <div className="lg:col-span-2 space-y-4">
                  <DriveMechanismPanel
                    data={{
                      drive_mechanism: 'solution_gas',
                      energy_index: 0.65,
                      drive_indicators: {
                        pressure_decline_rate: 15.2,
                        gor_trend: 2.5,
                        pressure_retained: 0.68,
                        final_gor: 850
                      }
                    }}
                  />
                  <ReservesSummary
                    data={{
                      drive_mechanism: 'solution_gas',
                      original_oil_in_place: 25e6,
                      original_gas_in_place: 15e9,
                      energy_index: 0.65
                    }}
                  />
                </div>
              </div>

              {/* Log Viewer */}
              <LogViewer curves={generateDemoLogData()} />

              {/* Telemetry Strip */}
              <TelemetryStrip wells={['WELL-A01', 'WELL-A02', 'WELL-B01']} />

              {/* 3D Viewer */}
              <SubsurfaceViewer />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;

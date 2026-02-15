# CYSMIC Subsurface OS - Technical Stack

## Agent Grounding Tools & Libraries

### Well Log Analysis
| Tool | Purpose | Open Source |
|------|---------|-------------|
| **lasio** | Read/write LAS files (ASCII well logs) | ✅ |
| **dlisio** | Parse DLIS binary well logs | ✅ |
| **PetroPy** | Petrophysical calculations (GR, SP, resistivity → porosity, Sw) | ✅ |
| **cigvis** | Interactive well log visualization | ✅ |
| **welly** | Multi-well log processing | ✅ |

### Seismic Data
| Tool | Purpose | Open Source |
|------|---------|-------------|
| **Segyio** | Read/write SEG-Y seismic data | ✅ |
| **CIGVis** | 3D seismic visualization | ✅ |
| **ObsPy** | Seismic data processing | ✅ |
| **SeReMpy** | Seismic reservoir modeling | ✅ |
| **bruges** | Seismic rock physics | ✅ |

### Reservoir Simulation
| Tool | Purpose | Open Source |
|------|---------|-------------|
| **OPM Flow** | Black-oil reservoir simulation | ✅ |
| **PyReservoir** | Reservoir engineering calculations | ✅ |
| **MRST** (Stanford) | Reservoir simulation & optimization | ✅ |
| **ecl_kw** | Eclipse output parsing | ✅ |

### Production Forecasting & ML
| Tool | Purpose | Open Source |
|------|---------|-------------|
| **Prophet** | Time-series forecasting | ✅ |
| **XGBoost** | Gradient boosting for production | ✅ |
| **LSTM/TensorFlow** | Deep learning for patterns | ✅ |
| **Scikit-learn** | Traditional ML pipelines | ✅ |
| **SciPy** | Optimization, interpolation | ✅ |

### Petrophysics Calculations
| Calculation | Library/Method |
|-------------|----------------|
| **Porosity** | lasio + custom (density, neutron, sonic) |
| **Water Saturation** | Archie's equation (custom) |
| **Permeability** | Timur-Coates model (custom) |
| **Net Pay** | Cutoff-based (custom) |
| **Fluid Properties** | PyPVT / custom correlations |

### History Matching
| Tool | Purpose |
|------|---------|
| **OPM + Optimization** | Assisted history matching |
| **SciPy.optimize** | Gradient-based calibration |
| **Emulator models** | Surrogate models for fast matching |

---

## Proposed Agent Toolset

### Reservoir Agent
```
Tools:
├── calculate_original_oil_in_place(area, thickness, porosity, Sw)
├── calculate_gas_in_place(...)
├── predict_recovery_factor(reservoir_type, drive_mechanism)
├── run_decline_curve_analysis(production_data)
├── estimate_remaining_reserves(production_history)
└── query_rag(field_name, "reservoir characteristics")
```

### Drilling Agent
```
Tools:
├── calculate_bit_weight(rop, rpm, torque)
├── estimate_drill_time(depth, rate)
├── optimize_bha_configuration(...)
├── calculate_torque_drag(depth, hole_size)
├── detect_anomalies(drilling_parameters)
└── query_rag(field_name, "drilling reports")
```

### Production Agent
```
Tools:
├── forecast_production(well_data, method)
├── calculate_npv(cash_flows, discount_rate)
├── optimize_choke_setting(...)
├── predict_water_cut(production_history)
├── calculate_productivity_index(...)
└── query_rag(field_name, "production reports")
```

### Geology Agent
```
Tools:
├── correlate_wells(las_files, markers)
├── calculate_thickness(log_data, cutoff)
├── map_structure(seismic, horizon)
├── estimate_fault_seal(...)
├── generate_cross_section(...)
└── query_rag(field_name, "seismic interpretation")
```

### IoT/Real-time Agent
```
Tools:
├── stream_sensor_data(well_id)
├── detect_anomalies(metrics)
├── alert_threshold(pressure, temp, flow)
├── calculate_uptime(well_events)
└── predict_failure(sensor_history)
```

---

## Data Pipeline

```
┌──────────────────────────────────────────────────────────────────┐
│                    DATA SOURCES                                 │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐         │
│  │ SEG-Y  │  │  LAS    │  │ DLIS    │  │ Petrel  │         │
│  │ Seismic│  │ Well    │  │ Binary  │  │ Export  │         │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘         │
│       │             │             │             │               │
│       ▼             ▼             ▼             ▼               │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐         │
│  │ segyio │  │  lasio  │  │ dlisio  │  │ custom  │         │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘         │
│       │             │             │             │               │
└───────┼─────────────┼─────────────┼─────────────┼─────────────┘
        │             │             │             │
        ▼             ▼             ▼             ▼
┌──────────────────────────────────────────────────────────────────┐
│                    PROCESSED DATA STORE                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Seismic Cube │  │  Well Logs   │  │  Production  │         │
│  │   (NumPy)   │  │  (DataFrame) │  │   (Series)   │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│           │                │                │                     │
│           └────────────────┼────────────────┘                     │
│                            ▼                                      │
│                  ┌──────────────────┐                            │
│                  │   Vector Store   │  ← RAG Foundation         │
│                  │   (Chroma/Qdrant)│                            │
│                  └──────────────────┘                            │
└──────────────────────────────────────────────────────────────────┘
```

---

## Integration Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     LLM (Ollama/Cloud)                         │
│                           ↑                                     │
│                    ┌─────┴─────┐                               │
│                    │  LangGraph │  ← Agent Council             │
│                    └─────┬─────┘                               │
│          ┌───────────────┼───────────────┐                    │
│    ┌─────┴─────┐   ┌─────┴─────┐   ┌─────┴─────┐            │
│    │ Reservoir │   │  Drilling │   │ Production│            │
│    │   Agent   │   │   Agent   │   │   Agent   │            │
│    └─────┬─────┘   └─────┬─────┘   └─────┬─────┘            │
│          │               │               │                     │
│          ▼               ▼               ▼                     │
│    ┌─────────────────────────────────────────────┐            │
│    │           TOOL EXECUTION LAYER              │            │
│    │  ┌─────────┐ ┌─────────┐ ┌─────────────┐  │            │
│    │  │ lasio  │ │ segyio  │ │ ML Models   │  │            │
│    │  │ dlisio │ │  OPM    │ │ (Prophet,   │  │            │
│    │  │ PetroPy│ │ MRST    │ │  XGBoost)   │  │            │
│    │  └─────────┘ └─────────┘ └─────────────┘  │            │
│    └─────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Dependencies (Python)

```python
# Data Parsing
lasio>=0.32
dlisio>=0.1
segyio>=1.0
obsPy>=1.2

# Visualization
cigvis>=0.4
matplotlib>=3.7
plotly>=5.0

# Reservoir & ML
opm-flow (external)
prophet>=1.1
xgboost>=2.0
tensorflow>=2.13
scikit-learn>=1.3

# RAG & Agents
langchain>=0.3
langgraph>=0.2
langchain-ollama>=0.1
chromadb>=0.4
qdrant-client>=1.7

# Backend
django>=5.0
djangorestframework>=3.14
```

---

## Ground Truth Strategy

1. **Calculable formulas in code** - Not just LLM hallucination
2. **Cross-reference with RAG** - Agents verify with real field data
3. **Uncertainty ranges** - Always show confidence intervals
4. **Human-in-loop** - Critical decisions require engineer sign-off
5. **Explainable ML** - Feature importance, SHAP values

---

## Next Steps

1. Initialize Django project with LangGraph
2. Set up data parser module (lasio, dlisio, segyio)
3. Build first agent (Reservoir or Production) with tools
4. Connect RAG pipeline

Want me to start scaffolding the Django + LangGraph project? 🧙‍♂️

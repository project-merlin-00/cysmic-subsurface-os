# CYSMIC Subsurface OS - Technical Specification

> Version: 1.0  
> Date: February 2026

---

## 1. Vision

Field management application for oil & gas operators to manage multiple fields/basins and dive deep to specific wells. Agent-first approach to subsurface resource decision-making. Lighter alternative to Petrel/Eclipse with RAG to connect seismic → wells → reports → portfolio.

---

## 2. Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js + React + Three.js |
| Backend | Django 5.x + Django REST Framework |
| Agentic | LangGraph |
| LLM | Ollama (local/cloud) |
| RAG | LangChain + ChromaDB |
| Data Parsing | lasio, dlisio, segyio |

---

## 3. Modules

| Module | Description |
|--------|-------------|
| 3D Subsurface Model | 3D visualization, sector/well markers, stats, NL query |
| Analysis Canvas | Agent-based analysis, workflow orchestration |
| Field Manager Map | Geographic field view, asset management |
| Field Project Manager | Project tracking, tasks |
| Well Operations | Real-time monitoring, drilling phases |

---

## 4. Agent Council

| Agent | Specialty |
|-------|-----------|
| Reservoir Agent | OOIP, GIP, recovery factor, decline curves |
| Drilling Agent | BHA optimization, torque/drag, drill time |
| Production Agent | NPV, choke optimization, forecasting |
| Geology Agent | Well correlation, structure mapping |
| IoT Agent | Sensor monitoring, anomaly detection |

---

## 5. Project Structure

```
cysmic-subsurface-os/
├── cysmic/                 # Django project
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── agents/                 # LangGraph agents
│   ├── __init__.py
│   ├── council.py          # Agent orchestration
│   ├── reservoir.py
│   ├── drilling.py
│   ├── production.py
│   ├── geology.py
│   └── iot.py
├── tools/                  # Grounded calculations
│   ├── __init__.py
│   ├── petrophysics.py     # Porosity, Sw, permeability
│   ├── reservoir.py        # OOIP, GIP, recovery
│   ├── drilling.py        # Torque, drag, BHA
│   └── production.py       # NPV, decline curves
├── data/                   # Data parsers
│   ├── __init__.py
│   ├── las_parser.py       # lasio wrapper
│   ├── dlis_parser.py      # dlisio wrapper
│   └── seismic_parser.py   # segyio wrapper
├── rag/                    # RAG pipeline
│   ├── __init__.py
│   ├── ingest.py           # Document ingestion
│   └── query.py            # Query engine
├── ui/                     # Frontend (Next.js)
├── SPEC.md                 # This file
└── README.md
```

---

## 6. API Endpoints (MVP)

### Fields
- `GET /api/fields/` - List all fields
- `POST /api/fields/` - Create field
- `GET /api/fields/{id}/` - Field detail

### Wells
- `GET /api/wells/` - List wells (filter by field)
- `POST /api/wells/` - Create well
- `GET /api/wells/{id}/logs/` - Well log data

### Data Upload
- `POST /api/upload/las/` - Upload LAS file
- `POST /api/upload/seismic/` - Upload SEG-Y

### Agents
- `POST /api/agents/query/` - Query agent council
- `GET /api/agents/status/` - Agent status

### RAG
- `POST /api/rag/ingest/` - Ingest documents
- `POST /api/rag/query/` - Query documents

---

## 7. Grounded Tools

### Petrophysics
- `calculate_porosity(gamma, density, neutron)` - Porosity from logs
- `calculate_water_saturation(archie_params)` - Sw from resistivity
- `calculate_permeability(timor_coates)` - Permeability estimation

### Reservoir
- `calculate_ooip(area, h, phi, Sw)` - Original Oil in Place
- `calculate_gip(area, h, phi, Sg)` - Gas in Place
- `decline_curve_analysis(production)` - Arps decline fitting

### Drilling
- `calculate_torque_drag(depth, pipe_config)` - Torque/drag
- `optimize_bha(well_config)` - BHA optimization

### Production
- `calculate_npv(cash_flows, rate)` - Net Present Value
- `forecast_production(well_data)` - Production forecasting

---

## 8. Data Models

### Field
```python
class Field(models.Model):
    name = models.CharField(max_length=200)
    basin = models.CharField(max_length=200)
    country = models.CharField(max_length=100)
    coordinates = models.PointField()
    operator = models.CharField(max_length=200)
    discovered = models.DateField()
```

### Well
```python
class Well(models.Model):
    field = models.ForeignKey(Field, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    type = models.CharField(choices=['producer', 'injector', 'exploration'])
    status = models.CharField(choices=['active', 'drilling', 'shut-in'])
    tvd = models.FloatField()  # True vertical depth
    md = models.FloatField()   # Measured depth
```

### WellLog
```python
class WellLog(models.Model):
    well = models.ForeignKey(Well, on_delete=models.CASCADE)
    log_type = models.CharField()  # GR, Resistivity, Porosity, etc.
    data = JSONField()  # Depth-indexed values
    units = models.CharField()
```

---

## 9. Implementation Phases

### Phase 1: Foundation (Weeks 1-4)
- Django project setup
- Data models (Field, Well, WellLog)
- LAS file parser (lasio integration)
- Basic authentication

### Phase 2: Core MVP (Weeks 5-8)
- 3D visualization (Three.js)
- First agent (Reservoir) with tools
- Basic RAG pipeline

### Phase 3: Agent Council (Weeks 9-12)
- Multi-agent orchestration
- Full RAG pipeline
- All 5 modules functional

### Phase 4: Polish (Weeks 13-16)
- SEG-Y support
- IoT integration
- Desktop app (Electron)

---

## 10. Dependencies

```txt
# Django
django>=5.0
djangorestframework>=3.14

# Data Parsing
lasio>=0.32
dlisio>=0.1
segyio>=1.0

# ML & Reservoir
prophet>=1.1
xgboost>=2.0
tensorflow>=2.13
scikit-learn>=1.3

# Agents & RAG
langchain>=0.3
langgraph>=0.2
langchain-ollama>=0.1
chromadb>=0.4

# Frontend
next>=14
react>=18
three>=0.16
```

---

## 11. Acceptance Criteria

- [ ] Django project runs locally
- [ ] Can upload and parse LAS files
- [ ] Can query Reservoir Agent with tool results
- [ ] 3D visualization renders basic model
- [ ] RAG returns relevant document chunks
- [ ] Agent council produces reasoned response

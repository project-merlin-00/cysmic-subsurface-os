# CYSMIC Subsurface OS

Agentic AI platform for oil & gas field management with multi-agent council.

## Overview

CYSMIC Subsurface OS is a field management application for oil & gas operators to manage fields, basins, and wells. Built with an **agent-first approach** using LangGraph for orchestrating specialized petroleum engineering agents.

## Vision

- Lighter alternative to Petrel/Eclipse
- Agentic AI for subsurface decision-making
- RAG to connect seismic → wells → reports → portfolio

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Django 5.x + DRF |
| Agentic | LangGraph |
| LLM | Ollama (local/cloud) |
| RAG | LangChain + ChromaDB |
| Data Parsing | lasio, dlisio, segyio |

## Modules

1. **3D Subsurface Model** - 3D visualization
2. **Analysis Canvas** - Agent-based analysis
3. **Field Manager Map** - Geographic view
4. **Field Project Manager** - Project tracking
5. **Well Operations** - Real-time monitoring

## Agents

| Agent | Specialty |
|-------|-----------|
| Reservoir | OOIP, GIP, recovery, decline curves |
| Drilling | BHA, torque/drag, well planning |
| Production | NPV, choke, forecasting |
| Geology | Well logs, seismic, correlation |
| IoT | Sensors, anomaly detection |

## Quick Start

```bash
# Clone
git clone https://github.com/project-merlin-00/cysmic-subsurface-os.git
cd cysmic-subsurface-os

# Create venv
python3 -m venv venv
source venv/bin/activate

# Install
pip install -r requirements.txt

# Run
python manage.py migrate
python manage.py runserver
```

## API Endpoints

- `GET /api/core/fields/` - List fields
- `GET /api/core/wells/` - List wells
- `POST /api/agents/query/` - Query agent council

## Grounded Tools

The agents are grounded with actual petroleum engineering calculations:

- `calculate_porosity_from_density()` - Porosity from density log
- `calculate_water_saturation_archie()` - Sw from resistivity
- `calculate_ooip_volumetric()` - Original Oil in Place
- `arps_decline_curve()` - Decline curve analysis
- `calculate_npv()` - Net Present Value

## Documentation

- [SPEC.md](./SPEC.md) - Technical specification
- [TECH_STACK.md](./TECH_STACK.md) - Detailed tech stack

## GitHub

https://github.com/project-merlin-00/cysmic-subsurface-os

## License

MIT

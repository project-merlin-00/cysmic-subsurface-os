"""
LangGraph Agent Council for CYSMIC Subsurface OS
Multi-agent orchestration for petroleum engineering tasks
"""

import os
from typing import TypedDict, List, Annotated
from dataclasses import dataclass, field
from enum import Enum

# LangGraph imports
from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_core.tools import tool

# Note: In production, use actual imports
# from langchain_ollama import ChatOllama
# from cysmic.tools import petrophysics, reservoir


class AgentType(str, Enum):
    """Types of specialized agents"""
    RESERVOIR = "reservoir"
    DRILLING = "drilling"
    PRODUCTION = "production"
    GEOLOGY = "geology"
    IOT = "iot"


@dataclass
class AgentTool:
    """Tool available to agents"""
    name: str
    description: str
    function: callable
    parameters: dict


@dataclass
class Agent:
    """Specialized agent configuration"""
    agent_type: AgentType
    name: str
    description: str
    system_prompt: str
    tools: List[AgentTool] = field(default_factory=list)


class AgentState(TypedDict):
    """State passed between nodes in the agent graph"""
    messages: List  # Chat messages
    task: str  # Current task description
    context: dict  # Field/well context data
    agent_results: dict  # Results from each agent
    final_response: str  # Consolidated response
    active_agents: List[str]  # Agents to consult


# ============================================================
# TOOLS FOR AGENTS
# ============================================================

@tool
def calculate_ooip(area: float, thickness: float, porosity: float, 
                  sw: float, boi: float = 1.2) -> str:
    """
    Calculate Original Oil in Place (OOIP) using volumetric method.
    
    Args:
        area: Drainage area in acres
        thickness: Net thickness in feet
        porosity: Porosity as decimal (e.g., 0.20 for 20%)
        sw: Water saturation as decimal
        boi: Oil formation volume factor (rb/STB), default 1.2
    
    Returns:
        OOIP in STB with explanation
    """
    # Using reservoir calculation
    try:
        # Simple volumetric calculation
        ooip = (area * thickness * porosity * (1 - sw)) / (5.615 * boi)
        
        return f"""
**OOIP Calculation:**
- Area: {area:,} acres
- Thickness: {thickness:.1f} ft
- Porosity: {porosity*100:.1f}%
- Water Saturation: {sw*100:.1f}%
- Boi: {boi:.2f} rb/STB

**Result: {ooip:,.0f} STB** ({ooip/1e6:.2f} MMSTB)
"""
    except Exception as e:
        return f"Error calculating OOIP: {str(e)}"


@tool
def calculate_recovery_factor(
    drive_mechanism: str,
    current_recovery: float,
    ooip: float
) -> str:
    """
    Calculate current recovery factor and remaining potential.
    
    Args:
        drive_mechanism: Drive type ('solution_gas', 'gas_cap', 'water_drive', 'combination')
        current_recovery: Current oil recovered in STB
        ooip: Original Oil in Place in STB
    
    Returns:
        Recovery analysis with recommendations
    """
    if ooip <= 0:
        return "Error: OOIP must be positive"
    
    current_rf = (current_recovery / ooip) * 100
    
    # Expected RF by drive mechanism
    expected_rf = {
        'solution_gas': 10,
        'gas_cap': 20,
        'water_drive': 30,
        'combination': 35,
    }.get(drive_mechanism.lower().replace(' ', '_'), 15)
    
    remaining = expected_rf - current_rf
    
    return f"""
**Recovery Factor Analysis:**
- Drive Mechanism: {drive_mechanism.title()} Drive
- Current Recovery: {current_rf:.1f}%
- Expected Recovery: {expected_rf:.1f}%
- Remaining Potential: {remaining:.1f}%

**Recommendation:**
{"Consider water injection to improve recovery" if drive_mechanism == "solution_gas" and remaining > 10 else "Continue current operations"}
"""


@tool
def analyze_decline_curve(
    initial_rate: float,
    current_rate: float,
    time_months: float,
    decline_type: str = "hyperbolic"
) -> str:
    """
    Analyze decline curve and forecast future production.
    
    Args:
        initial_rate: Initial production rate (bbl/d)
        current_rate: Current production rate (bbl/d)
        time_months: Time since start (months)
        decline_type: Type of decline ('exponential', 'hyperbolic', 'harmonic')
    
    Returns:
        Decline analysis with forecast
    """
    if initial_rate <= 0 or current_rate <= 0:
        return "Error: Rates must be positive"
    
    # Calculate decline rate
    if decline_type == "exponential":
        di = -math.log(current_rate / initial_rate) / time_months if current_rate < initial_rate else 0
    else:
        # Simplified for hyperbolic
        di = (initial_rate / current_rate - 1) / time_months if current_rate < initial_rate else 0
    
    # Forecast
    forecast_12m = current_rate * math.exp(-di * 12) if decline_type == "exponential" else current_rate / (1 + di * 12)
    
    # Calculate EUR (simplified)
    eur = current_rate / di if di > 0 else 0
    
    return f"""
**Decline Curve Analysis:**
- Decline Type: {decline_type.title()}
- Initial Rate: {initial_rate:,.0f} bbl/d
- Current Rate: {current_rate:,.0f} bbl/d
- Decline Rate: {di*100:.2f}%/month

**Forecast:**
- 12-Month Rate: {forecast_12m:,.0f} bbl/d
- Estimated Ultimate Recovery: {eur:,.0f} bbl

**Recommendation:**
{"Optimize choke to maintain rate" if di > 0.05 else "Monitor for potential workover"}
"""


@tool
def calculate_npv_analysis(
    cash_flows: str,
    discount_rate: float = 0.1
) -> str:
    """
    Calculate NPV for a project or well.
    
    Args:
        cash_flows: Comma-separated cash flows (negative for investment, positive for revenue)
        discount_rate: Annual discount rate (default 10%)
    
    Returns:
        NPV analysis with recommendations
    """
    try:
        flows = [float(x.strip()) for x in cash_flows.split(',')]
    except:
        return "Error: Invalid cash flow format. Use: -100000, 10000, 15000, ..."
    
    if not flows:
        return "Error: No cash flows provided"
    
    # Simple NPV calculation
    npv = 0
    for i, cf in enumerate(flows):
        npv += cf / ((1 + discount_rate) ** i)
    
    total_investment = abs(sum(f for f in flows if f < 0))
    total_revenue = sum(f for f in flows if f > 0)
    pi = total_revenue / total_investment if total_investment > 0 else 0
    
    return f"""
**NPV Analysis:**
- Discount Rate: {discount_rate*100:.0f}%
- Total Investment: ${total_investment:,.0f}
- Total Revenue: ${total_revenue:,.0f}

**Results:**
- NPV: ${npv:,.0f}
- Profitability Index: {pi:.2f}

**Verdict: {"PROFITABLE" if npv > 0 else "NOT PROFITABLE"}
"""


# ============================================================
# AGENT PROMPTS
# ============================================================

RESERVOIR_AGENT_PROMPT = """You are a Reservoir Engineering Agent for CYSMIC Subsurface OS.

Your expertise includes:
- Volumetric calculations (OOIP, GIP)
- Decline curve analysis
- Recovery factor estimation
- Drive mechanism analysis
- Material balance

You have access to tools for:
- calculate_ooip: Calculate Original Oil in Place
- calculate_recovery_factor: Analyze recovery factor
- analyze_decline_curve: Production forecasting
- calculate_npv: Economic analysis

Always show your calculations and cite assumptions.
Provide recommendations based on engineering principles."""


DRILLING_AGENT_PROMPT = """You are a Drilling Engineering Agent for CYSMIC Subsurface OS.

Your expertise includes:
- BHA (Bottom Hole Assembly) design
- Torque and drag calculations
- Drill time estimation
- Well planning
- Mud weight calculations

You have access to tools for drilling calculations.
Always show your work and cite industry standards."""


PRODUCTION_AGENT_PROMPT = """You are a Production Engineering Agent for CYSMIC Subsurface OS.

Your expertise includes:
- Production optimization
- Choke sizing
- NPV analysis
- Artificial lift selection
- Well performance

You have access to tools for:
- calculate_npv_analysis: Economic analysis
- analyze_decline_curve: Production forecasting
- calculate_productivity_index: Well performance

Provide actionable recommendations."""


GEOLOGY_AGENT_PROMPT = """You are a Geology Agent for CYSMIC Subsurface OS.

Your expertise includes:
- Well log interpretation
- Seismic analysis
- Structure mapping
- Stratigraphy
- Fault analysis

You can query the RAG system for field reports and seismic interpretations.
Provide geological insights and recommendations."""


IOT_AGENT_PROMPT = """You are an IoT/Real-time Monitoring Agent for CYSMIC Subsurface OS.

Your expertise includes:
- Sensor data analysis
- Anomaly detection
- Predictive maintenance
- Real-time alerts

You can access real-time sensor data from wells.
Provide operational insights and alerts."""


# ============================================================
# AGENT COUNCIL ORCHESTRATION
# ============================================================

def create_agent_council():
    """
    Create the LangGraph agent council workflow.
    
    Flow:
    1. Receive user query
    2. Classify task to determine which agents needed
    3. Invoke relevant agents in parallel or sequence
    4. Consolidate responses
    5. Return final answer
    """
    
    # Define the graph
    workflow = StateGraph(AgentState)
    
    # Add nodes
    workflow.add_node("classifier", classify_task)
    workflow.add_node("reservoir_agent", invoke_reservoir_agent)
    workflow.add_node("drilling_agent", invoke_drilling_agent)
    workflow.add_node("production_agent", invoke_production_agent)
    workflow.add_node("geology_agent", invoke_geology_agent)
    workflow.add_node("iot_agent", invoke_iot_agent)
    workflow.add_node("consolidator", consolidate_response)
    
    # Set entry point
    workflow.set_entry_point("classifier")
    
    # Add conditional edges based on classification
    workflow.add_conditional_edges(
        "classifier",
        route_to_agents,
        {
            "reservoir": "reservoir_agent",
            "drilling": "drilling_agent", 
            "production": "production_agent",
            "geology": "geology_agent",
            "iot": "iot_agent",
            "multi": ["reservoir_agent", "production_agent"],  # Run both
            "general": "consolidator",
        }
    )
    
    # All agents lead to consolidator
    for agent in ["reservoir_agent", "drilling_agent", "production_agent", 
                  "geology_agent", "iot_agent"]:
        workflow.add_edge(agent, "consolidator")
    
    workflow.add_edge("consolidator", END)
    
    return workflow.compile()


def classify_task(state: AgentState) -> AgentState:
    """Classify the user task to determine which agents to invoke."""
    task = state.get("task", "").lower()
    
    # Determine active agents
    agents = []
    
    if any(word in task for word in ["ooip", "gip", "reserves", "recovery", "volumetric", 
                                       "drive", "reservoir", "pressure", "aquifer"]):
        agents.append("reservoir")
    
    if any(word in task for word in ["drill", "bha", "torque", "drag", "well plan", 
                                       "mud", "casing", "cement"]):
        agents.append("drilling")
    
    if any(word in task for word in ["production", "rate", "forecast", "npv", "economic",
                                       "choke", "lift", "decline"]):
        agents.append("production")
    
    if any(word in task for word in ["log", "seismic", "geology", "structure", "fault",
                                       "stratigraphy", "correlation", "porosity"]):
        agents.append("geology")
    
    if any(word in task for word in ["sensor", "monitor", "real-time", "pressure", 
                                       "temperature", "alert", "anomaly"]):
        agents.append("iot")
    
    # Default to reservoir if unclear
    if not agents:
        agents = ["reservoir"]
    
    state["active_agents"] = agents
    return state


def route_to_agents(state: AgentState) -> str:
    """Route to appropriate agent(s)."""
    agents = state.get("active_agents", [])
    
    if len(agents) > 1:
        return "multi"
    elif agents:
        return agents[0]
    else:
        return "general"


# Agent invocation functions (simplified - would use actual LLM in production)
def invoke_reservoir_agent(state: AgentState) -> AgentState:
    """Invoke reservoir agent for the task."""
    # In production: Use LLM + tools
    result = {
        "agent": "reservoir",
        "response": "Reservoir analysis would be performed here with OOIP calculations."
    }
    state["agent_results"]["reservoir"] = result
    return state


def invoke_drilling_agent(state: AgentState) -> AgentState:
    """Invoke drilling agent for the task."""
    result = {
        "agent": "drilling", 
        "response": "Drilling analysis would be performed here."
    }
    state["agent_results"]["drilling"] = result
    return state


def invoke_production_agent(state: AgentState) -> AgentState:
    """Invoke production agent for the task."""
    result = {
        "agent": "production",
        "response": "Production analysis would be performed here."
    }
    state["agent_results"]["production"] = result
    return state


def invoke_geology_agent(state: AgentState) -> AgentState:
    """Invoke geology agent for the task."""
    result = {
        "agent": "geology",
        "response": "Geology analysis would be performed here."
    }
    state["agent_results"]["geology"] = result
    return state


def invoke_iot_agent(state: AgentState) -> AgentState:
    """Invoke IoT agent for the task."""
    result = {
        "agent": "iot",
        "response": "IoT analysis would be performed here."
    }
    state["agent_results"]["iot"] = result
    return state


def consolidate_response(state: AgentState) -> AgentState:
    """Consolidate responses from multiple agents."""
    task = state.get("task", "")
    results = state.get("agent_results", {})
    
    # Build final response
    response = f"## CYSMIC Agent Council Response\n\n"
    response += f"**Query:** {task}\n\n"
    
    for agent_name, result in results.items():
        response += f"### {agent_name.title()} Agent\n"
        response += result.get("response", "No response") + "\n\n"
    
    state["final_response"] = response
    return state


# ============================================================
# API ENDPOINT
# ============================================================

async def query_agent_council(
    task: str,
    context: dict = None,
    agents: List[str] = None
) -> dict:
    """
    Query the agent council.
    
    Args:
        task: User's question/task
        context: Optional context (field, well data)
        agents: Optional specific agents to invoke
    
    Returns:
        Consolidated response from agent council
    """
    # Create initial state
    initial_state = {
        "messages": [],
        "task": task,
        "context": context or {},
        "agent_results": {},
        "final_response": "",
        "active_agents": agents or [],
    }
    
    # Run the graph (would use actual compiled graph in production)
    # graph = create_agent_council()
    # result = graph.invoke(initial_state)
    
    # Simplified response for now
    return {
        "task": task,
        "response": f"Agent council would analyze: {task}",
        "agents_invoked": agents or ["reservoir"],  # Default
    }


# ============================================================
# DEMO
# ============================================================

if __name__ == "__main__":
    import asyncio
    
    async def demo():
        # Test query
        result = await query_agent_council(
            task="Calculate OOIP for Field A with area 1000 acres, thickness 50ft, porosity 20%, Sw 25%",
            context={"field": "Field A"}
        )
        print(result)
    
    asyncio.run(demo())

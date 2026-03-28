# Orchestrator Hooks

This directory contains hooks to enforce proper Orchestrator agent usage in ProTraderSim development workflows.

## Overview

The Orchestrator agent is the central coordination point for complex multi-agent development tasks. These hooks ensure that complex tasks are properly routed through the Orchestrator for decomposition and agent coordination.

## Hooks

### 1. orchestrator-enforcement.json
**Event**: PreToolUse  
**Purpose**: Blocks complex tasks that don't use Orchestrator and redirects to proper workflow

**Triggers when**:
- Task involves multiple subtasks
- Affects multiple platform layers (frontend, backend, database)
- Cross-cutting concerns detected
- Multiple specialist agents required

**Action**: Blocks execution and suggests using `@orchestrator`

### 2. orchestrator-session-start.json
**Event**: SessionStart  
**Purpose**: Injects guidance about Orchestrator usage at the beginning of sessions

**Action**: Provides welcome message with Orchestrator usage guidance

### 3. orchestrator-workflow.json
**Event**: PreToolUse  
**Purpose**: Enforces complete Orchestrator workflow for complex tasks

**Action**: Validates proper workflow steps and provides fallback guidance

### 4. complexity-check.sh
**Purpose**: Companion script for task complexity analysis

**Features**:
- Scores task complexity based on keywords
- Counts affected platform layers
- Identifies required specialist agents
- Outputs JSON analysis for hook consumption

### 5. orchestrator-feedback.json
**Event**: PostToolUse  
**Purpose**: Provides real-time feedback about workflow compliance

**Triggers when**:
- Complex task was completed without Orchestrator
- Multiple specialist agents were involved
- Workflow optimization opportunity identified

**Action**: Provides constructive feedback and suggests Orchestrator usage

## Usage

### For Developers
When starting a complex task:
1. Use `@orchestrator [describe your task]`
2. Follow the Orchestrator's decomposition and assignment guidance
3. Work with the assigned specialist agents
4. Return to Orchestrator for progress tracking and consolidation

### For Hook System
The hooks automatically:
- Detect complex tasks
- Enforce Orchestrator usage
- Provide guidance when needed
- Maintain workflow consistency

## Configuration

All hooks are enabled by default. To modify behavior:
- Edit the JSON files in this directory
- Adjust complexity thresholds in `complexity-check.sh`
- Update condition criteria in hook definitions

## Integration

These hooks integrate with the ProTraderSim agent framework:
- Works with all 14 specialist agents
- Maintains the agent hierarchy (Orchestrator → Specialists)
- Preserves existing agent capabilities
- Adds coordination layer for complex tasks

## Examples

### Complex Task (Requires Orchestrator)
```
User: "Build a trailing stop loss feature for the trading platform"
Hook: Detects complexity → Blocks direct execution → Suggests @orchestrator
Orchestrator: Decomposes into subtasks → Assigns to @coding, @frontend, @test
```

### Simple Task (No Orchestrator Needed)
```
User: "Fix a typo in the navigation header"
Hook: Detects simplicity → Allows direct execution with @frontend
```

### Complex Task Completed Without Orchestrator (Feedback)
```
User: Directly works with @coding and @frontend to build feature
Hook: Post-execution → Provides feedback → Suggests Orchestrator for next time
```

## Testing

Test hooks by:
1. Starting complex tasks without Orchestrator
2. Verifying proper redirection occurs
3. Checking session start guidance appears
4. Validating complexity scoring accuracy
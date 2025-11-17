# RSA Agent Prompts

This directory contains system prompts for Cursor agents designed to work with the RSA Systems Platform.

## Available Agents

### 1. **RSA Full-Stack Implementation Agent** (`01-main-vibe-agent.md`)
The main implementation agent that performs full repository scans, identifies missing features, and implements fixes across the entire stack.

**Use when:** You need comprehensive system updates, feature implementations, or bug fixes across multiple modules.

### 2. **RSA System Auditor** (`02-audit-agent.md`)
An audit-only agent that scans the repository and generates detailed reports of missing features, broken logic, and inconsistencies.

**Use when:** You need to assess the current state of the system without making changes.

### 3. **Timesheet Week Boundary Fix Agent** (`03-timesheet-week-fix-agent.md`)
A focused agent that fixes all weekly calculation logic to ensure Sunday → Saturday week boundaries.

**Use when:** You need to fix week calculation bugs specifically, without touching other parts of the system.

### 4. **RSA Week Boundary Test Generator** (`04-automated-test-agent.md`)
An automated test generation agent that creates Jest test suites for validating weekly time tracking logic.

**Use when:** You need comprehensive test coverage for week boundary calculations.

## How to Use

1. Open Cursor
2. Navigate to the agent configuration (usually in Settings or Agent Management)
3. Create a new agent
4. Copy the entire contents of the desired agent's markdown file
5. Paste into the "System Prompt" field
6. Name the agent as specified in each file

## Additional Agents (Available on Request)

The following agents can be generated if needed:

- **UI Redesign Agent** - For UI/UX improvements and standardization
- **Database Migration Repair Agent** - For fixing Prisma schema and migration issues
- **Gantt Scheduling Agent** - For implementing project scheduling features
- **Role/Permission Repair Agent** - For fixing RBAC and permission systems

## Notes

- All agents are designed to work with Next.js, Prisma, and PostgreSQL
- Agents assume the codebase follows the RSA Systems Platform architecture
- The main implementation agent is the most comprehensive and should be used for major updates
- The audit agent is read-only and will not make any code changes



/**
 * BMad-Method Knowledge Integration Module
 * 
 * This module processes the BMad-Method framework knowledge from team-fullstack.txt
 * and provides context-aware prompt enhancement for AI interactions.
 */

const fs = require('fs');
const path = require('path');

class BMadIntegration {
  constructor() {
    this.knowledgeBase = null;
    this.agents = {};
    this.currentAgent = 'echo';
    this.loadKnowledge();
  }

  /**
   * Load and parse the BMad-Method knowledge base
   */
  loadKnowledge() {
    try {
      const knowledgePath = path.join(__dirname, '../team-fullstack.txt');
      const content = fs.readFileSync(knowledgePath, 'utf8');
      this.knowledgeBase = content;
      this.parseAgents(content);
    } catch (error) {
      console.error('Failed to load BMad knowledge base:', error);
      this.knowledgeBase = '';
    }
  }

  /**
   * Parse available agents from the knowledge base and create ECHO team
   */
  parseAgents(content) {
    const agentSections = content.split('==================== START: .bmad-core/agents/');
    
    // Define core ECHO team focused on @team-fullstack.txt knowledge
    const echoTeam = {
      'echo': {
        name: 'ECHO',
        title: 'ECHO - Workflow Coordinator',
        role: 'Professional workflow coordinator for agile development',
        style: 'Direct, professional, outcome-focused',
        focus: 'Specialist coordination and resource allocation',
        whenToUse: 'For workflow coordination and specialist routing'
      },
      'analyst': {
        name: 'Mary',
        title: 'Mary - Business Analyst',
        role: 'Business analysis and strategic research',
        style: 'Analytical, data-driven, objective',
        focus: 'Market research, competitive analysis, business intelligence',
        whenToUse: 'For market research, competitive analysis, or business strategy',
        contentGeneration: {
          documents: ['Market Analysis', 'Competitive Analysis', 'Business Reports']
        }
      },
      'pm': {
        name: 'John',
        title: 'John - Product Manager', 
        role: 'Product strategy and requirements documentation',
        style: 'Strategic, systematic, outcome-oriented',
        focus: 'Product strategy, requirements documentation, roadmap planning',
        whenToUse: 'For product strategy, requirements gathering, or PRD creation',
        contentGeneration: {
          documents: ['Product Requirements Documents', 'Product Roadmaps', 'Feature Specifications']
        }
      },
      'ux-expert': {
        name: 'Sally',
        title: 'Sally - UX Expert',
        role: 'User experience design and interface development',
        style: 'User-centered, methodical, detail-oriented',
        focus: 'User experience design, interface specifications, design systems',
        whenToUse: 'For UX/UI design, user research, or interface specifications',
        contentGeneration: {
          documents: ['UX Research Reports', 'Design Documentation', 'User Personas']
        }
      },
      'architect': {
        name: 'Winston',
        title: 'Winston - System Architect',
        role: 'Technical architecture and infrastructure planning',
        style: 'Systematic, pragmatic, technically rigorous',
        focus: 'System architecture, technology selection, infrastructure planning',
        whenToUse: 'For system architecture, technology decisions, or infrastructure planning',
        contentGeneration: {
          documents: ['Architecture Documents', 'Infrastructure Plans', 'Technology Assessments']
        }
      },
      'po': {
        name: 'Sarah',
        title: 'Sarah - Product Owner',
        role: 'Product ownership and delivery coordination',
        style: 'Systematic, detail-oriented, process-driven',
        focus: 'Product ownership, quality assurance, delivery coordination',
        whenToUse: 'For product ownership, quality reviews, or delivery coordination',
        contentGeneration: {
          documents: ['User Stories', 'Acceptance Criteria', 'Sprint Reports']
        }
      }
    };
    
    // Load ECHO team
    this.agents = echoTeam;
    
    // Also parse any additional agents from knowledge base
    agentSections.forEach(section => {
      if (section.includes('==================== END:')) {
        const lines = section.split('\n');
        const agentFile = lines[0];
        
        if (agentFile && agentFile.includes('.md')) {
          const agentName = agentFile.replace('.md', '').trim();
          
          // Only override if not already in ECHO team
          if (!this.agents[agentName]) {
            const yamlMatch = section.match(/```yaml([\s\S]*?)```/);
            if (yamlMatch) {
              const agentInfo = this.parseAgentYaml(yamlMatch[1]);
              if (agentInfo) {
                this.agents[agentName] = agentInfo;
              }
            }
          }
        }
      }
    });
  }

  /**
   * Parse agent YAML configuration
   */
  parseAgentYaml(yamlContent) {
    try {
      const lines = yamlContent.split('\n');
      const agent = {};
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.includes('name:')) {
          agent.name = trimmed.split('name:')[1].trim();
        } else if (trimmed.includes('title:')) {
          agent.title = trimmed.split('title:')[1].trim();
        } else if (trimmed.includes('whenToUse:')) {
          agent.whenToUse = trimmed.split('whenToUse:')[1].trim();
        } else if (trimmed.includes('role:')) {
          agent.role = trimmed.split('role:')[1].trim();
        } else if (trimmed.includes('style:')) {
          agent.style = trimmed.split('style:')[1].trim();
        } else if (trimmed.includes('focus:')) {
          agent.focus = trimmed.split('focus:')[1].trim();
        }
      }
      
      return agent;
    } catch (error) {
      console.error('Failed to parse agent YAML:', error);
      return null;
    }
  }

  /**
   * Get list of available agents
   */
  getAgents() {
    return this.agents;
  }

  /**
   * Set the current active agent
   */
  setAgent(agentName) {
    if (this.agents[agentName]) {
      this.currentAgent = agentName;
      return true;
    }
    return false;
  }

  /**
   * Get the current active agent
   */
  getCurrentAgent() {
    return this.currentAgent;
  }

  /**
   * Get agent information
   */
  getAgentInfo(agentName = null) {
    const agent = agentName || this.currentAgent;
    return this.agents[agent] || null;
  }

  /**
   * Generate ECHO-enhanced system message with friendly personality
   */
  generateSystemMessage(agentName = null) {
    const agent = agentName || this.currentAgent;
    const agentInfo = this.agents[agent];
    
    if (!agentInfo) {
      return this.getDefaultSystemMessage();
    }

    if (agent === 'echo') {
      return `You are ECHO, a professional workflow coordinator for agile development methodology.

CORE IDENTITY: You coordinate specialist resources and direct users to appropriate expertise based on their current project requirements.

PRIMARY FUNCTION: 
Analyze user requests and connect them with the appropriate specialist based on their development phase and specific needs.

AVAILABLE SPECIALISTS:
1. ANALYST - Market research, competitive analysis, business intelligence
2. PRODUCT MANAGER - Requirements documentation, product strategy, roadmaps
3. UX EXPERT - User interface design, wireframes, user experience
4. ARCHITECT - System design, technical planning, infrastructure
5. PRODUCT OWNER - Epic creation, user stories, sprint planning

COORDINATION APPROACH:
- Identify user requirements directly
- Recommend appropriate specialist based on need
- Provide clear rationale for specialist selection
- Focus on actionable outcomes

COMMUNICATION STYLE:
- Direct and professional
- Clear specialist recommendations
- Outcome-focused responses
- No unnecessary elaboration

SPECIALIST ROUTING:
- Research/Analysis needs → Analyst
- Requirements/Strategy → Product Manager  
- Design/UX needs → UX Expert
- Technical/Architecture → Architect
- Story/Epic breakdown → Product Owner

DIRECTIVE: Provide efficient specialist coordination with clear, actionable recommendations based on user requirements.`;
    }

    return `You are ${agentInfo.title}, specializing in ${agentInfo.focus}.

ROLE: ${agentInfo.role}
SPECIALIZATION: ${agentInfo.focus}
APPROACH: ${agentInfo.style}

USE WHEN: ${agentInfo.whenToUse}

CORE RESPONSIBILITIES:
- Provide domain-specific expertise
- Generate professional deliverables
- Focus on actionable outcomes
- Maintain quality standards

DELIVERABLES:
- ${(agentInfo.contentGeneration && agentInfo.contentGeneration.documents) ? agentInfo.contentGeneration.documents.join(', ') : 'Professional documentation'}
- Clear recommendations and analysis
- Structured documentation and reports

COMMUNICATION STANDARDS:
- Direct and professional responses
- Clear, actionable recommendations
- Focus on specific user requirements
- Structured output with proper formatting

DIRECTIVE: Provide expert ${agentInfo.focus.toLowerCase()} with clear, professional deliverables focused on user requirements.`;
  }

  /**
   * Get default ECHO system message
   */
  getDefaultSystemMessage() {
    return `You are ECHO, Chief Executive Officer and strategic leader of this development organization.

You direct a team of specialized professionals, each with distinct expertise in agile development methodologies. Your role is to provide executive oversight and connect users with appropriate specialists to achieve superior project outcomes.

ORGANIZATIONAL STRUCTURE:
• ECHO (You) - Chief Executive Officer & Strategic Orchestrator
• Mary - Business Analyst & Strategic Research Specialist
• John - Product Manager & Requirements Specialist  
• Sally - UX Design Expert & Interface Specialist
• Winston - System Architect & Technical Infrastructure Specialist
• Sarah - Product Owner & Quality Assurance Specialist

OPERATIONAL PRINCIPLES:
- User-Centric Development Focus
- Iterative & Incremental Delivery Methodology
- Strategic Collaborative Approach
- Transparent Communication Protocols
- Results-Oriented Value Delivery
- Adaptive Strategic Response

AVAILABLE COMMANDS:
- */help - Access team capabilities and organizational structure
- */agent [name] - Delegate to specialist (analyst, pm, ux-expert, architect, po)
- */status - Review current progress and strategic positioning

Executive Directive: Provide strategic leadership while leveraging specialized team expertise to deliver exceptional results through systematic agile methodologies.`;
  }

  /**
   * Process user input for BMad commands and workflow detection
   */
  processCommand(message) {
    const trimmed = message.trim();
    
    // Handle explicit commands
    if (trimmed.startsWith('*/help') || trimmed.startsWith('*help')) {
      return this.getHelpResponse();
    }
    
    if (trimmed.startsWith('*/agent') || trimmed.startsWith('*agent')) {
      const parts = trimmed.split(' ');
      if (parts.length > 1) {
        const agentName = parts[1];
        if (this.setAgent(agentName)) {
          return this.getAgentSwitchResponse(agentName);
        } else {
          return this.getInvalidAgentResponse(agentName);
        }
      } else {
        return this.getAgentListResponse();
      }
    }
    
    // Handle specialist shortcuts
    if (trimmed.startsWith('*analyst') || trimmed.startsWith('*brainstorm')) {
      if (this.setAgent('analyst')) {
        return this.getAgentSwitchResponse('analyst');
      }
    }
    
    if (trimmed.startsWith('*pm')) {
      if (this.setAgent('pm')) {
        return this.getAgentSwitchResponse('pm');
      }
    }
    
    if (trimmed.startsWith('*ux-expert')) {
      if (this.setAgent('ux-expert')) {
        return this.getAgentSwitchResponse('ux-expert');
      }
    }
    
    if (trimmed.startsWith('*architect')) {
      if (this.setAgent('architect')) {
        return this.getAgentSwitchResponse('architect');
      }
    }
    
    if (trimmed.startsWith('*po')) {
      if (this.setAgent('po')) {
        return this.getAgentSwitchResponse('po');
      }
    }
    
    if (trimmed.startsWith('*/status') || trimmed.startsWith('*status')) {
      return this.getStatusResponse();
    }
    
    if (trimmed.startsWith('*/workflow') || trimmed.startsWith('*workflow')) {
      return this.getWorkflowResponse();
    }
    
    return null; // No command detected
  }

  /**
   * Generate ECHO help response
   */
  getHelpResponse() {
    const currentAgentInfo = this.getAgentInfo();
    
    return `# ECHO - BMad Methodology Workflow Guide

## Welcome! I'm ECHO, Your BMad Workflow Facilitator

I'm here to help guide you through the BMad agile methodology by connecting you with the right specialists at the right time. I analyze your project needs and recommend the most appropriate expert to help you progress.

## BMad Methodology Workflow

**1. IDEATION PHASE** → *Mary (Business Analyst)*
• Brainstorming, market research, competitive analysis
• Command: \`*analyst\` or \`*brainstorm\`

**2. REQUIREMENTS PHASE** → *John (Product Manager)*
• PRD creation, product strategy, roadmap planning
• Command: \`*pm\`

**3. DESIGN PHASE** → *Sally (UX Expert)*
• User experience, wireframes, design systems
• Command: \`*ux-expert\`

**4. ARCHITECTURE PHASE** → *Winston (System Architect)*
• Technical architecture, system design, infrastructure
• Command: \`*architect\`

**5. EPIC CREATION PHASE** → *Sarah (Product Owner)*
• Epic breakdown, user stories, sprint planning
• Command: \`*po\`

## Available Specialists

**Mary** - Business Analyst & Research Specialist
• Ideation support, market analysis, competitive intelligence
• Perfect for: "I have an idea..." or "I need to research..."

**John** - Product Manager & Strategy Expert
• PRD creation, requirements gathering, product roadmaps
• Perfect for: "I need a product plan..." or "How do I structure this..."

**Sally** - UX Design Expert & Interface Specialist
• User experience design, wireframes, design systems
• Perfect for: "How should users interact..." or "I need designs..."

**Winston** - System Architect & Technical Infrastructure
• Technical architecture, system design, technology decisions
• Perfect for: "What's the best architecture..." or "How should I build..."

**Sarah** - Product Owner & Epic Management
• Epic creation, user story breakdown, backlog management
• Perfect for: "How do I break this down..." or "I need user stories..."

## Quick Commands

• \`*help\` - Show this guide
• \`*workflow\` - Show your current position in BMad process
• \`*status\` - Current progress and next steps
• \`*analyst\` or \`*brainstorm\` - Start ideation phase
• \`*pm\` - Move to requirements/PRD phase
• \`*ux-expert\` - Begin design phase
• \`*architect\` - Start architecture phase
• \`*po\` - Epic creation and story breakdown

## How I Help

Instead of guessing which specialist you need, just tell me about your project! I'll analyze what you're saying and recommend the right expert. For example:

"I have an idea for an app..." → I'll connect you with Mary for research
"I need to plan my product features..." → I'll connect you with John for strategy
"My users need a better interface..." → I'll connect you with Sally for UX

**Current Specialist:** ${(currentAgentInfo && currentAgentInfo.title) ? currentAgentInfo.title : 'ECHO (Workflow Facilitator)'}

Let me know what you're working on, and I'll guide you to the right specialist!`;
  }

  /**
   * Generate agent switch response
   */
  getAgentSwitchResponse(agentName) {
    const agentInfo = this.getAgentInfo(agentName);
    
    return `# Specialist Engagement: ${agentInfo.title}

**Professional Introduction:** I am **${agentInfo.name}**, ${agentInfo.personality}

**Role & Responsibilities:** ${agentInfo.role}
**Area of Specialization:** ${agentInfo.focus}
**Engagement Criteria:** ${agentInfo.whenToUse}

**Professional Approach:**
I operate with ${agentInfo.style.toLowerCase()} methodology as an integrated member of the ECHO organization. My approach emphasizes systematic agile development, user-centered design principles, and measurable value delivery through collaborative engagement.

**Next Steps:** ${this.getAgentSpecificPrompt(agentName)}

**Team Coordination:** Use \`*/agent [name]\` for specialist delegation or \`*/help\` for organizational directory.`;
  }

  /**
   * Generate invalid agent response
   */
  getInvalidAgentResponse(agentName) {
    return `# Invalid Specialist Designation: "${agentName}"

**Available ECHO Organization Members:**

• **ECHO** - Chief Executive Officer (Team coordination)
• **Mary** - Business Analyst (Command: analyst)
• **John** - Product Manager (Command: pm)
• **Sally** - UX Design Expert (Command: ux-expert)
• **Winston** - System Architect (Command: architect)
• **Sarah** - Product Owner (Command: po)

**Correct Usage:** \`*/agent analyst\` or \`*/help\` for organizational directory

**Note:** Precise command syntax is required for effective specialist delegation.`;
  }

  /**
   * Generate agent list response
   */
  getAgentListResponse() {
    const currentAgentInfo = this.getAgentInfo();
    
    return `# ECHO Organization - Complete Specialist Directory

**Available Professional Team Members:**

• **ECHO** - Chief Executive Officer & Strategic Orchestrator
• **Mary** (\`*/agent analyst\`) - Business Analyst & Strategic Research Specialist
• **John** (\`*/agent pm\`) - Product Manager & Requirements Specialist
• **Sally** (\`*/agent ux-expert\`) - UX Design Expert & Interface Specialist
• **Winston** (\`*/agent architect\`) - System Architect & Technical Infrastructure Specialist
• **Sarah** (\`*/agent po\`) - Product Owner & Quality Assurance Specialist

**Current Active Leadership:** ${(currentAgentInfo && currentAgentInfo.title) ? currentAgentInfo.title : 'ECHO (Chief Executive Officer)'}

**Delegation Protocol:** Use \`*/agent [name]\` for specialist engagement

**Organizational Commitment:** Professional agile methodology implementation for superior project outcomes.`;
  }

  /**
   * Get agent-specific prompt for engagement
   */
  getAgentSpecificPrompt(agentName) {
    const prompts = {
      'echo': 'Please provide your project requirements for strategic assessment and appropriate resource allocation.',
      'analyst': 'Please specify your research objectives or analytical requirements for comprehensive business intelligence.',
      'pm': 'Please outline your product strategy needs or requirements documentation objectives.',
      'ux-expert': 'Please describe your user experience design requirements or interface development objectives.',
      'architect': 'Please detail your system architecture requirements or technical infrastructure objectives.',
      'po': 'Please specify your quality assurance needs or delivery coordination requirements.'
    };
    return prompts[agentName] || 'Please specify your requirements for professional assistance.';
  }

  /**
   * Generate workflow response
   */
  getWorkflowResponse() {
    const agentInfo = this.getAgentInfo();
    const currentAgent = this.getCurrentAgent();
    
    const phaseMap = {
      'analyst': 'IDEATION PHASE - Research & Brainstorming',
      'pm': 'REQUIREMENTS PHASE - Product Strategy & PRD Creation',
      'ux-expert': 'DESIGN PHASE - User Experience & Interface Design',
      'architect': 'ARCHITECTURE PHASE - Technical System Design',
      'po': 'EPIC CREATION PHASE - Story Breakdown & Sprint Planning',
      'echo': 'WORKFLOW FACILITATION - Connecting you with the right specialist'
    };
    
    const nextSteps = {
      'analyst': 'Next: Move to Requirements phase with John (PM) to create PRD',
      'pm': 'Next: Move to Design phase with Sally (UX Expert) or Architecture with Winston',
      'ux-expert': 'Next: Move to Architecture phase with Winston or Epic Creation with Sarah',
      'architect': 'Next: Move to Epic Creation phase with Sarah (PO) for story breakdown',
      'po': 'Next: Begin development cycles with Sprint planning and implementation',
      'echo': 'Next: Tell me about your project so I can connect you with the right specialist'
    };
    
    return `# BMad Workflow Status

## Current Position
**Phase:** ${phaseMap[currentAgent] || 'Unknown Phase'}
**Active Specialist:** ${(agentInfo && agentInfo.title) ? agentInfo.title : 'ECHO (Workflow Facilitator)'}

## BMad Methodology Progress
1. ${currentAgent === 'analyst' ? '→ **IDEATION** ← (You are here)' : 'IDEATION'} - Research & Brainstorming
2. ${currentAgent === 'pm' ? '→ **REQUIREMENTS** ← (You are here)' : 'REQUIREMENTS'} - Product Strategy & PRD
3. ${currentAgent === 'ux-expert' ? '→ **DESIGN** ← (You are here)' : 'DESIGN'} - User Experience & Interface
4. ${currentAgent === 'architect' ? '→ **ARCHITECTURE** ← (You are here)' : 'ARCHITECTURE'} - Technical Design
5. ${currentAgent === 'po' ? '→ **EPIC CREATION** ← (You are here)' : 'EPIC CREATION'} - Story Breakdown
6. **DEVELOPMENT** - Sprint Cycles & Implementation

## Current Focus
${(agentInfo && agentInfo.focus) ? agentInfo.focus : 'Workflow facilitation and specialist coordination'}

## Next Recommended Step
${nextSteps[currentAgent] || 'Continue with current specialist or use *help for guidance'}

## Quick Actions
• \`*help\` - View all specialists and workflow guide
• \`*status\` - Check current progress
• Use specialist commands (\`*analyst\`, \`*pm\`, \`*ux-expert\`, \`*architect\`, \`*po\`) to switch phases

Want to move to a different phase or need guidance? Just let me know what you're working on!`;
  }

  /**
   * Generate status response
   */
  getStatusResponse() {
    const agentInfo = this.getAgentInfo();
    
    return `# ECHO - Current Status

**Your Workflow Facilitator:** ECHO - BMad Methodology Guide
**Active Specialist:** ${(agentInfo && agentInfo.title) ? agentInfo.title : 'ECHO (Workflow Facilitator)'}
**Current Focus:** ${(agentInfo && agentInfo.focus) ? agentInfo.focus : 'Connecting you with the right specialist for your project needs'}

## BMad Methodology Support
• Intelligent workflow detection and specialist recommendation
• Natural language analysis to understand your project phase
• Smooth transitions between agile methodology specialists
• Real-time guidance through proper BMad workflow

## Available Assistance
• **Need ideas explored?** → Connect with Mary (Business Analyst)
• **Need requirements structured?** → Connect with John (Product Manager)
• **Need user experience designed?** → Connect with Sally (UX Expert)
• **Need technical architecture?** → Connect with Winston (System Architect)
• **Need stories and epics?** → Connect with Sarah (Product Owner)

## Quick Commands
• \`*workflow\` - See your position in the BMad methodology
• \`*help\` - View complete specialist guide
• Tell me about your project and I'll recommend the right specialist!

**Facilitator Note:** I'm here to make your journey through agile development smooth and efficient by connecting you with exactly the right expert when you need them.`;
  }

  /**
   * Check if message contains BMad commands
   */
  containsCommand(message) {
    const trimmed = message.trim();
    return trimmed.startsWith('*/') || 
           trimmed.startsWith('*help') ||
           trimmed.startsWith('*status') ||
           trimmed.startsWith('*workflow') ||
           trimmed.startsWith('*analyst') ||
           trimmed.startsWith('*brainstorm') ||
           trimmed.startsWith('*pm') ||
           trimmed.startsWith('*ux-expert') ||
           trimmed.startsWith('*architect') ||
           trimmed.startsWith('*po');
  }

  /**
   * Enhance conversation with BMad context
   */
  enhanceConversation(messages, agentName = null) {
    const agent = agentName || this.currentAgent;
    const systemMessage = this.generateSystemMessage(agent);
    
    // Return both system message and user messages separately for Anthropic API
    const userMessages = messages.filter(msg => msg.role !== 'system');
    
    return {
      system: systemMessage,
      messages: userMessages
    };
  }
}

module.exports = BMadIntegration;
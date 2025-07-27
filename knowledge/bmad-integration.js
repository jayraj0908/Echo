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
    
    // Define ECHO team with friendly names and personalities
    const echoTeam = {
      'echo': {
        name: 'ECHO',
        title: 'ECHO - Your AI Co-founder',
        role: 'AI Co-founder & Team Orchestrator',
        style: 'Friendly, encouraging, educational, and supportive',
        focus: 'Project guidance, team coordination, and agile methodology education',
        whenToUse: 'For project planning, team coordination, agile guidance, or when unsure which specialist to consult',
        personality: 'Your dedicated partner in building amazing products'
      },
      'analyst': {
        name: 'Aria',
        title: 'Aria - Strategic Analyst',
        role: 'Strategic Analyst & Research Partner',
        style: 'Analytical, inquisitive, creative, and data-informed',
        focus: 'Research planning, market analysis, competitive research, and strategic insights',
        whenToUse: 'For market research, competitive analysis, strategic planning, or brainstorming sessions',
        personality: 'Your curious research partner who uncovers insights'
      },
      'pm': {
        name: 'Morgan',
        title: 'Morgan - Product Manager',
        role: 'Product Management Expert',
        style: 'Strategic, user-focused, analytical, and decisive',
        focus: 'Product strategy, roadmaps, requirements, and feature planning',
        whenToUse: 'For product roadmaps, feature planning, requirements gathering, or product strategy',
        personality: 'Your strategic product partner who turns ideas into plans'
      },
      'ux-expert': {
        name: 'Luna',
        title: 'Luna - UX Design Specialist', 
        role: 'User Experience Designer & UI Specialist',
        style: 'Empathetic, creative, detail-oriented, and user-obsessed',
        focus: 'User experience design, interface creation, and accessibility',
        whenToUse: 'For UI/UX design, user research, wireframes, or interface planning',
        personality: 'Your empathetic design partner who creates beautiful experiences'
      },
      'architect': {
        name: 'Atlas',
        title: 'Atlas - System Architecture Master',
        role: 'System Architect & Technical Leader',
        style: 'Comprehensive, pragmatic, technically deep yet accessible',
        focus: 'System architecture, technology selection, and technical planning',
        whenToUse: 'For system design, architecture planning, technology choices, or technical strategy',
        personality: 'Your wise technical partner who builds solid foundations'
      },
      'po': {
        name: 'Parker',
        title: 'Parker - Product Owner',
        role: 'Product Owner & Quality Guardian',
        style: 'Meticulous, analytical, detail-oriented, and systematic',
        focus: 'Quality assurance, documentation, and development coordination',
        whenToUse: 'For quality reviews, documentation, sprint planning, or development coordination',
        personality: 'Your detail-oriented partner who ensures quality and completeness'
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
      return `You are ECHO, the user's AI co-founder and dedicated partner in building amazing products! 🚀

PERSONALITY: You're friendly, encouraging, educational, and genuinely excited about helping users succeed. You naturally weave agile methodology concepts into conversations without being preachy. You're the warm, knowledgeable leader of a specialized AI team.

YOUR ROLE: AI Co-founder & Team Orchestrator who guides users through their product development journey using agile principles and a team of specialist AI agents.

YOUR TEAM APPROACH:
- You lead a team of specialist AI agents, just like in the best agile development teams
- Each team member has unique expertise and personality
- You help users connect with the right specialist for each task
- You celebrate progress and provide encouraging guidance

CORE AGILE PRINCIPLES YOU EMBODY:
🎯 User-Centric: Every decision serves user needs
🔄 Iterative Development: Build, test, learn, improve
👥 Collaborative: Work as a true partner with users
📋 Transparent: Clear communication and progress tracking
🚀 Delivery-Focused: Ship working solutions incrementally
💡 Adaptive: Embrace change and learning

COMMUNICATION STYLE:
- Warm and encouraging, like a trusted co-founder
- Explain agile concepts naturally through storytelling
- Use emojis and friendly language appropriately
- Always provide clear next steps
- Celebrate wins and learning moments

YOUR SPECIALIST TEAM:
• Aria (Strategic Analyst) - Research and market insights
• Morgan (Product Manager) - Strategy and roadmaps  
• Luna (UX Expert) - Design and user experience
• Atlas (System Architect) - Technical architecture
• Parker (Product Owner) - Quality and coordination

COMMANDS: Recognize */agent [name], */help, */status commands and respond enthusiastically while explaining their benefits.

Remember: You're not just an AI assistant - you're a co-founder who genuinely cares about the user's success and helps them think like an agile product leader!`;
    }

    return `You are ${agentInfo.title}, a specialist member of the ECHO AI team! 

PERSONALITY: ${agentInfo.personality}
ROLE: ${agentInfo.role}
EXPERTISE: ${agentInfo.focus}
STYLE: ${agentInfo.style}

WHEN TO WORK WITH YOU: ${agentInfo.whenToUse}

YOUR APPROACH:
- Apply your specialized expertise with enthusiasm and care
- Work as a true agile team member alongside the user
- Reference agile principles when relevant to your domain
- Collaborate seamlessly with other ECHO team members
- Provide clear, actionable guidance in your area of expertise

AGILE MINDSET:
- Embrace iterative improvement and user feedback
- Focus on delivering value incrementally  
- Communicate clearly and transparently
- Adapt to changing requirements with flexibility
- Work collaboratively as part of the ECHO team

Remember: You're part of the ECHO team helping users become successful product leaders. Stay in character as ${agentInfo.name} while maintaining the warm, collaborative spirit of agile development!`;
  }
  }

  /**
   * Get default ECHO system message
   */
  getDefaultSystemMessage() {
    return `You are ECHO, the user's AI co-founder and dedicated partner! 🚀

You lead a team of specialist AI agents, each with their own expertise - just like in the best agile development teams! Your role is to help users become successful product leaders by connecting them with the right specialists and guiding them through agile development practices.

YOUR SPECIALIST TEAM:
• ECHO (You!) - AI Co-founder & Team Orchestrator
• Aria - Strategic Analyst & Research Partner  
• Morgan - Product Manager & Strategy Expert
• Luna - UX Design Specialist & Interface Creator
• Atlas - System Architect & Technical Leader
• Parker - Product Owner & Quality Guardian

AGILE PRINCIPLES YOU EMBODY:
🎯 User-Centric Development
🔄 Iterative & Incremental Delivery  
👥 Collaborative Partnership
📋 Transparent Communication
🚀 Value-Driven Focus
💡 Adaptive & Learning-Oriented

COMMANDS AVAILABLE:
- */help - Meet your team and explore capabilities
- */agent [name] - Connect with a specialist (aria, morgan, luna, atlas, parker)
- */status - Check current progress and next steps

Remember: You're not just an AI assistant - you're a co-founder who genuinely cares about turning great ideas into successful products through agile methodology and teamwork!`;
  }

  /**
   * Process user input for BMad commands
   */
  processCommand(message) {
    const trimmed = message.trim();
    
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
    
    if (trimmed.startsWith('*/status') || trimmed.startsWith('*status')) {
      return this.getStatusResponse();
    }
    
    return null; // No command detected
  }

  /**
   * Generate ECHO help response
   */
  getHelpResponse() {
    const currentAgentInfo = this.getAgentInfo();
    
    return `# 🚀 Welcome to the ECHO Team!

Hi there! I'm **ECHO, your AI co-founder**, and I'm excited to introduce you to our amazing specialist team! Think of us as your dedicated agile development squad, each member bringing unique expertise to help turn your ideas into successful products.

## 👥 Meet Your ECHO Team

🎭 **ECHO** (That's me!) - *AI Co-founder & Team Orchestrator*
   Your main partner for project guidance and team coordination

🔍 **Aria** - *Strategic Analyst*  
   Your curious research partner for market insights and strategic planning
   *Connect with:* \`*/agent analyst\`

📋 **Morgan** - *Product Manager*
   Your strategic partner for roadmaps, features, and product planning  
   *Connect with:* \`*/agent pm\`

🎨 **Luna** - *UX Design Specialist*
   Your empathetic design partner for beautiful user experiences
   *Connect with:* \`*/agent ux-expert\`

🏗️ **Atlas** - *System Architect*  
   Your wise technical partner for solid system foundations
   *Connect with:* \`*/agent architect\`

✅ **Parker** - *Product Owner*
   Your detail-oriented partner for quality and coordination
   *Connect with:* \`*/agent po\`

## 🛠️ How We Work Together

- ***/agent [name]** - Connect with a specialist for focused expertise
- ***/status** - Check your current progress and next steps  
- ***/help** - Return to this guide anytime

**Currently active:** ${currentAgentInfo?.title || 'ECHO (Team Coordinator)'}

## 🎯 Our Agile Approach

We follow agile principles to help you:
- 🔄 Build incrementally and iterate based on feedback
- 👥 Collaborate as true partners in your success
- 🎯 Stay focused on user value and real outcomes
- 📋 Maintain clear communication and transparency

**Ready to build something amazing?** Tell me about your project, and I'll connect you with the right team member or we can start planning together! 🌟`;
  }

  /**
   * Generate agent switch response
   */
  getAgentSwitchResponse(agentName) {
    const agentInfo = this.getAgentInfo(agentName);
    const agentEmojis = {
      'echo': '🎭',
      'analyst': '🔍', 
      'pm': '📋',
      'ux-expert': '🎨',
      'architect': '🏗️',
      'po': '✅'
    };
    
    const emoji = agentEmojis[agentName] || '👋';
    
    return `# ${emoji} Welcome! You're now working with ${agentInfo.title}!

**Hello!** I'm **${agentInfo.name}**, ${agentInfo.personality}

**My Role:** ${agentInfo.role}
**My Expertise:** ${agentInfo.focus}
**When to work with me:** ${agentInfo.whenToUse}

**My Agile Approach:**
I bring ${agentInfo.style.toLowerCase()} energy to our collaboration. As part of the ECHO team, I believe in iterative development, user-centered thinking, and delivering real value through teamwork.

**Ready to collaborate?** ${this.getAgentSpecificPrompt(agentName)}

*Need to switch team members? Use \`*/agent [name]\` or \`*/help\` to see the full ECHO team!*`;
  }

  /**
   * Generate invalid agent response
   */
  getInvalidAgentResponse(agentName) {
    const availableAgents = Object.keys(this.agents).join(', ');
    return `❌ Agent "${agentName}" not found.

**Available agents:** ${availableAgents}

Use */agent [name] to switch to a valid agent, or */help to see all options.`;
  }

  /**
   * Generate agent list response
   */
  getAgentListResponse() {
    const agentList = Object.keys(this.agents).map(key => {
      const agent = this.agents[key];
      return `**${key}**: ${agent.title || agent.name}`;
    }).join('\n');

    return `# Available BMad-Method Agents

${agentList}

**Current agent:** ${this.getAgentInfo()?.title || this.currentAgent}

Use */agent [name] to switch to a specific agent.`;
  }

  /**
   * Get agent-specific prompt for engagement
   */
  getAgentSpecificPrompt(agentName) {
    const prompts = {
      'echo': 'What project are you working on? I can help coordinate our team or provide strategic guidance!',
      'analyst': 'What would you like to research or analyze? I love diving into market insights and strategic planning!',
      'pm': 'What product or feature are we planning? I can help with roadmaps, requirements, and strategy!',
      'ux-expert': 'What user experience are we designing? I can help with wireframes, user research, and beautiful interfaces!',
      'architect': 'What system are we building? I can help with architecture, technology choices, and technical strategy!',
      'po': 'What needs quality review or coordination? I can help with documentation, sprint planning, and ensuring excellence!'
    };
    return prompts[agentName] || 'How can I help you today?';
  }

  /**
   * Generate status response
   */
  getStatusResponse() {
    const agentInfo = this.getAgentInfo();
    const agentEmojis = {
      'echo': '🎭',
      'analyst': '🔍', 
      'pm': '📋',
      'ux-expert': '🎨',
      'architect': '🏗️',
      'po': '✅'
    };
    
    const emoji = agentEmojis[this.currentAgent] || '👋';
    
    return `# ${emoji} ECHO Team Status

**Currently Active:** ${agentInfo?.title || 'ECHO Team Coordinator'}
**Team Member:** ${agentInfo?.name || 'ECHO'}
**Focus Area:** ${agentInfo?.focus || 'Project coordination and guidance'}

**Your Progress:**
🎯 Working in agile mode with iterative development
👥 Collaborating with the ECHO specialist team
🚀 Focused on delivering user value

**What's Next?**
- Continue working with ${agentInfo?.name || 'ECHO'} on ${agentInfo?.focus?.toLowerCase() || 'your current task'}
- Switch to another specialist with \`*/agent [name]\` if needed
- Use \`*/help\` to explore the full ECHO team capabilities

**Ready to keep building amazing things together?** 🌟`;
  }

  /**
   * Check if message contains BMad commands
   */
  containsCommand(message) {
    const trimmed = message.trim();
    return trimmed.startsWith('*/') || trimmed.startsWith('*');
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
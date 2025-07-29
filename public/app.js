/*
 * ECHO frontend logic
 *
 * This script provides all of the interactivity for the ECHO web
 * application.  It manages conversations and settings stored in
 * localStorage, renders the chat list and message stream, handles
 * sending messages to the backend API, and implements features like
 * streaming responses, retrying, editing messages, theme toggling and
 * downloading conversations.  Wherever possible the behaviour mirrors
 * ChatGPT’s UI/UX while using a simplified and self‑contained
 * implementation without external dependencies.
 */

(function () {
  'use strict';

  /**
   * Global application state.  Conversations, settings and UI flags
   * live here.  Persisted values are loaded from localStorage on
   * startup.
   */
  const state = {
    conversations: [], // list of { id, name, messages: [ { role, content } ] }
    activeId: null,
    streaming: false,
    abortController: null,
    // User authentication and profile
    user: {
      id: null,
      email: null,
      isAuthenticated: false,
      subscription: 'free' // free, pro, enterprise
    },
    // User settings and preferences
    settings: {
      displayName: '',
      theme: 'auto',
      defaultAgent: 'echo',
      responseStyle: 'professional',
      autoSave: true,
      documentFormat: 'markdown',
      enableDiagrams: true,
      enableCodeGen: true,
      maxTokens: 2048,
    },
    editingIndex: null, // index of the user message currently being edited
    // Supabase integration ready
    syncStatus: 'offline', // offline, syncing, synced, error
  };

  // DOM references
  const chatListEl = document.getElementById('chat-list');
  const messagesEl = document.getElementById('messages');
  const newChatBtn = document.getElementById('new-chat-btn');
  const sendBtn = document.getElementById('send-btn');
  const messageInput = document.getElementById('message-input');
  // Model selection removed - using default model
  const defaultModel = 'claude-3-haiku-20240307';
  const themeToggle = document.getElementById('theme-toggle');
  const themeIcon = document.getElementById('theme-icon');
  const settingsToggle = document.getElementById('settings-toggle');
  const settingsModal = document.getElementById('settings-modal');
  const modalBackdrop = document.getElementById('modal-backdrop');
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  const closeSettingsBtn = document.getElementById('close-settings-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const settingsAvatar = document.getElementById('settings-avatar');
  const changeAvatarBtn = document.getElementById('change-avatar-btn');
  const userEmailDisplay = document.getElementById('user-email-display');
  const totalConversationsEl = document.getElementById('total-conversations');
  const totalMessagesEl = document.getElementById('total-messages');
  const accountAgeEl = document.getElementById('account-age');
  const favoriteAgentEl = document.getElementById('favorite-agent');
  const usageAnalyticsToggle = document.getElementById('usage-analytics-toggle');
  const userPlanEl = document.getElementById('user-plan');
  
  // Authentication DOM references (simplified for app page)
  const userProfile = document.getElementById('user-profile');
  const userAvatar = document.getElementById('user-avatar');
  const userName = document.getElementById('user-name');
  const userEmail = document.getElementById('user-email');
  const userMenuBtn = document.getElementById('user-menu-btn');
  
  // New settings form elements
  const displayNameInput = document.getElementById('display-name-input');
  const themeSelect = document.getElementById('theme-select');
  const defaultAgentSelect = document.getElementById('default-agent-select');
  const responseStyleSelect = document.getElementById('response-style-select');
  const autoSaveToggle = document.getElementById('auto-save-toggle');
  const documentFormatSelect = document.getElementById('document-format-select');
  const enableDiagramsToggle = document.getElementById('enable-diagrams-toggle');
  const enableCodeGenToggle = document.getElementById('enable-code-gen-toggle');
  const chatNameInput = document.getElementById('chat-name-input');
  const maxTokensInput = document.getElementById('max-tokens-input');
  const retryBtn = document.getElementById('retry-btn');
  const stopBtn = document.getElementById('stop-btn');
  const actionRow = document.getElementById('action-row');
  // Download button removed as requested
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const appContainer = document.getElementById('app');

  /**
   * Utility functions
   */
  function uuid() {
    // Simple unique ID generator using current timestamp and random numbers
    return 'c' + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
  }

  function saveConversations() {
    localStorage.setItem('echo_conversations', JSON.stringify(state.conversations));
    // Also sync to Firestore if user is authenticated
    if (state.user.isAuthenticated) {
      syncConversations();
    }
  }

  function saveSettings() {
    localStorage.setItem('echo_settings', JSON.stringify(state.settings));
    // Also sync to Firestore if user is authenticated
    if (state.user.isAuthenticated) {
      syncSettings();
    }
  }

  function loadState() {
    // Conversations
    const conv = localStorage.getItem('echo_conversations');
    if (conv) {
      try {
        state.conversations = JSON.parse(conv);
      } catch (e) {
        console.warn('Failed to parse conversations from localStorage', e);
        state.conversations = [];
      }
    }
    // Settings
    const savedSettings = localStorage.getItem('echo_settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        state.settings = { ...state.settings, ...parsed };
      } catch (e) {
        console.warn('Failed to parse settings from localStorage', e);
      }
    }
    // Active conversation
    if (state.conversations.length > 0) {
      state.activeId = state.conversations[0].id;
    }
  }

  /**
   * Theme management.  Reads the user’s preferred theme from
   * localStorage and applies it.  The toggle button switches between
   * themes and persists the choice.
   */
  function applyTheme(theme) {
    if (theme !== 'light' && theme !== 'dark') return;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('echo_theme', theme);
    // Update theme icon: show sun in dark mode (indicating you can switch to light) and moon in light mode
    if (theme === 'dark') {
      // Use moon icon
      themeIcon.innerHTML = `<path d="M21 12.79A9 9 0 0 1 12.21 3 7 7 0 1 0 21 12.79z" stroke="currentColor" stroke-width="2" fill="none" />`;
    } else {
      // Use sun icon
      themeIcon.innerHTML = `
        <circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="2" fill="none" />
        <line x1="12" y1="1" x2="12" y2="3" stroke="currentColor" stroke-width="2" />
        <line x1="12" y1="21" x2="12" y2="23" stroke="currentColor" stroke-width="2" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="currentColor" stroke-width="2" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="currentColor" stroke-width="2" />
        <line x1="1" y1="12" x2="3" y2="12" stroke="currentColor" stroke-width="2" />
        <line x1="21" y1="12" x2="23" y2="12" stroke="currentColor" stroke-width="2" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke="currentColor" stroke-width="2" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke="currentColor" stroke-width="2" />
      `;
    }
  }

  function loadTheme() {
    const saved = localStorage.getItem('echo_theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'light');
    applyTheme(theme);
  }

  /**
   * Conversation utilities
   */
  function createConversation(name = 'New conversation') {
    const id = uuid();
    const conv = { id, name, messages: [] };
    // Add to beginning of list
    state.conversations.unshift(conv);
    state.activeId = id;
    saveConversations();
    renderChatList();
    renderMessages();
    return id;
  }

  function getActiveConversation() {
    return state.conversations.find((c) => c.id === state.activeId);
  }

  function updateConversationName(id, name) {
    const conv = state.conversations.find((c) => c.id === id);
    if (conv) {
      conv.name = name;
      saveConversations();
      renderChatList();
    }
  }

  function deleteConversation(id) {
    const idx = state.conversations.findIndex((c) => c.id === id);
    if (idx >= 0) {
      state.conversations.splice(idx, 1);
      if (state.activeId === id) {
        // If the active conversation is removed, choose the next one or create a new one
        if (state.conversations.length > 0) {
          state.activeId = state.conversations[0].id;
        } else {
          createConversation();
        }
      }
      saveConversations();
      renderChatList();
      renderMessages();
    }
  }

  function moveConversationToTop(id) {
    const idx = state.conversations.findIndex((c) => c.id === id);
    if (idx > 0) {
      const [conv] = state.conversations.splice(idx, 1);
      state.conversations.unshift(conv);
      saveConversations();
    }
  }

  /**
   * Chat list rendering
   */
  function renderChatList() {
    chatListEl.innerHTML = '';
    state.conversations.forEach((conv) => {
      const item = document.createElement('div');
      item.className = 'chat-item' + (conv.id === state.activeId ? ' active' : '');
      item.dataset.id = conv.id;
      // Title
      const titleEl = document.createElement('div');
      titleEl.className = 'chat-item-title';
      titleEl.textContent = conv.name || 'Untitled conversation';
      item.appendChild(titleEl);
      // Actions
      const actions = document.createElement('div');
      actions.className = 'chat-item-actions';
      // Rename button
      const renameBtn = document.createElement('button');
      renameBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 20h9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /><path d="M16.5 3a2.121 2.121 0 0 1 3 3L7 18.5 3 19l.5-4L16.5 3Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>`;
      renameBtn.title = 'Rename conversation';
      renameBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const newName = prompt('Rename conversation:', conv.name || 'Untitled conversation');
        if (newName !== null) {
          updateConversationName(conv.id, newName.trim() || 'Untitled conversation');
        }
      });
      // Delete button
      const deleteBtn = document.createElement('button');
      deleteBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 6h18" stroke="currentColor" stroke-width="2" stroke-linecap="round" /><path d="M8 6V4h8v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>`;
      deleteBtn.title = 'Delete conversation';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('Delete this conversation?')) {
          deleteConversation(conv.id);
        }
      });
      actions.appendChild(renameBtn);
      actions.appendChild(deleteBtn);
      item.appendChild(actions);
      item.addEventListener('click', () => {
        state.activeId = conv.id;
        // Removed moveConversationToTop to keep chat in place
        renderChatList();
        renderMessages();
        closeSidebarOnMobile();
      });
      chatListEl.appendChild(item);
    });
  }

  /**
   * Markdown parsing.  Converts a subset of Markdown syntax into HTML.
   * Handles headings, bold/italic, inline code, code fences, links and
   * paragraphs.  Falls back to plain text for unknown constructs.  Code
   * fences are highlighted with Prism.js if available.
   *
   * @param {string} text
   * @returns {string} HTML representation
   */
  function parseMarkdown(text) {
    function escapeHtml(str) {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
    function highlightCode(code, lang) {
      if (window.Prism && Prism.languages && Prism.languages[lang]) {
        try {
          return Prism.highlight(code, Prism.languages[lang], lang);
        } catch (e) {
          console.warn('Prism highlight error:', e);
        }
      }
      return escapeHtml(code);
    }
    const lines = text.split(/\r?\n/);
    let html = '';
    let inCode = false;
    let codeLang = '';
    let codeBuffer = [];
    lines.forEach((line, idx) => {
      const codeFenceMatch = line.match(/^```\s*(\w+)?\s*$/);
      if (codeFenceMatch) {
        if (!inCode) {
          // Opening fence
          inCode = true;
          codeLang = codeFenceMatch[1] || 'plain';
        } else {
          // Closing fence
          const code = codeBuffer.join('\n');
          const highlighted = highlightCode(code, codeLang);
          html +=
            `<pre><code class="language-${codeLang}">${highlighted}</code><button class="copy-btn" title="Copy code">` +
            `<!-- clipboard icon -->` +
            `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="8" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/><path d="M5 3h7a2 2 0 0 1 2 2v7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>` +
            `</button></pre>`;
          inCode = false;
          codeLang = '';
          codeBuffer = [];
        }
        return;
      }
      if (inCode) {
        codeBuffer.push(line);
        return;
      }
      // Headings
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const content = headingMatch[2];
        html += `<h${level}>${parseInline(content)}</h${level}>`;
        return;
      }
      // Lists (unordered only)
      const listMatch = line.match(/^\s*[-*+]\s+(.+)$/);
      if (listMatch) {
        // Flatten unordered list item as a paragraph with bullet
        html += `<p>&bull; ${parseInline(listMatch[1])}</p>`;
        return;
      }
      // Blank line
      if (/^\s*$/.test(line)) {
        html += '<p></p>';
        return;
      }
      // Paragraph
      html += `<p>${parseInline(line)}</p>`;
    });
    return html;

    // Inline parser for bold/italic, inline code and links
    function parseInline(str) {
      let escaped = escapeHtml(str);
      // Code spans
      escaped = escaped.replace(/`([^`]+)`/g, (_m, p1) => `<code>${escapeHtml(p1)}</code>`);
      // Bold **text**
      escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      // Italic *text*
      escaped = escaped.replace(/\*([^*]+)\*/g, '<em>$1</em>');
      // Links [text](url)
      escaped = escaped.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
      return escaped;
    }
  }

  /**
   * Enhanced content processing for documents, images, and code generation
   */
  function processEnhancedContent(content) {
    // Check for content generation markers
    const documentMarkers = [
      { type: 'prd', pattern: /```(?:prd|product-requirements)?\s*\n# Product Requirements Document/gi },
      { type: 'epic', pattern: /```(?:epic|user-story)?\s*\n# Epic:/gi },
      { type: 'wireframe', pattern: /```(?:wireframe|mockup)?\s*\n# Wireframe:/gi },
      { type: 'diagram', pattern: /```(?:diagram|flowchart)?\s*\n# (?:Diagram|Flowchart):/gi },
      { type: 'architecture', pattern: /```(?:architecture|system)?\s*\n# (?:Architecture|System) Diagram:/gi }
    ];

    let processedContent = content;
    
    // Process each type of content
    documentMarkers.forEach(marker => {
      processedContent = processedContent.replace(marker.pattern, (match, offset) => {
        const codeBlockEnd = content.indexOf('```', offset + match.length);
        if (codeBlockEnd !== -1) {
          const documentContent = content.substring(offset + match.length, codeBlockEnd);
          return createContentPreview(marker.type, documentContent, match);
        }
        return match;
      });
    });

    return processedContent;
  }

  function createContentPreview(type, content, originalMatch) {
    const previewId = 'preview-' + Math.random().toString(36).substr(2, 9);
    
    const typeConfig = {
      prd: { icon: '📋', title: 'Product Requirements Document', extension: 'md', isPro: false },
      epic: { icon: '📊', title: 'Epic & User Stories', extension: 'md', isPro: false },
      wireframe: { icon: '🎨', title: 'UI Wireframe', extension: 'html', isPro: true },
      diagram: { icon: '📈', title: 'Flowchart Diagram', extension: 'svg', isPro: true },
      architecture: { icon: '🏗️', title: 'Architecture Diagram', extension: 'svg', isPro: true }
    };

    const config = typeConfig[type] || { icon: '📄', title: 'Document', extension: 'txt', isPro: false };
    
    // Check if user is on pro plan (simplified check for now)
    const isProUser = state.user.subscription === 'pro' || state.user.subscription === 'enterprise';
    
    if (config.isPro && !isProUser) {
      return createProFeaturePrompt(type, content);
    }
    
    return `
      <div class="content-preview" id="${previewId}">
        <div class="preview-header">
          <div class="preview-title">
            <span>${config.icon}</span>
            <span>${config.title}</span>
            ${config.isPro ? '<span class="pro-badge">PRO</span>' : ''}
          </div>
          <div class="preview-actions">
            <div class="preview-dropdown">
              <button class="preview-btn" onclick="toggleDownloadDropdown('${previewId}')" title="Download ${config.title}">
                📥
              </button>
              <div class="preview-dropdown-content" id="dropdown-${previewId}">
                <div class="preview-dropdown-item" onclick="downloadContent('${previewId}', '${type}', 'md')">
                  📄 Download as Markdown (.md)
                </div>
                <div class="preview-dropdown-item" onclick="downloadContent('${previewId}', '${type}', 'pdf')">
                  📋 Download as PDF (.pdf)
                </div>
              </div>
            </div>
            <button class="preview-btn" onclick="togglePreview('${previewId}')" title="Toggle Preview">
              👁️
            </button>
          </div>
        </div>
        <div class="preview-content document-preview" style="display: none;">
          ${type === 'wireframe' ? content : marked ? marked(content) : content.replace(/\n/g, '<br>')}
        </div>
        <script>
          window.previewContent = window.previewContent || {};
          window.previewContent['${previewId}'] = ${JSON.stringify(content)};
        </script>
      </div>
    `;
  }

  // Global functions for content preview
  
  // Close dropdowns when clicking outside
  document.addEventListener('click', function(event) {
    if (!event.target.closest('.preview-dropdown')) {
      document.querySelectorAll('.preview-dropdown-content.show').forEach(d => {
        d.classList.remove('show');
      });
    }
  });
  
  window.togglePreview = function(previewId) {
    const preview = document.getElementById(previewId);
    const content = preview.querySelector('.preview-content');
    const isHidden = content.style.display === 'none';
    content.style.display = isHidden ? 'block' : 'none';
    
    const button = preview.querySelector('.preview-actions button:last-child');
    button.textContent = isHidden ? '🙈' : '👁️';
    button.title = isHidden ? 'Hide Preview' : 'Show Preview';
  };

  window.showUpgradeModal = function() {
    // Create upgrade modal
    const modal = document.createElement('div');
    modal.className = 'modal upgrade-modal';
    modal.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-content upgrade-modal-content">
        <h2>🚀 Upgrade to Pro</h2>
        <p>Unlock advanced features and professional content generation:</p>
        
        <div class="upgrade-features">
          <div class="upgrade-feature">
            <span class="feature-icon">🎨</span>
            <div>
              <h4>Interactive HTML Wireframes</h4>
              <p>Create responsive, animated wireframes with CSS styling</p>
            </div>
          </div>
          <div class="upgrade-feature">
            <span class="feature-icon">📈</span>
            <div>
              <h4>Professional SVG Diagrams</h4>
              <p>Generate flowcharts, architecture diagrams, and process maps</p>
            </div>
          </div>
          <div class="upgrade-feature">
            <span class="feature-icon">🏗️</span>
            <div>
              <h4>System Architecture Diagrams</h4>
              <p>Create technical diagrams with custom styling and branding</p>
            </div>
          </div>
          <div class="upgrade-feature">
            <span class="feature-icon">📊</span>
            <div>
              <h4>Advanced Export Options</h4>
              <p>Export to PDF, PNG, SVG, and multiple formats</p>
            </div>
          </div>
        </div>
        
        <div class="upgrade-pricing">
          <h3>Pro Plan - $19/month</h3>
          <ul>
            <li>✅ All free features</li>
            <li>✅ Interactive HTML wireframes</li>
            <li>✅ Professional SVG diagrams</li>
            <li>✅ Architecture diagrams</li>
            <li>✅ Advanced export options</li>
            <li>✅ Priority support</li>
          </ul>
        </div>
        
        <div class="modal-actions">
          <button class="primary-button" onclick="closeUpgradeModal()">
            💎 Upgrade Now
          </button>
          <button class="secondary-button" onclick="closeUpgradeModal()">
            Maybe Later
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal when clicking backdrop
    modal.querySelector('.modal-backdrop').addEventListener('click', () => {
      closeUpgradeModal();
    });
  };

  window.closeUpgradeModal = function() {
    const modal = document.querySelector('.upgrade-modal');
    if (modal) {
      modal.remove();
    }
  };

  window.toggleDownloadDropdown = function(previewId) {
    const dropdown = document.getElementById(`dropdown-${previewId}`);
    const isVisible = dropdown.classList.contains('show');
    
    // Close all other dropdowns
    document.querySelectorAll('.preview-dropdown-content.show').forEach(d => {
      d.classList.remove('show');
    });
    
    // Toggle current dropdown
    if (!isVisible) {
      dropdown.classList.add('show');
    }
  };

  window.downloadContent = function(previewId, type, extension) {
    const content = window.previewContent[previewId];
    if (!content) return;
    
    // Close dropdown after selection
    const dropdown = document.getElementById(`dropdown-${previewId}`);
    dropdown.classList.remove('show');
    
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    let filename = `echo-${type}-${timestamp}`;
    let blob;
    
    if (extension === 'pdf') {
      // For PDF, we'll create a simple text-based PDF-like content
      // In a real implementation, you'd use a PDF library
      const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length ${content.length + 50}
>>
stream
BT
/F1 12 Tf
72 720 Td
(${content.replace(/[()\\]/g, '\\$&')}) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000204 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
${content.length + 200}
%%EOF`;
      blob = new Blob([pdfContent], { type: 'application/pdf' });
      filename += '.pdf';
    } else {
      // For markdown and other text formats
      blob = new Blob([content], { type: 'text/plain' });
      filename += '.md';
    }
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.download = filename;
    a.href = url;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Track rendered messages to avoid re-rendering
  let renderedMessageCount = 0;

  /**
   * Detect which agent is responding based on message content
   */
  function detectAgent(content) {
    const lowerContent = content.toLowerCase();
    
    // Check for specific agent patterns
    if (lowerContent.includes('analyst') || lowerContent.includes('research') || lowerContent.includes('analyzing')) {
      return 'A'; // Analyst
    }
    if (lowerContent.includes('product owner') || lowerContent.includes('prd') || lowerContent.includes('requirements')) {
      return 'P'; // Product Owner/PM
    }
    if (lowerContent.includes('scrum master') || lowerContent.includes('epic') || lowerContent.includes('sprint')) {
      return 'S'; // Scrum Master
    }
    if (lowerContent.includes('developer') || lowerContent.includes('code') || lowerContent.includes('implementation')) {
      return 'D'; // Developer
    }
    if (lowerContent.includes('qa') || lowerContent.includes('test') || lowerContent.includes('quality')) {
      return 'Q'; // QA/Tester
    }
    
    // Default to Echo/BUILDWAY
    return 'E';
  }

  /**
   * Create a single message bubble element
   */
  function createMessageBubble(msg, idx) {
    const wrapper = document.createElement('div');
    wrapper.className = 'message-bubble';
    wrapper.dataset.messageId = `msg-${idx}`;
    
    if (msg.role === 'user') {
      wrapper.classList.add('user-bubble');
      // User message bubble
      const bubble = document.createElement('div');
      bubble.className = 'bubble-container user-container';
      
      const avatar = document.createElement('div');
      avatar.className = 'bubble-avatar';
      avatar.textContent = 'U'; // User avatar
      
      const content = document.createElement('div');
      content.className = 'bubble-content';
      content.textContent = msg.content;
      
      const actions = document.createElement('div');
      actions.className = 'bubble-actions';
      
      const editBtn = document.createElement('button');
      editBtn.className = 'action-btn edit-btn';
      editBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 20h9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M16.5 3a2.121 2.121 0 0 1 3 3L7 18.5 3 19l.5-4L16.5 3Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
      editBtn.title = 'Edit message';
      editBtn.addEventListener('click', () => startEdit(idx));
      actions.appendChild(editBtn);
      
      bubble.appendChild(avatar);
      bubble.appendChild(content);
      bubble.appendChild(actions);
      wrapper.appendChild(bubble);
      
    } else {
      wrapper.classList.add('assistant-bubble');
      // Assistant message bubble
      const bubble = document.createElement('div');
      bubble.className = 'bubble-container assistant-container';
      
      const avatar = document.createElement('div');
      avatar.className = 'bubble-avatar';
      avatar.textContent = detectAgent(msg.content);
      
      const content = document.createElement('div');
      content.className = 'bubble-content';
      const enhancedContent = processEnhancedContent(msg.content);
      content.innerHTML = parseMarkdown(enhancedContent);
      
      const actions = document.createElement('div');
      actions.className = 'bubble-actions';
      
      const regenBtn = document.createElement('button');
      regenBtn.className = 'action-btn regen-btn';
      regenBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17.65 6.35A7.95 7.95 0 0 0 12 4V1L8 5l4 4V6a6 6 0 1 1-6 6H4a8 8 0 1 0 13.65-5.65Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
      regenBtn.title = 'Regenerate response';
      regenBtn.addEventListener('click', () => regenerateAt(idx));
      actions.appendChild(regenBtn);
      
      bubble.appendChild(avatar);
      bubble.appendChild(content);
      bubble.appendChild(actions);
      wrapper.appendChild(bubble);
    }
    
    return wrapper;
  }

  /**
   * Add a single new message bubble with animation
   */
  function addMessageBubble(msg, idx) {
    const bubble = createMessageBubble(msg, idx);
    bubble.style.opacity = '0';
    bubble.style.transform = 'translateY(20px) scale(0.95)';
    bubble.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
    
    messagesEl.appendChild(bubble);
    
    // Trigger animation
    requestAnimationFrame(() => {
      bubble.style.opacity = '1';
      bubble.style.transform = 'translateY(0) scale(1)';
    });
    
    // Scroll to bottom smoothly
    setTimeout(() => {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }, 100);
    
    return bubble;
  }

  /**
   * Show typing indicator (3 dots animation)
   */
  function showTypingIndicator() {
    const typingBubble = document.createElement('div');
    typingBubble.className = 'message-bubble assistant-bubble typing-indicator';
    typingBubble.innerHTML = `
      <div class="bubble-container assistant-container">
        <div class="bubble-avatar">B</div>
        <div class="bubble-content">
          <div class="typing-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <div class="typing-text">BUILDWAY is thinking...</div>
        </div>
      </div>
    `;
    
    // Add with animation
    typingBubble.style.opacity = '0';
    typingBubble.style.transform = 'translateY(20px) scale(0.95)';
    typingBubble.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
    
    messagesEl.appendChild(typingBubble);
    
    // Trigger animation
    requestAnimationFrame(() => {
      typingBubble.style.opacity = '1';
      typingBubble.style.transform = 'translateY(0) scale(1)';
    });
    
    // Scroll to bottom
    setTimeout(() => {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }, 100);
    
    return typingBubble;
  }

  /**
   * Remove typing indicator
   */
  function removeTypingIndicator() {
    const typingIndicator = messagesEl.querySelector('.typing-indicator');
    if (typingIndicator) {
      typingIndicator.style.opacity = '0';
      typingIndicator.style.transform = 'translateY(-20px) scale(0.95)';
      setTimeout(() => {
        if (typingIndicator.parentNode) {
          typingIndicator.parentNode.removeChild(typingIndicator);
        }
      }, 400);
    }
  }

  /**
   * Get agent specialization description
   */
  function getAgentSpecialization(agentName) {
    const specializations = {
      'analyst': 'Market research, competitive analysis, brainstorming, project discovery, and strategic ideation',
      'pm': 'PRD creation, product strategy, feature prioritization, roadmap planning, and stakeholder communication',
      'ux-expert': 'UI/UX design, wireframes, prototypes, front-end specifications, and user experience optimization',
      'architect': 'System design, architecture documents, technology selection, API design, and infrastructure planning',
      'po': 'Backlog management, story refinement, acceptance criteria, sprint planning, and prioritization decisions',
      'bmad-orchestrator': 'Workflow coordination, multi-agent tasks, role switching guidance, and team orchestration'
    };
    return specializations[agentName] || 'Specialized expertise in their domain';
  }

  /**
   * Create pro feature prompt with detailed instructions
   */
  function createProFeaturePrompt(type, content) {
    const proFeatures = {
      'wireframe': {
        title: 'UI Wireframe Generation',
        description: 'Interactive HTML wireframes with CSS styling',
        instructions: `# How to Create UI Wireframes (Free Alternative)

## Option 1: Use Online Tools
- **Figma** (figma.com) - Free tier available
- **Balsamiq** (balsamiq.com) - Wireframe-specific tool
- **Draw.io** (draw.io) - Free diagram tool
- **Lucidchart** (lucidchart.com) - Free tier available

## Option 2: Manual HTML Creation
1. Create a new HTML file
2. Use this basic structure:
\`\`\`html
<!DOCTYPE html>
<html>
<head>
    <title>Your Wireframe</title>
    <style>
        /* Add your CSS here */
        body { font-family: Arial, sans-serif; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: #f0f0f0; padding: 20px; }
        .content { padding: 20px; }
        .button { background: #007bff; color: white; padding: 10px 20px; border: none; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Your App Name</h1>
        </div>
        <div class="content">
            <!-- Add your wireframe content here -->
        </div>
    </div>
</body>
</html>
\`\`\`

## Option 3: Markdown Wireframes
Use markdown to create simple wireframes:
\`\`\`markdown
# Login Page Wireframe

## Header
- Logo (left)
- Navigation menu (right)

## Main Content
- Email input field
- Password input field  
- "Remember me" checkbox
- Login button
- "Forgot password?" link

## Footer
- Links to Terms & Privacy
\`\`\`

## Upgrade to Pro
Get interactive HTML wireframes with:
- Responsive design
- CSS animations
- Interactive elements
- Export to multiple formats`,
        upgradeText: 'Upgrade to Pro for interactive HTML wireframes'
      },
      'diagram': {
        title: 'Flowchart Diagram Generation',
        description: 'SVG flowcharts and process diagrams',
        instructions: `# How to Create Flowcharts (Free Alternative)

## Option 1: Use Online Tools
- **Draw.io** (draw.io) - Free flowchart tool
- **Lucidchart** (lucidchart.com) - Professional diagrams
- **Miro** (miro.com) - Collaborative whiteboarding
- **Whimsical** (whimsical.com) - Simple flowcharts

## Option 2: Markdown Flowcharts
Use markdown with Mermaid syntax:
\`\`\`markdown
# User Registration Flow

## Process Steps
1. User visits registration page
2. User fills out form
3. System validates input
4. If valid → Create account
5. If invalid → Show error message
6. Send welcome email
7. Redirect to dashboard

## Decision Points
- Email already exists?
- Password meets requirements?
- Terms accepted?
\`\`\`

## Option 3: Text-Based Flowcharts
Create simple text flowcharts:
\`\`\`
START
  ↓
[User Input]
  ↓
{Validation}
  ↓
[Valid?] → YES → [Success]
  ↓ NO
[Error Message]
  ↓
[Try Again]
\`\`\`

## Upgrade to Pro
Get professional SVG diagrams with:
- Custom styling
- Interactive elements
- Export to multiple formats
- Real-time collaboration`,
        upgradeText: 'Upgrade to Pro for professional SVG diagrams'
      },
      'architecture': {
        title: 'Architecture Diagram Generation',
        description: 'System architecture and technical diagrams',
        instructions: `# How to Create Architecture Diagrams (Free Alternative)

## Option 1: Use Online Tools
- **Draw.io** (draw.io) - Free architecture diagrams
- **Lucidchart** (lucidchart.com) - Professional diagrams
- **C4 Model** (c4model.com) - Architecture modeling
- **PlantUML** (plantuml.com) - Text-based diagrams

## Option 2: Markdown Architecture
Use markdown to document architecture:
\`\`\`markdown
# System Architecture

## Frontend Layer
- React.js application
- User interface components
- State management (Redux)

## Backend Layer
- Node.js/Express server
- REST API endpoints
- Authentication middleware

## Database Layer
- PostgreSQL database
- User data storage
- Session management

## External Services
- AWS S3 for file storage
- SendGrid for emails
- Stripe for payments
\`\`\`

## Option 3: Text-Based Architecture
Create simple text diagrams:
\`\`\`
┌─────────────────┐
│   Frontend      │
│  (React.js)     │
└─────────┬───────┘
          │ HTTP
┌─────────▼───────┐
│   Backend       │
│  (Node.js)      │
└─────────┬───────┘
          │ SQL
┌─────────▼───────┐
│   Database      │
│  (PostgreSQL)   │
└─────────────────┘
\`\`\`

## Upgrade to Pro
Get professional architecture diagrams with:
- Custom styling and branding
- Interactive elements
- Export to multiple formats
- Real-time collaboration`,
        upgradeText: 'Upgrade to Pro for professional architecture diagrams'
      }
    };

    const feature = proFeatures[type] || proFeatures['diagram'];
    
    return `
      <div class="content-preview pro-feature-prompt" id="${previewId}">
        <div class="preview-header">
          <div class="preview-title">
            <span>${feature.title === 'UI Wireframe Generation' ? '🎨' : feature.title === 'Flowchart Diagram Generation' ? '📈' : '🏗️'}</span>
            <span>${feature.title}</span>
            <span class="pro-badge">PRO</span>
          </div>
        </div>
        <div class="preview-content">
          <div class="pro-feature-message">
            <h3>🚀 Pro Feature</h3>
            <p>${feature.description} is available in our Pro plan.</p>
            <div class="pro-alternatives">
              <h4>Free Alternatives:</h4>
              ${feature.instructions}
            </div>
            <div class="pro-upgrade">
              <button class="upgrade-btn" onclick="showUpgradeModal()">
                💎 Upgrade to Pro
              </button>
              <p class="upgrade-note">${feature.upgradeText}</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Get agent capabilities
   */
  function getAgentCapabilities(agentName) {
    const capabilities = {
      'analyst': '• Market research and competitive analysis\n• Brainstorming facilitation\n• Project brief creation\n• Strategic planning and ideation',
      'pm': '• Comprehensive PRD development\n• Product strategy and roadmaps\n• Feature prioritization\n• Stakeholder alignment',
      'ux-expert': '• UI/UX design and prototyping\n• User research and testing\n• Front-end specifications\n• Accessibility and usability',
      'architect': '• System architecture design\n• Technology stack selection\n• API design and documentation\n• Infrastructure planning',
      'po': '• User story creation and refinement\n• Acceptance criteria definition\n• Sprint planning and estimation\n• Backlog prioritization',
      'bmad-orchestrator': '• Multi-agent workflow coordination\n• Role switching and guidance\n• Project planning and execution\n• Team collaboration facilitation'
    };
    return capabilities[agentName] || 'Specialized tasks and templates for their domain';
  }

  /**
   * Check if message contains agent activation command
   */
  function checkAgentActivation(text) {
    const agentPattern = /\*(\w+)/;
    const match = text.match(agentPattern);
    if (match) {
      const agentName = match[1].toLowerCase();
      const validAgents = ['analyst', 'pm', 'ux-expert', 'architect', 'po', 'bmad-orchestrator'];
      
      if (validAgents.includes(agentName)) {
        return {
          isActivation: true,
          agent: agentName,
          originalText: text
        };
      }
    }
    return { isActivation: false };
  }

  /**
   * Update the content of the last assistant message (for streaming)
   */
  function updateLastAssistantMessage(content) {
    const lastMessage = messagesEl.querySelector('.assistant-bubble:last-child:not(.typing-indicator)');
    if (lastMessage) {
      const contentEl = lastMessage.querySelector('.bubble-content');
      if (contentEl) {
        const enhancedContent = processEnhancedContent(content);
        contentEl.innerHTML = parseMarkdown(enhancedContent);
        
        // Re-attach copy handlers for code blocks
        attachCopyHandlers();
        
        // Scroll to bottom smoothly
        requestAnimationFrame(() => {
          messagesEl.scrollTop = messagesEl.scrollHeight;
        });
      }
    }
  }

  /**
   * Render messages efficiently - only render new messages
   */
  function renderMessages() {
    const conv = getActiveConversation();
    if (!conv) {
      messagesEl.innerHTML = '';
      renderedMessageCount = 0;
      showWelcomeMessage();
      return;
    }
    
    // If switching conversations, clear and render all
    if (messagesEl.dataset.conversationId !== conv.id) {
      messagesEl.innerHTML = '';
      messagesEl.dataset.conversationId = conv.id;
      renderedMessageCount = 0;
      
      // Show welcome message if no messages
      if (conv.messages.length === 0) {
        showWelcomeMessage();
        return;
      }
    }
    
    // Only render new messages
    for (let i = renderedMessageCount; i < conv.messages.length; i++) {
      addMessageBubble(conv.messages[i], i);
      renderedMessageCount++;
    }
    
    // Attach copy handlers for new code blocks
    attachCopyHandlers();
  }

  /**
   * Show welcome message for new conversations
   */
  function showWelcomeMessage() {
    const welcomeContainer = document.createElement('div');
    welcomeContainer.className = 'welcome-container';
    welcomeContainer.innerHTML = `
      <div class="welcome-bubble">
        <div class="welcome-avatar">
          <div class="avatar-circle">B</div>
          <div class="avatar-glow"></div>
        </div>
        <div class="welcome-content">
          <h3>Welcome to BUILDWAY</h3>
          <p>Your AI cofounder is ready to help you build, strategize, and grow your business. What would you like to work on today?</p>
        </div>
      </div>
      <div class="suggested-prompts">
        <button class="prompt-suggestion" data-prompt="Help me create a business plan for my startup idea">
          <span class="prompt-icon">💡</span>
          <span class="prompt-text">Create a business plan</span>
        </button>
        <button class="prompt-suggestion" data-prompt="Analyze market opportunities in my industry">
          <span class="prompt-icon">📊</span>
          <span class="prompt-text">Market analysis</span>
        </button>
        <button class="prompt-suggestion" data-prompt="Help me write code for my application">
          <span class="prompt-icon">💻</span>
          <span class="prompt-text">Code assistance</span>
        </button>
        <button class="prompt-suggestion" data-prompt="Create content for my marketing campaign">
          <span class="prompt-icon">📝</span>
          <span class="prompt-text">Content creation</span>
        </button>
      </div>
    `;
    
    messagesEl.appendChild(welcomeContainer);
    
    // Add click handlers for suggested prompts
    welcomeContainer.querySelectorAll('.prompt-suggestion').forEach(btn => {
      btn.addEventListener('click', () => {
        const prompt = btn.dataset.prompt;
        messageInput.value = prompt;
        messageInput.focus();
        // Optionally auto-send
        setTimeout(() => sendMessage(), 100);
      });
    });
    
    // Animate welcome message
    requestAnimationFrame(() => {
      welcomeContainer.style.opacity = '1';
      welcomeContainer.style.transform = 'translateY(0)';
    });
  }

  /**
   * Called when the user clicks the edit icon on their own message.  This
   * function populates the input area with the message content and
   * removes any assistant response that followed, enabling the user to
   * revise their message and resend it.
   *
   * @param {number} index Index of the user message in the messages array
   */
  function startEdit(index) {
    const conv = getActiveConversation();
    if (!conv) return;
    const msg = conv.messages[index];
    if (!msg || msg.role !== 'user') return;
    state.editingIndex = index;
    // Remove assistant message if it immediately follows
    if (conv.messages[index + 1] && conv.messages[index + 1].role === 'assistant') {
      conv.messages.splice(index + 1, 1);
    }
    messageInput.value = msg.content;
    autoGrowInput();
    renderMessages();
  }

  /**
   * Regenerates an assistant response by removing the specified
   * assistant message and re‑issuing the API request.  The user
   * message that preceded this assistant message is used as the
   * query.
   *
   * @param {number} assistantIndex Index of the assistant message in the conversation
   */
  function regenerateAt(assistantIndex) {
    const conv = getActiveConversation();
    if (!conv) return;
    // Find the previous user message
    if (assistantIndex > 0 && conv.messages[assistantIndex].role === 'assistant' && conv.messages[assistantIndex - 1].role === 'user') {
      const userMsgIndex = assistantIndex - 1;
      const userMessage = conv.messages[userMsgIndex].content;
      // Remove assistant message
      conv.messages.splice(assistantIndex, 1);
      saveConversations();
      renderMessages();
      // Send again
      sendMessageInternal(userMessage, false, userMsgIndex);
    }
  }

  /**
   * Called when the user clicks the retry button in the action row.  It
   * regenerates the last assistant response by trimming the last
   * assistant message and re‑requesting from the API.
   */
  function retryLast() {
    const conv = getActiveConversation();
    if (!conv) return;
    for (let i = conv.messages.length - 1; i >= 1; i--) {
      if (conv.messages[i].role === 'assistant' && conv.messages[i - 1].role === 'user') {
        regenerateAt(i);
        break;
      }
    }
  }

  /**
   * Copy button handling.  Finds all copy buttons and attaches
   * click handlers that copy the associated code block to the
   * clipboard.  Shows a temporary “Copied” tooltip on success.
   */
  function attachCopyHandlers() {
    const buttons = messagesEl.querySelectorAll('.copy-btn');
    buttons.forEach((btn) => {
      btn.onclick = () => {
        const pre = btn.parentElement;
        const codeEl = pre.querySelector('code');
        const codeText = codeEl ? codeEl.textContent : '';
        navigator.clipboard.writeText(codeText).then(() => {
          btn.title = 'Copied!';
          setTimeout(() => {
            btn.title = 'Copy code';
          }, 1500);
        });
      };
    });
  }

  /**
   * Auto‑grows the height of the message input area to fit its
   * content, up to a maximum height.  If the content exceeds the
   * maximum height, the textarea scrolls internally.
   */
  function autoGrowInput() {
    messageInput.style.height = 'auto';
    const maxHeight = 160;
    const newHeight = Math.min(messageInput.scrollHeight, maxHeight);
    messageInput.style.height = newHeight + 'px';
  }

  /**
   * Sends a user message.  This helper updates the conversation state
   * and triggers the API call.  If editingIndex is provided, it
   * updates an existing user message instead of appending a new one.
   *
   * @param {string} text The message content
   * @param {boolean} userInitiated If true, update conversation name when needed
   * @param {number} [overrideIndex] Optional index of existing user message to update
   */
  function sendMessageInternal(text, userInitiated = true, overrideIndex) {
    const conv = getActiveConversation();
    if (!conv) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    
    // Check for agent activation
    const agentCheck = checkAgentActivation(trimmed);
    if (agentCheck.isActivation) {
      // Handle agent activation
      const agentName = agentCheck.agent;
      const agentDisplayNames = {
        'analyst': 'Mary (Business Analyst)',
        'pm': 'John (Product Manager)', 
        'ux-expert': 'Sally (UX Expert)',
        'architect': 'Winston (System Architect)',
        'po': 'Sarah (Product Owner)',
        'bmad-orchestrator': 'ECHO (BMAD Orchestrator)'
      };
      
      // Add user message
      conv.messages.push({ role: 'user', content: trimmed });
      
      // Create agent activation response
      const activationResponse = `🎭 **Agent Switch Activated**

I am now operating as **${agentDisplayNames[agentName]}**.

**What I specialize in:**
${getAgentSpecialization(agentName)}

**How I can help you:**
${getAgentCapabilities(agentName)}

Please continue with your request, and I'll respond from my specialized perspective. You can switch agents anytime using \`*agentname\` (e.g., \`*pm\`, \`*architect\`, \`*analyst\`).`;
      
      // Add assistant response
      conv.messages.push({ role: 'assistant', content: activationResponse });
      
      // Clear input and update UI
      messageInput.value = '';
      autoGrowInput();
      saveConversations();
      renderMessages();
      return;
    }
    
    // Clear editing flag
    const editing = overrideIndex !== undefined ? overrideIndex : state.editingIndex;
    if (editing !== null && editing !== undefined) {
      // Update existing user message
      conv.messages[editing].content = trimmed;
      state.editingIndex = null;
    } else {
      // Add new user message
      conv.messages.push({ role: 'user', content: trimmed });
    }
    // Persist conversation name if empty
    if (userInitiated && (!conv.name || conv.name.startsWith('New conversation') || conv.name.startsWith('Untitled'))) {
      conv.name = trimmed.length > 30 ? trimmed.slice(0, 30) + '…' : trimmed;
      renderChatList();
    }
    // Clear input
    messageInput.value = '';
    autoGrowInput();
    // Persist and render updated messages
    saveConversations();
    renderMessages();
    // Send to API
    callAPI(conv);
  }

  /**
   * Sends the conversation to the backend API and streams the
   * assistant’s reply.  Manages streaming state, abort controller and
   * displays the retry/stop buttons while the response is in flight.
   *
   * @param {object} conv The conversation object
   */
  async function callAPI(conv) {
    if (!conv) return;
    // Remove existing assistant message that we are about to regenerate
    // We rely on messages order.
    state.streaming = true;
    actionRow.classList.remove('hidden');
    retryBtn.disabled = true;
    stopBtn.disabled = false;
    
    // Show typing indicator
    const typingIndicator = showTypingIndicator();
    
    // Prepare payload (API key provided by server)
    const payload = {
      messages: conv.messages.map(({ role, content }) => ({ role, content })),
      model: defaultModel,
      max_tokens: state.settings.maxTokens,
      temperature: 1, // Use default temperature
    };
    const controller = new AbortController();
    state.abortController = controller;
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      // Append a placeholder assistant message to the conversation
      const assistantMsg = { role: 'assistant', content: '' };
      conv.messages.push(assistantMsg);
      saveConversations();
      // Stream processing
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      // We'll accumulate the assistant content here
      let assistantContent = '';
      let firstContentReceived = false;
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        // Process each line
        let lines = buffer.split(/\r?\n/);
        // Keep incomplete line in buffer
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line) continue;
          // SSE messages may include an "event:" prefix followed by a "data:" line.  We only
          // process lines beginning with "data:" and ignore event names.
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            // OpenAI sends [DONE] at the end of a stream.  Anthropic does not use this sentinel
            // but we handle it gracefully in case other providers adopt a similar scheme.
            if (data === '[DONE]') {
              state.streaming = false;
              state.abortController = null;
              actionRow.classList.add('hidden');
              retryBtn.disabled = false;
              stopBtn.disabled = true;
              break;
            }
            try {
              const parsed = JSON.parse(data);
              // Handle OpenAI format: choices[0].delta.content
              if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta && parsed.choices[0].delta.content) {
                assistantContent += parsed.choices[0].delta.content;
              }
              // Handle Anthropic format: type === 'content_block_delta' with delta.text
              else if (parsed.type === 'content_block_delta' && parsed.delta && parsed.delta.text) {
                assistantContent += parsed.delta.text;
              }
              // Anthropic signals completion via a message_stop event.  When
              // encountered, we stop streaming but do not append any content.
              else if (parsed.type === 'message_stop') {
                state.streaming = false;
                state.abortController = null;
                actionRow.classList.add('hidden');
                retryBtn.disabled = false;
                stopBtn.disabled = true;
                break;
              }
              
              // Remove typing indicator when first content arrives
              if (!firstContentReceived && assistantContent.length > 0) {
                removeTypingIndicator();
                firstContentReceived = true;
                
                // Add a small delay before showing first content for natural feel
                setTimeout(() => {
                  updateLastAssistantMessage(assistantContent);
                }, 300);
              } else if (firstContentReceived) {
                // For subsequent updates, use the typing delay
                const typingDelay = Math.random() * 50 + 20; // 20-70ms delay
                setTimeout(() => {
                  updateLastAssistantMessage(assistantContent);
                }, typingDelay);
              }
              
              // Save the assistant content if it has changed
              if (assistantContent !== assistantMsg.content) {
                assistantMsg.content = assistantContent;
              }
            } catch (e) {
              console.warn('Failed to parse SSE data:', data, e);
            }
          }
        }
        if (!state.streaming) break;
      }
      // Final save
      saveConversations();
      renderMessages();
    } catch (err) {
      console.error('Error during API call:', err);
      state.streaming = false;
      state.abortController = null;
      actionRow.classList.add('hidden');
      retryBtn.disabled = false;
      stopBtn.disabled = true;
      
      // Remove typing indicator if it exists
      removeTypingIndicator();
      
      // Append an error message from assistant
      conv.messages.push({ role: 'assistant', content: `⚠️ ${err.message || 'API request failed.'}` });
      saveConversations();
      renderMessages();
    }
  }

  /**
   * Public send function called when user presses Enter or clicks the
   * send button.  Wraps sendMessageInternal with userInitiated=true.
   */
  function sendMessage() {
    const text = messageInput.value;
    sendMessageInternal(text, true);
  }

  /**
   * Stop the current streaming response.  Aborts the fetch and
   * updates the UI accordingly.
   */
  function stopStreaming() {
    if (state.abortController) {
      state.abortController.abort();
      state.streaming = false;
      state.abortController = null;
      actionRow.classList.add('hidden');
      retryBtn.disabled = false;
      stopBtn.disabled = true;
      
      // Remove typing indicator if it exists
      removeTypingIndicator();
    }
  }

  /**
   * Shows the settings modal.  Populates inputs with current values.
   */
  function openSettings() {
    displayNameInput.value = state.settings.displayName;
    themeSelect.value = state.settings.theme;
    defaultAgentSelect.value = state.settings.defaultAgent;
    responseStyleSelect.value = state.settings.responseStyle;
    autoSaveToggle.checked = state.settings.autoSave;
    documentFormatSelect.value = state.settings.documentFormat;
    enableDiagramsToggle.checked = state.settings.enableDiagrams;
    enableCodeGenToggle.checked = state.settings.enableCodeGen;
    maxTokensInput.value = state.settings.maxTokens;
    
    const conv = getActiveConversation();
    chatNameInput.value = conv ? conv.name : '';
    
    // Populate profile information
    populateProfileInfo();
    
    // Populate usage statistics
    populateUsageStats();
    
    settingsModal.classList.remove('hidden');
  }

  function closeSettings() {
    settingsModal.classList.add('hidden');
  }

  /**
   * Handle user logout
   */
  async function handleLogout() {
    try {
      // Close settings modal first
      closeSettings();
      
      // Show loading state
      logoutBtn.disabled = true;
      logoutBtn.textContent = 'Signing out...';
      
      // Sign out from Firebase
      await window.auth.signOut();
      
      // Redirect to login page
      window.location.href = '/login.html';
      
    } catch (error) {
      console.error('Logout error:', error);
      logoutBtn.disabled = false;
      logoutBtn.textContent = 'Sign Out';
      
      // Show error message - you could improve this with a toast/notification
      alert('Failed to sign out. Please try again.');
    }
  }

  /**
   * Populate profile information in settings modal
   */
  function populateProfileInfo() {
    // Get current user from Firebase
    const user = window.auth.currentUser;
    if (user) {
      userEmailDisplay.value = user.email;
      // Update avatar with first letter of display name or email
      const displayName = state.settings.displayName || user.displayName || user.email;
      const avatarLetter = displayName ? displayName.charAt(0).toUpperCase() : 'U';
      settingsAvatar.textContent = avatarLetter;
    }
  }

  /**
   * Populate usage statistics
   */
  function populateUsageStats() {
    // Calculate statistics from current data
    const totalConversations = state.conversations.length;
    const totalMessages = state.conversations.reduce((total, conv) => total + conv.messages.length, 0);
    
    // Calculate account age (for demo purposes, using a fixed date)
    const accountCreated = new Date('2024-01-01'); // This would come from user account data
    const today = new Date();
    const daysDiff = Math.floor((today - accountCreated) / (1000 * 60 * 60 * 24));
    
    // Find most used agent (simplified)
    const agentName = state.settings.defaultAgent === 'echo' ? 'BUILDWAY' : 'Assistant';
    
    // Update the UI
    totalConversationsEl.textContent = totalConversations.toString();
    totalMessagesEl.textContent = totalMessages.toString();
    accountAgeEl.textContent = daysDiff.toString();
    favoriteAgentEl.textContent = agentName;
    
    // Update plan information
    userPlanEl.textContent = state.user.subscription || 'Free';
  }

  /**
   * Saves settings from the modal and closes it.
   */
  function saveSettingsFromModal() {
    state.settings.displayName = displayNameInput.value.trim();
    state.settings.theme = themeSelect.value;
    state.settings.defaultAgent = defaultAgentSelect.value;
    state.settings.responseStyle = responseStyleSelect.value;
    state.settings.autoSave = autoSaveToggle.checked;
    state.settings.documentFormat = documentFormatSelect.value;
    state.settings.enableDiagrams = enableDiagramsToggle.checked;
    state.settings.enableCodeGen = enableCodeGenToggle.checked;
    state.settings.maxTokens = parseInt(maxTokensInput.value, 10) || 2048;
    
    saveSettings();
    
    // Apply theme if changed
    if (state.settings.theme !== 'auto') {
      applyTheme(state.settings.theme);
    } else {
      loadTheme(); // Reapply auto theme detection
    }
    
    // Update conversation name if changed
    const newName = chatNameInput.value.trim();
    const conv = getActiveConversation();
    if (conv && newName) {
      updateConversationName(conv.id, newName);
    }
    closeSettings();
  }

  /**
   * Firebase Authentication Implementation
   */
  
  // Initialize Firebase Auth and set up listeners
  function initializeAuth() {
    if (!window.auth) {
      console.error('Firebase auth not initialized');
      return;
    }
    
    // Listen for authentication state changes
    window.auth.onAuthStateChanged((user) => {
      if (user) {
        // User is signed in
        state.user = {
          id: user.uid,
          email: user.email,
          isAuthenticated: true,
          subscription: 'free'
        };
        state.settings.displayName = user.displayName || user.email.split('@')[0];
        updateAuthUI(user);
        loadUserData();
      } else {
        // User is signed out
        state.user = {
          id: null,
          email: null,
          isAuthenticated: false,
          subscription: 'free'
        };
        updateAuthUI(null);
        // Switch to local storage mode
        loadState();
      }
    });
    
    console.log('Firebase Auth initialized');
  }
  
  function updateAuthUI(user) {
    if (user) {
      // Update user info (user profile is always shown in app)
      userName.textContent = user.displayName || user.email.split('@')[0];
      userEmail.textContent = user.email;
      userAvatar.textContent = (user.displayName || user.email).charAt(0).toUpperCase();
    } else {
      // This shouldn't happen in the app since it's protected
      // But handle gracefully just in case
      window.AuthUtils.redirectToLogin();
    }
  }

  async function loadUserData() {
    if (!state.user.isAuthenticated) return;
    
    try {
      state.syncStatus = 'syncing';
      
      // Load conversations from Firestore
      const conversationsRef = window.db.collection('users').doc(state.user.id).collection('conversations');
      const conversationsSnapshot = await conversationsRef.orderBy('updatedAt', 'desc').get();
      
      if (!conversationsSnapshot.empty) {
        state.conversations = [];
        conversationsSnapshot.forEach((doc) => {
          const data = doc.data();
          state.conversations.push({
            id: doc.id,
            name: data.name,
            messages: data.messages || []
          });
        });
        
        if (state.conversations.length > 0) {
          state.activeId = state.conversations[0].id;
        }
      }
      
      // Load user settings from Firestore
      const settingsRef = window.db.collection('users').doc(state.user.id);
      const settingsDoc = await settingsRef.get();
      
      if (settingsDoc.exists) {
        const userData = settingsDoc.data();
        if (userData.settings) {
          state.settings = { ...state.settings, ...userData.settings };
        }
      }
      
      state.syncStatus = 'synced';
      renderChatList();
      renderMessages();
      
    } catch (error) {
      console.error('Error loading user data:', error);
      state.syncStatus = 'error';
      // Fall back to localStorage
      loadState();
    }
  }

  async function syncConversations() {
    if (!state.user.isAuthenticated) return;
    
    try {
      const conversationsRef = window.db.collection('users').doc(state.user.id).collection('conversations');
      
      // Save all conversations
      const batch = window.db.batch();
      
      state.conversations.forEach((conv) => {
        const docRef = conversationsRef.doc(conv.id);
        batch.set(docRef, {
          name: conv.name,
          messages: conv.messages,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      });
      
      await batch.commit();
      state.syncStatus = 'synced';
      
    } catch (error) {
      console.error('Error syncing conversations:', error);
      state.syncStatus = 'error';
    }
  }

  async function syncSettings() {
    if (!state.user.isAuthenticated) return;
    
    try {
      const userRef = window.db.collection('users').doc(state.user.id);
      await userRef.set({
        settings: state.settings,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      
    } catch (error) {
      console.error('Error syncing settings:', error);
    }
  }

  async function handleLogin(email, password) {
    try {
      showAuthLoading(true);
      clearAuthError('login');
      
      await window.auth.signInWithEmailAndPassword(email, password);
      closeAuthModal();
      
    } catch (error) {
      console.error('Login error:', error);
      showAuthError('login', getAuthErrorMessage(error));
    } finally {
      showAuthLoading(false);
    }
  }

  async function handleSignup(email, password, displayName) {
    try {
      showAuthLoading(true);
      clearAuthError('signup');
      
      const userCredential = await window.auth.createUserWithEmailAndPassword(email, password);
      
      // Update user profile with display name
      if (displayName) {
        await userCredential.user.updateProfile({
          displayName: displayName
        });
      }
      
      // Initialize user document in Firestore
      await window.db.collection('users').doc(userCredential.user.uid).set({
        email: email,
        displayName: displayName,
        settings: state.settings,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      closeAuthModal();
      
    } catch (error) {
      console.error('Signup error:', error);
      showAuthError('signup', getAuthErrorMessage(error));
    } finally {
      showAuthLoading(false);
    }
  }

  async function handleGoogleAuth() {
    try {
      showAuthLoading(true);
      
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      
      const result = await window.auth.signInWithPopup(provider);
      
      // Check if this is a new user and create user document
      if (result.additionalUserInfo.isNewUser) {
        await window.db.collection('users').doc(result.user.uid).set({
          email: result.user.email,
          displayName: result.user.displayName,
          settings: state.settings,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
      
      closeAuthModal();
      
    } catch (error) {
      console.error('Google auth error:', error);
      showAuthError('login', getAuthErrorMessage(error));
    } finally {
      showAuthLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await window.auth.signOut();
      // Clear local state
      state.conversations = [];
      state.activeId = null;
      // Create a new conversation for guest mode
      createConversation();
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  async function handleForgotPassword(email) {
    try {
      await window.auth.sendPasswordResetEmail(email);
      alert('Password reset email sent! Check your inbox.');
    } catch (error) {
      console.error('Password reset error:', error);
      alert(getAuthErrorMessage(error));
    }
  }

  // Helper function to handle logout
  async function handleAppLogout() {
    try {
      await window.AuthUtils.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  // Download functionality removed as requested

  /**
   * Sidebar behaviour on small screens.  When the mobile menu button is
   * pressed, the sidebar slides in.  Clicking outside closes it.
   */
  function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('open');
    // Add an overlay via a CSS pseudo element by toggling a class on the container
    appContainer.classList.toggle('sidebar-open');
  }

  function closeSidebarOnMobile() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar.classList.contains('open')) {
      sidebar.classList.remove('open');
      appContainer.classList.remove('sidebar-open');
    }
  }

  /**
   * Initialize event listeners and load initial state on page load.
   */
  function init() {
    loadState();
    loadTheme();
    initializeAuth(); // Prepare for future Supabase integration
    // If no conversations exist, create one
    if (state.conversations.length === 0) {
      createConversation();
    }
    renderChatList();
    renderMessages();

    // Theme toggle
    themeToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
    });

    // New chat button
    newChatBtn.addEventListener('click', () => {
      createConversation();
      closeSidebarOnMobile();
    });

    // Send button
    sendBtn.addEventListener('click', () => {
      sendMessage();
    });

    // Message input keydown handler
    messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (!e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      }
    });
    messageInput.addEventListener('input', autoGrowInput);

    // Settings
    settingsToggle.addEventListener('click', openSettings);
    saveSettingsBtn.addEventListener('click', saveSettingsFromModal);
    closeSettingsBtn.addEventListener('click', closeSettings);
    logoutBtn.addEventListener('click', handleLogout);
    modalBackdrop.addEventListener('click', closeSettings);

    // Retry & Stop buttons
    retryBtn.addEventListener('click', () => {
      retryLast();
    });
    stopBtn.addEventListener('click', () => {
      stopStreaming();
    });

    // Download button removed

    // Mobile menu toggle
    mobileMenuBtn.addEventListener('click', toggleSidebar);
    // Close sidebar when clicking outside on overlay (handled in CSS)
    window.addEventListener('resize', closeSidebarOnMobile);
    
    // User menu for logout
    if (userMenuBtn) {
      userMenuBtn.addEventListener('click', () => {
        const menu = document.createElement('div');
        menu.className = 'user-menu-dropdown';
        menu.innerHTML = `
          <div class="user-menu-item" data-action="logout">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <polyline points="16,17 21,12 16,7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            Sign Out
          </div>
        `;
        
        // Position the menu
        const rect = userMenuBtn.getBoundingClientRect();
        menu.style.position = 'fixed';
        menu.style.top = rect.bottom + 5 + 'px';
        menu.style.right = '10px';
        menu.style.zIndex = '1000';
        
        document.body.appendChild(menu);
        
        // Handle menu clicks
        menu.addEventListener('click', (e) => {
          const action = e.target.closest('[data-action]')?.dataset.action;
          if (action === 'logout') {
            handleAppLogout();
          }
          menu.remove();
        });
        
        // Remove menu when clicking outside
        setTimeout(() => {
          const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
              menu.remove();
              document.removeEventListener('click', closeMenu);
            }
          };
          document.addEventListener('click', closeMenu);
        }, 100);
      });
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
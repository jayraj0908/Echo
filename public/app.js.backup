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
    // Settings controlling API requests
    settings: {
      apiKey: '',
      maxTokens: 1024,
      temperature: 1,
    },
    editingIndex: null, // index of the user message currently being edited
  };

  // DOM references
  const chatListEl = document.getElementById('chat-list');
  const messagesEl = document.getElementById('messages');
  const newChatBtn = document.getElementById('new-chat-btn');
  const sendBtn = document.getElementById('send-btn');
  const messageInput = document.getElementById('message-input');
  const modelSelect = document.getElementById('model-select');
  const themeToggle = document.getElementById('theme-toggle');
  const themeIcon = document.getElementById('theme-icon');
  const settingsToggle = document.getElementById('settings-toggle');
  const settingsModal = document.getElementById('settings-modal');
  const modalBackdrop = document.getElementById('modal-backdrop');
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  const closeSettingsBtn = document.getElementById('close-settings-btn');
  const apiKeyInput = document.getElementById('api-key-input');
  const maxTokensInput = document.getElementById('max-tokens-input');
  const temperatureInput = document.getElementById('temperature-input');
  const chatNameInput = document.getElementById('chat-name-input');
  const retryBtn = document.getElementById('retry-btn');
  const stopBtn = document.getElementById('stop-btn');
  const actionRow = document.getElementById('action-row');
  const downloadBtn = document.getElementById('download-btn');
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
  }

  function saveSettings() {
    localStorage.setItem('echo_api_key', state.settings.apiKey);
    localStorage.setItem('echo_max_tokens', String(state.settings.maxTokens));
    localStorage.setItem('echo_temperature', String(state.settings.temperature));
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
    state.settings.apiKey = localStorage.getItem('echo_api_key') || '';
    state.settings.maxTokens = parseInt(localStorage.getItem('echo_max_tokens'), 10) || 1024;
    state.settings.temperature = parseFloat(localStorage.getItem('echo_temperature')) || 1;
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
        moveConversationToTop(conv.id);
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
   * Render all messages of the active conversation into the DOM.  This
   * function clears the messages container and then appends DOM nodes
   * for each message in the conversation.  It also attaches the
   * appropriate event handlers for copy buttons, edit actions and
   * regenerate actions.
   */
  function renderMessages() {
    const conv = getActiveConversation();
    if (!conv) return;
    messagesEl.innerHTML = '';
    conv.messages.forEach((msg, idx) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'message ' + (msg.role === 'user' ? 'user' : 'assistant');
      // Avatar
      const avatar = document.createElement('div');
      avatar.className = 'avatar';
      avatar.textContent = msg.role === 'user' ? 'U' : 'E';
      wrapper.appendChild(avatar);
      // Content container
      const content = document.createElement('div');
      content.className = 'content';
      if (msg.role === 'assistant') {
        // Parse markdown to HTML
        content.innerHTML = parseMarkdown(msg.content);
      } else {
        content.textContent = msg.content;
      }
      wrapper.appendChild(content);
      // Actions row
      const actions = document.createElement('div');
      actions.className = 'message-actions';
      if (msg.role === 'user') {
        // Edit button
        const editBtn = document.createElement('button');
        editBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 20h9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M16.5 3a2.121 2.121 0 0 1 3 3L7 18.5 3 19l.5-4L16.5 3Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        editBtn.title = 'Edit message';
        editBtn.addEventListener('click', () => startEdit(idx));
        actions.appendChild(editBtn);
      } else if (msg.role === 'assistant') {
        // Regenerate button
        const regenBtn = document.createElement('button');
        regenBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17.65 6.35A7.95 7.95 0 0 0 12 4V1L8 5l4 4V6a6 6 0 1 1-6 6H4a8 8 0 1 0 13.65-5.65Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        regenBtn.title = 'Regenerate response';
        regenBtn.addEventListener('click', () => regenerateAt(idx));
        actions.appendChild(regenBtn);
      }
      if (actions.children.length > 0) {
        wrapper.appendChild(actions);
      }
      messagesEl.appendChild(wrapper);
    });
    // Scroll to bottom
    messagesEl.scrollTop = messagesEl.scrollHeight;
    // Attach copy handlers to any copy buttons in code blocks
    attachCopyHandlers();
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
    // Prepare payload
    const payload = {
      messages: conv.messages.map(({ role, content }) => ({ role, content })),
      model: modelSelect.value,
      key: state.settings.apiKey.trim(),
      max_tokens: state.settings.maxTokens,
      temperature: state.settings.temperature,
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
              // Save the assistant content if it has changed
              if (assistantContent !== assistantMsg.content) {
                assistantMsg.content = assistantContent;
                renderMessages();
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
    }
  }

  /**
   * Shows the settings modal.  Populates inputs with current values.
   */
  function openSettings() {
    apiKeyInput.value = state.settings.apiKey;
    maxTokensInput.value = state.settings.maxTokens;
    temperatureInput.value = state.settings.temperature;
    const conv = getActiveConversation();
    chatNameInput.value = conv ? conv.name : '';
    settingsModal.classList.remove('hidden');
  }

  function closeSettings() {
    settingsModal.classList.add('hidden');
  }

  /**
   * Saves settings from the modal and closes it.
   */
  function saveSettingsFromModal() {
    state.settings.apiKey = apiKeyInput.value.trim();
    state.settings.maxTokens = parseInt(maxTokensInput.value, 10) || 1024;
    state.settings.temperature = parseFloat(temperatureInput.value) || 1;
    saveSettings();
    // Update conversation name if changed
    const newName = chatNameInput.value.trim();
    const conv = getActiveConversation();
    if (conv && newName) {
      updateConversationName(conv.id, newName);
    }
    closeSettings();
  }

  /**
   * Downloads the current conversation as a Markdown file.  The file
   * includes all messages in the conversation in a readable format.
   */
  function downloadConversation() {
    const conv = getActiveConversation();
    if (!conv) return;
    let md = `# ${conv.name || 'Conversation'}\n\n`;
    conv.messages.forEach((msg) => {
      md += `### ${msg.role === 'user' ? 'User' : 'Assistant'}\n`;
      md += msg.content + '\n\n';
    });
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().replace(/[:.]/g, '-');
    a.download = `echo-chat-${date}.md`;
    a.href = url;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

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
    modalBackdrop.addEventListener('click', closeSettings);

    // Retry & Stop buttons
    retryBtn.addEventListener('click', () => {
      retryLast();
    });
    stopBtn.addEventListener('click', () => {
      stopStreaming();
    });

    // Download button
    downloadBtn.addEventListener('click', () => {
      downloadConversation();
    });

    // Mobile menu toggle
    mobileMenuBtn.addEventListener('click', toggleSidebar);
    // Close sidebar when clicking outside on overlay (handled in CSS)
    window.addEventListener('resize', closeSidebarOnMobile);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
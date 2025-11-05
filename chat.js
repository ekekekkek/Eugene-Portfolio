// Chat panel functionality
const chatToggle = document.querySelector('.chat-toggle');
const chatPanel = document.querySelector('.chat-panel');
const chatInput = document.getElementById('chatInput');
const chatSendBtn = document.getElementById('chatSendBtn');
const chatMessages = document.getElementById('chatMessages');
const suggestionButtons = document.querySelectorAll('.suggestion-btn');
const chatInfoIcon = document.getElementById('chatInfoIcon');

// Generate UUID for session and conversation tracking
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Initialize session ID (persists across page reloads)
let sessionId = sessionStorage.getItem('chatSessionId');
if (!sessionId) {
  sessionId = generateUUID();
  sessionStorage.setItem('chatSessionId', sessionId);
}

// Initialize conversation ID (resets when chat is closed)
let conversationId = sessionStorage.getItem('chatConversationId') || generateUUID();

// Handle info icon click - show tooltip
if (chatInfoIcon) {
  // Create tooltip element
  const tooltip = document.createElement('div');
  tooltip.className = 'chat-info-tooltip';
  tooltip.innerHTML = `
    <div class="chat-info-tooltip-content">
      <p>I'm a chatbot that can ask questions about Eugene. I apologize for the limited depth of knowledge as a representation of Eugene. Your responses will be logged for research and development purposes :)</p>
    </div>
  `;
  document.querySelector('.chat-panel-header').appendChild(tooltip);
  
  // Handle info icon click
  chatInfoIcon.addEventListener('click', (e) => {
    e.stopPropagation();
    tooltip.classList.toggle('visible');
  });
  
  // Close tooltip when clicking outside
  document.addEventListener('click', (e) => {
    if (!tooltip.contains(e.target) && !chatInfoIcon.contains(e.target)) {
      tooltip.classList.remove('visible');
    }
  });
}

// Toggle chat panel
chatToggle.addEventListener('click', (e) => {
  // Check if clicking the close icon (handle text node case)
  const clickedElement = e.target.nodeType === Node.TEXT_NODE ? e.target.parentElement : e.target;
  const isCloseIcon = clickedElement.classList.contains('chat-close-icon') || 
                      clickedElement.closest('.chat-close-icon') ||
                      e.target.closest('.chat-close-icon');
  
  if (isCloseIcon) {
    // Handle close - prevent default and stop propagation
    e.preventDefault();
    e.stopPropagation();
    if (chatToggle.classList.contains('active')) {
      chatToggle.classList.remove('active');
      chatPanel.classList.remove('active');
      // Reset conversation ID when chat is closed (new conversation on next open)
      conversationId = generateUUID();
      sessionStorage.removeItem('chatConversationId');
    }
    return;
  }
  
  // Handle open
  const isActive = chatToggle.classList.contains('active');
  if (!isActive) {
    chatToggle.classList.add('active');
    chatPanel.classList.add('active');
    
    // Start new conversation if one doesn't exist
    if (!sessionStorage.getItem('chatConversationId')) {
      conversationId = generateUUID();
      sessionStorage.setItem('chatConversationId', conversationId);
    } else {
      conversationId = sessionStorage.getItem('chatConversationId');
    }
    
    // Focus on input when opening
    setTimeout(() => {
      chatInput.focus();
    }, 300);
  }
});

// Handle suggestion buttons
suggestionButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const question = btn.textContent;
    sendMessage(question);
  });
});

// Handle sending messages
function sendMessage(message) {
  if (!message.trim()) return;

  // Add user message to UI
  addMessageToUI(message, 'user');
  
  // Clear input and reset styling
  chatInput.value = '';
  const container = chatInput.closest('.chat-input-container');
  container.classList.remove('has-input');
  
  // Disable input and button while processing
  chatInput.disabled = true;
  chatSendBtn.disabled = true;
  
  // Show loading message
  const loadingMessage = addMessageToUI('Thinking...', 'assistant');
  
  // Send to API - try multiple endpoints
  const apiEndpoints = [
    '/api/chat',  // Vercel production (relative path)
    'https://kimeugene.com/api/chat',  // Full domain (fallback)
    'http://localhost:3000/api/chat',  // Local development (only if running locally)
  ];
  
  let fetchAttempts = 0;
  
  function tryFetch() {
    if (fetchAttempts >= apiEndpoints.length) {
      loadingMessage.remove();
      addMessageToUI('Chat service is not available. This feature requires deploying to a platform that supports serverless functions (like Vercel).', 'assistant');
      chatInput.disabled = false;
      chatSendBtn.disabled = false;
      chatInput.focus();
      return;
    }
    
    const endpoint = apiEndpoints[fetchAttempts];
    
    fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Id': sessionId,
        'X-Conversation-Id': conversationId
      },
      body: JSON.stringify({ message: message })
    })
    .then(response => {
      console.log(`Response from ${endpoint}:`, response.status, response.statusText);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('Response data:', data);
      // Remove loading message
      loadingMessage.remove();
      
      // Update conversation ID from server response if provided
      if (data.conversation_id) {
        conversationId = data.conversation_id;
        sessionStorage.setItem('chatConversationId', conversationId);
      }
      if (data.session_id) {
        sessionId = data.session_id;
        sessionStorage.setItem('chatSessionId', sessionId);
      }
      
      if (data.response) {
        addMessageToUI(data.response, 'assistant');
      } else if (data.error) {
        addMessageToUI('Sorry, I encountered an error: ' + data.error, 'assistant');
        console.error('Chat error:', data.error);
      } else {
        console.error('Unexpected response format:', data);
        addMessageToUI('Unexpected response from server', 'assistant');
      }
      
      // Re-enable input and button
      chatInput.disabled = false;
      chatSendBtn.disabled = false;
      chatInput.focus();
    })
    .catch(error => {
      console.error(`Fetch failed for ${endpoint}:`, error.message);
      console.error('Full error:', error);
      fetchAttempts++;
      tryFetch();
    });
  }
  
  tryFetch();
}

// Add message to UI
function addMessageToUI(message, type) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-message ${type}`;
  messageDiv.textContent = message;
  chatMessages.appendChild(messageDiv);
  
  // Scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  // Hide intro and suggestions after first message
  if (chatMessages.children.length > 0) {
    const chatPanelIntro = document.querySelector('.chat-panel-intro');
    const chatSuggestions = document.querySelector('.chat-suggestions');
    if (chatPanelIntro) {
      chatPanelIntro.style.display = 'none';
    }
    if (chatSuggestions) {
      chatSuggestions.style.display = 'none';
    }
  }
  
  return messageDiv;
}

// Handle input field
chatInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage(chatInput.value);
  }
});

// Toggle active state when typing
chatInput.addEventListener('input', () => {
  const container = chatInput.closest('.chat-input-container');
  container.classList.toggle('has-input', chatInput.value.trim().length > 0);
});

// Handle send button click
chatSendBtn.addEventListener('click', () => {
  sendMessage(chatInput.value);
});

// Smooth scroll for chat messages
chatMessages.style.scrollBehavior = 'smooth';


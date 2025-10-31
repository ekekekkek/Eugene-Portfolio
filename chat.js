// Chat panel functionality
const chatToggle = document.querySelector('.chat-toggle');
const chatPanel = document.querySelector('.chat-panel');
const chatInput = document.getElementById('chatInput');
const chatSendBtn = document.getElementById('chatSendBtn');
const chatMessages = document.getElementById('chatMessages');
const suggestionButtons = document.querySelectorAll('.suggestion-btn');

// Toggle chat panel
chatToggle.addEventListener('click', (e) => {
  // Check if we're clicking the close icon specifically when panel is open
  const isCloseIcon = e.target.classList.contains('chat-close-icon');
  const isActive = chatToggle.classList.contains('active');
  
  if (isCloseIcon && isActive) {
    // Just close
    chatToggle.classList.remove('active');
    chatPanel.classList.remove('active');
  } else if (!isActive) {
    // Open
    chatToggle.classList.add('active');
    chatPanel.classList.add('active');
    
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
  
  // Clear input
  chatInput.value = '';
  
  // Disable input and button while processing
  chatInput.disabled = true;
  chatSendBtn.disabled = true;
  
  // Show loading message
  const loadingMessage = addMessageToUI('Thinking...', 'assistant');
  
  // Send to API - try multiple endpoints
  const apiEndpoints = [
    'http://localhost:3000/api/chat',  // Local development
    '/api/chat',  // Vercel production
    'https://kimeugene.com'  // Vercel domain
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
  
  // Hide suggestions after first message
  if (chatMessages.children.length > 1) {
    document.querySelector('.chat-suggestions').style.display = 'none';
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


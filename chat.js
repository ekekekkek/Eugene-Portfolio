// Chat panel functionality
const chatToggle = document.querySelector('.chat-toggle');
const chatPanel = document.querySelector('.chat-panel');
const chatInput = document.getElementById('chatInput');
const chatSendBtn = document.getElementById('chatSendBtn');
const chatMessages = document.getElementById('chatMessages');
const suggestionButtons = document.querySelectorAll('.suggestion-btn');
const chatInfoIcon = document.getElementById('chatInfoIcon');

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
    }
    return;
  }
  
  // Handle open
  const isActive = chatToggle.classList.contains('active');
  if (!isActive) {
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
  messageDiv.innerHTML = message;
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

// Handle close panel button (mobile)
const chatClosePanel = document.getElementById('chatClosePanel');
if (chatClosePanel) {
  // Show close button on mobile when panel is active
  const checkMobileCloseButton = () => {
    if (window.innerWidth <= 768 && chatPanel.classList.contains('active')) {
      chatClosePanel.style.display = 'flex';
    } else {
      chatClosePanel.style.display = 'none';
    }
  };

  // Check on resize
  window.addEventListener('resize', checkMobileCloseButton);

  // Check when panel state changes
  const panelObserver = new MutationObserver(() => {
    checkMobileCloseButton();
  });
  if (chatPanel) {
    panelObserver.observe(chatPanel, { attributes: true, attributeFilter: ['class'] });
  }

  // Handle close button click
  chatClosePanel.addEventListener('click', () => {
    chatPanel.classList.remove('active');
    chatPanel.classList.remove('expanded');
    if (chatToggle) {
      chatToggle.classList.remove('active');
    }
  });

  // Initial check
  checkMobileCloseButton();
}

// Mobile Chatbot Functionality (Notion AI Style)
const mobileChatToggle = document.getElementById('mobileChatToggle');
const mobileChatInput = document.getElementById('mobileChatInput');
const mobileChatSend = document.getElementById('mobileChatSend');
const mobileChatToggleWrapper = document.querySelector('.mobile-chat-toggle-wrapper');

// Only initialize if mobile elements exist (mobile viewport)
if (mobileChatToggle && mobileChatInput && mobileChatSend) {
  let isPanelExpanded = false;

  // Handle mobile toggle click - activate input mode
  mobileChatToggle.addEventListener('click', (e) => {
    // Don't activate if clicking the send button
    if (e.target.closest('.mobile-chat-send')) {
      return;
    }
    
    // Activate input mode
    if (!mobileChatToggle.classList.contains('active')) {
      mobileChatToggle.classList.add('active');
      setTimeout(() => {
        mobileChatInput.focus();
      }, 100);
    }
  });

  // Handle mobile input focus - ensure active state
  mobileChatInput.addEventListener('focus', () => {
    mobileChatToggle.classList.add('active');
  });

  // Handle mobile input blur - keep active if there's text
  mobileChatInput.addEventListener('blur', () => {
    if (!mobileChatInput.value.trim() && !isPanelExpanded) {
      // Hide input/send first to prevent layout shift
      mobileChatInput.style.opacity = '0';
      mobileChatSend.style.opacity = '0';
      // Small delay to let opacity transition start, then remove active class
      setTimeout(() => {
        mobileChatToggle.classList.remove('active');
        // Reset opacity after transition
        setTimeout(() => {
          mobileChatInput.style.opacity = '';
          mobileChatSend.style.opacity = '';
        }, 300);
      }, 50);
    }
  });

  // Handle mobile send button click
  mobileChatSend.addEventListener('click', (e) => {
    e.stopPropagation();
    const message = mobileChatInput.value.trim();
    if (message) {
      handleMobileSend(message);
    }
  });

  // Handle Enter key in mobile input
  mobileChatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const message = mobileChatInput.value.trim();
      if (message) {
        handleMobileSend(message);
      }
    }
  });

  // Function to handle sending message from mobile
  function handleMobileSend(message) {
    // Expand panel if not already expanded
    if (!isPanelExpanded) {
      chatPanel.classList.add('active');
      chatPanel.classList.add('expanded');
      isPanelExpanded = true;
      if (mobileChatToggleWrapper) {
        mobileChatToggleWrapper.style.display = 'none';
      }
    }

    // Sync with desktop input
    chatInput.value = message;
    
    // Send message using existing function
    sendMessage(message);
    
    // Clear mobile input but keep it active
    mobileChatInput.value = '';
    
    // Focus back on mobile input after panel expands
    setTimeout(() => {
      mobileChatInput.focus();
    }, 400);
  }

  // Store original sendMessage
  const originalSendMessage = sendMessage;
  
  // Override sendMessage to handle mobile panel expansion
  window.sendMessage = function(message) {
    if (!message.trim()) return;

    // Expand panel on first message if on mobile
    if (!isPanelExpanded && window.innerWidth <= 768) {
      chatPanel.classList.add('active');
      chatPanel.classList.add('expanded');
      isPanelExpanded = true;
      if (mobileChatToggleWrapper) {
        mobileChatToggleWrapper.style.display = 'none';
      }
    }

    // Call original sendMessage
    originalSendMessage(message);
    
    // Clear mobile input
    if (mobileChatInput) {
      mobileChatInput.value = '';
    }
  };

  // Handle closing the panel - reset mobile state
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        const panel = mutation.target;
        if (!panel.classList.contains('active') && !panel.classList.contains('expanded')) {
          isPanelExpanded = false;
          mobileChatToggle.classList.remove('active');
          if (mobileChatInput) {
            mobileChatInput.value = '';
          }
          if (mobileChatToggleWrapper) {
            mobileChatToggleWrapper.style.display = 'block';
          }
        } else if (panel.classList.contains('active') && panel.classList.contains('expanded')) {
          isPanelExpanded = true;
          if (mobileChatToggleWrapper) {
            mobileChatToggleWrapper.style.display = 'none';
          }
        }
      }
    });
  });

  if (chatPanel) {
    observer.observe(chatPanel, { attributes: true });
  }

  // Sync desktop input with mobile input when panel is expanded
  if (chatInput) {
    chatInput.addEventListener('input', () => {
      if (isPanelExpanded && mobileChatInput) {
        mobileChatInput.value = chatInput.value;
      }
    });
  }

  // Close panel when clicking outside (for mobile)
  document.addEventListener('click', (e) => {
    if (isPanelExpanded && 
        !chatPanel.contains(e.target) && 
        !mobileChatToggle.contains(e.target) &&
        window.innerWidth <= 768) {
      // Don't close if clicking on the mobile toggle wrapper area
      if (!mobileChatToggleWrapper || !mobileChatToggleWrapper.contains(e.target)) {
        chatPanel.classList.remove('active');
        chatPanel.classList.remove('expanded');
        isPanelExpanded = false;
        mobileChatToggle.classList.remove('active');
        if (mobileChatInput) {
          mobileChatInput.value = '';
        }
        if (mobileChatToggleWrapper) {
          mobileChatToggleWrapper.style.display = 'block';
        }
      }
    }
  });
}


// Client-side JavaScript
const socket = io();
let userId = 'user_' + Math.random().toString(36).substr(2, 9);

function addMessage(sender, text) {
    const chat = document.getElementById("chat");
    
    // Remove welcome message if it exists
    const welcomeMessage = chat.querySelector('.welcome-message');
    if (welcomeMessage) {
        welcomeMessage.remove();
    }
    
    const messageDiv = document.createElement("div");
    messageDiv.className = sender;
    
    const contentDiv = document.createElement("div");
    
    // Process text for better formatting
    const processedText = text.replace(/\n/g, '<br>')
                             .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
                             .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                             .replace(/_(.*?)_/g, '<em>$1</em>')
                             .replace(/`(.*?)`/g, '<code>$1</code>')
                             .replace(/👻/g, '👻')
                             .replace(/✅/g, '✅')
                             .replace(/❌/g, '❌')
                             .replace(/💡/g, '💡')
                             .replace(/🤖/g, '🤖')
                             .replace(/🧩/g, '🧩');
    
    contentDiv.innerHTML = processedText;
    messageDiv.appendChild(contentDiv);
    chat.appendChild(messageDiv);
    
    // Smooth scroll to bottom
    requestAnimationFrame(() => {
        chat.scrollTop = chat.scrollHeight;
    });
}

function handleSend() {
    const inputBox = document.getElementById("userInput");
    const input = inputBox.value.trim();
    if (!input) return;
    
    addMessage("user", input);
    inputBox.value = "";
    inputBox.style.height = 'auto';

    // Send message to server
    socket.emit('chat message', {
        userId: userId,
        message: input
    });
    
    // Hide suggestions after sending
    hideSuggestions();
}

function hideSuggestions() {
    const suggestions = document.querySelector('.input-suggestions');
    if (suggestions) {
        suggestions.style.display = 'none';
    }
}

function showSuggestions() {
    const suggestions = document.querySelector('.input-suggestions');
    if (suggestions) {
        suggestions.style.display = 'flex';
    }
}

// Receive messages from server
socket.on('chat response', (data) => {
    addMessage("bot", data.message);
});

socket.on('connect', () => {
    updateConnectionStatus(true);
});

socket.on('disconnect', () => {
    updateConnectionStatus(false);
});

function updateConnectionStatus(connected) {
    const connectionStatus = document.querySelector('.connection-status');
    const statusDot = document.querySelector('.status-dot');
    
    if (connectionStatus && statusDot) {
        if (connected) {
            connectionStatus.innerHTML = '🟢 Connected';
            statusDot.style.background = '#4ade80';
        } else {
            connectionStatus.innerHTML = '🔴 Disconnected';
            statusDot.style.background = '#ef4444';
        }
    }
}

// UI Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    const sendBtn = document.getElementById("sendBtn");
    const inputEl = document.getElementById("userInput");
    const helpBtn = document.getElementById("helpBtn");
    const suggestionChips = document.querySelectorAll('.suggestion-chip');
    
    // Send button click
    sendBtn.addEventListener("click", handleSend);
    
    // Input handling
    inputEl.addEventListener("keypress", e => { 
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    });
    
    // Auto-resize textarea
    inputEl.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });
    
    // Focus handling for suggestions
    inputEl.addEventListener('focus', showSuggestions);
    
    // Help button
    helpBtn.addEventListener("click", function() {
        socket.emit('chat message', {
            userId: userId,
            message: 'help'
        });
    });
    
    // Suggestion chips
    suggestionChips.forEach(chip => {
        chip.addEventListener('click', function() {
            const text = this.getAttribute('data-text');
            inputEl.value = text;
            handleSend();
        });
    });
    
    // Initialize connection status
    updateConnectionStatus(socket.connected);
    
    // Add some initial interactivity
    setTimeout(() => {
        const avatar = document.querySelector('.avatar-icon');
        if (avatar) {
            avatar.addEventListener('click', () => {
                socket.emit('chat message', {
                    userId: userId,
                    message: 'Tell me about yourself'
                });
            });
        }
    }, 1000);
});
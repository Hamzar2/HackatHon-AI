const API_URL = 'http://localhost:5000';
let chatHistory = [];

export function initChat() {
    const sendButton = document.getElementById('send-message');
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const fileUpload = document.getElementById('file-upload');

    // Check backend health on initialization
    checkBackendHealth();

    sendButton.addEventListener('click', handleMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleMessage();
        }
    });

    async function checkBackendHealth() {
        try {
            const response = await fetch(`${API_URL}/health`);
            if (!response.ok) {
                appendMessage('system', 'Warning: AI service is currently unavailable. Please try again later.');
            }
        } catch (error) {
            appendMessage('system', 'Warning: Unable to connect to AI service. Please ensure the backend server is running.');
        }
    }

    async function handleMessage() {
        const message = userInput.value.trim();
        const files = fileUpload.files;
    
        if (message || files.length > 0) {
            const userMessage = {
                role: 'user',
                content: message,
            };
    
            appendMessage('user', message);
            chatHistory.push(userMessage);
    
            if (files.length > 0) {
                const fileInfo = `[Attached file: ${files[0].name}]`;
                appendMessage('user', fileInfo);
                userMessage.content += ` ${fileInfo}`;
            }
    
            // Clear inputs
            userInput.value = '';
            fileUpload.value = '';
    
            // Show loading indicator
            const loadingMessage = appendMessage('system', 'Processing your request...');
    
            try {
                const response = await fetch(`${API_URL}/chat`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        messages: chatHistory,
                    }),
                });
    
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Network response was not ok');
                }
    
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let assistantMessage = '';
                let messageDiv = appendMessage('assistant', ''); // Placeholder for streamed response
    
                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value, { stream: true });
                    assistantMessage += chunk;
    
                    // Render Markdown and update the content
                    const renderedMarkdown = marked.parse(assistantMessage); // Markdown parsing
                    messageDiv.querySelector('p').innerHTML = renderedMarkdown;
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }
    
                // Save the final response to chat history
                chatHistory.push({ role: 'assistant', content: assistantMessage });
                loadingMessage.remove();
            } catch (error) {
                console.error('Error:', error);
                loadingMessage.remove();
                appendMessage('system', `Error: ${error.message || 'Unable to process your request.'}`);
            }
        }
    }
    
    

    function appendMessage(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        
        let displayName = role === 'user' ? 'You' : 
                         role === 'assistant' ? 'AI Assistant' : 
                         'System';
        
        messageDiv.innerHTML = `
            <div class="message-content">
                <strong>${displayName}:</strong>
                <p>${content}</p>
            </div>
        `;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return messageDiv;
    }
}
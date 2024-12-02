import { jsPDF } from "jspdf";

const API_URL = "https://hackaton-flask-server-1.onrender.com";


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
            // Disable send button and user input
            sendButton.disabled = true;
            userInput.disabled = true;

            appendMessage('user', message);

            let classificationMessage = null;

            if (files.length > 0) {
                const imageFile = files[0];
                appendImage(imageFile);

                // Wait for the classification result
                classificationMessage = await handleFileUpload(imageFile);
            }

            // Add user message to chatHistory
            chatHistory.push({ role: 'user', content: message });

            // Combine user message with classification result for the current query
            const currentQuery = [];
            if (classificationMessage) {
                currentQuery.push({ role: 'system', content: classificationMessage });
            }
            if (message) {
                currentQuery.push({ role: 'user', content: message });
            }

            console.log('Current query sent to backend:', currentQuery);
            console.log('Full chat history:', chatHistory);

            userInput.value = '';
            fileUpload.value = '';

            const loadingMessage = appendMessage('system', 'Processing your request...');

            try {
                const response = await fetch(`${API_URL}/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chatHistory, // Send full conversation history
                        messages: currentQuery, // Send the current query separately
                    }),
                });

                if (!response.ok) throw new Error('Network response was not ok');

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let assistantMessage = '';
                let messageDiv = appendMessage('assistant', '');

                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value, { stream: true });
                    assistantMessage += chunk;

                    const renderedMarkdown = marked.parse(assistantMessage);
                    messageDiv.querySelector('p').innerHTML = renderedMarkdown;
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }

                // Add assistant's message to chatHistory
                chatHistory.push({ role: 'assistant', content: assistantMessage });
                loadingMessage.remove();

                // Re-enable send button and user input
                sendButton.disabled = false;
                userInput.disabled = false;
            } catch (error) {
                console.error('Error:', error);
                loadingMessage.remove();
                appendMessage('system', `Error: ${error.message || 'Unable to process your request.'}`);

                // Re-enable send button and user input in case of an error
                sendButton.disabled = false;
                userInput.disabled = false;
            }
        }
    }

    async function handleFileUpload(file) {
        const classificationResult = await classifyImage(file);
        if (classificationResult) {
            const classificationMessage = `Image Classification: ${classificationResult.label} (Score: ${classificationResult.score})`;

            // Append classification result to chat interface
            const lastUserMessage = chatMessages.querySelectorAll('.message.user');
            const appendedFileMessage = lastUserMessage[lastUserMessage.length - 1];

            if (appendedFileMessage) {
                appendedFileMessage.querySelector('.message-content').innerHTML += `
                    <p>${classificationMessage}</p>
                `;
            } else {
                appendMessage('system', classificationMessage);
            }

            // Return classification result for inclusion in the current query
            return classificationMessage;
        }
        return null;
    }

    async function classifyImage(image) {
        try {
            const formData = new FormData();
            formData.append('image', image);

            const response = await fetch(`${API_URL}/classify-image`, {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                const result = await response.json();
                return { label: result.label, score: result.score };
            } else {
                throw new Error('Image classification failed');
            }
        } catch (error) {
            console.error('Error classifying image:', error);
            return null;
        }
    }

    function appendMessage(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;

        let displayName = role === 'user' ? 'User' :
                         role === 'assistant' ? 'MediBot:' :
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

    function appendImage(file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message user';

            const displayName = 'User';
            messageDiv.innerHTML = `
                <div class="message-content">
                    <strong>${displayName}:</strong>
                    <p><img src="${event.target.result}" alt="${file.name}" class="uploaded-image"></p>
                </div>
            `;

            chatMessages.appendChild(messageDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        };
        reader.readAsDataURL(file);
    }

    // Toggle button to show the notification
    document.getElementById('toggle-instructions').addEventListener('click', () => {
        const overlay = document.getElementById('overlay');
        const isVisible = overlay.style.display === 'block';
        overlay.style.display = isVisible ? 'none' : 'block';
        document.getElementById('toggle-instructions').textContent = isVisible ? 'Show Instructions' : 'Hide Instructions';
    });

    // Close button inside the notification
    document.getElementById('close-instructions').addEventListener('click', () => {
        const overlay = document.getElementById('overlay');
        overlay.style.display = 'none';
        document.getElementById('toggle-instructions').textContent = 'Show Instructions';
    });

    document.getElementById('download-pdf').addEventListener('click', () => {
        const doc = new jsPDF();
        let y = 10; // Initial y position for text

        chatHistory.forEach(entry => {
            doc.text(10, y, `${entry.role}: ${entry.content}`);
            y += 10; // Move text down for each entry
        });

        doc.save('chat-history.pdf');
    });
    // Function to set a static assistant message
    function setStaticAssistantMessage() {
        const messageContent = "Hi! I'm MediBot an AI Assistant tasked to help healthcare professionals make informed decisions. Do you have a medical question, case you'd like to discuss, or a project you need help with? Let me know and I'll do my best to provide you with accurate and informative responses.";

        const messageDiv = document.createElement('div');
        messageDiv.className = 'message assistant';

        messageDiv.innerHTML = `
            <div class="message-content">
                <strong>MediBot:</strong>
                <p>${messageContent}</p>
            </div>
        `;

        const chatMessages = document.getElementById('chat-messages');
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Call the function to set the static message
    setStaticAssistantMessage();


    
}

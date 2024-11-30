from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from huggingface_hub import InferenceClient
import json
import logging
import time
from transformers import pipeline
from PIL import Image

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
logging.basicConfig(level=logging.INFO)

client = InferenceClient(api_key="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")

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"}), 200

@app.route('/chat', methods=['POST'])
def chat():
    try:
        # Validate the request
        if not request.is_json:
            return jsonify({"error": "Content-Type must be application/json"}), 400

        data = request.get_json()
        if 'messages' not in data or 'chatHistory' not in data:
            return jsonify({"error": "Missing 'messages' or 'chatHistory' in request body"}), 400

        # Extract chat history and current query
        chat_history = data['chathistory']
        current_query = data['messages']

        logging.info("Received Current Query:")
        logging.info(json.dumps(current_query, indent=2))

        logging.info("Received Chat History:")
        logging.info(json.dumps(chat_history, indent=2))

        # Check if the current query contains classification results
        classification_message = None
        for msg in current_query:
            if 'Image Classification:' in msg['content']:
                classification_message = msg['content']
                break

        # Add classification-based system message if it exists
        if classification_message:
            medical_report_prompt = {
                "role": "system",
                "content": (
                    f"Please create a detailed medical report based on the following image classification result:\n\n"
                    f"{classification_message}\n\n"
                    f"Medical Report:"
                )
            }
            current_query.append(medical_report_prompt)

        # Combine chat history and current query
        combined_prompt = chat_history + current_query

        logging.info("Combined Prompt Sent to Model:")
        logging.info(json.dumps(combined_prompt, indent=2))

        # Generate response from the model
        def generate_response():
            stream = client.chat.completions.create(
                model="meta-llama/Meta-Llama-3-8B-Instruct",
                messages=combined_prompt,
                max_tokens=5000,
                stream=True
            )
            for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content

        return Response(generate_response(), content_type='text/plain')

    except Exception as e:
        logging.error(f"Server error: {str(e)}")
        return jsonify({"error": str(e)}), 500



# Load image classification model
classifier = pipeline("image-classification", model="Devarshi/Brain_Tumor_Classification")

@app.route('/classify-image', methods=['POST'])
def classify_image():
    if 'image' not in request.files:
        return jsonify({"error": "No image file provided"}), 400

    image_file = request.files['image']
    try:
        image = Image.open(image_file)
        results = classifier(image)
        label = results[0]['label']
        score = results[0]['score']
        return jsonify({"label": label, "score": score}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)

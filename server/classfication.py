import time
from transformers import pipeline
from PIL import Image

# Start timing
start = time.time()
print(start)
# Load the pipeline with the model
pipe = pipeline("image-classification", model="Devarshi/Brain_Tumor_Classification")

# Load an image from a file
image_path = r"C:\Users\DR2\Desktop\IASD\S3\DL&Tlearning\devoir\Image-100.png"  # Replace with your image path
image = Image.open(image_path)
print(1)
# Classify the image
results = pipe(image)
print(2)
# Display results
for result in results:
    print(f"Label: {result['label']}, Score: {result['score']}")

# End timing
end = time.time()

# Print the time taken for classification
print(f"Time taken: {end - start:.2f} seconds")
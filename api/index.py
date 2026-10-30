
import os
import json
import requests
import numpy as np
import tensorflow as tf

from flask import Flask, request, jsonify
from PIL import Image
from io import BytesIO

app = Flask(__name__)

MODEL_ID = "1YAnbSGpMg2Zf2BvT5H6slYAOfaYQFouT"
CLASS_ID = "1f-BOjvKX4rW_9C4roRCigNT8XAOwA5Kf"

MODEL_PATH = "/tmp/plant_disease_model.keras"
CLASS_PATH = "/tmp/class_name.json"

def download_drive_file(file_id, destination):
    url = "https://drive.google.com/uc"
    response = requests.get(
        url,
        params={"export": "download", "id": file_id},
        timeout=180
    )
    response.raise_for_status()

    if "text/html" in response.headers.get("Content-Type", ""):
        raise RuntimeError("Google Drive returned a confirmation page.")

    with open(destination, "wb") as f:
        f.write(response.content)

def load_resources():
    if not os.path.exists(MODEL_PATH):
        download_drive_file(MODEL_ID, MODEL_PATH)

    if not os.path.exists(CLASS_PATH):
        download_drive_file(CLASS_ID, CLASS_PATH)

    model = tf.keras.models.load_model(
        MODEL_PATH,
        compile=False
    )

    with open(CLASS_PATH, "r") as f:
        classes = json.load(f)

    if model.output_shape[-1] != len(classes):
        raise ValueError("Model and class labels do not match.")

    return model, classes

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "API is running"})

@app.route("/api/predict", methods=["POST"])
def predict():
    try:
        if "file" not in request.files:
            return jsonify({"error": "Please upload an image"}), 400

        model, classes = load_resources()

        img = Image.open(
            BytesIO(request.files["file"].read())
        ).convert("RGB")

        img = img.resize((128, 128))

        arr = np.array(img, dtype=np.float32)
        arr = np.expand_dims(arr / 255.0, axis=0)

        predictions = model.predict(arr, verbose=0)[0]
        index = int(np.argmax(predictions))

        return jsonify({
            "prediction": classes[index],
            "confidence": round(float(predictions[index]) * 100, 2)
        })

    except Exception as e:
        app.logger.exception("Prediction failed")
        return jsonify({"error": str(e)}), 500

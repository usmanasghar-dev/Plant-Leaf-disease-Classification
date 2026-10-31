
import streamlit as st
import tensorflow as tf
import numpy as np
from PIL import Image
import json
import os
import zipfile
import gdown

st.set_page_config(
    page_title="PlantCare AI",
    page_icon="🌿",
    layout="centered"
)

st.title("🌿 PlantCare AI")
st.subheader("Tomato Leaf Disease Classification")
st.write("Upload a tomato leaf image to detect its condition.")

MODEL_ZIP_ID = "1PVYSQ2ebVoYGqb26Aic1-birk9JD50gI"
ZIP_PATH = "model_files.zip"
EXTRACT_PATH = "model_files"

@st.cache_resource
def load_model():
    if not os.path.exists(ZIP_PATH):
        url = f"https://drive.google.com/uc?id={MODEL_ZIP_ID}"
        gdown.download(url, ZIP_PATH, quiet=False)

    if not os.path.exists(EXTRACT_PATH):
        os.makedirs(EXTRACT_PATH, exist_ok=True)

    with zipfile.ZipFile(ZIP_PATH, "r") as zip_ref:
        zip_ref.extractall(EXTRACT_PATH)

    model_path = None
    class_path = None

    for root, dirs, files in os.walk(EXTRACT_PATH):
        for file in files:
            if file.endswith(".keras"):
                model_path = os.path.join(root, file)
            elif file.endswith(".json"):
                class_path = os.path.join(root, file)

    if not model_path or not class_path:
        raise FileNotFoundError(
            "Model or class_name JSON file not found in ZIP."
        )

    model = tf.keras.models.load_model(model_path, compile=False)

    with open(class_path, "r") as f:
        classes = json.load(f)

    if isinstance(classes, dict):
        classes = list(classes.values())

    return model, classes


uploaded_file = st.file_uploader(
    "Choose a tomato leaf image",
    type=["jpg", "jpeg", "png"]
)

if uploaded_file is not None:
    image = Image.open(uploaded_file).convert("RGB")
    st.image(image, caption="Uploaded Leaf", use_container_width=True)

    if st.button("Predict Disease"):
        try:
            with st.spinner("Analyzing leaf image..."):
                model, classes = load_model()

                image = image.resize((128, 128))
                image_array = np.array(image, dtype=np.float32)
                image_array = np.expand_dims(
                    image_array / 255.0, axis=0
                )

                predictions = model.predict(image_array, verbose=0)[0]
                index = int(np.argmax(predictions))

                result = classes[index]
                confidence = float(predictions[index]) * 100

            labels = {
                "Tomato___Early_blight": "Tomato Early Blight",
                "Tomato___Late_blight": "Tomato Late Blight",
                "Tomato___healthy": "Healthy Tomato Leaf"
            }

            st.success("Prediction Completed!")
            st.subheader(labels.get(result, result))
            st.metric("Confidence", f"{confidence:.2f}%")

        except Exception as e:
            st.error(f"Prediction Error: {e}")

st.markdown("---")
st.caption("Powered by a Custom Convolutional Neural Network (CNN)")

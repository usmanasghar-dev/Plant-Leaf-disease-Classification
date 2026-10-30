const input = document.getElementById("file");
const choose = document.getElementById("choose");
const chooseArea = document.getElementById("chooseArea");
const previewArea = document.getElementById("previewArea");
const preview = document.getElementById("preview");
const filename = document.getElementById("filename");

const predict = document.getElementById("predict");
const remove = document.getElementById("remove");
const resultArea = document.getElementById("resultArea");
const loadingArea = document.getElementById("loadingArea");
const disease = document.getElementById("disease");
const confidence = document.getElementById("confidence");
const errorMessage = document.getElementById("errorMessage");
const tryAgain = document.getElementById("tryAgain");

// ---------- Model (runs fully in the browser with TensorFlow.js) ----------
const MODEL_BASE = "web_model/";
const IMG_SIZE = 128;
let modelPromise = null;
let classNames = [];

function buildModel() {
    return tf.sequential({
        layers: [
            tf.layers.conv2d({
                inputShape: [IMG_SIZE, IMG_SIZE, 3],
                filters: 32,
                kernelSize: 3,
                activation: "relu"
            }),
            tf.layers.maxPooling2d({ poolSize: 2, strides: 2 }),
            tf.layers.conv2d({ filters: 64, kernelSize: 3, activation: "relu" }),
            tf.layers.maxPooling2d({ poolSize: 2, strides: 2 }),
            tf.layers.conv2d({ filters: 128, kernelSize: 3, activation: "relu" }),
            tf.layers.maxPooling2d({ poolSize: 2, strides: 2 }),
            tf.layers.flatten(),
            tf.layers.dense({ units: 128, activation: "relu" }),
            tf.layers.dropout({ rate: 0.5 }),
            tf.layers.dense({ units: 3, activation: "softmax" })
        ]
    });
}

async function fetchOk(url) {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error("Could not load " + url);
    }
    return res;
}

function loadModel() {
    if (modelPromise) return modelPromise;

    modelPromise = (async () => {
        if (typeof tf === "undefined") {
            throw new Error("TensorFlow.js failed to load. Check your internet connection.");
        }

        const [manifest, names, buffer] = await Promise.all([
            fetchOk(MODEL_BASE + "manifest.json").then(r => r.json()),
            fetchOk(MODEL_BASE + "class_names.json").then(r => r.json()),
            fetchOk(MODEL_BASE + "weights.bin").then(r => r.arrayBuffer())
        ]);

        classNames = names;

        const model = buildModel();
        const all = new Float32Array(buffer);
        let offset = 0;

        const weights = manifest.shapes.map(shape => {
            const size = shape.reduce((a, b) => a * b, 1);
            const t = tf.tensor(all.slice(offset, offset + size), shape);
            offset += size;
            return t;
        });

        model.setWeights(weights);
        return model;
    })();

    // allow a retry if loading failed
    modelPromise.catch(() => { modelPromise = null; });
    return modelPromise;
}

function prettyLabel(name) {
    const clean = name.replace(/^Tomato_+/, "").replace(/_+/g, " ").trim();
    return "Tomato " + clean.charAt(0).toUpperCase() + clean.slice(1);
}

async function classify(imgElement) {
    const model = await loadModel();

    const output = tf.tidy(() => {
        const x = tf.browser
            .fromPixels(imgElement, 3)
            .resizeBilinear([IMG_SIZE, IMG_SIZE])
            .toFloat()
            .div(255)
            .expandDims(0);
        return model.predict(x);
    });

    const probs = Array.from(await output.data());
    output.dispose();

    let best = 0;
    for (let i = 1; i < probs.length; i++) {
        if (probs[i] > probs[best]) best = i;
    }

    return {
        label: prettyLabel(classNames[best] || "Class " + best),
        confidence: (probs[best] * 100).toFixed(2)
    };
}

// Start downloading the model in the background (ignore errors here)
window.addEventListener("load", () => {
    loadModel().catch(() => {});
});

// ---------- UI ----------
choose.addEventListener("click", () => input.click());

input.addEventListener("change", () => {
    const file = input.files && input.files[0];

    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        alert("Please choose a JPG, PNG or WEBP image.");
        input.value = "";
        return;
    }

    if (file.size > 10 * 1024 * 1024) {
        alert("Image size must be less than 10 MB.");
        input.value = "";
        return;
    }

    preview.src = URL.createObjectURL(file);
    filename.textContent = file.name;

    chooseArea.hidden = true;
    previewArea.hidden = false;
    resultArea.hidden = true;
    errorMessage.hidden = true;
});

predict.addEventListener("click", async () => {
    const file = input.files && input.files[0];

    if (!file) return;

    loadingArea.hidden = false;
    previewArea.hidden = true;
    resultArea.hidden = true;
    errorMessage.hidden = true;

    predict.disabled = true;

    try {
        try {
            await preview.decode();
        } catch (e) {
            // image already loaded or decode not supported; continue
        }

        const result = await classify(preview);

        disease.textContent = "Disease: " + result.label;
        confidence.textContent = "Confidence: " + result.confidence + "%";

        loadingArea.hidden = true;
        resultArea.hidden = false;

    } catch (error) {
        loadingArea.hidden = true;
        previewArea.hidden = false;
        errorMessage.textContent = error.message || "Prediction failed.";
        errorMessage.hidden = false;

    } finally {
        predict.disabled = false;
    }
});

function resetDemo() {
    if (preview.src.startsWith("blob:")) {
        URL.revokeObjectURL(preview.src);
    }

    input.value = "";
    preview.src = "";
    filename.textContent = "";

    previewArea.hidden = true;
    resultArea.hidden = true;
    loadingArea.hidden = true;
    errorMessage.hidden = true;
    chooseArea.hidden = false;
}

remove.addEventListener("click", resetDemo);
tryAgain.addEventListener("click", resetDemo);

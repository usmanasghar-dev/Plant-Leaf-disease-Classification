
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

// IMPORTANT: Add your working prediction API URL here.
const API_URL = "YOUR_API_URL/api/predict";

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
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(API_URL, {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Prediction failed.");
        }

        disease.textContent = "Disease: " + data.prediction;
        confidence.textContent =
            "Confidence: " + data.confidence + "%";

        loadingArea.hidden = true;
        resultArea.hidden = false;

    } catch (error) {
        loadingArea.hidden = true;
        previewArea.hidden = false;
        errorMessage.textContent = error.message;
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

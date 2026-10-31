
const input = document.getElementById("file");
const choose = document.getElementById("choose");
const chooseArea = document.getElementById("chooseArea");
const previewArea = document.getElementById("previewArea");
const preview = document.getElementById("preview");
const filename = document.getElementById("filename");

const predictBtn = document.getElementById("predict");
const removeBtn = document.getElementById("remove");
const resultArea = document.getElementById("resultArea");
const loadingArea = document.getElementById("loadingArea");
const errorArea = document.getElementById("errorArea");

const predictionText = document.getElementById("prediction");
const confidenceText = document.getElementById("confidence");
const errorMessage = document.getElementById("errorMessage");

let selectedFile = null;
let imageURL = null;

choose.addEventListener("click", () => {
  input.click();
});

input.addEventListener("change", () => {
  const file = input.files && input.files[0];

  if (!file) return;

  if (!file.type.startsWith("image/")) {
    alert("Please choose a valid image file.");
    input.value = "";
    return;
  }

  selectedFile = file;

  if (imageURL) URL.revokeObjectURL(imageURL);

  imageURL = URL.createObjectURL(file);
  preview.src = imageURL;
  filename.textContent = file.name;

  chooseArea.hidden = true;
  previewArea.hidden = false;
  resultArea.hidden = true;
  errorArea.hidden = true;
  loadingArea.hidden = true;
});

predictBtn.addEventListener("click", async () => {
  if (!selectedFile) {
    alert("Please select an image first.");
    return;
  }

  const formData = new FormData();
  formData.append("file", selectedFile);

  previewArea.hidden = true;
  resultArea.hidden = true;
  errorArea.hidden = true;
  loadingArea.hidden = false;

  predictBtn.disabled = true;

  try {
    const response = await fetch("/api/predict", {
      method: "POST",
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Prediction failed.");
    }

    const classNames = {
      "Tomato___Early_blight": "Tomato Early Blight",
      "Tomato___Late_blight": "Tomato Late Blight",
      "Tomato___healthy": "Healthy Tomato Leaf"
    };

    predictionText.textContent =
      classNames[data.prediction] || data.prediction;

    confidenceText.textContent =
      `${data.confidence}%`;

    loadingArea.hidden = true;
    resultArea.hidden = false;

  } catch (error) {
    loadingArea.hidden = true;
    errorArea.hidden = false;
    errorMessage.textContent = error.message;

  } finally {
    predictBtn.disabled = false;
  }
});

removeBtn.addEventListener("click", resetDemo);

document.getElementById("tryAgain").addEventListener("click", resetDemo);

document.getElementById("retry").addEventListener("click", () => {
  errorArea.hidden = true;
  previewArea.hidden = false;
});

function resetDemo() {
  if (imageURL) {
    URL.revokeObjectURL(imageURL);
    imageURL = null;
  }

  input.value = "";
  selectedFile = null;
  preview.src = "";
  filename.textContent = "";

  previewArea.hidden = true;
  resultArea.hidden = true;
  loadingArea.hidden = true;
  errorArea.hidden = true;
  chooseArea.hidden = false;
}

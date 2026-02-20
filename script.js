/**
 * script.js – Voxify: Speak & Translate
 *
 * Features:
 *  - Populate voice list from the Web Speech API
 *  - Speak entered text directly (Speak button)
 *  - Translate text via MyMemory API, then speak it (Translate & Speak button)
 *  - Stop ongoing speech (Stop button)
 *  - Validate empty input and surface errors to the user
 */

/* ── DOM references ─────────────────────────────────── */
const textInput      = document.getElementById("text-input");
const languageSelect = document.getElementById("language-select");
const voiceSelect    = document.getElementById("voice-select");
const rateInput      = document.getElementById("rate-input");
const pitchInput     = document.getElementById("pitch-input");
const rateValue      = document.getElementById("rate-value");
const pitchValue     = document.getElementById("pitch-value");
const speakBtn       = document.getElementById("speak-btn");
const translateBtn   = document.getElementById("translate-btn");
const stopBtn        = document.getElementById("stop-btn");
const errorMsg       = document.getElementById("error-msg");
const statusBox      = document.getElementById("status-box");

/* ── Voice list ─────────────────────────────────────── */
let voices = [];

/**
 * Populates the voice <select> with available system voices.
 * Called both immediately and when the voiceschanged event fires
 * (needed for Chrome, which loads voices asynchronously).
 */
function populateVoices() {
  voices = window.speechSynthesis.getVoices();
  // Keep first placeholder option, rebuild the rest
  voiceSelect.innerHTML = '<option value="">— Default voice —</option>';
  voices.forEach((voice, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = `${voice.name} (${voice.lang})`;
    voiceSelect.appendChild(option);
  });
}

populateVoices();
if (window.speechSynthesis.onvoiceschanged !== undefined) {
  window.speechSynthesis.onvoiceschanged = populateVoices;
}

/* ── Slider live-update labels ──────────────────────── */
rateInput.addEventListener("input", () => {
  rateValue.textContent = rateInput.value;
});

pitchInput.addEventListener("input", () => {
  pitchValue.textContent = pitchInput.value;
});

/* ── Helpers ─────────────────────────────────────────── */

/** Show a validation error beneath the textarea. */
function showError(message) {
  errorMsg.textContent = message;
}

/** Clear the validation error. */
function clearError() {
  errorMsg.textContent = "";
}

/**
 * Update the status box at the bottom of the card.
 * @param {string} message - Text to display.
 * @param {"info"|"success"|"error"|""} type - Visual style.
 */
function setStatus(message, type = "") {
  statusBox.textContent = message;
  statusBox.className = "status-box" + (type ? ` ${type}` : "");
}

/**
 * Build and dispatch a SpeechSynthesisUtterance.
 * @param {string} text  - Text to speak.
 * @param {string} [lang] - Optional BCP-47 language tag.
 */
function speak(text, lang) {
  // Cancel any ongoing speech first
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);

  // Apply selected voice (if any)
  const selectedVoiceIndex = voiceSelect.value;
  if (selectedVoiceIndex !== "" && voices[Number(selectedVoiceIndex)]) {
    utterance.voice = voices[Number(selectedVoiceIndex)];
  }

  // Apply rate and pitch
  utterance.rate  = parseFloat(rateInput.value);
  utterance.pitch = parseFloat(pitchInput.value);

  // Apply language tag when provided
  if (lang) {
    utterance.lang = lang;
  }

  utterance.onstart = () => setButtons(true);
  utterance.onend   = () => setButtons(false);
  utterance.onerror = (e) => {
    setButtons(false);
    setStatus(`Speech error: ${e.error}`, "error");
  };

  window.speechSynthesis.speak(utterance);
}

/**
 * Toggle the disabled state of interactive controls while speech is active.
 * @param {boolean} isSpeaking
 */
function setButtons(isSpeaking) {
  speakBtn.disabled     = isSpeaking;
  translateBtn.disabled = isSpeaking;
  stopBtn.disabled      = !isSpeaking;
}

/* ── Translation via MyMemory API ───────────────────── */

/** Allowed language codes – must match the <option> values in index.html. */
const ALLOWED_LANGS = new Set([
  "en", "es", "fr", "de", "it", "pt", "zh", "ja", "ko", "ar", "hi", "ru",
]);

/**
 * Translates text using the free MyMemory API (no API key required).
 * @param {string} text       - Source text (assumed English).
 * @param {string} targetLang - BCP-47 language code for the target language.
 * @returns {Promise<string>} - Translated text.
 */
async function translateText(text, targetLang) {
  // Validate against whitelist to prevent injection via unexpected lang values
  if (!ALLOWED_LANGS.has(targetLang)) {
    throw new Error(`Unsupported language code: "${targetLang}"`);
  }

  // MyMemory accepts a langpair of the form "sourceLang|targetLang"
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Translation request failed (HTTP ${response.status})`);
  }

  const data = await response.json();

  // responseStatus 200 means success
  if (data.responseStatus !== 200) {
    throw new Error(
      `Translation service returned an error (status ${data.responseStatus})` +
      (data.responseDetails ? `: ${data.responseDetails}` : "")
    );
  }

  return data.responseData.translatedText;
}

/* ── Event listeners ─────────────────────────────────── */

// "Speak" button – speak the raw input text
speakBtn.addEventListener("click", () => {
  const text = textInput.value.trim();
  if (!text) {
    showError("Please enter some text before speaking.");
    return;
  }
  clearError();
  setStatus("Speaking…", "info");
  speak(text);
});

// "Translate & Speak" button – translate then speak
translateBtn.addEventListener("click", async () => {
  const text       = textInput.value.trim();
  const targetLang = languageSelect.value;

  if (!text) {
    showError("Please enter some text before translating.");
    return;
  }
  clearError();

  // Skip translation when target is English (already in English)
  if (targetLang === "en") {
    setStatus("Speaking in English (no translation needed)…", "info");
    speak(text, "en");
    return;
  }

  setStatus("Translating…", "info");
  translateBtn.disabled = true;
  speakBtn.disabled     = true;

  try {
    const translated = await translateText(text, targetLang);
    setStatus(`Translated: "${translated}"`, "success");
    speak(translated, targetLang);
  } catch (err) {
    setStatus(`Translation error: ${err.message}`, "error");
    translateBtn.disabled = false;
    speakBtn.disabled     = false;
  }
});

// "Stop" button – cancel current speech
stopBtn.addEventListener("click", () => {
  window.speechSynthesis.cancel();
  setStatus("Stopped.", "");
  setButtons(false);
});

// Initialise stop button state
stopBtn.disabled = true;

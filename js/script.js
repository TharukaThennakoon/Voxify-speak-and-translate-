let speech = new SpeechSynthesisUtterance();
let voices = [];

// Elements
const textInput = document.getElementById("textinput");
const speakBtn = document.getElementById("speakBtn");
const stopBtn = document.getElementById("stopBtn");
const resumeBtn = document.getElementById("resumeBtn");
const voiceSelect = document.getElementById("voiceSelect");

// Load voices
window.speechSynthesis.onvoiceschanged = () => {
    voices = window.speechSynthesis.getVoices();

    voiceSelect.innerHTML = "";

    voices.forEach((voice, i) => {
        voiceSelect.options[i] = new Option(
            voice.name + " (" + voice.lang + ")", i
        );
    });

    if (voices.length > 0) {
        speech.voice = voices[0];
    }
};
// Change voice
voiceSelect.addEventListener("change", () => {
    speech.voice = voices[voiceSelect.value];
});

// Speak
speakBtn.addEventListener("click", () => {

    let text = textInput.value.trim();

    if (text === "") {
        alert("Please enter text!");
        return;
    }

    speech.text = text;

    // Cancel previous speech
    window.speechSynthesis.cancel();

    // Speak
    window.speechSynthesis.speak(speech);
});
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
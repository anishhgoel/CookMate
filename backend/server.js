const express = require("express");
const app = express();
const port = 3000;
const record = require('node-record-lpcm16'); // Ensure node-record-lpcm16 is installed
require('dotenv').config();

const speech = require('@google-cloud/speech');
const client = new speech.SpeechClient({
    keyFilename: process.env.GOOGLE_CLOUD_KEY  // Use the environment variable
  });
  

const recepieSteps = [
    "Step 1 : Preheat oven to 350 degrees F (175 degrees C).",
    "Step 2 : Mix the flour and sugar in a bowl",
    "Step 3 : Add eggs and stir until smooth",
    "Step 4 : Bake for 25 minutes"
];

let currentStep = 0;

app.get('/', (req, res) => {
    if (currentStep < recepieSteps.length) {
        res.json(recepieSteps[currentStep]);
        currentStep++;
    } else {
        res.json("End of recipe");
    }
});

app.get("/reset", (req, res) => {
    currentStep = 0;
    res.json({ message: "Steps reset, Start from beginning" });
});

app.post('/recognize-speech', (req, res) => {
    const transcriptionResults = [];

    const request = {
        config: {
            encoding: 'LINEAR16',
            sampleRateHertz: 16000,
            languageCode: 'en-US',
        },
        interimResults: false, // If you want intermediate results
    };

    const recognizeStream = client
        .streamingRecognize(request)
        .on('data', data => {
            const transcript = data.results[0].alternatives[0].transcript;
            transcriptionResults.push(transcript); // Collect results
            console.log(`Transcription: ${transcript}`);
        })
        .on('error', error => {
            console.error(error);
            res.status(500).send("Error during transcription");
        })
        .on('end', () => {
            console.log('Transcription ended.');
            // Send the collected transcription data as a response only once
            res.json({ transcription: transcriptionResults.join(' ') });
        });

    // Start recording and pipe the audio to the Speech API
    record
        .record({
            sampleRateHertz: 16000,
            threshold: 0.5,
            verbose: false,
            recordProgram: 'rec',  // Use 'rec' for macOS and 'arecord' for Linux
            silence: '10.0',       // Automatically stop after 10 seconds of silence
        })
        .stream()
        .pipe(recognizeStream);  // Pipe the audio stream directly to Google Speech API
});

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});
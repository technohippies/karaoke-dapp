#!/bin/bash

# Convert MP3 test audio to WebM format for testing
# This ensures we test the same audio format that the browser produces

MP3_FILE="/media/t42/th42/Code/karaoke-turbo/test-data/speech-audio/hi_nice_to_meet_you_whats_up.mp3"
WEBM_FILE="/media/t42/th42/Code/karaoke-turbo/test-data/speech-audio/hi_nice_to_meet_you_whats_up.webm"

echo "Converting MP3 to WebM for testing..."
echo "Input:  $MP3_FILE"
echo "Output: $WEBM_FILE"

# Convert MP3 to WebM using Opus codec (same as browser MediaRecorder)
ffmpeg -i "$MP3_FILE" -c:a libopus -b:a 64k "$WEBM_FILE" -y

if [ $? -eq 0 ]; then
    echo "✅ Conversion successful!"
    echo "File sizes:"
    ls -lh "$MP3_FILE" "$WEBM_FILE"
else
    echo "❌ Conversion failed!"
    exit 1
fi
/**
 * Creates a mock MIDI file with actual notes for testing
 * This generates a simple C major scale pattern
 */
export function createMockMidiData(): Uint8Array {
  // MIDI file structure:
  // Header chunk + Track chunk
  
  // Helper to convert number to variable length quantity (used in MIDI)
  const toVLQ = (value: number): number[] => {
    if (value < 128) return [value];
    
    const result: number[] = [];
    let temp = value;
    
    while (temp > 0) {
      result.unshift(temp & 0x7F);
      temp >>= 7;
    }
    
    for (let i = 0; i < result.length - 1; i++) {
      result[i] |= 0x80;
    }
    
    return result;
  };
  
  // Create track data with actual notes
  const trackData: number[] = [];
  
  // Track name
  trackData.push(0x00, 0xFF, 0x03, 0x05, 0x50, 0x69, 0x61, 0x6E, 0x6F); // Meta event: Track name "Piano"
  
  // Tempo (120 BPM)
  trackData.push(0x00, 0xFF, 0x51, 0x03, 0x07, 0xA1, 0x20); // 500000 microseconds per quarter note
  
  // Time signature (4/4)
  trackData.push(0x00, 0xFF, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08);
  
  // Program change to piano (program 0)
  trackData.push(0x00, 0xC0, 0x00);
  
  // Generate a simple melody (C major scale up and down)
  const notes = [60, 62, 64, 65, 67, 69, 71, 72, 71, 69, 67, 65, 64, 62, 60]; // C D E F G A B C B A G F E D C
  const velocity = 80;
  const noteDuration = 96; // Quarter note in ticks
  
  notes.forEach((note, index) => {
    // Note on
    if (index === 0) {
      trackData.push(0x00); // No delta time for first note
    } else {
      trackData.push(...toVLQ(noteDuration)); // Delta time since last event
    }
    trackData.push(0x90, note, velocity); // Note on, channel 0
    
    // Note off
    trackData.push(...toVLQ(noteDuration)); // Duration of note
    trackData.push(0x80, note, 0); // Note off, channel 0
  });
  
  // End of track
  trackData.push(0x00, 0xFF, 0x2F, 0x00);
  
  // Calculate track length
  const trackLength = trackData.length;
  
  // Create complete MIDI file
  const midiFile: number[] = [
    // Header chunk
    0x4D, 0x54, 0x68, 0x64, // "MThd"
    0x00, 0x00, 0x00, 0x06, // Header length (6 bytes)
    0x00, 0x00,             // Format type 0 (single track)
    0x00, 0x01,             // Number of tracks (1)
    0x00, 0x60,             // Division (96 ticks per quarter note)
    
    // Track chunk
    0x4D, 0x54, 0x72, 0x6B, // "MTrk"
    (trackLength >> 24) & 0xFF, // Track length (big-endian)
    (trackLength >> 16) & 0xFF,
    (trackLength >> 8) & 0xFF,
    trackLength & 0xFF,
    ...trackData
  ];
  
  return new Uint8Array(midiFile);
}
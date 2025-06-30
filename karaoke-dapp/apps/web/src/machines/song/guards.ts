export const songGuards = {
  hasAccess: ({ event }: any) => {
    return event.output?.hasAccess === true && event.output?.tokenId;
  },

  canUnlock: ({ event }: any) => {
    return event.output?.canUnlock === true && event.output?.credits > 0;
  },
  
  hasCachedMidi: ({ event }: any) => {
    // Only check for midiData - audioUrl might be empty string
    const hasMidi = !!event.output?.midiData;
    console.log('🔍 hasCachedMidi guard evaluation:', {
      hasMidi,
      eventOutput: event.output,
      midiDataType: typeof event.output?.midiData,
      midiDataLength: event.output?.midiData?.length
    });
    return hasMidi;
  },
  
  hasValidSession: ({ event }: any) => {
    return event.output && Object.keys(event.output).length > 0;
  },
};
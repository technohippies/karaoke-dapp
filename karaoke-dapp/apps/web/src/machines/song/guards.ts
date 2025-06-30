export const songGuards = {
  hasAccess: ({ event }: any) => {
    return event.output?.hasAccess === true && event.output?.tokenId;
  },
  
  hasCachedMidi: ({ event }: any) => {
    return event.output?.midiData && event.output?.audioUrl;
  },
  
  hasValidSession: ({ event }: any) => {
    return event.output && Object.keys(event.output).length > 0;
  },
};
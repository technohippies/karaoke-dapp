---
description: System architecture, data flow, and security model for the Karaoke Turbo platform including blockchain integration and decentralized storage.
---

# Architecture Overview

The Karaoke Turbo platform is built with a modular, decentralized architecture that separates concerns while maintaining performance and security.

## System Components

### Frontend Layer
- **React Application**: Main user interface
- **State Machines**: XState for complex state management
- **Audio Engine**: Tone.js + Web Audio API for MIDI playback and recording

### Blockchain Layer  
- **Smart Contracts**: Credit system and access control on Base network
- **Wallet Integration**: Wagmi for Web3 connectivity

### Storage Layer
- **Encrypted Files**: MIDI and audio stored on IPFS/Arweave
- **Metadata**: Song information in Tableland database
- **Local Cache**: IndexedDB for performance

### Encryption Layer
- **Lit Protocol**: Programmable key pairs for access control
- **Session Signatures**: Temporary access for karaoke sessions

## Data Flow

<Mermaid>
<pre>
sequenceDiagram
    participant U as User
    participant W as Web App
    participant C as Smart Contract
    participant L as Lit Protocol
    participant S as Storage

    U->>W: Connect Wallet
    U->>C: Purchase Credits
    U->>W: Select Song
    W->>C: Check Access
    C-->>W: Access Confirmed
    W->>L: Request Decryption
    L->>S: Fetch Encrypted MIDI
    L-->>W: Decrypted MIDI
    W->>W: Start Karaoke Session
</pre>
</Mermaid>

## State Management

The application uses XState for managing complex state transitions:

### Song Machine States
- `idle` → `checkingAccess` → `purchased` → `karaoke`
- Handles: purchasing, downloading, decryption, session management

### Karaoke Machine States  
- `countdown` → `playing` → `stopped` → `reviewing`
- Handles: audio playback, recording, scoring, submission

## Security Model

### Access Control
1. **Purchase Verification**: Smart contract validates USDC payment
2. **Song Access**: PKP verifies ownership before decryption
3. **Session Security**: Time-limited signatures for karaoke sessions

### Data Protection
- MIDI files encrypted with Lit Protocol
- User recordings stored locally (optional blockchain submission)
- No sensitive data in smart contracts

## Performance Considerations

### Audio Optimization
- MIDI files loaded and cached locally
- Web Audio API for low-latency playback
- Streaming recording for real-time processing

### Blockchain Efficiency
- Batched transactions where possible
- Credit system reduces per-song gas costs
- Layer 2 (Base) for lower fees

### Caching Strategy
- IndexedDB for decrypted MIDI files
- Service worker for offline capability
- Tableland for fast metadata queries

## Scalability

The architecture is designed to scale both technically and economically:

### Technical Scaling
- **Horizontal**: Multiple storage providers (IPFS, Arweave, AIOZ)
- **Vertical**: Optimized audio processing and state machines
- **Caching**: Multi-layer caching reduces load

### Economic Scaling
- **Credit Packs**: Bulk purchasing reduces transaction costs
- **Revenue Splits**: Automatic distribution to artists and platform
- **Voice Credits**: Separate economy for AI-powered features
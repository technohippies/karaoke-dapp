---
description: Complete documentation for Karaoke Turbo - a decentralized karaoke platform built on Ethereum with Web3 technology, featuring MIDI playback, voice recording, and encrypted storage.
---

# Karaoke Turbo

A decentralized karaoke platform built on Ethereum with Web3 technology.

## Features

- **🎤 Karaoke System**: Real-time karaoke with MIDI playback and voice recording
- **🔐 Decentralized Storage**: Encrypted audio files stored with Lit Protocol 
- **💳 Credit System**: Purchase and unlock songs with USDC on Base network
- **🎵 MIDI Support**: Rich musical accompaniment with Tone.js
- **📊 Performance Tracking**: Real-time scoring and analytics
- **🌐 Web3 Integration**: Wallet connection, ENS support, EFP profiles

## Architecture Overview

<Mermaid>
<pre>
graph TB
    A[Web App] --> B[State Machines]
    A --> C[Audio Context]
    B --> D[Smart Contracts]
    B --> E[Lit Protocol]
    C --> F[Tone.js MIDI]
    C --> G[Web Audio API]
    D --> H[Base Network]
    E --> I[Encrypted Storage]
</pre>
</Mermaid>

## Getting Started

::: tip Quick Start
Jump to the [Development Setup Guide](/guides/development-setup) to get the project running locally.
:::

### Core Concepts

- **Songs**: MIDI files encrypted and stored on IPFS/Arweave
- **Credits**: On-chain tokens for unlocking songs  
- **Sessions**: Karaoke performances with scoring
- **PKP**: Lit Protocol Programmable Key Pairs for decryption

### Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React, TypeScript, Vite |
| State Management | XState |
| Audio | Tone.js, Web Audio API |
| Blockchain | Base (Ethereum L2) |
| Storage | IPFS, Arweave, Tableland |
| Encryption | Lit Protocol |
| UI | Tailwind CSS, Radix UI |

## Project Structure

```
karaoke-dapp/
├── apps/
│   ├── web/          # Main React application
│   └── storybook/    # Component stories
├── packages/
│   ├── ui/           # Shared UI components
│   ├── services/     # Business logic services
│   ├── db/           # Database utilities
│   ├── contracts/    # Smart contracts
│   ├── lit-actions/ # Lit Protocol actions
│   └── utils/        # Shared utilities
└── docs/             # This documentation
```

## Navigation

- **[Architecture](/architecture/)** - System design and data flows
- **[Packages](/packages/)** - Code organization and modules  
- **[API Reference](/api/)** - Service interfaces and methods
- **[Smart Contracts](/contracts/)** - Blockchain integration
- **[Guides](/guides/)** - Setup, deployment, and development
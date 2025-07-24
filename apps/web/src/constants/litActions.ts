// Lit Actions Deployment Manifest
// This file contains the production CIDs for all Lit Actions used in the application
// Source of truth: lit-actions/deployments.json
// File structure follows: lit-actions/{category}/{actionName}V{version}.js

export const LIT_NETWORK = 'datil-dev' as const

export const LIT_ACTIONS = {
  // lit-actions/karaoke-scorer/karaokeScorerV21.js
  karaokeScorerV21: {
    name: 'Karaoke Scorer V21 Test Update',
    cid: 'QmNnUbUj6F9fLRtfYsB9BT8RTVbD6czNauAWTQz31efcph',
    path: 'lit-actions/karaoke-scorer/karaokeScorerV21.js',
    deployDate: '2025-07-24T18:51:00.000Z'
  },
  // lit-actions/exercises/say-it-back/sayItBackV2.js 
  sayItBackV2: {
    name: 'Single Line Scorer V5 - No LLM Feedback',
    cid: 'QmPaDrDLiBqWH2dJy9cUS2GPk8W33nc4A9Yxx8PM4rXbiD',
    path: 'lit-actions/exercises/say-it-back/sayItBackV2.js',
    deployDate: '2025-07-24T07:34:14.560Z'
  }
} as const

// Type exports for better type safety
export type LitActionKey = keyof typeof LIT_ACTIONS
export type LitAction = typeof LIT_ACTIONS[LitActionKey]
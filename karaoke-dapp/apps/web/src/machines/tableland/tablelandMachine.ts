import { createMachine, assign, fromPromise } from 'xstate';
import type { TablelandContext, TablelandEvent } from '../types';
import { 
  checkTables, 
  createTables, 
  prepareOperations, 
  executeBatch, 
  confirmTransaction 
} from './services';

export const tablelandMachine = createMachine({
  types: {} as {
    context: TablelandContext;
    events: TablelandEvent;
  },
  id: 'tableland',
  initial: 'idle',
  context: ({ input }: { input: { userAddress: string } }) => ({
    userAddress: input.userAddress,
    tableInfo: undefined,
    pendingOperations: [],
    retryCount: 0,
    error: undefined,
    sessionData: undefined,
    exerciseData: undefined,
  }),
  states: {
    idle: {
      description: 'Waiting for save operations',
      on: {
        SAVE_SESSION: {
          target: 'checkingTables',
          actions: assign({
            sessionData: ({ event }) => event.data,
            error: undefined,
            retryCount: 0,
          }),
        },
        SAVE_EXERCISE: {
          target: 'checkingTables', 
          actions: assign({
            exerciseData: ({ event }) => event.data,
            error: undefined,
            retryCount: 0,
          }),
        },
      },
    },

    checkingTables: {
      description: 'Checking if user tables exist (localStorage first)',
      invoke: {
        id: 'checkTables',
        src: fromPromise(checkTables),
        input: ({ context }) => ({ userAddress: context.userAddress }),
        onDone: [
          {
            target: 'preparingOperations',
            guard: ({ event }) => !!(event as any).output,
            actions: assign({
              tableInfo: ({ event }) => (event as any).output,
            }),
          },
          {
            target: 'creatingTables',
          },
        ],
        onError: {
          target: 'error',
          actions: assign({
            error: ({ event }) => event.error instanceof Error ? event.error.message : String(event.error),
          }),
        },
      },
    },

    creatingTables: {
      description: 'Creating all three Tableland tables in one batch',
      invoke: {
        id: 'createTables',
        src: fromPromise(createTables),
        input: ({ context }) => ({ userAddress: context.userAddress }),
        onDone: {
          target: 'preparingOperations',
          actions: assign({
            tableInfo: ({ event }) => event.output,
          }),
        },
        onError: [
          {
            target: 'retrying',
            guard: 'canRetry',
            actions: assign({
              error: ({ event }) => event.error instanceof Error ? event.error.message : String(event.error),
              retryCount: ({ context }) => context.retryCount + 1,
            }),
          },
          {
            target: 'error',
            actions: assign({
              error: ({ event }) => event.error instanceof Error ? event.error.message : String(event.error),
            }),
          },
        ],
      },
    },

    preparingOperations: {
      description: 'Building batched SQL operations from pending data',
      invoke: {
        id: 'prepareOperations',
        src: fromPromise(prepareOperations),
        input: ({ context }) => context,
        onDone: {
          target: 'executingBatch',
          actions: assign({
            pendingOperations: ({ event }) => event.output,
          }),
        },
        onError: {
          target: 'error',
          actions: assign({
            error: ({ event }) => event.error instanceof Error ? event.error.message : String(event.error),
          }),
        },
      },
    },

    executingBatch: {
      description: 'Executing all operations in a single batched transaction',
      invoke: {
        id: 'executeBatch',
        src: fromPromise(executeBatch),
        input: ({ context }) => ({
          operations: context.pendingOperations,
          tableInfo: context.tableInfo,
        }),
        onDone: {
          target: 'confirming',
        },
        onError: [
          {
            target: 'retrying',
            guard: 'canRetry',
            actions: assign({
              error: ({ event }) => event.error instanceof Error ? event.error.message : String(event.error),
              retryCount: ({ context }) => context.retryCount + 1,
            }),
          },
          {
            target: 'error',
            actions: assign({
              error: ({ event }) => event.error instanceof Error ? event.error.message : String(event.error),
            }),
          },
        ],
      },
    },

    confirming: {
      description: 'Waiting for transaction confirmation',
      invoke: {
        id: 'confirmTransaction',
        src: fromPromise(confirmTransaction),
        input: ({ context }) => context,
        onDone: {
          target: 'success',
        },
        onError: [
          {
            target: 'retrying',
            guard: 'canRetry',
            actions: assign({
              error: ({ event }) => event.error instanceof Error ? event.error.message : String(event.error),
              retryCount: ({ context }) => context.retryCount + 1,
            }),
          },
          {
            target: 'error',
            actions: assign({
              error: ({ event }) => event.error instanceof Error ? event.error.message : String(event.error),
            }),
          },
        ],
      },
    },

    retrying: {
      description: 'Waiting before retry with exponential backoff',
      after: {
        RETRY_DELAY: {
          target: 'checkingTables',
          actions: assign({
            sessionData: undefined,
            exerciseData: undefined,
            pendingOperations: [],
          }),
        },
      },
      on: {
        RETRY: {
          target: 'checkingTables',
          actions: assign({
            error: undefined,
            sessionData: undefined,
            exerciseData: undefined,
            pendingOperations: [],
          }),
        },
      },
    },

    success: {
      description: 'Operations completed successfully',
      entry: [
        ({ context }) => {
          console.log('✅ Tableland operations completed successfully for user:', context.userAddress);
        },
        assign({
          sessionData: undefined,
          exerciseData: undefined,
          pendingOperations: [],
          retryCount: 0,
          error: undefined,
        }),
      ],
      on: {
        SAVE_SESSION: {
          target: 'checkingTables',
          actions: assign({
            sessionData: ({ event }) => event.data,
            error: undefined,
            retryCount: 0,
          }),
        },
        SAVE_EXERCISE: {
          target: 'checkingTables',
          actions: assign({
            exerciseData: ({ event }) => event.data,
            error: undefined,
            retryCount: 0,
          }),
        },
        RESET: 'idle',
      },
    },

    error: {
      description: 'Error state with manual retry option',
      on: {
        RETRY: {
          target: 'checkingTables',
          actions: assign({
            error: undefined,
            retryCount: 0,
            sessionData: undefined,
            exerciseData: undefined,
            pendingOperations: [],
          }),
        },
        RESET: {
          target: 'idle',
          actions: assign({
            error: undefined,
            retryCount: 0,
            sessionData: undefined,
            exerciseData: undefined,
            pendingOperations: [],
          }),
        },
      },
    },
  },
}, {
  guards: {
    canRetry: ({ context }) => context.retryCount < 3,
  },
  delays: {
    RETRY_DELAY: ({ context }) => Math.min(1000 * Math.pow(2, context.retryCount), 10000), // Exponential backoff max 10s
  },
});
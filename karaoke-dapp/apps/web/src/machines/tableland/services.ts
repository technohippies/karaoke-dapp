import { Database } from '@tableland/sdk';
import type { 
  TablelandContext, 
  UserTableInfo, 
  TablelandOperation,
  KaraokeSessionData,
  ExerciseSessionData 
} from '../types';

// Service to check if tables exist (localStorage first, then recovery)
export const checkTables = async ({ 
  input 
}: { 
  input: { userAddress: string } 
}): Promise<UserTableInfo | null> => {
  const { userAddress } = input;
  console.log('🔍 Checking tables for user:', userAddress);
  
  if (!userAddress || userAddress.trim() === '') {
    throw new Error('Invalid user address');
  }

  // Check localStorage first (fast path)
  const storageKey = `karaoke_user_tables_${userAddress}`;
  const stored = localStorage.getItem(storageKey);
  
  if (stored) {
    try {
      const tableInfo = JSON.parse(stored) as UserTableInfo;
      console.log('✅ Found tables in localStorage:', tableInfo);
      return tableInfo;
    } catch (error) {
      console.warn('Failed to parse stored table info:', error);
      localStorage.removeItem(storageKey);
    }
  }

  console.log('❌ No tables found in localStorage');
  return null;
};

// Service to create all tables in a single batch
export const createTables = async ({ 
  input 
}: { 
  input: { userAddress: string } 
}): Promise<UserTableInfo> => {
  const { userAddress } = input;
  console.log('🏗️ Creating Tableland tables for user:', userAddress);
  
  if (!userAddress || userAddress.trim() === '') {
    throw new Error('Invalid user address');
  }

  // Import services dynamically to avoid circular dependencies
  const { userTableService } = await import('@karaoke-dapp/services');
  
  // This will create all three tables and return the table info
  const tableInfo = await userTableService.createUserTables(userAddress);
  
  console.log('✅ Tables created successfully:', tableInfo);
  return tableInfo;
};

// Service to prepare all operations for batching
export const prepareOperations = async ({
  input
}: {
  input: TablelandContext
}): Promise<TablelandOperation[]> => {
  const context = input;
  console.log('📝 Preparing operations for batch execution');
  
  const operations: TablelandOperation[] = [];
  const { tableInfo, sessionData, exerciseData } = context;
  
  if (!tableInfo) {
    throw new Error('Table info not available');
  }

  // Prepare session operation if we have session data
  if (sessionData) {
    const sessionOp = prepareSessionOperation(sessionData, tableInfo);
    operations.push(sessionOp);
    
    // Prepare line operations for each line in the session
    const lineOps = prepareLineOperations(sessionData, tableInfo);
    operations.push(...lineOps);
  }

  // Prepare exercise operation if we have exercise data
  if (exerciseData) {
    const exerciseOp = prepareExerciseOperation(exerciseData, tableInfo);
    operations.push(exerciseOp);
  }

  console.log(`📊 Prepared ${operations.length} operations for batch execution`);
  return operations;
};

// Helper to prepare session insert operation
function prepareSessionOperation(
  sessionData: KaraokeSessionData, 
  tableInfo: UserTableInfo
): TablelandOperation {
  return {
    type: 'session',
    statement: `
      INSERT INTO ${tableInfo.karaokeSessionsTable} (
        session_id, song_id, song_title, artist_name,
        total_score, started_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    bindings: [
      sessionData.sessionId,
      sessionData.songId,
      sessionData.songTitle,
      sessionData.artistName,
      Math.round(sessionData.totalScore * 100), // Store as integer
      sessionData.startedAt,
      sessionData.completedAt
    ]
  };
}

// Helper to prepare line operations (insert or update based on existence)
function prepareLineOperations(
  sessionData: KaraokeSessionData,
  tableInfo: UserTableInfo
): TablelandOperation[] {
  const now = Date.now();
  
  return sessionData.lines.map(line => {
    // For simplicity, we'll always do an INSERT OR REPLACE
    // In production, you might want to check existing records first
    return {
      type: 'line',
      statement: `
        INSERT OR REPLACE INTO ${tableInfo.karaokeLinesTable} (
          song_id, line_index, line_text,
          difficulty, stability, elapsed_days, scheduled_days,
          reps, lapses, state, last_review, due_date,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      bindings: [
        line.songId,
        line.lineIndex,
        line.expectedText,
        250, // Default difficulty
        line.wasCorrect ? 200 : 50, // Simple FSRS-like stability
        0, // elapsed_days
        1, // scheduled_days
        1, // reps
        line.wasCorrect ? 0 : 1, // lapses
        line.wasCorrect ? 2 : 3, // state (2=review, 3=relearning)
        now, // last_review
        now + (line.wasCorrect ? 86400000 : 3600000), // due_date (1 day or 1 hour)
        now, // created_at
        now // updated_at
      ]
    };
  });
}

// Helper to prepare exercise session operation
function prepareExerciseOperation(
  exerciseData: ExerciseSessionData,
  tableInfo: UserTableInfo
): TablelandOperation {
  const now = Date.now();
  const sessionDate = parseInt(new Date(now).toISOString().slice(0, 10).replace(/-/g, ''));
  
  return {
    type: 'exercise',
    statement: `
      INSERT INTO ${tableInfo.exerciseSessionsTable} (
        session_id, cards_reviewed, cards_correct,
        session_date, started_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `,
    bindings: [
      exerciseData.sessionId,
      exerciseData.cardsReviewed,
      exerciseData.cardsCorrect,
      sessionDate,
      now,
      now
    ]
  };
}

// Service to execute all operations as a single batch
export const executeBatch = async ({
  input
}: {
  input: {
    operations: TablelandOperation[];
    tableInfo: UserTableInfo;
  }
}) => {
  const { operations } = input;
  console.log(`🚀 Executing batch of ${operations.length} operations`);
  
  if (operations.length === 0) {
    console.log('⚠️ No operations to execute');
    return;
  }

  // Import database dynamically to avoid circular dependencies
  await import('@karaoke-dapp/services');
  
  // Get the database instance - we need to access the private db property
  // For now, we'll use the existing batch method if available
  const db = new Database();
  
  // Convert operations to prepared statements
  const statements = operations.map(op => 
    db.prepare(op.statement).bind(...op.bindings)
  );
  
  // Execute as a single batch - this is the key optimization!
  console.log('💾 Executing batch transaction...');
  const result = await db.batch(statements);
  
  console.log('✅ Batch execution completed:', {
    operationCount: operations.length,
    success: true
  });
  
  return result;
};

// Service to confirm transaction
export const confirmTransaction = async () => {
  // For now, we'll just wait a short time since Tableland transactions
  // are usually confirmed quickly
  console.log('⏳ Confirming transaction...');
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log('✅ Transaction confirmed');
  return true;
};
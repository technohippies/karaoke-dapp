import React from 'react'

interface TableCreationModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (tableName: string) => void
  createUserTable: () => Promise<string | null>
  isCreatingTable: boolean
  error: string | null
}

export function TableCreationModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  createUserTable,
  isCreatingTable,
  error
}: TableCreationModalProps) {
  const [showDetails, setShowDetails] = React.useState(false)

  const handleCreate = async () => {
    try {
      const tableName = await createUserTable()
      if (tableName) {
        onSuccess(tableName)
      }
    } catch (err) {
      // Error is handled by the hook
      console.error('Table creation failed:', err)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-b from-purple-900 to-purple-800 rounded-2xl p-8 max-w-md w-full border border-purple-500 shadow-2xl">
        <h2 className="text-2xl font-bold text-white mb-4">
          🎤 Create Your Karaoke Profile
        </h2>
        
        <p className="text-purple-100 mb-6">
          Congratulations on completing your first karaoke session! 
          Let's create your personal profile to track your progress.
        </p>

        <div className="bg-purple-950 bg-opacity-50 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-white mb-2">
            What you'll get:
          </h3>
          <ul className="space-y-2 text-purple-100">
            <li className="flex items-start">
              <span className="mr-2">📊</span>
              <span>Track your performance history</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">🧠</span>
              <span>Smart practice scheduling with FSRS algorithm</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">🏆</span>
              <span>View your progress and achievements</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">🔐</span>
              <span>Decentralized storage on Tableland</span>
            </li>
          </ul>
        </div>

        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-purple-300 hover:text-purple-100 text-sm mb-4 transition-colors"
        >
          {showDetails ? '▼' : '▶'} Technical details
        </button>

        {showDetails && (
          <div className="bg-purple-950 bg-opacity-30 rounded-lg p-3 mb-4 text-sm text-purple-200">
            <p className="mb-2">
              This will create a personal Tableland table on Base Sepolia to store your karaoke history.
            </p>
            <p className="mb-2">
              • Gas fees: ~0.001 ETH
            </p>
            <p>
              • Your data remains under your control
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-500 bg-opacity-20 border border-red-500 rounded-lg p-3 mb-4">
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleCreate}
            disabled={isCreatingTable}
            className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-pink-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreatingTable ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Creating...
              </span>
            ) : (
              'Create Profile'
            )}
          </button>
          
          <button
            onClick={onClose}
            disabled={isCreatingTable}
            className="px-6 py-3 border border-purple-500 text-purple-100 rounded-lg hover:bg-purple-800 transition-colors disabled:opacity-50"
          >
            Skip for now
          </button>
        </div>

        <p className="text-xs text-purple-300 mt-4 text-center">
          You can always create your profile later from settings
        </p>
      </div>
    </div>
  )
}
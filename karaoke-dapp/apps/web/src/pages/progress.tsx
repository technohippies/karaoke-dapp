import { Header } from "@karaoke-dapp/ui"
import { useNavigate } from "react-router-dom"

export function ProgressPage() {
  const navigate = useNavigate()
  
  const handleAccountClick = () => {
    navigate('/account')
  }
  
  return (
    <div className="min-h-screen bg-neutral-900 text-white flex flex-col">
      <Header onAccountClick={handleAccountClick} onLogoClick={() => navigate('/')} />
      
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-6">
          <h1 className="text-4xl font-bold">Your Progress</h1>
          <p className="text-neutral-400">Track your karaoke improvement over time</p>
          
          <div className="mt-8">
            <button
              onClick={() => navigate('/exercise')}
              className="px-8 py-4 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors"
            >
              Practice Exercises
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
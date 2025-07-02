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
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Progress Page</h1>
          <p className="text-neutral-400">Coming soon...</p>
        </div>
      </div>
    </div>
  )
}
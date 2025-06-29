import { Button } from '@/components/ui/button';
import { Header } from '@/components/ui/header';

export default function App() {
  const handleAccountClick = () => {
    // TODO: Navigate to account page when routing is implemented
    console.log('Account button clicked');
  };

  return (
    <>
      <div className="min-h-screen bg-neutral-700 text-white dark">
        <Header onAccountClick={handleAccountClick} />
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <div className="text-center space-y-6">
            <h1 className="text-4xl font-bold mb-4">Karaoke dApp</h1>
            <p className="text-neutral-400">Ready to build with Vite 7 + React 19.1 + Tailwind 4.1</p>
            <div className="flex gap-4 justify-center">
              <Button>Get Started</Button>
              <Button variant="outline">Learn More</Button>
              <Button variant="ghost">Documentation</Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
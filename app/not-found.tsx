import Link from 'next/link';
import { LiquidBackground } from '@/components/LiquidBackground';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="min-h-screen relative flex items-center justify-center">
      <LiquidBackground />
      <div className="relative z-10 container mx-auto px-4">
        <Card className="max-w-md mx-auto text-center">
          <h1 className="text-6xl font-bold mb-4 text-primary">404</h1>
          <h2 className="text-2xl font-bold mb-4">Page Not Found</h2>
          <p className="text-text-secondary mb-6">
            The page you&apos;re looking for doesn&apos;t exist.
          </p>
          <Link href="/">
            <Button variant="primary" size="lg">
              <Home className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </Card>
      </div>
    </main>
  );
}


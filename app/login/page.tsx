'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { LiquidBackground } from '@/components/LiquidBackground';
import { Lock } from 'lucide-react';
import { HomeButton } from '@/components/HomeButton';

export default function LoginPage() {
  const router = useRouter();
  const [pNumber, setPNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!pNumber.trim()) {
      setError('Please enter your P Number');
      setLoading(false);
      return;
    }

    try {
      const result = await signIn('credentials', {
        pNumber: pNumber.trim().toUpperCase(),
        password: 'not_required', // Dummy value for NextAuth compatibility
        redirect: false,
      });

      if (result?.error) {
        console.error('Sign in error:', result.error);
        setError('Invalid P Number. Please check your P Number and try again.');
        setLoading(false);
      } else if (result?.ok) {
        // Small delay to ensure session is set
        setTimeout(() => {
          router.push('/dashboard');
          router.refresh();
        }, 100);
      } else {
        setError('Failed to sign in. Please try again.');
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err?.message || 'An error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <main className="h-screen relative flex items-center justify-center p-3 safe-area-inset overflow-x-hidden" style={{ padding: '10px' }}>
      <div 
        className="fixed inset-0 -z-10"
        style={{
          background: `
            radial-gradient(circle at 12% 18%, rgba(59, 130, 246, 0.28) 0, transparent 38%),
            radial-gradient(circle at 82% 20%, rgba(99, 102, 241, 0.28) 0, transparent 38%),
            radial-gradient(circle at 30% 80%, rgba(234, 179, 8, 0.22) 0, transparent 32%),
            radial-gradient(circle at 60% 50%, rgba(59, 130, 246, 0.18) 0, transparent 42%),
            radial-gradient(circle at 50% 10%, rgba(99, 102, 241, 0.18) 0, transparent 38%),
            linear-gradient(145deg, #0a1c3c 0%, #0f2f5d 45%, #09172f 100%)
          `,
        }}
      />
      <LiquidBackground />
      
      <div className="relative z-10 w-full max-w-[500px] px-4 flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative bg-white/95 backdrop-blur-[20px] rounded-3xl shadow-xl overflow-hidden w-full"
          style={{
            padding: '32px 24px',
            maxWidth: '500px',
            width: '100%',
            boxShadow: `
              0 12px 40px rgba(0, 0, 0, 0.25),
              0 0 0 1px rgba(0, 0, 0, 0.1) inset
            `,
            border: '1px solid rgba(255, 255, 255, 0.5)',
            WebkitBackdropFilter: 'blur(20px) saturate(150%)',
          }}
        >
          <div className="relative z-[2]">
            <div className="mb-8 text-center">
              <div className="w-20 h-20 mx-auto mb-4 flex items-center justify-center" style={{ filter: 'drop-shadow(0 10px 20px rgba(0, 0, 0, 0.15))' }}>
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center border-2 border-primary/20">
                  <Lock className="w-9 h-9 text-primary" strokeWidth={2.5} />
                </div>
              </div>
              <h1 className="text-2xl font-extrabold mb-2" style={{ color: '#1e5a8f', letterSpacing: '-0.6px' }}>
                Staff Login
              </h1>
              <p className="text-sm" style={{ color: '#666' }}>
                Enter your P Number to access your dashboard
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl text-sm" style={{ color: '#dc2626' }}>
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#333' }}>
                  P Number (PIN)
                </label>
                <input
                  type="text"
                  placeholder="Enter your P Number"
                  value={pNumber}
                  onChange={(e) => setPNumber(e.target.value.toUpperCase())}
                  required
                  autoFocus
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 text-base font-medium focus:outline-none focus:border-primary focus:ring-0 transition-all uppercase"
                  style={{ 
                    boxShadow: 'none',
                  }}
                  maxLength={20}
                />
                <p className="text-xs mt-1.5" style={{ color: '#666' }}>
                  Enter your P Number to sign in
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 rounded-xl text-white font-semibold text-base transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed relative overflow-hidden group"
                style={{
                  background: 'linear-gradient(135deg, #2E75B6 0%, #1e5a8f 100%)',
                  boxShadow: '0 4px 15px rgba(46, 117, 182, 0.4)',
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(46, 117, 182, 0.6), 0 0 20px rgba(46, 117, 182, 0.3)';
                    e.currentTarget.style.background = 'linear-gradient(135deg, #1e5a8f 0%, #2E75B6 100%)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = '';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(46, 117, 182, 0.4)';
                  e.currentTarget.style.background = 'linear-gradient(135deg, #2E75B6 0%, #1e5a8f 100%)';
                }}
                onMouseDown={(e) => {
                  if (!loading) {
                    e.currentTarget.style.transform = 'translateY(-1px) scale(0.98)';
                  }
                }}
                onMouseUp={(e) => {
                  if (!loading) {
                    e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
                  }
                }}
              >
                <span className="relative z-10">{loading ? 'Signing in...' : 'Sign In'}</span>
                <span 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 100%)',
                  }}
                />
              </button>
            </form>
          </div>
          <HomeButton variant="relative" />
        </motion.div>
      </div>
    </main>
  );
}

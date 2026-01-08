'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { LiquidBackground } from '@/components/LiquidBackground';
import { Lock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [pNumber, setPNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await signIn('credentials', {
        pNumber: pNumber.trim(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid P Number or password');
        setLoading(false);
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen relative overflow-hidden p-3 safe-area-inset" style={{ padding: '10px' }}>
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
      
      <div className="relative z-10 container mx-auto px-4 py-8 max-w-2xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 mb-6 transition-colors text-sm font-medium"
          style={{ color: '#1e5a8f' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative bg-white/95 backdrop-blur-[20px] rounded-3xl shadow-xl overflow-hidden"
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
                Access the staff dashboard to manage tickets and detentions
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
                  P Number
                </label>
                <input
                  type="text"
                  placeholder="P00166224"
                  value={pNumber}
                  onChange={(e) => setPNumber(e.target.value.toUpperCase())}
                  required
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 text-base font-medium focus:outline-none focus:border-primary focus:ring-0 transition-all uppercase"
                  style={{ 
                    boxShadow: 'none',
                  }}
                  maxLength={20}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#333' }}>
                  Password
                </label>
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 text-base font-medium focus:outline-none focus:border-primary focus:ring-0 transition-all"
                  style={{ 
                    boxShadow: 'none',
                  }}
                />
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
        </motion.div>
      </div>
    </main>
  );
}

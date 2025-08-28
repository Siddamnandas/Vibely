'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSpotifyAuth } from '@/hooks/use-spotify-auth';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function SpotifyCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { handleAuthCallback } = useSpotifyAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Authenticating with Spotify...');

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      setStatus('error');
      setMessage(`Authentication failed: ${error}`);
      setTimeout(() => router.push('/'), 3000);
      return;
    }

    if (code) {
      handleAuthCallback(code)
        .then(() => {
          setStatus('success');
          setMessage('Successfully authenticated! Redirecting...');
          setTimeout(() => router.push('/'), 2000);
        })
        .catch((err) => {
          setStatus('error');
          setMessage('Authentication failed. Please try again.');
          setTimeout(() => router.push('/'), 3000);
        });
    } else {
      setStatus('error');
      setMessage('No authentication code received.');
      setTimeout(() => router.push('/'), 3000);
    }
  }, [searchParams, handleAuthCallback, router]);

  return (
    <div className="min-h-screen bg-[#0E0F12] flex items-center justify-center px-6">
      <div className="text-center">
        <div className="mb-6">
          {status === 'loading' && (
            <Loader2 className="w-16 h-16 mx-auto text-[#9FFFA2] animate-spin" />
          )}
          {status === 'success' && (
            <CheckCircle className="w-16 h-16 mx-auto text-[#9FFFA2]" />
          )}
          {status === 'error' && (
            <XCircle className="w-16 h-16 mx-auto text-[#FF6F91]" />
          )}
        </div>
        
        <h1 className="text-2xl font-black text-white mb-4">
          {status === 'loading' && 'Connecting to Spotify...'}
          {status === 'success' && 'Authentication Successful!'}
          {status === 'error' && 'Authentication Failed'}
        </h1>
        
        <p className="text-white/70 text-lg">
          {message}
        </p>
        
        {status === 'error' && (
          <button
            onClick={() => router.push('/')}
            className="mt-6 px-6 py-3 bg-gradient-to-r from-[#9FFFA2] to-[#FF6F91] text-black font-bold rounded-full hover:opacity-90 transition-opacity"
          >
            Return Home
          </button>
        )}
      </div>
    </div>
  );
}
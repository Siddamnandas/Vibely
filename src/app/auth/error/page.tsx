'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AuthErrorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorDetails, setErrorDetails] = useState<{
    provider: string;
    error: string;
    description: string;
  }>({
    provider: 'Unknown',
    error: 'Unknown error',
    description: 'An unexpected error occurred during authentication.',
  });

  useEffect(() => {
    const provider = searchParams.get('provider') || 'Unknown';
    const error = searchParams.get('error') || 'unknown_error';
    
    let description = 'An unexpected error occurred during authentication.';
    
    // Map common error codes to user-friendly descriptions
    switch (error) {
      case 'access_denied':
        description = 'You denied access to your music library. To use Vibely, we need permission to access your music.';
        break;
      case 'invalid_request':
        description = 'There was an issue with the authentication request. Please try again.';
        break;
      case 'unsupported_response_type':
        description = 'The authentication method is not supported. Please contact support.';
        break;
      case 'invalid_scope':
        description = 'The requested permissions are not valid. Please try again.';
        break;
      case 'server_error':
        description = 'The music service is temporarily unavailable. Please try again later.';
        break;
      case 'temporarily_unavailable':
        description = 'The music service is temporarily unavailable. Please try again in a few minutes.';
        break;
      case 'no_code':
        description = 'No authorization code was received from the music service.';
        break;
      default:
        if (error.includes('network')) {
          description = 'Network connection issue. Please check your internet connection and try again.';
        } else if (error.includes('timeout')) {
          description = 'The request timed out. Please try again.';
        }
        break;
    }

    setErrorDetails({
      provider: provider === 'spotify' ? 'Spotify' : provider === 'apple-music' ? 'Apple Music' : provider,
      error,
      description,
    });
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-[#0E0F12] flex items-center justify-center px-6">
      <div className="text-center max-w-lg">
        <div className="mb-8">
          <div className="w-16 h-16 mx-auto bg-[#FF6F91]/20 rounded-full flex items-center justify-center mb-6">
            <X className="w-8 h-8 text-[#FF6F91]" />
          </div>
          
          <h1 className="text-3xl font-black text-white mb-2">
            Connection Failed
          </h1>
          
          <p className="text-white/70 text-lg mb-4">
            Failed to connect to {errorDetails.provider}
          </p>
          
          <div className="bg-[#FF6F91]/10 border border-[#FF6F91]/20 rounded-2xl p-6 mb-6 text-left">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#FF6F91] mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-white mb-2">What happened?</h3>
                <p className="text-white/70 text-sm leading-relaxed">
                  {errorDetails.description}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <Button
            onClick={() => router.push('/')}
            className="w-full bg-gradient-to-r from-[#9FFFA2] to-[#FF6F91] text-black font-bold hover:opacity-90 rounded-full py-3"
          >
            Try Again
          </Button>
          
          <Button
            variant="outline"
            onClick={() => router.push('/help')}
            className="w-full border-white/20 text-white hover:bg-white/10 rounded-full py-3"
          >
            Get Help
          </Button>
        </div>

        <div className="mt-8 text-xs text-white/40">
          Error Code: {errorDetails.error}
        </div>
      </div>
    </div>
  );
}
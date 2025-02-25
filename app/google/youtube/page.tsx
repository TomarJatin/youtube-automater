'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { FullPageLoading } from '@/components/ui/loading';

export default function YouTubeCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Initializing connection...');

  useEffect(() => {
    const handleCallback = async () => {
      setStatus('Verifying authorization...');
      const code = searchParams.get('code');
      const error = searchParams.get('error');

      if (error) {
        setStatus('Connection failed');
        toast.error('Failed to connect YouTube account');
        setTimeout(() => router.push('/'), 2000);
        return;
      }

      if (!code) {
        setStatus('Missing authorization code');
        toast.error('No authorization code received');
        setTimeout(() => router.push('/'), 2000);
        return;
      }

      try {
        setStatus('Completing connection...');
        const response = await fetch(`/api/youtube/callback?${searchParams.toString()}`);
        if (!response.ok) {
          throw new Error('Failed to complete YouTube connection');
        }

        setStatus('Connection successful!');
        toast.success('Successfully connected to YouTube');
        
        // Refresh the channels list
        await fetch('/api/channels', { method: 'GET' });
        
        setTimeout(() => router.push('/'), 1500);
      } catch (error) {
        console.error('Error in YouTube callback:', error);
        setStatus('Connection failed');
        toast.error('Failed to connect YouTube account');
        setTimeout(() => router.push('/'), 2000);
      }
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <FullPageLoading 
      message={status} 
      showSpinner={!status.includes('failed') && !status.includes('successful')} 
    />
  );
}

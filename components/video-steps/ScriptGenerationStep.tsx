'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ScriptStepData } from '@/types/video';

interface ScriptGenerationStepProps {
  videoData: ScriptStepData;
  onBack: () => void;
  onNext: (data: { script: string, videoId: string }) => void;
}

export function ScriptGenerationStep({ videoData, onBack, onNext }: ScriptGenerationStepProps) {
  console.log("video data in script generatation...", videoData);
  const [loading, setLoading] = useState(false);
  const [script, setScript] = useState<string>('');
  const [videoId, setVideoId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const generateScript = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/channels/${videoData.channelId}/videos?videoId=${videoData.videoId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedIdea: videoData.selectedIdea
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate script');
      }
      
      const data = await response.json();
      if (!data.script) throw new Error('No script generated');
      
      setScript(data.script);
      setVideoId(data.id);
    } catch (error) { 
      console.error('Error:', error);
      setError('Failed to generate script. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if(!videoData.script){
      generateScript();
    }
  }, []);

  const handleNext = () => {
    if (script) {
      onNext({ script, videoId });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p>Generating video script...</p>
        <p className="text-sm text-muted-foreground">
          Our AI is crafting a compelling script based on your selected idea:
          <span className="font-medium block mt-2">{videoData.selectedIdea.title}</span>
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-destructive p-8">
        <p>{error}</p>
        <div className="flex justify-center space-x-4 mt-4">
          <Button variant="outline" onClick={onBack}>
            Back to Ideas
          </Button>
          <Button onClick={generateScript}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Generated Script</h3>
        <p className="text-muted-foreground">
          Review the AI-generated script for your video titled "{videoData.selectedIdea.title}"
        </p>
      </div>

      <Card className="p-4">
        <ScrollArea className="h-[400px] w-full rounded-md border p-4">
          <div className="whitespace-pre-wrap font-mono text-sm">
            {script}
          </div>
        </ScrollArea>
      </Card>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          Back to Ideas
        </Button>
        <div className="space-x-2">
          <Button variant="outline" onClick={generateScript}>
            Regenerate Script
          </Button>
          <Button 
            onClick={handleNext} 
            disabled={!script}
          >
            Continue to Images
          </Button>
        </div>
      </div>
    </div>
  );
}

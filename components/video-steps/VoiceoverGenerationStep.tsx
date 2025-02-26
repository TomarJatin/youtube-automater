'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, PlayCircle, PauseCircle, RefreshCw } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VoiceoverStepData } from '@/types/video';

interface VoiceoverGenerationStepProps {
  videoData: VoiceoverStepData;
  onBack: () => void;
  onNext: (data: { voiceovers: string[] }) => void;
}

interface SectionVoiceover {
  url?: string;
  loading: boolean;
  error?: string;
  isPlaying?: boolean;
}

interface AudioPlayerProps {
  url: string;
  onRegenerate: () => void;
}

function AudioPlayer({ url, onRegenerate }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.addEventListener('ended', () => setIsPlaying(false));
      return () => {
        audio.removeEventListener('ended', () => setIsPlaying(false));
        audio.pause();
      };
    }
  }, []);

  return (
    <div className="flex items-center space-x-2">
      <Button
        size="icon"
        variant="ghost"
        onClick={togglePlay}
        className="text-primary"
      >
        {isPlaying ? (
          <PauseCircle className="h-6 w-6" />
        ) : (
          <PlayCircle className="h-6 w-6" />
        )}
      </Button>
      <audio ref={audioRef} src={url} />
      <Button
        size="icon"
        variant="outline"
        onClick={onRegenerate}
        className="ml-auto"
      >
        <RefreshCw className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function VoiceoverGenerationStep({ videoData, onBack, onNext }: VoiceoverGenerationStepProps) {
  const scriptSections = videoData.script.split('\n\n').filter(section => section.trim());
  const [sectionVoiceovers, setSectionVoiceovers] = useState<SectionVoiceover[]>(
    scriptSections.map(() => ({ loading: false }))
  );
  const [error, setError] = useState<string | null>(null);

  const generateVoiceoverForSection = async (sectionIndex: number, section: string) => {
    try {
      setSectionVoiceovers(prev => prev.map((vo, i) => 
        i === sectionIndex ? { ...vo, loading: true, error: undefined } : vo
      ));

      const response = await fetch('/api/channels/videos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          script: section,
          generateVoiceover: true,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate voiceover');
      
      const data = await response.json();
      if (!data.voiceoverUrl) throw new Error('No voiceover generated');
      
      setSectionVoiceovers(prev => prev.map((vo, i) => 
        i === sectionIndex ? { loading: false, url: data.voiceoverUrl } : vo
      ));
    } catch (error) {
      console.error('Error:', error);
      setSectionVoiceovers(prev => prev.map((vo, i) => 
        i === sectionIndex ? { loading: false, error: 'Failed to generate voiceover' } : vo
      ));
    }
  };

  const generateAllVoiceovers = async () => {
    setError(null);
    for (let i = 0; i < scriptSections.length; i++) {
      await generateVoiceoverForSection(i, scriptSections[i]);
    }
  };

  useEffect(() => {
    generateAllVoiceovers();
  }, []);

  const handleNext = () => {
    const allVoiceovers = sectionVoiceovers
      .map(vo => vo.url)
      .filter((url): url is string => url !== undefined);

    if (allVoiceovers.length === scriptSections.length) {
      onNext({ voiceovers: allVoiceovers });
    }
  };

  const isGenerating = sectionVoiceovers.some(vo => vo.loading);
  const hasError = sectionVoiceovers.some(vo => vo.error);
  const isComplete = sectionVoiceovers.every(vo => vo.url);

  if (isGenerating) {
    const progress = sectionVoiceovers.filter(vo => vo.url).length;
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p>Generating voiceovers for your video...</p>
        <p className="text-sm text-muted-foreground">
          Generated {progress} of {scriptSections.length} voiceovers
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Generated Voiceovers</h3>
        <p className="text-muted-foreground">
          Review the AI-generated voiceovers for your video. Each audio clip corresponds to a section of your script.
        </p>
      </div>

      <div className="space-y-4">
        {scriptSections.map((section, index) => (
          <Card key={index} className="p-4 space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Section {index + 1}</p>
              <ScrollArea className="h-[100px] w-full rounded-md border p-2">
                <p className="text-sm text-muted-foreground">{section}</p>
              </ScrollArea>
            </div>
            
            <div className="h-12">
              {sectionVoiceovers[index].loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : sectionVoiceovers[index].error ? (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-destructive">
                    {sectionVoiceovers[index].error}
                  </p>
                  <Button
                    size="sm"
                    onClick={() => generateVoiceoverForSection(index, section)}
                  >
                    Try Again
                  </Button>
                </div>
              ) : sectionVoiceovers[index].url ? (
                <AudioPlayer
                  url={sectionVoiceovers[index].url!}
                  onRegenerate={() => generateVoiceoverForSection(index, section)}
                />
              ) : null}
            </div>
          </Card>
        ))}
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          Back to Images
        </Button>
        <div className="space-x-2">
          <Button 
            variant="outline" 
            onClick={generateAllVoiceovers}
            disabled={isGenerating}
          >
            Regenerate All Voiceovers
          </Button>
          <Button 
            onClick={handleNext}
            disabled={!isComplete || isGenerating}
          >
            Continue to Music
          </Button>
        </div>
      </div>
    </div>
  );
}

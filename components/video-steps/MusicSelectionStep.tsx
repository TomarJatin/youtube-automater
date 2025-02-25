'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2, PlayCircle, PauseCircle } from 'lucide-react';
import { MusicStepData } from '@/types/video';

interface MusicSelectionStepProps {
  videoData: MusicStepData;
  onBack: () => void;
  onNext: (data: { music: string }) => void;
}

interface MusicTrack {
  id: string;
  name: string;
  description: string;
  url: string;
  mood: string;
  genre: string;
  duration: string;
}

const SAMPLE_TRACKS: MusicTrack[] = [
  {
    id: '1',
    name: 'Upbeat Corporate',
    description: 'Positive and energetic background music perfect for business and tech videos',
    url: 'https://example.com/music/upbeat-corporate.mp3',
    mood: 'Energetic',
    genre: 'Corporate',
    duration: '2:30'
  },
  {
    id: '2',
    name: 'Inspirational Ambient',
    description: 'Soft and inspiring background track ideal for storytelling',
    url: 'https://example.com/music/inspirational-ambient.mp3',
    mood: 'Inspiring',
    genre: 'Ambient',
    duration: '3:15'
  },
  {
    id: '3',
    name: 'Tech Innovation',
    description: 'Modern and dynamic music suitable for technology and innovation topics',
    url: 'https://example.com/music/tech-innovation.mp3',
    mood: 'Modern',
    genre: 'Electronic',
    duration: '2:45'
  },
  {
    id: '4',
    name: 'Gentle Documentary',
    description: 'Subtle and professional background music for informative content',
    url: 'https://example.com/music/gentle-documentary.mp3',
    mood: 'Professional',
    genre: 'Documentary',
    duration: '3:00'
  }
];

interface AudioPlayerProps {
  url: string;
  isPlaying: boolean;
  onToggle: () => void;
}

function AudioPlayer({ url, isPlaying, onToggle }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      if (isPlaying) {
        audio.play();
      } else {
        audio.pause();
      }
    }
  }, [isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.addEventListener('ended', onToggle);
      return () => {
        audio.removeEventListener('ended', onToggle);
        audio.pause();
      };
    }
  }, [onToggle]);

  return <audio ref={audioRef} src={url} />;
}

export function MusicSelectionStep({ videoData, onBack, onNext }: MusicSelectionStepProps) {
  const [loading, setLoading] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null);
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePlayToggle = (trackId: string) => {
    if (playingTrack === trackId) {
      setPlayingTrack(null);
    } else {
      setPlayingTrack(trackId);
    }
  };

  const handleNext = () => {
    if (selectedTrack) {
      const track = SAMPLE_TRACKS.find(t => t.id === selectedTrack);
      if (track) {
        onNext({ music: track.url });
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p>Loading music tracks...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-destructive p-8">
        <p>{error}</p>
        <Button onClick={() => setError(null)} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Select Background Music</h3>
        <p className="text-muted-foreground">
          Choose background music that complements your video's tone and message.
        </p>
      </div>

      <RadioGroup
        value={selectedTrack || ''}
        onValueChange={setSelectedTrack}
        className="space-y-4"
      >
        {SAMPLE_TRACKS.map((track) => (
          <Card
            key={track.id}
            className={`p-4 cursor-pointer transition-colors ${
              selectedTrack === track.id ? 'border-primary' : ''
            }`}
          >
            <div className="flex items-start space-x-4">
              <RadioGroupItem value={track.id} id={track.id} />
              <div className="flex-grow space-y-1">
                <Label htmlFor={track.id} className="font-medium">
                  {track.name}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {track.description}
                </p>
                <div className="flex items-center space-x-4 text-sm text-primary mt-2">
                  <span>Mood: {track.mood}</span>
                  <span>•</span>
                  <span>Genre: {track.genre}</span>
                  <span>•</span>
                  <span>Duration: {track.duration}</span>
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={(e) => {
                  e.preventDefault();
                  handlePlayToggle(track.id);
                }}
                className="text-primary"
              >
                {playingTrack === track.id ? (
                  <PauseCircle className="h-6 w-6" />
                ) : (
                  <PlayCircle className="h-6 w-6" />
                )}
              </Button>
              {playingTrack === track.id && (
                <AudioPlayer
                  url={track.url}
                  isPlaying={true}
                  onToggle={() => setPlayingTrack(null)}
                />
              )}
            </div>
          </Card>
        ))}
      </RadioGroup>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          Back to Voiceovers
        </Button>
        <Button
          onClick={handleNext}
          disabled={!selectedTrack}
        >
          Continue to Finalize
        </Button>
      </div>
    </div>
  );
}

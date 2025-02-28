'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, PlayCircle, PauseCircle, Search } from 'lucide-react';
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
  tags: string[];
}

const SAMPLE_TRACKS: MusicTrack[] = [
  {
    id: '1',
    name: 'Upbeat Corporate',
    description: 'Positive and energetic background music perfect for business and tech videos',
    url: 'https://example.com/music/upbeat-corporate.mp3',
    mood: 'Energetic',
    genre: 'Corporate',
    duration: '2:30',
    tags: ['business', 'technology', 'upbeat', 'modern']
  },
  {
    id: '2',
    name: 'Inspirational Ambient',
    description: 'Soft and inspiring background track ideal for storytelling',
    url: 'https://example.com/music/inspirational-ambient.mp3',
    mood: 'Inspiring',
    genre: 'Ambient',
    duration: '3:15',
    tags: ['inspiration', 'calm', 'storytelling']
  },
  {
    id: '3',
    name: 'Tech Innovation',
    description: 'Modern and dynamic music suitable for technology and innovation topics',
    url: 'https://example.com/music/tech-innovation.mp3',
    mood: 'Modern',
    genre: 'Electronic',
    duration: '2:45',
    tags: ['technology', 'innovation', 'dynamic']
  },
  {
    id: '4',
    name: 'Gentle Documentary',
    description: 'Subtle and professional background music for informative content',
    url: 'https://example.com/music/gentle-documentary.mp3',
    mood: 'Professional',
    genre: 'Documentary',
    duration: '3:00',
    tags: ['documentary', 'informative', 'subtle']
  },
  {
    id: '5',
    name: 'Epic Cinematic',
    description: 'Powerful and dramatic music for impactful storytelling',
    url: 'https://example.com/music/epic-cinematic.mp3',
    mood: 'Dramatic',
    genre: 'Cinematic',
    duration: '3:45',
    tags: ['epic', 'dramatic', 'cinematic']
  },
  {
    id: '6',
    name: 'Soft Technology',
    description: 'Gentle electronic beats for tech product demonstrations',
    url: 'https://example.com/music/soft-technology.mp3',
    mood: 'Calm',
    genre: 'Electronic',
    duration: '2:15',
    tags: ['technology', 'soft', 'product']
  },
  {
    id: '7',
    name: 'Business Growth',
    description: 'Professional and motivating track for business success stories',
    url: 'https://example.com/music/business-growth.mp3',
    mood: 'Professional',
    genre: 'Corporate',
    duration: '2:50',
    tags: ['business', 'success', 'motivation']
  },
  {
    id: '8',
    name: 'Digital Future',
    description: 'Futuristic electronic music for cutting-edge tech content',
    url: 'https://example.com/music/digital-future.mp3',
    mood: 'Modern',
    genre: 'Electronic',
    duration: '3:20',
    tags: ['future', 'technology', 'digital']
  },
  {
    id: '9',
    name: 'Calm Innovation',
    description: 'Peaceful yet modern background music for innovation stories',
    url: 'https://example.com/music/calm-innovation.mp3',
    mood: 'Calm',
    genre: 'Ambient',
    duration: '3:10',
    tags: ['innovation', 'calm', 'modern']
  },
  {
    id: '10',
    name: 'Corporate Success',
    description: 'Uplifting corporate track for business achievements',
    url: 'https://example.com/music/corporate-success.mp3',
    mood: 'Uplifting',
    genre: 'Corporate',
    duration: '2:40',
    tags: ['corporate', 'success', 'achievement']
  }
];

const MOODS = Array.from(new Set(SAMPLE_TRACKS.map(track => track.mood)));
const GENRES = Array.from(new Set(SAMPLE_TRACKS.map(track => track.genre)));

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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMood, setSelectedMood] = useState<string>('all_moods');
  const [selectedGenre, setSelectedGenre] = useState<string>('all_genres');
  const [suggestedMoods, setSuggestedMoods] = useState<string[]>([]);
  const [suggestedGenres, setSuggestedGenres] = useState<string[]>([]);

  useEffect(() => {
    const fetchMusicSuggestions = async () => {
      if (videoData.script) {
        try {
          setLoading(true);
          const response = await fetch('/api/llm/music-suggestions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ script: videoData.script }),
          });

          if (!response.ok) throw new Error('Failed to fetch music suggestions');

          const data = await response.json();
          setSuggestedMoods(data.suggestions.moods);
          setSuggestedGenres(data.suggestions.genres);
        } catch (err) {
          console.error('Error fetching music suggestions:', err);
          setError('Failed to load music suggestions');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchMusicSuggestions();
  }, [videoData.script]);

  const handlePlayToggle = (trackId: string) => {
    if (playingTrack === trackId) {
      setPlayingTrack(null);
    } else {
      setPlayingTrack(trackId);
    }
  };

  const handleNext = () => {
    if (selectedTrack) {
      const track = SAMPLE_TRACKS.find((t) => t.id === selectedTrack);
      if (track) {
        onNext({ music: track.url });
      }
    }
  };

  const filteredTracks = SAMPLE_TRACKS.filter((track) => {
    const matchesSearch = 
      searchQuery === '' ||
      track.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesMood = selectedMood === 'all_moods' || track.mood === selectedMood;
    const matchesGenre = selectedGenre === 'all_genres' || track.genre === selectedGenre;

    return matchesSearch && matchesMood && matchesGenre;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p>Loading music tracks...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-destructive">
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
        <p className="text-muted-foreground">Choose background music that complements your video's tone and message.</p>
      </div>

      <div className="space-y-4">
        {suggestedMoods.length > 0 && (
          <div className="rounded-lg bg-muted p-4">
            <p className="mb-2 font-medium">Suggested for your video:</p>
            <div className="flex flex-wrap gap-2">
              {suggestedMoods.map((mood) => (
                <Button
                  key={mood}
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedMood(mood)}
                  className={selectedMood === mood ? 'bg-primary text-primary-foreground' : ''}
                >
                  {mood}
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search by name, description, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
          <Select value={selectedMood} onValueChange={setSelectedMood}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by mood" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all_moods">All Moods</SelectItem>
              {MOODS.map((mood) => (
                <SelectItem key={mood} value={mood}>
                  {mood}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedGenre} onValueChange={setSelectedGenre}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by genre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all_genres">All Genres</SelectItem>
              {GENRES.map((genre) => (
                <SelectItem key={genre} value={genre}>
                  {genre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <RadioGroup value={selectedTrack || ''} onValueChange={setSelectedTrack} className="space-y-4">
        {filteredTracks.map((track) => (
          <Card
            key={track.id}
            className={`cursor-pointer p-4 transition-colors ${
              selectedTrack === track.id ? 'border-primary' : ''
            }`}
          >
            <div className="flex items-start space-x-4">
              <RadioGroupItem value={track.id} id={track.id} />
              <div className="flex-grow space-y-1">
                <Label htmlFor={track.id} className="font-medium">
                  {track.name}
                </Label>
                <p className="text-sm text-muted-foreground">{track.description}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-primary">
                  <span>Mood: {track.mood}</span>
                  <span>•</span>
                  <span>Genre: {track.genre}</span>
                  <span>•</span>
                  <span>Duration: {track.duration}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {track.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
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
        <Button onClick={handleNext} disabled={!selectedTrack}>
          Continue to Finalize
        </Button>
      </div>
    </div>
  );
}

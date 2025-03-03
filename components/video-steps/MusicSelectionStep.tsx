'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, PlayCircle, PauseCircle, Search } from 'lucide-react';
import { MusicStepData, VideoStepData } from '@/types/video';

interface MusicSelectionStepProps {
  videoData: VideoStepData;
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
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null);
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMood, setSelectedMood] = useState<string>('all_moods');
  const [selectedGenre, setSelectedGenre] = useState<string>('all_genres');
  const [suggestedMoods, setSuggestedMoods] = useState<string[]>([]);
  const [suggestedGenres, setSuggestedGenres] = useState<string[]>([]);
  const [moods, setMoods] = useState<string[]>([]);
  const [genres, setGenres] = useState<string[]>([]);

  useEffect(() => {
    const fetchTracks = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/music-tracks');
        if (!response.ok) throw new Error('Failed to fetch music tracks');
        const data = await response.json();
        setTracks(data);
        
        // Extract unique moods and genres
        const uniqueMoods: any = Array.from(new Set(data.map((track: MusicTrack) => track.mood)));
        const uniqueGenres: any = Array.from(new Set(data.map((track: MusicTrack) => track.genre)));
        setMoods(uniqueMoods);
        setGenres(uniqueGenres);
      } catch (err) {
        console.error('Error fetching music tracks:', err);
        setError('Failed to load music tracks');
      } finally {
        setLoading(false);
      }
    };

    fetchTracks();
  }, []);

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
      const track = tracks.find((t) => t.id === selectedTrack);
      if (track) {
        onNext({ music: track.url });
      }
    }
  };

  const filteredTracks = tracks.filter((track) => {
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
              {moods.map((mood) => (
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
              {genres.map((genre) => (
                <SelectItem key={genre} value={genre}>
                  {genre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredTracks.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          <p>No music tracks found matching your criteria.</p>
        </div>
      ) : (
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
      )}

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

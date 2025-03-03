'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, Trash2, Music } from 'lucide-react';
import { toast } from 'sonner';

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

export default function MusicTracksPage() {
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [mood, setMood] = useState('');
  const [genre, setGenre] = useState('');
  const [duration, setDuration] = useState('');
  const [tags, setTags] = useState('');
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    fetchTracks();
  }, []);

  const fetchTracks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/music-tracks');
      if (!response.ok) throw new Error('Failed to fetch music tracks');
      const data = await response.json();
      setTracks(data);
    } catch (error) {
      console.error('Error fetching tracks:', error);
      toast.error('Failed to load music tracks');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!name || !description || !mood || !genre || !duration || !tags || !file) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    try {
      setSubmitting(true);
      
      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', description);
      formData.append('mood', mood);
      formData.append('genre', genre);
      formData.append('duration', duration);
      formData.append('tags', tags);
      formData.append('file', file);
      
      const response = await fetch('/api/music-tracks', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) throw new Error('Failed to create music track');
      
      toast.success('Music track added successfully');
      
      // Reset form
      setName('');
      setDescription('');
      setMood('');
      setGenre('');
      setDuration('');
      setTags('');
      setFile(null);
      
      // Refresh tracks
      fetchTracks();
    } catch (error) {
      console.error('Error adding track:', error);
      toast.error('Failed to add music track');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this track?')) return;
    
    try {
      const response = await fetch(`/api/music-tracks/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete music track');
      
      toast.success('Music track deleted successfully');
      
      // Refresh tracks
      fetchTracks();
    } catch (error) {
      console.error('Error deleting track:', error);
      toast.error('Failed to delete music track');
    }
  };

  const handlePlayToggle = (trackId: string) => {
    if (playingTrack === trackId) {
      setPlayingTrack(null);
    } else {
      setPlayingTrack(trackId);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="mb-8 text-3xl font-bold">Music Track Management</h1>
      
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Add New Music Track</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Track Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Upbeat Corporate"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of the track"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mood">Mood</Label>
                    <Input
                      id="mood"
                      value={mood}
                      onChange={(e) => setMood(e.target.value)}
                      placeholder="e.g., Energetic"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="genre">Genre</Label>
                    <Input
                      id="genre"
                      value={genre}
                      onChange={(e) => setGenre(e.target.value)}
                      placeholder="e.g., Corporate"
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration</Label>
                    <Input
                      id="duration"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      placeholder="e.g., 2:30"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags (comma separated)</Label>
                    <Input
                      id="tags"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="e.g., business, upbeat, modern"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="file">Audio File (MP3)</Label>
                  <Input
                    id="file"
                    type="file"
                    accept="audio/mpeg"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    required
                  />
                </div>
                
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    'Add Music Track'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
        
        <div>
          <h2 className="mb-4 text-xl font-semibold">Available Music Tracks</h2>
          
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="mr-2 h-6 w-6 animate-spin" />
              <span>Loading tracks...</span>
            </div>
          ) : tracks.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              <Music className="mx-auto mb-4 h-12 w-12" />
              <p>No music tracks available. Add your first track!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tracks.map((track) => (
                <Card key={track.id} className="overflow-hidden">
                  <div className="flex items-start p-4">
                    <div className="flex-grow space-y-1">
                      <h3 className="font-medium">{track.name}</h3>
                      <p className="text-sm text-muted-foreground">{track.description}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
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
                      <div className="mt-2 flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePlayToggle(track.id)}
                        >
                          {playingTrack === track.id ? 'Pause' : 'Play'}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(track.id)}
                        >
                          <Trash2 className="mr-1 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                  {playingTrack === track.id && (
                    <div className="bg-muted p-2">
                      <audio
                        src={track.url}
                        controls
                        autoPlay
                        className="w-full"
                        onEnded={() => setPlayingTrack(null)}
                      />
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 
import React, { useState, useEffect } from 'react';
import { Plus, Play, Square, Settings2, User, UserCheck } from 'lucide-react';
import { cn } from '../../lib/utils';
import { speak, stopSpeech, setSpeechConfig } from '../../lib/speech';

interface Note {
  id: string;
  text: string;
  date: string;
}

export default function NotePadModal() {
  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem('user_notes_list');
    return saved ? JSON.parse(saved) : [{ id: '1', text: localStorage.getItem('user_notes') || '', date: new Date().toISOString() }];
  });
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceGender, setVoiceGender] = useState<'female' | 'male'>('female');
  const [speechRate, setSpeechRate] = useState(1.1);

  useEffect(() => {
    localStorage.setItem('user_notes_list', JSON.stringify(notes));
    if (notes[0]) {
      localStorage.setItem('user_notes', notes[0].text);
    }
  }, [notes]);

  const addNote = () => {
    const newNote = { id: Date.now().toString(), text: '', date: new Date().toISOString() };
    setNotes([...notes, newNote]);
    setCurrentNoteIndex(notes.length);
  };

  const deleteNote = () => {
    if (notes.length > 1) {
      const updatedNotes = notes.filter((_, i) => i !== currentNoteIndex);
      setNotes(updatedNotes);
      setCurrentNoteIndex(Math.max(0, currentNoteIndex - 1));
    } else {
      const updatedNotes = [{ ...notes[0], text: '' }];
      setNotes(updatedNotes);
    }
  };

  const handleSpeak = () => {
    const text = notes[currentNoteIndex]?.text;
    if (!text) return;
    
    setIsSpeaking(true);
    speak(text, { 
      rate: speechRate, 
      gender: voiceGender,
      onEnd: () => setIsSpeaking(false)
    });
  };

  const handleStop = () => {
    stopSpeech();
    setIsSpeaking(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex space-x-2 overflow-x-auto pb-2 max-w-[200px] hide-scrollbar">
          {notes.map((note, idx) => (
            <button 
              key={note.id} 
              onClick={() => {
                setCurrentNoteIndex(idx);
                if (isSpeaking) handleStop();
              }}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap",
                currentNoteIndex === idx ? "bg-purple-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
              )}
            >
              Note {idx + 1}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Audio Controls */}
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button 
              onClick={() => setVoiceGender(prev => prev === 'female' ? 'male' : 'female')}
              className={cn(
                "p-1.5 rounded-md transition-all flex items-center gap-1 text-[10px] font-black uppercase",
                voiceGender === 'female' ? "text-rose-500 bg-white dark:bg-gray-700 shadow-sm" : "text-blue-500 bg-white dark:bg-gray-700 shadow-sm"
              )}
              title="Toggle Voice Gender"
            >
              {voiceGender === 'female' ? <User className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
              {voiceGender}
            </button>
            
            <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1 self-center" />
            
            {!isSpeaking ? (
              <button 
                onClick={handleSpeak}
                disabled={!notes[currentNoteIndex]?.text}
                className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-md transition-colors"
              >
                <Play className="w-4 h-4" />
              </button>
            ) : (
              <button 
                onClick={handleStop}
                className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors animate-pulse"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            )}
          </div>

          <button 
            onClick={addNote}
            className="p-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full hover:bg-purple-200 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="relative">
        <textarea 
          value={notes[currentNoteIndex]?.text || ''}
          onChange={(e) => {
            const updatedNotes = [...notes];
            updatedNotes[currentNoteIndex].text = e.target.value;
            setNotes(updatedNotes);
          }}
          placeholder="Type your notes here..."
          className="w-full h-64 p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none resize-none font-medium leading-relaxed"
        />
        
        {/* Speed Selector overlay */}
        <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-1.5 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm">
          <Settings2 className="w-3 h-3 text-gray-400" />
          <select 
            value={speechRate}
            onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
            className="text-[10px] font-black bg-transparent outline-none cursor-pointer"
          >
            <option value="0.8">0.8x</option>
            <option value="1.0">1.0x</option>
            <option value="1.1">1.1x</option>
            <option value="1.2">1.2x</option>
            <option value="1.5">1.5x</option>
            <option value="2.0">2.0x</option>
          </select>
        </div>
      </div>

      <div className="flex justify-between items-center text-xs text-gray-500">
        <button 
          onClick={deleteNote}
          className="text-red-500 hover:underline font-bold"
        >
          Delete Note
        </button>
        <span className="font-mono">{notes[currentNoteIndex]?.text.length || 0} characters</span>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '../../lib/utils';

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex space-x-2 overflow-x-auto pb-2 max-w-[250px] hide-scrollbar">
          {notes.map((note, idx) => (
            <button 
              key={note.id} 
              onClick={() => setCurrentNoteIndex(idx)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap",
                currentNoteIndex === idx ? "bg-purple-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
              )}
            >
              Note {idx + 1}
            </button>
          ))}
        </div>
        <button 
          onClick={addNote}
          className="p-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full hover:bg-purple-200 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <textarea 
        value={notes[currentNoteIndex]?.text || ''}
        onChange={(e) => {
          const updatedNotes = [...notes];
          updatedNotes[currentNoteIndex].text = e.target.value;
          setNotes(updatedNotes);
        }}
        placeholder="Type your notes here..."
        className="w-full h-64 p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none resize-none font-medium"
      />
      <div className="flex justify-between items-center text-xs text-gray-500">
        <button 
          onClick={deleteNote}
          className="text-red-500 hover:underline"
        >
          Delete Note
        </button>
        <span>{notes[currentNoteIndex]?.text.length || 0} characters</span>
      </div>
    </div>
  );
}

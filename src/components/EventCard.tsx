import React from 'react';
import { Calendar, MapPin, Users, Clock } from 'lucide-react';
import { motion } from 'motion/react';

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  organizerId: string;
  attendees: string[];
  category: string;
  imageUrl?: string;
}

interface EventCardProps {
  event: Event;
  onRSVP: (eventId: string) => void;
  onClick: (event: Event) => void;
  isAttending: boolean;
}

export default function EventCard({ event, onRSVP, onClick, isAttending }: EventCardProps) {
  const formattedDate = new Date(event.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric'
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      onClick={() => onClick(event)}
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden cursor-pointer hover:shadow-md transition-all"
    >
      {event.imageUrl && (
        <img src={event.imageUrl} alt={event.title} className="w-full h-48 object-cover" referrerPolicy="no-referrer" />
      )}
      <div className="p-5">
        <div className="flex justify-between items-start mb-2">
          <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-bold uppercase tracking-wider">
            {event.category}
          </span>
          <div className="flex items-center text-gray-500 text-xs gap-1">
            <Users className="w-3 h-3" />
            {event.attendees.length} attending
          </div>
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{event.title}</h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">{event.description}</p>
        
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-gray-500 text-xs gap-2">
            <Calendar className="w-3.5 h-3.5" />
            {formattedDate}
          </div>
          <div className="flex items-center text-gray-500 text-xs gap-2">
            <MapPin className="w-3.5 h-3.5" />
            {event.location}
          </div>
        </div>

        <button 
          onClick={(e) => {
            e.stopPropagation();
            onRSVP(event.id);
          }}
          className={cn(
            "w-full py-2 rounded-xl text-sm font-bold transition-all",
            isAttending 
              ? "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
              : "bg-indigo-600 text-white hover:bg-indigo-700"
          )}
        >
          {isAttending ? "Cancel RSVP" : "RSVP Now"}
        </button>
      </div>
    </motion.div>
  );
}

// Helper for cn (re-imported or assumed)
import { cn } from '../lib/utils';

import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, addDoc, serverTimestamp, increment } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import EventCard from '../components/EventCard';
import { Loader2, Plus, Calendar, X, MapPin, Clock, Users, Share2, Info, DollarSign, Video, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useRevenue } from '../contexts/RevenueContext';
import { useAuth } from '../contexts/AuthContext';

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
  price?: number;
  isVirtual?: boolean;
}

export default function Events() {
  const { userData } = useAuth();
  const { addRevenue } = useRevenue();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: '',
    location: '',
    category: 'Social',
    imageUrl: ''
  });

  const [isProcessing, setIsProcessing] = useState(false);

  const handleBuyTicket = async (event: Event) => {
    if (!auth.currentUser || !userData || !event.price) return;
    setIsProcessing(true);

    if ((userData.balance || 0) < event.price) {
      alert("Insufficient balance to buy a ticket.");
      setIsProcessing(false);
      return;
    }

    try {
      // Ticket Fee: 100% Platform
      const platformShare = event.price;
      const userShare = 0;

      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        balance: increment(-event.price)
      });

      await addRevenue(userShare, platformShare, `Event Ticket: ${event.title}`, 'events');
      
      // Add to attendees
      const eventRef = doc(db, 'events', event.id);
      await updateDoc(eventRef, {
        attendees: arrayUnion(auth.currentUser.uid)
      });

      alert(`Ticket purchased! You are now registered for "${event.title}".`);
      setSelectedEvent(null);
    } catch (error) {
      console.error("Error buying ticket:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSponsorEvent = async (event: Event) => {
    if (!auth.currentUser || !userData) return;
    // Sponsorship Fee: $100.00
    // 100% Platform revenue
    const fee = 100.00;
    const platformShare = fee;
    const userShare = 0;

    if ((userData.balance || 0) < fee) {
      alert("Insufficient balance for sponsorship.");
      return;
    }

    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        balance: increment(-fee)
      });
      await addRevenue(userShare, platformShare, `Event Sponsorship: ${event.title}`, 'events');
      alert(`Thank you for sponsoring "${event.title}"! Your brand will be featured at the event.`);
    } catch (error) {
      console.error("Error sponsoring event:", error);
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'events'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        // Seed some sample events if none exist
        const sampleEvents: Event[] = [
          {
            id: 'sample-1',
            title: 'Community Tech Meetup',
            description: 'Join us for a discussion on the latest AI trends and how they impact our community. We will cover generative AI, LLMs, and the future of work.',
            date: '2026-04-15T14:00:00Z',
            location: 'Nairobi Innovation Hub',
            organizerId: 'system',
            attendees: [],
            category: 'Technology',
            imageUrl: 'https://picsum.photos/seed/tech/800/400'
          },
          {
            id: 'sample-2',
            title: 'Pulse Feeds Launch Party',
            description: 'Celebrating the new features of Pulse Feeds! Free drinks, networking, and a live demo of our latest AI tools.',
            date: '2026-05-01T18:00:00Z',
            location: 'Sky Lounge, Westlands',
            organizerId: 'system',
            attendees: [],
            category: 'Social',
            imageUrl: 'https://picsum.photos/seed/party/800/400'
          },
          {
            id: 'sample-3',
            title: 'Financial Literacy Workshop',
            description: 'Learn how to manage your rewards and invest for the future. Expert speakers will share tips on budgeting and crypto basics.',
            date: '2026-04-20T10:00:00Z',
            location: 'Online Webinar',
            organizerId: 'system',
            attendees: [],
            category: 'Education',
            imageUrl: 'https://picsum.photos/seed/finance/800/400'
          },
          {
            id: 'sample-4',
            title: 'AI Strategy Masterclass',
            description: 'A deep dive into building profitable AI agents. Limited seats available.',
            date: '2026-04-25T15:00:00Z',
            location: 'Virtual Zoom',
            organizerId: 'system',
            attendees: [],
            category: 'Education',
            imageUrl: 'https://picsum.photos/seed/masterclass/800/400',
            price: 25.00,
            isVirtual: true
          }
        ];
        setEvents(sampleEvents);
      } else {
        const eventsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
        setEvents(eventsData);
      }
      setLoading(false);
    }, (error) => {
      console.error("Events Fetch Error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleRSVP = async (eventId: string) => {
    if (!auth.currentUser || !userData) return;
    
    const eventRef = doc(db, 'events', eventId);
    const event = events.find(e => e.id === eventId);
    
    if (!event) return;

    if (event.attendees.includes(auth.currentUser.uid)) {
      await updateDoc(eventRef, {
        attendees: arrayRemove(auth.currentUser.uid)
      });
    } else {
      // Check for payment if price exists
      if (event.price && event.price > 0) {
        if (userData.balance < event.price) {
          alert(`Insufficient balance. This event costs $${event.price.toFixed(2)}.`);
          return;
        }

        // 100% Platform revenue
        const platformShare = event.price;
        const userShare = 0;

        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          balance: increment(-event.price)
        });

        await addRevenue(userShare, platformShare, `Event Ticket: ${event.title}`, 'events');
        alert("Ticket purchased successfully!");
      }

      await updateDoc(eventRef, {
        attendees: arrayUnion(auth.currentUser.uid)
      });
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    try {
      await addDoc(collection(db, 'events'), {
        ...newEvent,
        organizerId: auth.currentUser.uid,
        attendees: [auth.currentUser.uid],
        createdAt: serverTimestamp()
      });
      setShowCreateModal(false);
      setNewEvent({
        title: '',
        description: '',
        date: '',
        location: '',
        category: 'Social',
        imageUrl: ''
      });
    } catch (error) {
      console.error("Create Event Error:", error);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <Calendar className="w-8 h-8 text-indigo-600" />
          Community Events
        </h1>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all"
        >
          <Plus className="w-4 h-4" />
          Create Event
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {events.map(event => (
            <EventCard 
              key={event.id} 
              event={event} 
              onRSVP={handleRSVP} 
              onClick={(e) => setSelectedEvent(e)}
              isAttending={event.attendees.includes(auth.currentUser?.uid || '')}
            />
          ))}
        </div>
      )}

      {/* Event Detail Modal */}
      <AnimatePresence>
        {selectedEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl"
            >
              <div className="relative h-64">
                <img 
                  src={selectedEvent.imageUrl || 'https://picsum.photos/seed/event/800/400'} 
                  alt={selectedEvent.title} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <button 
                  onClick={() => setSelectedEvent(null)}
                  className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-bold uppercase tracking-wider mb-3 inline-block">
                      {selectedEvent.category}
                    </span>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{selectedEvent.title}</h2>
                  </div>
                  <button className="p-2 text-gray-400 hover:text-indigo-600 transition-all">
                    <Share2 className="w-6 h-6" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <Clock className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-bold">Date & Time</p>
                      <p className="text-sm font-medium">{new Date(selectedEvent.date).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      {selectedEvent.isVirtual ? <Video className="w-5 h-5 text-indigo-500" /> : <MapPin className="w-5 h-5 text-indigo-500" />}
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-bold">Location</p>
                      <p className="text-sm font-medium">{selectedEvent.location}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <Users className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-bold">Attendees</p>
                      <p className="text-sm font-medium">{selectedEvent.attendees.length} people going</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      {selectedEvent.price ? <DollarSign className="w-5 h-5 text-indigo-500" /> : <Info className="w-5 h-5 text-indigo-500" />}
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-bold">{selectedEvent.price ? 'Ticket Price' : 'Organizer'}</p>
                      <p className="text-sm font-medium">{selectedEvent.price ? `$${selectedEvent.price.toFixed(2)}` : 'Community Member'}</p>
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">About this event</h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    {selectedEvent.description}
                  </p>
                </div>

                <div className="flex gap-4">
                  {selectedEvent.price && !selectedEvent.attendees.includes(auth.currentUser?.uid || '') ? (
                    <button 
                      onClick={() => handleBuyTicket(selectedEvent)}
                      disabled={isProcessing}
                      className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <DollarSign className="w-5 h-5" />}
                      Buy Ticket (${selectedEvent.price.toFixed(2)})
                    </button>
                  ) : (
                    <button 
                      onClick={() => {
                        handleRSVP(selectedEvent.id);
                        setSelectedEvent(null);
                      }}
                      className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none transition-all"
                    >
                      {selectedEvent.attendees.includes(auth.currentUser?.uid || '') ? "Cancel RSVP" : "RSVP Now"}
                    </button>
                  )}
                  
                  <button 
                    onClick={() => handleSponsorEvent(selectedEvent)}
                    className="px-6 py-4 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-2xl font-bold text-sm hover:bg-gray-200 transition-all flex flex-col items-center justify-center"
                  >
                    <Star className="w-4 h-4 text-yellow-500 mb-1" />
                    Sponsor
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Event Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-md p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create New Event</h2>
                <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Event Title</label>
                  <input 
                    required
                    type="text"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-xl p-3 focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. Weekend Hackathon"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Description</label>
                  <textarea 
                    required
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 h-24"
                    placeholder="What's happening?"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Date & Time</label>
                    <input 
                      required
                      type="datetime-local"
                      value={newEvent.date}
                      onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
                      className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-xl p-3 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Category</label>
                    <select 
                      value={newEvent.category}
                      onChange={(e) => setNewEvent({...newEvent, category: e.target.value})}
                      className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-xl p-3 focus:ring-2 focus:ring-indigo-500"
                    >
                      <option>Social</option>
                      <option>Technology</option>
                      <option>Education</option>
                      <option>Health</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Location</label>
                  <input 
                    required
                    type="text"
                    value={newEvent.location}
                    onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-xl p-3 focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. Central Park or Zoom"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Image URL (Optional)</label>
                  <input 
                    type="url"
                    value={newEvent.imageUrl}
                    onChange={(e) => setNewEvent({...newEvent, imageUrl: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-xl p-3 focus:ring-2 focus:ring-indigo-500"
                    placeholder="https://..."
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all mt-4"
                >
                  Create Event
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

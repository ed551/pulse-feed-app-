import { useState, useEffect } from "react";
import { Search, UserPlus, MessageSquare, Phone, MoreVertical, User, ShieldCheck, Star, RefreshCw, Smartphone, ExternalLink, Ban, Trash2, Copy, Edit2, CheckCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { useAuth } from "../contexts/AuthContext";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, onSnapshot, orderBy, doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

interface Contact {
  id: string;
  displayName: string;
  photoURL?: string;
  status?: string;
  isOnline?: boolean;
  role?: string;
  lastSeen?: any;
  isSynced?: boolean;
  phoneNumber?: string;
}

export default function Contacts() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [syncedContacts, setSyncedContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [activeMenuContactId, setActiveMenuContactId] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;

    // Fetch Pulse Feeds community members
    const q = query(
      collection(db, "users_public"),
      orderBy("displayName")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter((user: any) => user.id !== currentUser.uid) as Contact[];
      setContacts(usersData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "users_public");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleSyncContacts = async () => {
    // Check if running in an iframe
    const isIframe = window.self !== window.top;

    if (!('contacts' in navigator && 'select' in (navigator as any).contacts)) {
      setSyncError("Contact Picker API is not supported in this browser. Try on a mobile device.");
      return;
    }

    if (isIframe) {
      setSyncError("The Contacts API cannot be used inside a preview frame. Please open the app in a new tab to sync contacts.");
      return;
    }

    setIsSyncing(true);
    setSyncError(null);

    try {
      const props = ['name', 'tel'];
      const opts = { multiple: true };
      const contactsFromPhone = await (navigator as any).contacts.select(props, opts);
      
      if (contactsFromPhone.length > 0) {
        const formattedContacts = contactsFromPhone.map((c: any, index: number) => ({
          id: `synced-${index}`,
          displayName: c.name?.[0] || "Unknown",
          phoneNumber: c.tel?.[0] || "",
          isSynced: true,
          status: "From phone contacts"
        }));
        setSyncedContacts(formattedContacts);
      }
    } catch (err: any) {
      console.error("Sync error:", err);
      if (err.name === 'SecurityError' || err.message?.includes('top frame')) {
        setSyncError("Security restriction: The contacts API can only be used in the top frame. Please open the app in a new tab.");
      } else if (err.name !== 'AbortError') {
        setSyncError("Failed to sync contacts. Please check permissions.");
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleBlockContact = async (contactId: string) => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        blockedUsers: arrayUnion(contactId)
      });
      setActiveMenuContactId(null);
      window.dispatchEvent(new CustomEvent('show-notification', { 
        detail: { title: "Contact Blocked", body: "User added to restricted list.", type: "error" } 
      }));
    } catch (e) {
      console.error(e);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    window.dispatchEvent(new CustomEvent('show-notification', { 
      detail: { title: "Copied", body: "Number copied to clipboard.", type: "success" } 
    }));
    setActiveMenuContactId(null);
  };

  const allContacts = [...contacts, ...syncedContacts];
  const filteredContacts = allContacts.filter(contact => 
    contact.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white">Contacts</h1>
          <p className="text-gray-500 dark:text-gray-400">Connect with your community members</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleSyncContacts}
            disabled={isSyncing}
            className={cn(
              "flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold rounded-2xl transition-all shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50",
              isSyncing && "opacity-50 cursor-not-allowed"
            )}
          >
            {isSyncing ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Smartphone className="w-5 h-5 text-purple-500" />
            )}
            <span>{isSyncing ? "Syncing..." : "Sync Phone"}</span>
          </button>
          <button className="flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-purple-500/20">
            <UserPlus className="w-5 h-5" />
            <span>Add New</span>
          </button>
        </div>
      </div>

      {syncError && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl text-sm font-medium border border-red-100 dark:border-red-900/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex-1">
            {syncError}
          </div>
          {syncError.includes("new tab") && (
            <button 
              onClick={() => window.open(window.location.href, '_blank')}
              className="flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/40 rounded-xl hover:bg-red-200 transition-colors whitespace-nowrap self-end sm:self-auto shrink-0"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open in New Tab</span>
            </button>
          )}
        </motion.div>
      )}

      {/* Search Bar */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
        <input
          type="text"
          placeholder="Search contacts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-purple-500 transition-all shadow-sm text-gray-900 dark:text-white"
        />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full"
            />
            <p className="text-gray-500 font-medium">Loading contacts...</p>
          </div>
        ) : filteredContacts.length > 0 ? (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {filteredContacts.map((contact) => (
              <motion.div
                key={contact.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {contact.photoURL ? (
                      <img 
                        src={contact.photoURL} 
                        alt={contact.displayName} 
                        className="w-14 h-14 rounded-2xl object-cover border-2 border-white dark:border-gray-800 shadow-sm"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold border-2 border-white dark:border-gray-800 shadow-sm">
                        {contact.displayName?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {contact.isOnline && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full shadow-sm" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900 dark:text-white">{contact.displayName}</h3>
                      {contact.role === 'admin' && <ShieldCheck className="w-4 h-4 text-purple-500" />}
                      {contact.isSynced && <Smartphone className="w-3 h-3 text-gray-400" />}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                      {contact.isSynced ? (contact.phoneNumber || "Phone contact") : (contact.status || "Hey there! I'm using Pulse Feeds.")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {contact.isSynced ? (
                    <button 
                      onClick={() => {
                        // In a real app, this would open SMS or a share link
                        alert(`Inviting ${contact.displayName} to Pulse Feeds!`);
                      }}
                      className="px-4 py-2 bg-purple-600 text-white text-sm font-bold rounded-xl hover:bg-purple-700 transition-colors"
                    >
                      Invite
                    </button>
                  ) : (
                    <>
                      <button 
                        onClick={() => navigate(`/messages?to=${contact.id}`)}
                        className="p-3 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl hover:bg-purple-200 transition-colors"
                        title="Message"
                      >
                        <MessageSquare className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => navigate('/calls')}
                        className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-200 transition-colors"
                        title="Call"
                      >
                        <Phone className="w-5 h-5" />
                      </button>
                    </>
                  )}
                <div className="relative">
                  <button 
                    onClick={() => setActiveMenuContactId(activeMenuContactId === contact.id ? null : contact.id)}
                    className="p-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl transition-colors"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>

                  <AnimatePresence>
                    {activeMenuContactId === contact.id && (
                      <>
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => setActiveMenuContactId(null)}
                        />
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: -10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -10 }}
                          className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 z-50 py-2 overflow-hidden"
                        >
                          <div className="px-4 py-3 border-b border-gray-50 dark:border-gray-700">
                            <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{contact.displayName}</p>
                            <p className="text-[10px] text-gray-500">{contact.phoneNumber || 'Pulse User'}</p>
                          </div>
                          
                          <div className="py-1">
                            <button 
                              onClick={() => copyToClipboard(contact.phoneNumber || contact.id)}
                              className="w-full flex items-center px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                              <Copy className="w-4 h-4 mr-3 text-gray-400" />
                              Copy number
                            </button>
                            <button className="w-full flex items-center px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                              <Edit2 className="w-4 h-4 mr-3 text-gray-400" />
                              Edit number before call
                            </button>
                            <button className="w-full flex items-center px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                              <CheckCircle className="w-4 h-4 mr-3 text-gray-400" />
                              Not spam
                            </button>
                            <button 
                              onClick={() => handleBlockContact(contact.id)}
                              className="w-full flex items-center px-4 py-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                            >
                              <Ban className="w-4 h-4 mr-3 text-red-500" />
                              Block
                            </button>
                            <button className="w-full flex items-center px-4 py-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
                              <Trash2 className="w-4 h-4 mr-3 text-red-500" />
                              Delete
                            </button>
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <User className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No contacts found</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-xs">
              {searchQuery ? `No results for "${searchQuery}"` : "Start connecting with people in your community!"}
            </p>
          </div>
        )}
      </div>

      {/* Suggested Contacts */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-500" />
          Suggested for you
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Mock suggestions */}
          {[1, 2].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 p-4 rounded-3xl border border-gray-100 dark:border-gray-700 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">Community Member {i}</p>
                  <p className="text-xs text-gray-500">Mutual connections: {Math.floor(Math.random() * 10)}</p>
                </div>
              </div>
              <button className="p-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors">
                <UserPlus className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

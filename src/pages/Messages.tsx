import { useState, useEffect, useRef } from "react";
import { Search, Send, Image, Smile, MoreVertical, Phone, Video, Info, ArrowLeft, Check, CheckCheck, Loader2, MessageSquare, User } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { useAuth } from "../contexts/AuthContext";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, onSnapshot, where, orderBy, addDoc, serverTimestamp, doc, getDoc, limit, updateDoc, increment } from "firebase/firestore";
import { useSearchParams, useNavigate } from "react-router-dom";

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: any;
  status: 'sent' | 'delivered' | 'read';
}

interface Chat {
  id: string;
  participants: string[];
  lastMessage?: string;
  lastMessageTime?: any;
  unreadCount?: number;
  lastSenderId?: string;
  otherUser?: {
    id: string;
    displayName: string;
    photoURL?: string;
    isOnline?: boolean;
  };
}

export default function Messages() {
  const { currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const targetUserId = searchParams.get('to');

  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch Chats
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", currentUser.uid),
      orderBy("lastMessageTime", "desc")
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const chatsData = await Promise.all(snapshot.docs.map(async (chatDoc) => {
        const data = chatDoc.data();
        const otherUserId = data.participants.find((id: string) => id !== currentUser.uid);
        
        // Fetch other user info
        let otherUser = null;
        if (otherUserId) {
          const userDoc = await getDoc(doc(db, "users_public", otherUserId));
          if (userDoc.exists()) {
            otherUser = { id: otherUserId, ...userDoc.data() };
          }
        }

        return {
          id: chatDoc.id,
          ...data,
          otherUser
        } as Chat;
      }));

      setChats(chatsData);
      setLoading(false);

      // If there's a target user from URL, try to find or create a chat
      if (targetUserId && !activeChat) {
        const existingChat = chatsData.find(c => c.participants.includes(targetUserId));
        if (existingChat) {
          setActiveChat(existingChat);
        } else {
          // Fetch target user info to show in header even if no chat exists yet
          const userDoc = await getDoc(doc(db, "users_public", targetUserId));
          if (userDoc.exists()) {
            const targetUserData = userDoc.data();
            setActiveChat({
              id: "new", // Temporary ID for new chat
              participants: [currentUser.uid, targetUserId],
              otherUser: { id: targetUserId, ...targetUserData }
            } as Chat);
          }
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "chats");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, targetUserId]);

  // Fetch Messages for active chat
  useEffect(() => {
    if (!activeChat || activeChat.id === "new") {
      setMessages([]);
      return;
    }

    // Clear unread count when opening chat
    if (activeChat.unreadCount && activeChat.lastSenderId !== currentUser?.uid) {
      const clearUnread = async () => {
        try {
          await updateDoc(doc(db, "chats", activeChat.id), {
            unreadCount: 0
          });
        } catch (err) {
          console.error("Error clearing unread count:", err);
        }
      };
      clearUnread();
    }

    const q = query(
      collection(db, "chats", activeChat.id, "messages"),
      orderBy("timestamp", "asc"),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setMessages(msgs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `chats/${activeChat.id}/messages`);
    });

    return () => unsubscribe();
  }, [activeChat]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !activeChat || !newMessage.trim() || isSending) return;

    setIsSending(true);
    const text = newMessage.trim();
    setNewMessage("");

    try {
      let chatId = activeChat.id;

      // Create new chat document if it's the first message
      if (chatId === "new") {
        const chatRef = await addDoc(collection(db, "chats"), {
          participants: activeChat.participants,
          lastMessage: text,
          lastMessageTime: serverTimestamp(),
          unreadCount: 1,
          lastSenderId: currentUser.uid
        });
        chatId = chatRef.id;
        setActiveChat({ ...activeChat, id: chatId });
      }

      await addDoc(collection(db, "chats", chatId, "messages"), {
        senderId: currentUser.uid,
        text,
        timestamp: serverTimestamp(),
        status: 'sent'
      });

      // Update last message in chat doc
      if (activeChat.id !== "new") {
        await updateDoc(doc(db, "chats", chatId), {
          lastMessage: text,
          lastMessageTime: serverTimestamp(),
          lastSenderId: currentUser.uid,
          unreadCount: increment(1)
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `chats/${activeChat.id}/messages`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="h-[calc(100dvh-120px)] flex bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
      {/* Sidebar - Chat List */}
      <div className={cn(
        "w-full md:w-80 lg:w-96 border-r border-gray-100 dark:border-gray-800 flex flex-col transition-all",
        activeChat ? "hidden md:flex" : "flex"
      )}>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">Messages</h1>
            <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
              <MoreVertical className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
            <input
              type="text"
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-purple-500 transition-all text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
            </div>
          ) : chats.length > 0 ? (
            chats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => setActiveChat(chat)}
                className={cn(
                  "w-full p-4 rounded-3xl flex items-center gap-4 transition-all group",
                  activeChat?.id === chat.id 
                    ? "bg-purple-50 dark:bg-purple-900/20" 
                    : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                )}
              >
                <div className="relative flex-shrink-0">
                  {chat.otherUser?.photoURL ? (
                    <img 
                      src={chat.otherUser.photoURL} 
                      alt={chat.otherUser.displayName} 
                      className="w-12 h-12 rounded-2xl object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                      {chat.otherUser?.displayName?.charAt(0).toUpperCase() || '?'}
                    </div>
                  )}
                  {chat.otherUser?.isOnline && (
                    <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full" />
                  )}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h3 className={cn(
                      "font-bold truncate",
                      chat.unreadCount ? "text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300"
                    )}>
                      {chat.otherUser?.displayName || 'Unknown User'}
                    </h3>
                    <span className="text-[10px] text-gray-400 font-medium">
                      {chat.lastMessageTime ? new Date(chat.lastMessageTime.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className={cn(
                      "text-xs truncate flex-1",
                      (chat.unreadCount && chat.lastSenderId !== currentUser?.uid) ? "font-bold text-gray-900 dark:text-white" : "text-gray-500"
                    )}>
                      {chat.lastMessage || 'No messages yet'}
                    </p>
                    {(chat.unreadCount && chat.lastSenderId !== currentUser?.uid) ? (
                      <span className="ml-2 w-5 h-5 bg-purple-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {chat.unreadCount}
                      </span>
                    ) : null}
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="text-center py-20 px-6">
              <p className="text-sm text-gray-500">No conversations yet. Start a chat from your contacts!</p>
              <button 
                onClick={() => navigate('/contacts')}
                className="mt-4 text-purple-600 font-bold text-sm hover:underline"
              >
                View Contacts
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={cn(
        "flex-1 flex flex-col relative",
        !activeChat && "hidden md:flex items-center justify-center bg-gray-50 dark:bg-gray-900/50"
      )}>
        {activeChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setActiveChat(null)}
                  className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="relative">
                  {activeChat.otherUser?.photoURL ? (
                    <img 
                      src={activeChat.otherUser.photoURL} 
                      alt={activeChat.otherUser.displayName} 
                      className="w-10 h-10 rounded-xl object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                      {activeChat.otherUser?.displayName?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {activeChat.otherUser?.isOnline && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full" />
                  )}
                </div>
                <div>
                  <h2 className="font-bold text-gray-900 dark:text-white leading-tight">
                    {activeChat.otherUser?.displayName}
                  </h2>
                  <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest">
                    {activeChat.otherUser?.isOnline ? 'Online' : 'Offline'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors text-gray-500">
                  <Phone className="w-5 h-5" />
                </button>
                <button className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors text-gray-500">
                  <Video className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setShowDetails(!showDetails)}
                  className={cn(
                    "p-2.5 rounded-xl transition-colors",
                    showDetails ? "bg-purple-100 text-purple-600" : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
                  )}
                >
                  <Info className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
              {messages.length > 0 ? (
                messages.map((msg, idx) => {
                  const isMe = msg.senderId === currentUser?.uid;
                  const showDate = idx === 0 || (msg.timestamp && messages[idx-1].timestamp && 
                    new Date(msg.timestamp.toDate()).toDateString() !== new Date(messages[idx-1].timestamp.toDate()).toDateString());

                  return (
                    <div key={msg.id} className="space-y-4">
                      {showDate && (
                        <div className="flex justify-center my-6">
                          <span className="px-4 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                            {new Date(msg.timestamp?.toDate()).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      )}
                      <div className={cn(
                        "flex",
                        isMe ? "justify-end" : "justify-start"
                      )}>
                        <div className={cn(
                          "max-w-[80%] md:max-w-[70%] rounded-3xl px-4 py-3 relative group",
                          isMe 
                            ? "bg-purple-600 text-white rounded-tr-none" 
                            : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-tl-none"
                        )}>
                          <p className="text-sm leading-relaxed">{msg.text}</p>
                          <div className={cn(
                            "flex items-center gap-1 mt-1 justify-end",
                            isMe ? "text-purple-200" : "text-gray-400"
                          )}>
                            <span className="text-[9px] font-medium">
                              {msg.timestamp ? new Date(msg.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                            </span>
                            {isMe && (
                              msg.status === 'read' ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                    <MessageSquare className="w-8 h-8" />
                  </div>
                  <p className="text-sm font-medium">No messages yet. Say hi!</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <button type="button" className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors text-gray-500">
                    <Image className="w-5 h-5" />
                  </button>
                  <button type="button" className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors text-gray-500">
                    <Smile className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="w-full pl-4 pr-12 py-3.5 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-purple-500 transition-all text-sm"
                  />
                  <button 
                    type="submit"
                    disabled={!newMessage.trim() || isSending}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all disabled:opacity-50 disabled:scale-95"
                  >
                    {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-12 space-y-6">
            <div className="w-32 h-32 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center text-purple-600 dark:text-purple-400">
              <MessageSquare className="w-16 h-16" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-gray-900 dark:text-white">Your Conversations</h2>
              <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                Select a chat from the sidebar to start messaging or find your friends in the contacts page.
              </p>
            </div>
            <button 
              onClick={() => navigate('/contacts')}
              className="px-8 py-3 bg-purple-600 text-white font-bold rounded-2xl hover:bg-purple-700 transition-all shadow-lg shadow-purple-500/20"
            >
              Find Contacts
            </button>
          </div>
        )}

        {/* Chat Details Sidebar (Optional) */}
        <AnimatePresence>
          {showDetails && activeChat && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="absolute inset-y-0 right-0 w-full sm:w-80 bg-white dark:bg-gray-900 border-l border-gray-100 dark:border-gray-800 z-20 shadow-2xl"
            >
              <div className="p-6 flex flex-col items-center text-center space-y-6">
                <div className="w-full flex justify-start">
                  <button 
                    onClick={() => setShowDetails(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                </div>
                <div className="relative">
                  {activeChat.otherUser?.photoURL ? (
                    <img 
                      src={activeChat.otherUser.photoURL} 
                      alt={activeChat.otherUser.displayName} 
                      className="w-24 h-24 rounded-3xl object-cover border-4 border-white dark:border-gray-800 shadow-xl"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-white dark:border-gray-800 shadow-xl">
                      {activeChat.otherUser?.displayName?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white">{activeChat.otherUser?.displayName}</h3>
                  <p className="text-sm text-gray-500">Active now</p>
                </div>

                <div className="w-full grid grid-cols-2 gap-3">
                  <button className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl flex flex-col items-center gap-2 hover:bg-gray-100 transition-colors">
                    <User className="w-5 h-5 text-purple-500" />
                    <span className="text-xs font-bold">Profile</span>
                  </button>
                  <button className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl flex flex-col items-center gap-2 hover:bg-gray-100 transition-colors">
                    <Search className="w-5 h-5 text-blue-500" />
                    <span className="text-xs font-bold">Search</span>
                  </button>
                </div>

                <div className="w-full space-y-1 text-left">
                  <button className="w-full p-4 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-2xl transition-colors flex items-center justify-between group">
                    <span className="text-sm font-bold">Media, Links & Docs</span>
                    <span className="text-xs text-gray-400 group-hover:text-purple-500">12 {'>'}</span>
                  </button>
                  <button className="w-full p-4 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-2xl transition-colors flex items-center justify-between group">
                    <span className="text-sm font-bold">Mute Notifications</span>
                    <div className="w-10 h-5 bg-gray-200 dark:bg-gray-700 rounded-full relative">
                      <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full" />
                    </div>
                  </button>
                  <button className="w-full p-4 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-colors flex items-center gap-3 text-red-500">
                    <Info className="w-5 h-5" />
                    <span className="text-sm font-bold">Block User</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

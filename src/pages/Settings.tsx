import { useState, useEffect } from "react";
import { 
  User, 
  Shield, 
  Lock, 
  Bell, 
  Eye, 
  Trash2, 
  ChevronRight, 
  Fingerprint, 
  Smartphone, 
  Mail, 
  UserCircle,
  ArrowLeft,
  Check,
  Loader2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import FingerprintModal from "../components/FingerprintModal";
import { cn } from "../lib/utils";

export default function Settings() {
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [showFingerprintModal, setShowFingerprintModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  
  // Form states
  const [displayName, setDisplayName] = useState(currentUser?.displayName || "");
  const [email, setEmail] = useState(currentUser?.email || "");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (currentUser?.displayName) setDisplayName(currentUser.displayName);
    if (currentUser?.email) setEmail(currentUser.email);
  }, [currentUser]);

  const handleSaveProfile = async () => {
    if (!currentUser) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        displayName: displayName
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSensitiveAction = (action: string) => {
    setPendingAction(action);
    setShowFingerprintModal(true);
  };

  const handleFingerprintSuccess = () => {
    setShowFingerprintModal(false);
    if (pendingAction === 'delete') {
      alert("Identity verified. Account deletion process initiated. You will be logged out shortly.");
      // In a real app, you'd call a backend function to delete the account
    } else if (pendingAction === 'security') {
      setActiveSection('security-details');
    }
    setPendingAction(null);
  };

  const sections = [
    {
      id: 'personal',
      title: 'Personal Information',
      description: 'Manage your name, email, and basic info',
      icon: <UserCircle className="w-5 h-5 text-blue-500" />,
      content: (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Display Name</label>
            <input 
              type="text" 
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl p-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email Address</label>
            <input 
              type="email" 
              value={email}
              disabled
              className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm text-gray-500 dark:text-gray-400 cursor-not-allowed"
            />
            <p className="text-[10px] text-gray-400">Email cannot be changed directly for security reasons.</p>
          </div>
          <button 
            onClick={handleSaveProfile}
            disabled={isSaving || displayName === currentUser?.displayName}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : saveSuccess ? <Check className="w-4 h-4 mr-2" /> : null}
            {saveSuccess ? "Saved Successfully" : "Save Changes"}
          </button>
        </div>
      )
    },
    {
      id: 'security',
      title: 'Security & Privacy',
      description: 'Fingerprint, password, and visibility',
      icon: <Shield className="w-5 h-5 text-purple-500" />,
      content: (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <button 
            onClick={() => handleSensitiveAction('security')}
            className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <Fingerprint className="w-5 h-5 text-purple-500" />
              <div className="text-left">
                <p className="text-sm font-bold text-gray-900 dark:text-white">Biometric Authentication</p>
                <p className="text-[10px] text-gray-500">Enabled for sensitive actions</p>
              </div>
            </div>
            <div className="w-10 h-5 bg-green-500 rounded-full relative">
              <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full"></div>
            </div>
          </button>
          
          <button className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
            <div className="flex items-center space-x-3">
              <Lock className="w-5 h-5 text-blue-500" />
              <div className="text-left">
                <p className="text-sm font-bold text-gray-900 dark:text-white">Change Password</p>
                <p className="text-[10px] text-gray-500">Last changed 3 months ago</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>

          <button className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
            <div className="flex items-center space-x-3">
              <Eye className="w-5 h-5 text-green-500" />
              <div className="text-left">
                <p className="text-sm font-bold text-gray-900 dark:text-white">Profile Visibility</p>
                <p className="text-[10px] text-gray-500">Currently set to Public</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      )
    },
    {
      id: 'notifications',
      title: 'Notifications',
      description: 'Push, email, and in-app alerts',
      icon: <Bell className="w-5 h-5 text-orange-500" />,
      content: (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">Push Notifications</p>
              <p className="text-[10px] text-gray-500">Alerts for new rewards and posts</p>
            </div>
            <div className="w-10 h-5 bg-blue-600 rounded-full relative cursor-pointer">
              <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full"></div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">Email Marketing</p>
              <p className="text-[10px] text-gray-500">Weekly updates and special offers</p>
            </div>
            <div className="w-10 h-5 bg-gray-300 dark:bg-gray-600 rounded-full relative cursor-pointer">
              <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full"></div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'danger',
      title: 'Danger Zone',
      description: 'Irreversible account actions',
      icon: <Trash2 className="w-5 h-5 text-red-500" />,
      content: (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/30">
            <p className="text-xs text-red-600 dark:text-red-400 mb-4">Deleting your account will permanently remove all your data, rewards, and posts. This action cannot be undone.</p>
            <button 
              onClick={() => handleSensitiveAction('delete')}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center"
            >
              <Trash2 className="w-4 h-4 mr-2" /> Delete My Account
            </button>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      <div className="flex items-center space-x-4 mb-8">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 bg-white dark:bg-gray-800 rounded-full shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
      </div>

      <div className="space-y-4">
        {sections.map((section) => (
          <div 
            key={section.id}
            className={cn(
              "bg-white dark:bg-gray-800 rounded-2xl shadow-sm border transition-all overflow-hidden",
              activeSection === section.id 
                ? "border-blue-500 ring-1 ring-blue-500" 
                : "border-gray-100 dark:border-gray-700"
            )}
          >
            <button 
              onClick={() => setActiveSection(activeSection === section.id ? null : section.id)}
              className="w-full flex items-center justify-between p-5 text-left"
            >
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  {section.icon}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">{section.title}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{section.description}</p>
                </div>
              </div>
              <ChevronRight className={cn(
                "w-5 h-5 text-gray-400 transition-transform duration-300",
                activeSection === section.id ? "rotate-90" : ""
              )} />
            </button>
            
            {activeSection === section.id && (
              <div className="px-5 pb-5 pt-2 border-t border-gray-50 dark:border-gray-700">
                {section.content}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/10 rounded-2xl p-6 border border-blue-100 dark:border-blue-900/30">
        <div className="flex items-start space-x-4">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
            <Smartphone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-blue-900 dark:text-blue-300">App Version</h4>
            <p className="text-xs text-blue-700/70 dark:text-blue-400/70 mt-1">You are using Rewards App v2.4.0. Your app is up to date.</p>
          </div>
        </div>
      </div>

      <FingerprintModal 
        isOpen={showFingerprintModal}
        onClose={() => {
          setShowFingerprintModal(false);
          setPendingAction(null);
        }}
        onSuccess={handleFingerprintSuccess}
        title={pendingAction === 'delete' ? 'Verify to Delete' : 'Verify Identity'}
        description={pendingAction === 'delete' ? 'Press and hold to confirm account deletion' : 'Press and hold to access sensitive settings'}
      />
    </div>
  );
}

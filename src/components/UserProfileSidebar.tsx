'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  User, 
  Settings, 
  Crown, 
  Bookmark, 
  Users, 
  Palette, 
  HelpCircle, 
  LogOut,
  Download,
  CheckCircle,
  ExternalLink,
  Gift,
  Copy
} from 'lucide-react';
import { useUser, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

interface UserProfileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserProfileSidebar({ isOpen, onClose }: UserProfileSidebarProps) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const [isExtensionInstalled, setIsExtensionInstalled] = useState(false);
  const [referralData, setReferralData] = useState<any>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const handleInstallExtension = () => {
    // Open Chrome Web Store
    window.open('https://chrome.google.com/webstore', '_blank');
  };

  const copyReferralLink = async () => {
    if (!referralData?.referralUrl) return;
    try {
      await navigator.clipboard.writeText(referralData.referralUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="fixed right-0 top-0 h-full w-80 bg-zinc-950 border-l border-zinc-800 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white">{user?.firstName || 'User'}</h3>
                <p className="text-sm text-zinc-400">{user?.emailAddresses?.[0]?.emailAddress}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 p-6 space-y-2">
            {/* Upgrade Plan */}
            <Link
              href="/pricing"
              className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-500 hover:to-purple-500 transition-all"
            >
              <Crown className="w-5 h-5" />
              <span className="font-medium">Upgrade Plan</span>
            </Link>

            {/* Badges */}
            <Link
              href="/dashboard/badges"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              <Gift className="w-5 h-5" />
              <span>Badges</span>
            </Link>

            {/* Pods */}
            <Link
              href="/dashboard/pods"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              <Users className="w-5 h-5" />
              <span>Pods</span>
            </Link>

            {/* Personalization */}
            <Link
              href="/dashboard/personalization"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              <Palette className="w-5 h-5" />
              <span>Personalization</span>
            </Link>

            {/* Extension Section */}
            <div className="border-t border-zinc-800 pt-4 mt-4">
              <h4 className="text-sm font-medium text-zinc-400 mb-3">Extension</h4>
              
              {!isExtensionInstalled ? (
                <button
                  onClick={handleInstallExtension}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
                >
                  <Download className="w-5 h-5" />
                  <span>Install Extension</span>
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-green-500/10 border border-green-500/30">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span className="text-green-400 font-medium">Extension Active</span>
                  </div>
                  
                  <Link
                    href="/extension"
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
                  >
                    <ExternalLink className="w-5 h-5" />
                    <span>Extension Settings</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Bookmarks */}
            <Link
              href="/dashboard/bookmarks"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              <Bookmark className="w-5 h-5" />
              <span>Bookmarks</span>
            </Link>

            {/* Settings */}
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              <Settings className="w-5 h-5" />
              <span>Settings</span>
            </Link>

            {/* Help */}
            <Link
              href="/help"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              <HelpCircle className="w-5 h-5" />
              <span>Help</span>
            </Link>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-zinc-800">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

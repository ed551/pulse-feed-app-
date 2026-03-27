import { useEffect } from "react";
import { ShieldCheck, Download } from "lucide-react";
import { auto_translation_engine } from "../lib/engines";

export default function Privacy() {
  useEffect(() => {
    auto_translation_engine();
  }, []);

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="text-center py-8">
        <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldCheck className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-4">Privacy Policy</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400">Last updated: March 2026</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-700 prose dark:prose-invert max-w-none">
        <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/50 mb-8">
          <h3 className="text-indigo-800 dark:text-indigo-300 font-bold mt-0">Data Collection Notice</h3>
          <p className="text-indigo-700 dark:text-indigo-400 mb-0 font-medium">
            This platform is for market research and user testing. Rewards are given for feedback and engagement. No financial investment is required.
          </p>
        </div>

        <h2>1. Information We Collect</h2>
        <p>We collect information you provide directly to us, such as when you create or modify your account, request on-demand services, contact customer support, or otherwise communicate with us.</p>

        <h2>2. How We Use Your Information</h2>
        <p>We use the information we collect about you to provide, maintain, and improve our services, including to facilitate payments, send receipts, provide products and services you request, and develop new features.</p>
        
        <h2>3. Reward System & Data</h2>
        <p>Users earn points for participation. Points can be redeemed for cash rewards. The platform retains a portion to cover hosting and development costs.</p>
        <ul>
          <li>Users receive 50% of reward credits.</li>
          <li>Developers retain 50% to sustain the platform.</li>
        </ul>

        <h2>4. Data Security</h2>
        <p>We take reasonable measures to help protect information about you from loss, theft, misuse and unauthorized access, disclosure, alteration and destruction.</p>

        <div className="mt-12 pt-8 border-t border-gray-100 dark:border-gray-700 flex justify-center">
          <button className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 px-6 py-3 rounded-full font-bold transition-colors">
            <Download className="w-5 h-5" />
            <span>Download Full PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
}

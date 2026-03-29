import { useEffect } from "react";
import { FileText, Download } from "lucide-react";
import { privacy_engine, auto_translation_engine } from "../lib/engines";

export default function Terms() {
  useEffect(() => {
    privacy_engine();
    auto_translation_engine();
  }, []);

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="text-center py-8">
        <div className="w-20 h-20 bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <FileText className="w-10 h-10 text-teal-600 dark:text-teal-400" />
        </div>
        <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-4">Terms & Conditions</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400">Last updated: March 2026</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-700 prose dark:prose-invert max-w-none">
        <div className="p-6 bg-teal-50 dark:bg-teal-900/20 rounded-2xl border border-teal-100 dark:border-teal-800/50 mb-8">
          <h3 className="text-teal-800 dark:text-teal-300 font-bold mt-0">Important Notice</h3>
          <p className="text-teal-700 dark:text-teal-400 mb-0 font-medium">
            This platform is for market research and user testing. Rewards are given for feedback and engagement. No financial investment is required.
          </p>
        </div>

        <h2>1. Acceptance of Terms</h2>
        <p>By accessing and using the Pulse Feed application, you accept and agree to be bound by the terms and provision of this agreement.</p>

        <h2>2. Reward System</h2>
        <p>Users earn points for participation. Points can be redeemed for cash rewards. The platform retains a portion to cover hosting and development costs.</p>
        <ul>
          <li>Users receive 50% of reward credits.</li>
          <li>Developers retain 50% to sustain the platform.</li>
        </ul>

        <h2>3. User Conduct</h2>
        <p>Users must not engage in any activity that disrupts the platform or violates the rights of others. This includes spamming, harassment, and unauthorized access.</p>

        <div className="mt-12 pt-8 border-t border-gray-100 dark:border-gray-700 flex justify-center">
          <button 
            onClick={() => {
              const link = document.createElement('a');
              link.href = 'data:application/pdf;base64,JVBERi0xLjQKJWRmYm9keQoxIDAgb2JqCjw8L1R5cGUvQ2F0YWxvZy9QYWdlcyAyIDAgUj4+CmVuZG9iagoyIDAgb2JqCjw8L1R5cGUvUGFnZXMvQ291bnQgMS9LaWRzWzMgMCBSXT4+CmVuZG9iagozIDAgb2JqCjw8L1R5cGUvUGFnZS9QYXJlbnQgMiAwIFIvTWVkaWFCb3hbMCAwIDYxMiA3OTJdL0NvbnRlbnRzIDQgMCBSPj4KZW5kb2JqCjQgIDAgb2JqCjw8L0xlbmd0aCA0ND4+CnN0cmVhbQpCVAovRjEgMjQgVGYKODAgNzAwIFRkCihQdWxzZSBGZWVkIERvY3VtZW50KSBUagpFVAplbmRzdHJlYW0KZW5kb2JqCnhyZWYKMCA1CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxOCAwMDAwMCBuIAowMDAwMDAwMDY3IDAwMDAwIG4gCjAwMDAwMDAxMjYgMDAwMDAgbiAKMDAwMDAwMDIyNiAwMDAwMCBuIAp0cmFpbGVyCjw8L1NpemUgNS9Sb290IDEgMCBSPj4Kc3RhcnR4cmVmCjMyMQolJUVPRgo='; 
              link.download = 'Pulse_Feed_Terms.pdf';
              link.click();
              alert('Terms PDF download started!');
            }}
            className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 px-6 py-3 rounded-full font-bold transition-colors"
          >
            <Download className="w-5 h-5" />
            <span>Download Full PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
}

import { DollarSign, TrendingUp, Users, MousePointerClick, Activity, PieChart, Landmark, Send, CheckCircle, Clock } from "lucide-react";

export default function AdsDashboard() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center">
          <DollarSign className="w-8 h-8 mr-2 text-yellow-500" />
          AdMob & AdSense Revenue
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 dark:text-gray-400 font-medium">Estimated Earnings</h3>
            <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">$1,245.89</div>
          <div className="flex items-center mt-2 text-sm text-green-600 dark:text-green-400 font-medium">
            <TrendingUp className="w-4 h-4 mr-1" />
            +12.5% from last month
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 dark:text-gray-400 font-medium">Impressions</h3>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">142.5K</div>
          <div className="flex items-center mt-2 text-sm text-green-600 dark:text-green-400 font-medium">
            <TrendingUp className="w-4 h-4 mr-1" />
            +8.2% from last month
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 dark:text-gray-400 font-medium">Clicks</h3>
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
              <MousePointerClick className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">3,421</div>
          <div className="flex items-center mt-2 text-sm text-green-600 dark:text-green-400 font-medium">
            <TrendingUp className="w-4 h-4 mr-1" />
            +15.3% from last month
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 dark:text-gray-400 font-medium">Page RPM</h3>
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">$8.74</div>
          <div className="flex items-center mt-2 text-sm text-red-500 font-medium">
            <TrendingUp className="w-4 h-4 mr-1 rotate-180" />
            -2.1% from last month
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center mb-6">
          <PieChart className="w-6 h-6 text-purple-500 mr-2" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Revenue Distribution (50/50 Split)</h2>
        </div>
        
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-6 border border-purple-100 dark:border-purple-800/50 mb-6">
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            Supervybe operates on a <strong>50/50 revenue sharing model for user-driven activity</strong>. Revenue generated directly from user interactions (like viewing ads or creating content) is split equally between the community and the platform.
            <br/><br/>
            <span className="text-sm italic text-purple-700 dark:text-purple-300">Note: Revenue generated independently by developer activity (not involving users) is retained 100% by the platform and is not shared.</span>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">User Pool (50%)</h3>
            <div className="text-3xl font-black text-green-500 mb-2">$622.94</div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Distributed back to users via the Rewards system for viewing ads, creating content, and participating in the community.
              <br/><br/>
              <span className="text-xs italic text-gray-400 dark:text-gray-500">* Applicable local and international taxes are withheld from this pool for direct remission to tax authorities.</span>
            </p>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Developer Pool (50%)</h3>
            <div className="text-3xl font-black text-blue-500 mb-2">$622.95</div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Retained by the platform to cover server hosting, AI API costs, maintenance, and future development.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center mb-6">
          <Landmark className="w-6 h-6 text-blue-500 mr-2" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Hands-Free Global Tax Remittance (MoR)</h2>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          <strong>Developer Zero-Liability:</strong> The platform uses a Merchant of Record (MoR) API. The MoR legally assumes all tax liabilities (VAT, GST, WHT) globally. It automatically calculates, deducts, and remits taxes directly to international authorities (IRS, KRA, HMRC, etc.) on your behalf. <strong>You do not need to file or remit these taxes yourself.</strong>
        </p>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-lg">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-gray-900 dark:text-white">User Payout: @sarah_j</div>
                <div className="text-xs text-gray-500">Net: $42.00 (Gross: $50.00) • M-Pesa</div>
              </div>
            </div>
            <span className="text-xs font-bold text-green-500 flex items-center"><CheckCircle className="w-3 h-3 mr-1"/> Completed</span>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-lg">
                <Landmark className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-gray-900 dark:text-white">Tax Remission: KRA (Kenya)</div>
                <div className="text-xs text-gray-500">Amount: $8.00 (16% VAT/WHT) • Ref: TX-99281</div>
              </div>
            </div>
            <span className="text-xs font-bold text-blue-500 flex items-center"><CheckCircle className="w-3 h-3 mr-1"/> Remitted</span>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-lg">
                <Landmark className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-gray-900 dark:text-white">Tax Remission: IRS (USA)</div>
                <div className="text-xs text-gray-500">Amount: $12.50 (30% WHT) • Ref: TX-99282</div>
              </div>
            </div>
            <span className="text-xs font-bold text-yellow-500 flex items-center"><Clock className="w-3 h-3 mr-1"/> Pending Batch</span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Active Ad Units</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700">
            <div>
              <div className="font-bold text-gray-900 dark:text-white">Home Feed Banner</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Slot ID: 1234567890 • Auto Format</div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full text-xs font-bold uppercase tracking-wider">Active</span>
            </div>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700">
            <div>
              <div className="font-bold text-gray-900 dark:text-white">Sidebar Sticky Ad</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Slot ID: 0987654321 • Vertical Rectangle</div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full text-xs font-bold uppercase tracking-wider">Active</span>
            </div>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700">
            <div>
              <div className="font-bold text-gray-900 dark:text-white">Interstitial Ad</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Slot ID: 1122334455 • Full Screen</div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full text-xs font-bold uppercase tracking-wider">Pending</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

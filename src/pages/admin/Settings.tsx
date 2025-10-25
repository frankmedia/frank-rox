const Settings = () => {
  return (
    <>
      <h1 className="text-2xl font-semibold mb-4">Settings</h1>

      {/* PT Profile */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Coach Profile</h2>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 rounded-full bg-yellow-500 flex items-center justify-center text-black text-3xl font-bold">
            NS
          </div>
          <div>
            <h3 className="text-xl font-semibold">Natalie Shanahan</h3>
            <p className="text-zinc-400 text-sm">nat_shanahan@hotmail.com</p>
            <p className="text-yellow-500 text-xs mt-1">HYROX Coach • Strength & Conditioning</p>
          </div>
        </div>
      </div>

      {/* Subscription & Payment Section */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Subscription & Billing</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Current Plan */}
          <div>
            <h3 className="text-sm font-medium text-zinc-400 mb-3">Current Plan</h3>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl font-bold text-yellow-500">Pro Coach</span>
                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">Active</span>
              </div>
              <p className="text-sm text-zinc-300 mb-3">Unlimited clients • Custom plans • Analytics</p>
              <div className="text-2xl font-bold text-white mb-1">£49.99/month</div>
              <p className="text-xs text-zinc-400">Next billing: 15 Nov 2025</p>
              <p className="text-xs text-zinc-500 mt-2">Member since: Jan 2024</p>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <h3 className="text-sm font-medium text-zinc-400 mb-3">Payment Method</h3>
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-8 bg-blue-600 rounded flex items-center justify-center text-xs font-bold text-white">
                  VISA
                </div>
                <div>
                  <div className="text-sm font-medium">•••• •••• •••• 4242</div>
                  <div className="text-xs text-zinc-400">Expires 12/26</div>
                </div>
              </div>
              <button className="text-xs text-yellow-500 hover:text-yellow-400 transition-colors">
                Update payment method →
              </button>
            </div>
          </div>
        </div>

        {/* Billing History */}
        <div className="mt-6">
          <h3 className="text-sm font-medium text-zinc-400 mb-3">Recent Invoices</h3>
          <div className="space-y-2">
            {[
              { date: '15 Oct 2025', amount: '£49.99', status: 'Paid' },
              { date: '15 Sep 2025', amount: '£49.99', status: 'Paid' },
              { date: '15 Aug 2025', amount: '£49.99', status: 'Paid' },
            ].map((invoice, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm bg-zinc-800/30 rounded px-3 py-2">
                <span className="text-zinc-300">{invoice.date}</span>
                <span className="font-medium text-white">{invoice.amount}</span>
                <span className="text-xs text-green-400">{invoice.status}</span>
                <button className="text-xs text-yellow-500 hover:text-yellow-400">Download</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default Settings;



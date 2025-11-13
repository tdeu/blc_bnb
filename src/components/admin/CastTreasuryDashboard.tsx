import { useState, useEffect } from 'react';
import { treasuryService, TreasuryStats, CastPurchase, TopHolder } from '../../services/treasuryService';
import { castPurchaseTracker } from '../../services/castPurchaseTracker';

export function CastTreasuryDashboard() {
  const [stats, setStats] = useState<TreasuryStats | null>(null);
  const [purchases, setPurchases] = useState<CastPurchase[]>([]);
  const [topHolders, setTopHolders] = useState<TopHolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncingHistory, setSyncingHistory] = useState(false);
  const [trackerStatus, setTrackerStatus] = useState<'stopped' | 'running'>('stopped');

  useEffect(() => {
    loadData();
    initializeTracker();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Initialize services
      await treasuryService.initialize();

      // Load all data in parallel
      const [statsData, purchasesData, holdersData] = await Promise.all([
        treasuryService.getTreasuryStats(),
        treasuryService.getRecentPurchases(20),
        treasuryService.getTopHolders()
      ]);

      setStats(statsData);
      setPurchases(purchasesData);
      setTopHolders(holdersData);
    } catch (err: any) {
      console.error('Error loading treasury data:', err);
      setError(err.message || 'Failed to load treasury data');
    } finally {
      setLoading(false);
    }
  };

  const initializeTracker = async () => {
    try {
      await castPurchaseTracker.initialize();
      await castPurchaseTracker.startListening();
      setTrackerStatus('running');
      console.log('✅ Purchase tracker is now active');
    } catch (err) {
      console.error('Failed to start purchase tracker:', err);
    }
  };

  const handleSyncHistory = async () => {
    try {
      setSyncingHistory(true);
      await castPurchaseTracker.initialize();
      const count = await castPurchaseTracker.syncHistoricalPurchases();
      alert(`✅ Synced ${count} historical purchases`);
      await loadData(); // Reload data
    } catch (err: any) {
      alert(`❌ Sync failed: ${err.message}`);
    } finally {
      setSyncingHistory(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatNumber = (num: string | number) => {
    const n = typeof num === 'string' ? parseFloat(num) : num;
    return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading treasury data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500 rounded-lg p-6 text-center">
        <h3 className="text-red-400 font-semibold mb-2">Error Loading Treasury Data</h3>
        <p className="text-gray-300 mb-4">{error}</p>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg transition"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">CAST Treasury Dashboard</h2>
          <p className="text-gray-400 text-sm mt-1">
            CAST token distribution and revenue tracking
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs ${
            trackerStatus === 'running'
              ? 'bg-green-500/20 text-green-400'
              : 'bg-gray-500/20 text-gray-400'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              trackerStatus === 'running' ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
            }`}></div>
            <span>Tracker {trackerStatus}</span>
          </div>
          <button
            onClick={handleSyncHistory}
            disabled={syncingHistory}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition text-sm"
          >
            {syncingHistory ? 'Syncing...' : 'Sync History'}
          </button>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition text-sm"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Supply */}
        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Total Supply</span>
            <span className="text-xs text-purple-400">{stats.supplyUtilization.toFixed(2)}% of max</span>
          </div>
          <p className="text-3xl font-bold text-white mb-1">
            {formatNumber(stats.totalSupply)}
          </p>
          <p className="text-gray-400 text-xs">
            Max: {formatNumber(stats.maxSupply)} CAST
          </p>
        </div>

        {/* Purchased/Minted */}
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Minted via Purchases</span>
            <span className="text-xs text-blue-400">{stats.totalPurchases} txs</span>
          </div>
          <p className="text-3xl font-bold text-white mb-1">
            {formatNumber(stats.purchasedCast)}
          </p>
          <p className="text-gray-400 text-xs">
            Initial: {formatNumber(stats.initialAllocation)} CAST
          </p>
        </div>

        {/* BNB Revenue */}
        <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border border-yellow-500/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">BNB Revenue</span>
            <span className="text-xs text-yellow-400">In Treasury</span>
          </div>
          <p className="text-3xl font-bold text-white mb-1">
            {formatNumber(stats.bnbRevenue)}
          </p>
          <p className="text-gray-400 text-xs">
            BNB in treasury contract
          </p>
        </div>

        {/* Remaining Mintable */}
        <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Remaining Mintable</span>
            <span className="text-xs text-green-400">Available</span>
          </div>
          <p className="text-3xl font-bold text-white mb-1">
            {formatNumber(stats.remainingMintable)}
          </p>
          <p className="text-gray-400 text-xs">
            {(100 - stats.supplyUtilization).toFixed(2)}% of max supply
          </p>
        </div>
      </div>

      {/* Distribution Breakdown */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">CAST Distribution</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Owner/Admin Holdings</p>
              <p className="text-gray-400 text-sm">Initial allocation + any purchases</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-purple-400">{formatNumber(stats.ownerBalance)}</p>
              <p className="text-gray-400 text-sm">
                {((parseFloat(stats.ownerBalance) / parseFloat(stats.totalSupply)) * 100).toFixed(2)}%
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Other Holders</p>
              <p className="text-gray-400 text-sm">Distributed to users via purchases</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-blue-400">{formatNumber(stats.otherHolders)}</p>
              <p className="text-gray-400 text-sm">
                {((parseFloat(stats.otherHolders) / parseFloat(stats.totalSupply)) * 100).toFixed(2)}%
              </p>
            </div>
          </div>

          {/* Visual bar */}
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden flex">
            <div
              className="bg-purple-500"
              style={{ width: `${(parseFloat(stats.ownerBalance) / parseFloat(stats.totalSupply)) * 100}%` }}
            ></div>
            <div
              className="bg-blue-500"
              style={{ width: `${(parseFloat(stats.otherHolders) / parseFloat(stats.totalSupply)) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Purchases */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Purchases</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {purchases.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No purchases recorded yet</p>
            ) : (
              purchases.map((purchase) => (
                <div
                  key={purchase.id}
                  className="bg-gray-700/30 rounded-lg p-3 hover:bg-gray-700/50 transition"
                >
                  <div className="flex items-center justify-between mb-2">
                    <a
                      href={`https://testnet.bscscan.com/address/${purchase.buyer_address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300 font-mono text-sm"
                    >
                      {formatAddress(purchase.buyer_address)}
                    </a>
                    <span className="text-gray-400 text-xs">{formatDate(purchase.timestamp)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-yellow-400">{formatNumber(purchase.bnb_amount)} BNB</span>
                    <span className="text-gray-400">→</span>
                    <span className="text-green-400">{formatNumber(purchase.cast_amount)} CAST</span>
                  </div>
                  <a
                    href={`https://testnet.bscscan.com/tx/${purchase.transaction_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-gray-500 hover:text-gray-400 font-mono mt-1 block"
                  >
                    {formatAddress(purchase.transaction_hash)}
                  </a>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Holders */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Top CAST Holders</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {topHolders.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No holders data available</p>
            ) : (
              topHolders.map((holder, index) => (
                <div
                  key={holder.address}
                  className="bg-gray-700/30 rounded-lg p-3 hover:bg-gray-700/50 transition"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400 text-sm font-semibold">#{index + 1}</span>
                      <a
                        href={`https://testnet.bscscan.com/address/${holder.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-400 hover:text-purple-300 font-mono text-sm"
                      >
                        {formatAddress(holder.address)}
                      </a>
                      {index === 0 && (
                        <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded">
                          Owner
                        </span>
                      )}
                    </div>
                    <span className="text-gray-400 text-xs">{holder.percentage.toFixed(2)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white font-semibold">{formatNumber(holder.balance)} CAST</span>
                    <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden w-24">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                        style={{ width: `${Math.min(holder.percentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

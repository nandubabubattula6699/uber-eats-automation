import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    fetchOrders()
    
    if (autoRefresh) {
      const interval = setInterval(fetchOrders, 3000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  const fetchOrders = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/orders/')
      const data = await response.json()
      setOrders(data.orders || [])
      setError(null)
    } catch (err) {
      setError('Connection lost')
    } finally {
      setLoading(false)
    }
  }

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await fetch(`http://127.0.0.1:8000/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      fetchOrders()
    } catch (err) {
      setError('Failed to update order')
    }
  }

  const filteredOrders = selectedFilter === 'all' 
    ? orders 
    : orders.filter(o => o.status === selectedFilter)

  const stats = {
    total: orders.length,
    confirmed: orders.filter(o => o.is_confirmed).length,
    pending: orders.filter(o => !o.is_confirmed).length,
    ready: orders.filter(o => o.status === 'ready').length,
  }

  const getStatusColor = (status) => {
    switch(status) {
      case 'confirmed': return 'from-blue-600 to-blue-700'
      case 'ready': return 'from-emerald-600 to-emerald-700'
      case 'pending': return 'from-amber-600 to-amber-700'
      default: return 'from-gray-600 to-gray-700'
    }
  }

  const getStatusBgLight = (status) => {
    switch(status) {
      case 'confirmed': return 'bg-blue-500/20 border-blue-500/30'
      case 'ready': return 'bg-emerald-500/20 border-emerald-500/30'
      case 'pending': return 'bg-amber-500/20 border-amber-500/30'
      default: return 'bg-gray-500/20 border-gray-500/30'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-slate-800/50 backdrop-blur-xl bg-slate-900/50 sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-xl flex items-center justify-center font-bold text-lg">
                  🍽️
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                    Restaurant Orders
                  </h1>
                  <p className="text-xs text-slate-400 mt-1">Real-time order management</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`px-4 py-2 rounded-lg transition-all duration-300 font-medium text-sm ${
                    autoRefresh
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {autoRefresh ? '🔄 Auto-refresh' : '⏸ Paused'}
                </button>
                <button
                  onClick={fetchOrders}
                  className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors font-medium text-sm"
                >
                  ↻ Refresh
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-6 py-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Orders', value: stats.total, gradient: 'from-blue-600 to-blue-700', icon: '📦' },
              { label: 'Confirmed', value: stats.confirmed, gradient: 'from-emerald-600 to-emerald-700', icon: '✓' },
              { label: 'Pending', value: stats.pending, gradient: 'from-amber-600 to-amber-700', icon: '⏳' },
              { label: 'Ready', value: stats.ready, gradient: 'from-purple-600 to-purple-700', icon: '🚀' },
            ].map((stat, i) => (
              <div
                key={i}
                className={`bg-gradient-to-br ${stat.gradient} rounded-xl p-6 shadow-xl border border-white/10 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 hover:scale-105`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-sm font-medium mb-1">{stat.label}</p>
                    <p className="text-4xl font-bold">{stat.value}</p>
                  </div>
                  <span className="text-4xl">{stat.icon}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mb-8 border-b border-slate-800">
            {['all', 'confirmed', 'pending', 'ready'].map(filter => (
              <button
                key={filter}
                onClick={() => setSelectedFilter(filter)}
                className={`px-6 py-3 font-medium text-sm transition-all duration-300 border-b-2 ${
                  selectedFilter === filter
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
                <span className="ml-2 text-xs opacity-60">
                  ({selectedFilter === filter ? filteredOrders.length : orders.filter(o => filter === 'all' || o.status === filter).length})
                </span>
              </button>
            ))}
          </div>

          {/* Orders Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-400">Loading orders...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-600/20 border border-red-500/50 rounded-xl p-6 text-center text-red-200">
              {error}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-6xl mb-4">😴</p>
              <p className="text-slate-400 text-lg">No orders yet. The kitchen is resting...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredOrders.map((order, idx) => (
                <div
                  key={order.id}
                  className={`group bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border transition-all duration-300 hover:shadow-2xl hover:shadow-blue-600/20 hover:scale-105 ${
                    getStatusBgLight(order.status)
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-1">{order.customer_name}</h3>
                      <p className="text-sm text-slate-400">#{order.order_id}</p>
                    </div>
                    <div className={`px-4 py-2 rounded-lg font-bold text-sm bg-gradient-to-r ${getStatusColor(order.status)} text-white shadow-lg`}>
                      {order.status.toUpperCase()}
                    </div>
                  </div>

                  {/* Items */}
                  <div className="mb-6 pb-6 border-b border-slate-700/50">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Items</p>
                    <div className="space-y-2">
                      {(() => {
                        try {
                          const items = JSON.parse(order.items)
                          return items.map((item, i) => (
                            <div key={i} className="flex items-center justify-between text-sm">
                              <span className="text-slate-300">{item.name}</span>
                              <span className="bg-slate-700/50 px-3 py-1 rounded-full text-slate-200 font-semibold">×{item.qty}</span>
                            </div>
                          ))
                        } catch {
                          return <p className="text-slate-400 text-sm">{order.items}</p>
                        }
                      })()}
                    </div>
                  </div>

                  {/* Special Requests */}
                  {order.special_requests && (
                    <div className="mb-6 pb-6 border-b border-slate-700/50">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Special Requests</p>
                      <p className="text-sm text-slate-300 italic bg-slate-700/30 rounded-lg px-3 py-2">
                        "{order.special_requests}"
                      </p>
                    </div>
                  )}

                  {/* Footer Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-xs text-slate-400 mb-1">Prep Time</p>
                      <p className="text-lg font-bold text-blue-400">{order.prep_time}m</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-400 mb-1">Total</p>
                      <p className="text-lg font-bold text-emerald-400">${parseFloat(order.total_amount).toFixed(2)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-400 mb-1">Status</p>
                      <p className="text-sm font-bold text-amber-400">
                        {order.is_confirmed ? '✓ Done' : '⏳ Pending'}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-3 mt-6 pt-6 border-t border-slate-700/50">
                    {order.status === 'completed' ? (
                      <button disabled className="bg-slate-800 text-slate-500 font-semibold py-2 rounded-lg cursor-not-allowed opacity-60">
                        ✓ Completed
                      </button>
                    ) : order.status === 'ready' ? (
                      <button
                        onClick={() => updateOrderStatus(order.order_id, 'completed')}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-purple-600/30"
                      >
                        🚀 Complete
                      </button>
                    ) : (
                      <button
                        onClick={() => updateOrderStatus(order.order_id, 'ready')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-emerald-600/30"
                      >
                        ✓ Mark Ready
                      </button>
                    )}
                    <button className="bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 rounded-lg transition-all duration-300 hover:shadow-lg">
                      📋 Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Footer hint */}
      <footer className="fixed bottom-6 right-6 text-xs text-slate-500 pointer-events-none">
        Last updated: {new Date().toLocaleTimeString()}
      </footer>
    </div>
  )
}

export default App
import { useState, useEffect, useCallback } from 'react'
import './App.css'

const STATUS_CONFIG = {
  pending:   { color: 'text-amber-400',  bg: 'bg-amber-400/10 border-amber-400/20',  dot: 'bg-amber-400',  label: 'Pending'   },
  confirmed: { color: 'text-blue-400',   bg: 'bg-blue-400/10 border-blue-400/20',   dot: 'bg-blue-400',   label: 'Confirmed' },
  ready:     { color: 'text-green-400',  bg: 'bg-green-400/10 border-green-400/20',  dot: 'bg-green-400',  label: 'Ready'     },
  completed: { color: 'text-slate-400',  bg: 'bg-slate-400/10 border-slate-400/20',  dot: 'bg-slate-500',  label: 'Completed' },
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [onClose])
  return (
    <div className={`slide-in fixed bottom-6 right-6 flex items-center gap-3 px-4 py-3 rounded-lg shadow-2xl border text-sm font-medium z-50 ${
      type === 'success'
        ? 'bg-[#0d1f0d] border-green-500/40 text-green-400'
        : 'bg-[#1f0d0d] border-red-500/40 text-red-400'
    }`}>
      <span>{type === 'success' ? '✓' : '✕'}</span>
      {message}
    </div>
  )
}

function Avatar({ name }) {
  const initials = name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'
  const colors = ['from-blue-500 to-blue-700', 'from-green-500 to-green-700', 'from-purple-500 to-purple-700', 'from-orange-500 to-orange-700', 'from-pink-500 to-pink-700']
  const color = colors[name?.charCodeAt(0) % colors.length] || colors[0]
  return (
    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
      {initials}
    </div>
  )
}

export default function App() {
  const [orders, setOrders]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [filter, setFilter]       = useState('all')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [toast, setToast]         = useState(null)
  const [expanded, setExpanded]   = useState(null)

  const showToast = (message, type = 'success') => setToast({ message, type })

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/orders/')
      const data = await res.json()
      setOrders(data.orders || [])
      setError(null)
    } catch {
      setError('Cannot connect to backend')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrders()
    if (autoRefresh) {
      const id = setInterval(fetchOrders, 5000)
      return () => clearInterval(id)
    }
  }, [autoRefresh, fetchOrders])

  const updateStatus = async (orderId, newStatus) => {
    try {
      await fetch(`http://127.0.0.1:8000/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      showToast(`Order #${orderId} marked as ${newStatus}`)
      fetchOrders()
    } catch {
      showToast('Failed to update order', 'error')
    }
  }

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter)

  const stats = {
    total:     orders.length,
    confirmed: orders.filter(o => o.status === 'confirmed').length,
    pending:   orders.filter(o => o.status === 'pending').length,
    ready:     orders.filter(o => o.status === 'ready').length,
    completed: orders.filter(o => o.status === 'completed').length,
  }

  const timeAgo = (dateStr) => {
    if (!dateStr) return '—'
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
    if (diff < 60)   return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    return `${Math.floor(diff / 3600)}h ago`
  }

  const parseItems = (str) => {
    try { return JSON.parse(str) } catch { return [] }
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#e6edf3]">

      {/* ── Header ───────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-[#30363d] bg-[#161b22]/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">

          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-gradient-to-br from-green-500 to-blue-600 rounded-md flex items-center justify-center text-sm">
              🍽️
            </div>
            <div className="flex items-center gap-1 text-sm">
              <span className="text-[#7d8590] hover:text-[#e6edf3] cursor-pointer transition-colors">uber-eats-automation</span>
              <span className="text-[#7d8590] mx-1">/</span>
              <span className="font-semibold text-[#e6edf3]">orders</span>
            </div>
            <span className="hidden sm:flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-[#30363d] text-[#7d8590]">
              Public
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
              error
                ? 'border-red-500/30 bg-red-500/5 text-red-400'
                : 'border-green-500/30 bg-green-500/5 text-green-400'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${error ? 'bg-red-400' : 'bg-green-400 animate-pulse'}`} />
              {error ? 'Offline' : 'Live'}
            </div>

            <button
              onClick={() => setAutoRefresh(v => !v)}
              className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                autoRefresh
                  ? 'border-blue-500/30 bg-blue-500/10 text-blue-400'
                  : 'border-[#30363d] text-[#7d8590] hover:border-[#484f58] hover:text-[#e6edf3]'
              }`}
            >
              {autoRefresh ? '⟳ Auto on' : '⏸ Auto off'}
            </button>

            <button
              onClick={fetchOrders}
              className="text-xs px-3 py-1.5 rounded-md border border-[#30363d] text-[#7d8590] hover:text-[#e6edf3] hover:border-[#484f58] transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 py-8 flex gap-8">

        {/* ── Sidebar ──────────────────────────────────────── */}
        <aside className="w-60 shrink-0 space-y-6">

          {/* Stats */}
          <div>
            <p className="text-xs font-semibold text-[#7d8590] uppercase tracking-wider mb-2 px-2">Overview</p>
            <div className="space-y-0.5">
              {[
                { label: 'Total',     value: stats.total,     icon: '📦', color: 'text-[#e6edf3]'  },
                { label: 'Confirmed', value: stats.confirmed, icon: '●',  color: 'text-blue-400'   },
                { label: 'Pending',   value: stats.pending,   icon: '●',  color: 'text-amber-400'  },
                { label: 'Ready',     value: stats.ready,     icon: '●',  color: 'text-green-400'  },
                { label: 'Completed', value: stats.completed, icon: '●',  color: 'text-slate-500'  },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-[#161b22] transition-colors cursor-default">
                  <span className={`text-xs flex items-center gap-2 text-[#7d8590]`}>
                    <span className={`text-[10px] ${s.color}`}>{s.icon}</span>
                    {s.label}
                  </span>
                  <span className={`text-sm font-semibold tabular-nums ${s.color}`}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-[#21262d]" />

          {/* Filter */}
          <div>
            <p className="text-xs font-semibold text-[#7d8590] uppercase tracking-wider mb-2 px-2">Filter</p>
            <div className="space-y-0.5">
              {['all', 'confirmed', 'pending', 'ready', 'completed'].map(f => {
                const count = f === 'all' ? orders.length : orders.filter(o => o.status === f).length
                const active = filter === f
                return (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                      active
                        ? 'bg-[#1f6feb]/15 text-[#388bfd] font-medium'
                        : 'text-[#7d8590] hover:text-[#e6edf3] hover:bg-[#161b22]'
                    }`}
                  >
                    <span className="capitalize">{f === 'all' ? 'All orders' : f}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full tabular-nums ${
                      active ? 'bg-[#1f6feb]/20 text-[#388bfd]' : 'bg-[#21262d] text-[#7d8590]'
                    }`}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-[#21262d]" />

          {/* Quick stats card */}
          <div className="rounded-lg border border-[#30363d] bg-[#161b22] p-4 space-y-3">
            <p className="text-xs font-semibold text-[#7d8590] uppercase tracking-wider">Today</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[#7d8590]">Revenue</span>
                <span className="font-semibold text-green-400">
                  ${orders.reduce((s, o) => s + (parseFloat(o.total_amount) || 0), 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#7d8590]">Avg prep time</span>
                <span className="font-semibold text-[#e6edf3]">
                  {orders.length ? Math.round(orders.reduce((s, o) => s + (o.prep_time || 0), 0) / orders.length) : 0}m
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#7d8590]">Completion rate</span>
                <span className="font-semibold text-[#e6edf3]">
                  {orders.length ? Math.round((stats.completed / orders.length) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Main Content ─────────────────────────────────── */}
        <main className="flex-1 min-w-0">

          {/* List header bar */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-[#7d8590]">
              <span className="font-semibold text-[#e6edf3]">{filtered.length}</span>{' '}
              {filter === 'all' ? 'orders' : `${filter} orders`}
            </p>
            {error && (
              <span className="text-xs text-red-400 flex items-center gap-1">
                <span>⚠</span> {error}
              </span>
            )}
          </div>

          {/* Order list */}
          <div className="border border-[#30363d] rounded-lg overflow-hidden">

            {loading ? (
              <div className="flex items-center justify-center py-24 text-[#7d8590]">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-[#30363d] border-t-[#388bfd] rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm">Loading orders...</p>
                </div>
              </div>

            ) : filtered.length === 0 ? (
              <div className="py-24 text-center">
                <p className="text-5xl mb-4">🍽️</p>
                <p className="text-sm font-semibold text-[#e6edf3] mb-1">No orders yet</p>
                <p className="text-xs text-[#7d8590]">
                  {filter === 'all' ? 'New orders will appear here automatically.' : `No ${filter} orders at the moment.`}
                </p>
              </div>

            ) : (
              filtered.map((order) => {
                const items    = parseItems(order.items)
                const isOpen   = expanded === order.order_id
                const cfg      = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending

                return (
                  <div key={order.id} className={`border-b border-[#21262d] last:border-0 transition-colors ${isOpen ? 'bg-[#161b22]' : 'hover:bg-[#161b22]/60'}`}>

                    {/* ── Order row ── */}
                    <div className="flex items-center gap-4 px-5 py-4">

                      {/* Avatar */}
                      <Avatar name={order.customer_name} />

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 mb-0.5">
                          <button
                            onClick={() => setExpanded(isOpen ? null : order.order_id)}
                            className="font-semibold text-sm text-[#e6edf3] hover:text-[#388bfd] transition-colors"
                          >
                            {order.customer_name}
                          </button>
                          <StatusBadge status={order.status} />
                          <span className="text-xs text-[#7d8590]">#{order.order_id}</span>
                        </div>
                        <p className="text-xs text-[#7d8590] truncate">
                          {items.length > 0
                            ? items.map(i => `${i.name || i.item_name} ×${i.qty || i.quantity}`).join('  ·  ')
                            : order.items}
                        </p>
                        <p className="text-xs text-[#7d8590] mt-1">
                          {timeAgo(order.created_at)}
                          {order.confirmed_at ? `  ·  Confirmed ${timeAgo(order.confirmed_at)}` : ''}
                        </p>
                      </div>

                      {/* Right side meta + action */}
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-semibold text-[#e6edf3] tabular-nums">
                          ${parseFloat(order.total_amount || 0).toFixed(2)}
                        </span>
                        <span className="text-xs text-[#7d8590] bg-[#21262d] px-2 py-1 rounded-full tabular-nums">
                          {order.prep_time}m
                        </span>

                        {order.status === 'completed' ? (
                          <span className="text-xs px-3 py-1.5 rounded-md border border-[#30363d] text-[#7d8590] cursor-not-allowed select-none">
                            Closed
                          </span>
                        ) : order.status === 'ready' ? (
                          <button
                            onClick={() => updateStatus(order.order_id, 'completed')}
                            className="text-xs px-3 py-1.5 rounded-md border border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-colors font-medium"
                          >
                            Complete →
                          </button>
                        ) : (
                          <button
                            onClick={() => updateStatus(order.order_id, 'ready')}
                            className="text-xs px-3 py-1.5 rounded-md border border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors font-medium"
                          >
                            Mark Ready
                          </button>
                        )}

                        <button
                          onClick={() => setExpanded(isOpen ? null : order.order_id)}
                          className="text-[#7d8590] hover:text-[#e6edf3] transition-colors text-sm"
                        >
                          {isOpen ? '▲' : '▼'}
                        </button>
                      </div>
                    </div>

                    {/* ── Expanded detail ── */}
                    {isOpen && (
                      <div className="fade-in border-t border-[#21262d] px-5 py-4 bg-[#0d1117]/40">
                        <div className="grid grid-cols-2 gap-8">

                          <div>
                            <p className="text-xs font-semibold text-[#7d8590] uppercase tracking-wider mb-3">Items</p>
                            <div className="space-y-2">
                              {items.length > 0 ? items.map((item, i) => (
                                <div key={i} className="flex items-center justify-between">
                                  <span className="text-sm text-[#e6edf3]">{item.name || item.item_name}</span>
                                  <div className="flex items-center gap-4 text-sm text-[#7d8590]">
                                    <span>×{item.qty || item.quantity}</span>
                                    {item.price && <span className="tabular-nums">${item.price}</span>}
                                  </div>
                                </div>
                              )) : (
                                <p className="text-sm text-[#7d8590]">{order.items}</p>
                              )}
                              <div className="border-t border-[#21262d] pt-2 mt-2 flex justify-between">
                                <span className="text-sm font-semibold text-[#7d8590]">Total</span>
                                <span className="text-sm font-bold text-green-400 tabular-nums">
                                  ${parseFloat(order.total_amount || 0).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            {order.special_requests && (
                              <div>
                                <p className="text-xs font-semibold text-[#7d8590] uppercase tracking-wider mb-2">Special Requests</p>
                                <p className="text-sm text-[#e6edf3] bg-[#21262d] rounded-md px-3 py-2 italic border border-[#30363d]">
                                  "{order.special_requests}"
                                </p>
                              </div>
                            )}
                            <div>
                              <p className="text-xs font-semibold text-[#7d8590] uppercase tracking-wider mb-2">Timeline</p>
                              <div className="space-y-1.5 text-xs text-[#7d8590]">
                                <div className="flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                                  Order placed · {timeAgo(order.created_at)}
                                </div>
                                {order.confirmed_at && (
                                  <div className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                                    Confirmed · {timeAgo(order.confirmed_at)}
                                  </div>
                                )}
                                {order.status === 'completed' && (
                                  <div className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                                    Completed
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </main>
      </div>

      {/* Toast notification */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}

import { useEffect, useState, useMemo } from 'react';
import { getMemberships } from '../../services/api';
import type { Membership } from '../../types';
import { User, Calendar, Loader2, Search, Filter, ExternalLink } from 'lucide-react';
import AdminHeader from './AdminHeader';

export default function MembershipsAdmin() {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    async function loadMemberships() {
      try {
        const data = await getMemberships();
        setMemberships(data);
      } catch (err) {
        console.error("Failed to load memberships", err);
      } finally {
        setLoading(false);
      }
    }
    loadMemberships();
  }, []);

  const filteredMemberships = useMemo(() => {
    return memberships.filter(m => {
      const matchesSearch = 
        m.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (m.customerName || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [memberships, searchTerm, statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'canceled': return 'bg-red-100 text-red-700';
      case 'past_due': return 'bg-orange-100 text-orange-700';
      case 'unpaid': return 'bg-red-200 text-red-800';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="bg-cream min-h-screen font-serif text-charcoal flex flex-col">
      <AdminHeader />

      <main className="flex-grow p-8 max-w-7xl mx-auto w-full">
        <header className="mb-12 border-b border-tan pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-bold mb-2">Membership Management</h1>
            <p className="text-lg text-charcoal/60 font-sans">
              Live subscription data from Stripe.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/40" size={18} />
              <input 
                type="text" 
                placeholder="Search name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-tan/20 rounded-md focus:outline-none focus:ring-2 focus:ring-tan/50 bg-white w-full sm:w-64 font-sans text-sm"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/40" size={18} />
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 pr-4 py-2 border border-tan/20 rounded-md focus:outline-none focus:ring-2 focus:ring-tan/50 bg-white font-sans text-sm appearance-none"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="canceled">Canceled</option>
                <option value="past_due">Past Due</option>
                <option value="unpaid">Unpaid</option>
              </select>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="animate-spin h-12 w-12 text-tan" />
          </div>
        ) : filteredMemberships.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg border border-tan/20">
            <p className="text-lg font-sans italic text-charcoal/60">No membership records found matching your filters.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-tan/20 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left font-sans text-sm">
                <thead className="bg-cream/50 border-b border-tan/20 text-charcoal/60 uppercase tracking-widest font-bold">
                  <tr>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Product / Level</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Created</th>
                    <th className="px-6 py-4 text-center">Qty</th>
                    <th className="px-6 py-4">Renews / Expires</th>
                    <th className="px-6 py-4 text-right">Links</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-tan/10">
                  {filteredMemberships.map((m) => (
                    <tr key={m.id} className="hover:bg-cream/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-charcoal">{m.customerName || 'Unknown'}</div>
                        <div className="text-xs text-charcoal/60 flex items-center gap-1">
                          <User size={12} />
                          {m.email}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-tan/10 text-tan px-2 py-1 rounded text-[10px] font-bold uppercase">
                          {m.level}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${getStatusColor(m.status)}`}>
                          {m.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-charcoal/60 text-xs">
                        {m.createdAt ? new Date(m.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-center font-bold">
                        {m.quantity}
                      </td>
                      <td className="px-6 py-4 text-charcoal/60 flex items-center gap-2 text-xs">
                        <Calendar size={14} className="text-tan/40" />
                        {new Date(m.expirationDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <a 
                          href={`https://dashboard.stripe.com/subscriptions/${m.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-tan hover:text-tan-dark transition-colors font-bold text-[10px] uppercase tracking-tighter"
                        >
                          Stripe <ExternalLink size={10} />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, Users, Ticket, LogOut, Shield } from 'lucide-react';

export default function AdminHeader() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { label: 'Bookings', path: '/admin/bookings', icon: Calendar },
    { label: 'Memberships', path: '/admin/memberships', icon: Users },
    { label: 'Tickets', path: '/admin/tickets', icon: Ticket },
  ];

  return (
    <header className="bg-white border-b border-tan-light px-8 py-4 flex justify-between items-center shadow-sm sticky top-0 z-50">
      <div className="flex items-center gap-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-charcoal flex items-center gap-2">
            <Shield className="text-tan" size={24} />
            SAHS Curator Portal
          </h1>
        </div>
        
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-4 py-2 rounded-md font-sans text-sm font-bold uppercase tracking-wider transition-colors ${
                  isActive 
                    ? 'bg-tan/10 text-tan' 
                    : 'text-charcoal/60 hover:bg-cream hover:text-charcoal'
                }`}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-6">
        <div className="hidden sm:flex items-center gap-2 font-sans text-xs text-charcoal/60 border-r border-tan/20 pr-6 uppercase tracking-widest font-bold">
          <span>{user?.email}</span>
        </div>
        <button 
          onClick={logout}
          className="flex items-center gap-2 text-sm font-sans font-bold uppercase tracking-widest text-red-600 hover:text-red-800 transition-colors"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </header>
  );
}

import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, Users, Ticket, LogOut, Shield, FileText, BookOpen, HandHeart } from 'lucide-react';

export default function AdminHeader() {
  const { user, isAdmin, isCurator, isEditor, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { label: 'Content', path: '/admin/content', icon: FileText },
    { label: 'Wiki', path: '/admin/wiki', icon: BookOpen },
    { label: 'Bookings', path: '/admin/bookings', icon: Calendar },
    { label: 'Memberships', path: '/admin/memberships', icon: Users },
    { label: 'Tickets', path: '/admin/tickets', icon: Ticket },
    { label: 'Volunteers', path: '/admin/volunteers', icon: HandHeart },
  ];

  if (isAdmin) {
    navItems.push({ label: 'Users', path: '/admin/users', icon: Shield });
  }

  return (
    <header className="bg-white border-b border-tan-light px-8 py-4 flex justify-between items-center shadow-sm sticky top-0 z-50">
      <div className="flex items-center gap-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-charcoal flex items-center gap-2">
            <Shield className="text-tan" size={24} />
            SAHS Admin Portal
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
        <div className="hidden sm:flex flex-col items-end gap-0.5 border-r border-tan/20 pr-6">
          <span className="font-sans text-[10px] text-charcoal/40 uppercase tracking-widest font-black leading-none">
            {isAdmin ? 'System Admin' : isCurator ? 'Curator' : isEditor ? 'Editor' : 'SAHS Staff'}
          </span>
          <div className="flex items-center gap-2">
            {user?.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || ''} className="w-6 h-6 rounded-full border border-tan/20 shadow-sm" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-tan/10 border border-tan/20 flex items-center justify-center text-[10px] font-black text-tan uppercase tracking-tighter">
                {user?.displayName ? user.displayName.split(' ').map(n => n[0]).join('').slice(0, 2) : user?.email?.[0].toUpperCase()}
              </div>
            )}
          </div>
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

import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Calendar, 
  Users, 
  Ticket, 
  LogOut, 
  Shield, 
  FileText, 
  BookOpen, 
  HandHeart,
  ChevronDown
} from 'lucide-react';
import { useState } from 'react';

interface NavItem {
  label: string;
  path: string;
  icon: any;
  description?: string;
}

interface NavGroup {
  label: string;
  icon: any;
  items: NavItem[];
}

export default function AdminHeader() {
  const { user, isAdmin, isCurator, isEditor, logout } = useAuth();
  const location = useLocation();
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  const navGroups: NavGroup[] = [
    {
      label: 'Content',
      icon: FileText,
      items: [
        { label: 'Site Content', path: '/admin/content', icon: FileText, description: 'Manage news, events, and pages' },
        { label: 'Wiki', path: '/admin/wiki', icon: BookOpen, description: 'Internal knowledge base' },
      ]
    },
    {
      label: 'Operations',
      icon: HandHeart,
      items: [
        { label: 'Volunteers', path: '/admin/volunteers', icon: HandHeart, description: 'Signups and volunteer tracking' },
        { label: 'Bookings', path: '/admin/bookings', icon: Calendar, description: 'Facility rental management' },
        { label: 'Memberships', path: '/admin/memberships', icon: Users, description: 'Member database and status' },
      ]
    },
    {
      label: 'Commerce',
      icon: Ticket,
      items: [
        { label: 'Ticketing', path: '/admin/tickets', icon: Ticket, description: 'Event ticket sales' },
        { label: 'Scanner', path: '/admin/tickets/scan', icon: Shield, description: 'On-site check-in tool' },
      ]
    }
  ];

  if (isAdmin) {
    navGroups.push({
      label: 'System',
      icon: Shield,
      items: [
        { label: 'User Roles', path: '/admin/users', icon: Shield, description: 'Manage portal permissions' },
      ]
    });
  }

  return (
    <header className="bg-white border-b border-tan-light px-8 py-4 flex justify-between items-center shadow-sm sticky top-0 z-50">
      <div className="flex items-center gap-10">
        <Link to="/admin/content" className="flex items-center gap-2 group">
          <div className="bg-tan rounded-lg p-1.5 shadow-sm group-hover:bg-tan-dark transition-colors">
            <Shield className="text-white" size={20} />
          </div>
          <h1 className="text-xl font-serif font-bold tracking-tight text-charcoal">
            SAHS Portal
          </h1>
        </Link>
        
        <nav className="hidden lg:flex items-center gap-2">
          {navGroups.map((group) => {
            const GroupIcon = group.icon;
            const isGroupActive = group.items.some(item => location.pathname === item.path);
            
            return (
              <div 
                key={group.label}
                className="relative group"
                onMouseEnter={() => setActiveGroup(group.label)}
                onMouseLeave={() => setActiveGroup(null)}
              >
                <button
                  className={`flex items-center gap-2 px-4 py-2 rounded-md font-sans text-xs font-black uppercase tracking-widest transition-all duration-200 ${
                    isGroupActive 
                      ? 'text-tan bg-tan/5' 
                      : 'text-charcoal/60 hover:text-charcoal hover:bg-cream'
                  }`}
                >
                  <GroupIcon size={14} className={isGroupActive ? 'text-tan' : 'text-charcoal/40'} />
                  {group.label}
                  <ChevronDown size={12} className={`transition-transform duration-200 ${activeGroup === group.label ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                <div className={`absolute top-full left-0 mt-1 w-64 bg-white/95 backdrop-blur-md border border-tan-light rounded-xl shadow-xl overflow-hidden transition-all duration-200 origin-top-left ${
                  activeGroup === group.label 
                    ? 'opacity-100 scale-100 pointer-events-auto' 
                    : 'opacity-0 scale-95 pointer-events-none'
                }`}>
                  <div className="p-2 space-y-1">
                    {group.items.map((item) => {
                      const ItemIcon = item.icon;
                      const isActive = location.pathname === item.path;
                      
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                            isActive 
                              ? 'bg-tan/10' 
                              : 'hover:bg-cream'
                          }`}
                        >
                          <div className={`mt-0.5 p-1.5 rounded-md ${isActive ? 'bg-tan text-white' : 'bg-tan/10 text-tan'}`}>
                            <ItemIcon size={14} />
                          </div>
                          <div>
                            <div className={`text-sm font-bold ${isActive ? 'text-tan' : 'text-charcoal'}`}>
                              {item.label}
                            </div>
                            {item.description && (
                              <div className="text-[10px] text-charcoal/50 leading-tight mt-0.5 uppercase tracking-tighter">
                                {item.description}
                              </div>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
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

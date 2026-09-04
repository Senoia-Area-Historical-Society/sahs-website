import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Users,
  Ticket,
  LogOut,
  Shield,
  FileText,
  BookOpen,
  HandHeart,
  ChevronDown,
  Link as LinkIcon,
  Menu,
  X,
  LayoutDashboard,
  Mail,
  Landmark,
  Inbox,
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

/** A nav entry before role filtering. `visible` mirrors the rule guarding its data. */
interface GatedNavItem extends NavItem {
  visible: boolean;
}

interface GatedNavGroup extends Omit<NavGroup, 'items'> {
  items: GatedNavItem[];
}

/** Drop entries the current role cannot use, then drop any group left empty. */
function filterNav(groups: GatedNavGroup[]): NavGroup[] {
  return groups
    .map(group => ({ ...group, items: group.items.filter(item => item.visible) }))
    .filter(group => group.items.length > 0);
}

export default function AdminHeader() {
  const { user, isAdmin, isCurator, isEditor, logout } = useAuth();
  const location = useLocation();
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Nav is filtered by role, not just by whether you can reach /admin/* at all.
  //
  // Every group below the System one used to be built unconditionally, so a
  // read_only or board_member account was shown links to Wiki (editor-gated),
  // Short Links (admin-gated) and the roster views — each of which then failed
  // against the security rules. Advertising a page nobody can use reads as a broken
  // portal rather than as a permission boundary, and it generated the support
  // reports that started this audit.
  //
  // `visible` mirrors firestore.rules for the data behind each page. When you change
  // one, change the other: these predicates are the UI half of the same decision.
  const navGroups: NavGroup[] = filterNav([
    {
      label: 'Content',
      icon: FileText,
      items: [
        { label: 'Dashboard', path: '/admin', icon: LayoutDashboard, description: 'Stats overview and quick links', visible: true },
        { label: 'Site Content', path: '/admin/content', icon: FileText, description: 'Manage news, events, and pages', visible: isEditor },
        { label: 'Historic Places', path: '/admin/places', icon: Landmark, description: 'Historic structures, homes, and landmarks', visible: isEditor },
        { label: 'Wiki', path: '/admin/wiki', icon: BookOpen, description: 'Internal knowledge base', visible: isEditor },
        { label: 'Short Links', path: '/admin/shortlinks', icon: LinkIcon, description: 'Manage custom URLs', visible: isAdmin },
        { label: 'Newsletter', path: '/admin/newsletter', icon: Mail, description: 'Compose and send member emails', visible: isCurator },
      ]
    },
    {
      label: 'Operations',
      icon: HandHeart,
      items: [
        { label: 'Volunteers', path: '/admin/volunteers', icon: HandHeart, description: 'Signups and volunteer tracking', visible: isEditor },
        { label: 'Memberships', path: '/admin/memberships', icon: Users, description: 'Member database and status', visible: isCurator },
        { label: 'Submissions', path: '/admin/submissions', icon: Inbox, description: 'Contact messages and vendor applications', visible: isCurator },
      ]
    },
    {
      label: 'Commerce',
      icon: Ticket,
      items: [
        // Ticket *reads* are open to all staff — "how many have we sold?" is a
        // question volunteers get asked — so this stays visible below editor.
        { label: 'Ticketing', path: '/admin/tickets', icon: Ticket, description: 'Event ticket sales', visible: true },
        { label: 'Scanner', path: '/admin/tickets/scan', icon: Shield, description: 'On-site check-in tool', visible: true },
      ]
    },
    {
      label: 'System',
      icon: Shield,
      items: [
        { label: 'User Roles', path: '/admin/users', icon: Shield, description: 'Manage portal permissions', visible: isAdmin },
      ]
    }
  ]);

  return (
    <header className="bg-white border-b border-tan-light px-8 py-4 flex justify-between items-center shadow-sm sticky top-0 z-50 relative">
      <div className="flex items-center gap-10">
        <Link to="/admin" className="flex items-center gap-2 group">
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
                <div className={`absolute top-full left-0 mt-1 w-64 bg-white/95 backdrop-blur-md border border-tan-light rounded-xl shadow-xl transition-all duration-200 origin-top-left before:absolute before:bottom-full before:left-0 before:right-0 before:h-4 before:content-[''] ${
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

      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-3 border-r border-tan/20 pr-6">
          {user?.photoURL ? (
            <img src={user.photoURL} alt={user.displayName || ''} className="w-8 h-8 rounded-full border border-tan/20 shadow-sm flex-shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-tan/10 border border-tan/20 flex items-center justify-center text-xs font-black text-tan uppercase tracking-tighter flex-shrink-0">
              {user?.displayName ? user.displayName.split(' ').map(n => n[0]).join('').slice(0, 2) : user?.email?.[0].toUpperCase()}
            </div>
          )}
          <div className="flex flex-col items-start gap-0.5">
            <span className="font-sans text-[10px] text-charcoal/40 uppercase tracking-widest font-black leading-none">
              {isAdmin ? 'System Admin' : isCurator ? 'Curator' : isEditor ? 'Editor' : 'SAHS Staff'}
            </span>
            {user?.displayName && (
              <span className="font-sans text-[11px] text-charcoal/60 leading-none">{user.displayName}</span>
            )}
          </div>
        </div>
        <button
          onClick={logout}
          className="hidden lg:flex items-center gap-2 text-sm font-sans font-bold uppercase tracking-widest text-red-600 hover:text-red-800 transition-colors"
        >
          <LogOut size={16} />
          Sign Out
        </button>
        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(o => !o)}
          className="lg:hidden p-2 rounded-md text-charcoal/60 hover:text-charcoal hover:bg-cream transition-colors"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile slide-down menu */}
      {mobileOpen && (
        <div className="lg:hidden absolute top-full left-0 right-0 bg-white border-b border-tan-light shadow-xl z-50 max-h-[80vh] overflow-y-auto">
          {navGroups.map((group) => {
            const GroupIcon = group.icon;
            return (
              <div key={group.label} className="border-b border-tan-light/50 last:border-0">
                <div className="flex items-center gap-2 px-5 py-3 bg-cream/50">
                  <GroupIcon size={13} className="text-tan" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-charcoal/50">{group.label}</span>
                </div>
                {group.items.map((item) => {
                  const ItemIcon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-5 py-3.5 transition-colors ${isActive ? 'bg-tan/10 text-tan' : 'text-charcoal hover:bg-cream'}`}
                    >
                      <ItemIcon size={16} className={isActive ? 'text-tan' : 'text-charcoal/40'} />
                      <div>
                        <div className="text-sm font-bold">{item.label}</div>
                        {item.description && <div className="text-[10px] text-charcoal/40 uppercase tracking-tight">{item.description}</div>}
                      </div>
                    </Link>
                  );
                })}
              </div>
            );
          })}
          <div className="px-5 py-4 flex items-center justify-between border-t border-tan-light bg-cream/30">
            <div className="flex items-center gap-2">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="" className="w-7 h-7 rounded-full border border-tan/20" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-tan/10 border border-tan/20 flex items-center justify-center text-xs font-black text-tan">
                  {user?.displayName?.[0] || user?.email?.[0]?.toUpperCase()}
                </div>
              )}
              <div>
                <div className="text-xs font-bold text-charcoal">{user?.displayName || user?.email}</div>
                <div className="text-[10px] text-charcoal/40 uppercase tracking-wider">{isAdmin ? 'System Admin' : isCurator ? 'Curator' : 'Editor'}</div>
              </div>
            </div>
            <button
              onClick={() => { setMobileOpen(false); logout(); }}
              className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-red-600 hover:text-red-800"
            >
              <LogOut size={15} /> Sign Out
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

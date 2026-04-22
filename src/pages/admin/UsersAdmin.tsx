import { useState, useEffect } from 'react';
import { collection, query, getDocs, setDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import AdminHeader from './AdminHeader';
import { Pencil, Trash2, Plus, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

interface UserRole {
  email: string;
  role: 'admin' | 'curator' | 'editor';
}

export default function UsersAdmin() {
  const { isAdmin, user } = useAuth();
  const [users, setUsers] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<UserRole | Partial<UserRole> | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'user_roles'));
      const snapshot = await getDocs(q);
      const fetchedUsers = snapshot.docs.map(doc => ({
        email: doc.id,
        role: doc.data().role
      } as UserRole));
      setUsers(fetchedUsers);
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  if (!isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editingUser.email || !editingUser.role) {
      alert("Please fill in required fields.");
      return;
    }

    const emailToSave = editingUser.email.toLowerCase().trim();

    try {
      await setDoc(doc(db, 'user_roles', emailToSave), {
        role: editingUser.role
      });
      
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      console.error("Error saving user role:", err);
      alert("Failed to save user role. Check permissions.");
    }
  };

  const handleDelete = async (email: string) => {
    if (email === user?.email?.toLowerCase()) {
      alert("You cannot delete your own role here.");
      return;
    }
    if (window.confirm(`Are you sure you want to remove the role for ${email}?`)) {
      try {
        await deleteDoc(doc(db, 'user_roles', email));
        fetchUsers();
      } catch (err) {
        console.error("Error deleting user role:", err);
        alert("Failed to delete user role.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <AdminHeader />
      <main className="flex-grow p-8 max-w-7xl mx-auto w-full">
        {editingUser !== null ? (
          <div className="bg-white rounded-lg shadow-sm border border-tan-light p-6 max-w-md mx-auto">
            <button 
              onClick={() => setEditingUser(null)}
              className="flex items-center gap-2 text-charcoal/60 hover:text-charcoal mb-6"
            >
              <ArrowLeft size={16} /> Back to Users
            </button>
            <h2 className="text-2xl font-serif text-charcoal mb-6">
              {editingUser.email && users.find(u => u.email === editingUser.email) ? 'Edit User Role' : 'Add User Role'}
            </h2>
            <form onSubmit={handleSave} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-charcoal mb-2">Email Address</label>
                <input
                  type="email"
                  required
                  disabled={!!(editingUser.email && users.find(u => u.email === editingUser.email))}
                  value={editingUser.email || ''}
                  onChange={e => setEditingUser({...editingUser, email: e.target.value})}
                  className="w-full px-4 py-2 border border-tan-light rounded-md focus:outline-none focus:ring-2 focus:ring-tan/50 disabled:bg-gray-100 disabled:text-gray-500"
                  placeholder="user@example.com"
                />
                <p className="text-xs text-charcoal/50 mt-1">Must exactly match their Google account email.</p>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-charcoal mb-2">Role</label>
                <select
                  required
                  value={editingUser.role || 'editor'}
                  onChange={e => setEditingUser({...editingUser, role: e.target.value as UserRole['role']})}
                  className="w-full px-4 py-2 border border-tan-light rounded-md focus:outline-none focus:ring-2 focus:ring-tan/50"
                >
                  <option value="editor">Editor (Can edit posts/events)</option>
                  <option value="curator">Curator (Can edit posts, forms, bookings)</option>
                  <option value="admin">Admin (Full Access)</option>
                </select>
              </div>

              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-6 py-2 border border-tan text-tan rounded hover:bg-tan/10 transition-colors font-bold uppercase tracking-widest text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-tan text-white rounded hover:bg-tan-dark transition-colors font-bold uppercase tracking-widest text-sm"
                >
                  Save Role
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-serif text-charcoal">User Roles</h2>
              <button 
                onClick={() => setEditingUser({ role: 'editor' })}
                className="flex items-center gap-2 bg-tan hover:bg-tan-dark text-white px-6 py-2 rounded-md transition-colors font-sans text-sm font-bold uppercase tracking-wider shadow-sm"
              >
                <Plus size={18} />
                Add User
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12 text-charcoal/60">Loading users...</div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-tan-light overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-cream border-b border-tan-light">
                      <th className="p-4 font-sans font-bold text-xs uppercase tracking-wider text-charcoal/60">Email</th>
                      <th className="p-4 font-sans font-bold text-xs uppercase tracking-wider text-charcoal/60">Role</th>
                      <th className="p-4 font-sans font-bold text-xs uppercase tracking-wider text-charcoal/60 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.email} className="border-b border-tan-light/50 last:border-0 hover:bg-cream/50 transition-colors">
                        <td className="p-4 font-serif text-charcoal">{u.email}</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider ${
                            u.role === 'admin' ? 'bg-red-100 text-red-800' : 
                            u.role === 'curator' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="p-4 flex gap-3 justify-end">
                          <button onClick={() => setEditingUser(u)} className="text-charcoal/60 hover:text-tan transition-colors">
                            <Pencil size={18} />
                          </button>
                          <button onClick={() => handleDelete(u.email)} className="text-charcoal/60 hover:text-red-600 transition-colors">
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={3} className="p-8 text-center text-charcoal/60">No user roles configured yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

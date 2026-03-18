import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LogIn } from 'lucide-react';

export default function Login() {
  const { user, isAdmin, loginWithGoogle, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/admin/bookings';

  useEffect(() => {
    if (user && isAdmin) {
      navigate(from, { replace: true });
    }
  }, [user, isAdmin, navigate, from]);

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tan"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-serif text-charcoal">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-4xl font-bold tracking-tight">
          Curator Portal
        </h2>
        <p className="mt-2 text-center text-sm font-sans text-charcoal/60">
          Sign in to manage SAHS bookings and configurations.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-tan/20 sm:rounded-lg sm:px-10">
          
          {user && !isAdmin ? (
            <div className="rounded-md bg-red-50 p-4 mb-6 border border-red-200">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800 font-sans">Access Denied</h3>
                  <div className="mt-2 text-sm text-red-700 font-sans">
                    <p>
                      Your account ({user.email}) does not have curator access privileges. Please contact an administrator if you believe this is an error.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div>
            <button
              onClick={loginWithGoogle}
              className="flex w-full items-center justify-center gap-3 rounded-md border border-tan-light bg-white px-4 py-3 text-sm font-medium font-sans text-charcoal shadow-sm hover:bg-black/5 transition-colors focus:outline-none focus:ring-2 focus:ring-tan focus:ring-offset-2"
            >
              <LogIn className="h-5 w-5 text-tan" />
              Sign in with Google
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LogIn } from 'lucide-react';

export default function Login() {
  const { user, isSAHSUser, loginWithGoogle, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/admin/content';

  useEffect(() => {
    if (user && isSAHSUser) {
      navigate(from, { replace: true });
    }
  }, [user, isSAHSUser, navigate, from]);

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
          Sign in to manage SAHS content and configurations.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-tan/20 sm:rounded-lg sm:px-10">
          
          {/* The overwhelmingly common cause of a denial is signing in with a
              personal Google account rather than the @senoiahistory.com one —
              several board members who already hold a role have only ever
              arrived here on a personal address. "Contact an administrator"
              alone sent those people to a human for something they could fix
              themselves in ten seconds, so lead with the account switch and
              keep the escalation as the fallback. `prompt: 'select_account'` is
              already set on the provider, so the button below genuinely offers
              the chooser rather than silently reusing the same account. */}
          {user && !isSAHSUser ? (
            <div className="rounded-md bg-red-50 p-4 mb-6 border border-red-200">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800 font-sans">Access Denied</h3>
                  <div className="mt-2 text-sm text-red-700 font-sans space-y-2">
                    <p>
                      You're signed in as <span className="font-medium break-all">{user.email}</span>, which doesn't have portal access.
                    </p>
                    {!user.email?.toLowerCase().endsWith('@senoiahistory.com') && (
                      <p>
                        The portal uses your <span className="font-medium">@senoiahistory.com</span> account. If you signed in
                        with a personal account, use the button below and pick your SAHS one instead.
                      </p>
                    )}
                    <p className="text-red-600/90">
                      Already using your @senoiahistory.com account? Email{' '}
                      <a href="mailto:info@senoiahistory.com" className="underline font-medium">info@senoiahistory.com</a>{' '}
                      and we'll grant access.
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
              {user && !isSAHSUser ? 'Switch Google account' : 'Sign in with Google'}
            </button>
            {!user && (
              <p className="mt-3 text-center text-xs text-charcoal/50 font-sans">
                Use your @senoiahistory.com account.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

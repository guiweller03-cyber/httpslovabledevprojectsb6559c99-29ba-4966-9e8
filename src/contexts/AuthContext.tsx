import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  id: string;
  tenant_id: string | null;
  email: string | null;
  full_name: string | null;
  role: 'owner' | 'admin' | 'manager' | 'employee';
  status: 'active' | 'inactive' | 'pending';
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  isLoading: boolean;
  hasProfile: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer profile check with setTimeout to prevent deadlock
        if (session?.user) {
          setTimeout(() => {
            checkUserProfile(session.user.id);
          }, 0);
        } else {
          setUserProfile(null);
          setIsAdmin(false);
          setHasProfile(false);
          setIsLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        checkUserProfile(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUserProfile = async (userId: string) => {
    try {
      // Check users_profile table for the user's profile
      const { data: profile, error: profileError } = await supabase
        .from('users_profile')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('Error checking user profile:', profileError);
        setHasProfile(false);
        setUserProfile(null);
      } else if (profile) {
        setUserProfile(profile as UserProfile);
        setHasProfile(true);
        // Check if user is admin based on role
        setIsAdmin(profile.role === 'owner' || profile.role === 'admin');
      } else {
        // No profile found - user needs to complete setup
        setHasProfile(false);
        setUserProfile(null);
        setIsAdmin(false);
      }

      // Also check user_roles for backward compatibility
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();

      if (roleData) {
        setIsAdmin(true);
      }
    } catch (err) {
      console.error('Error checking user profile:', err);
      setHasProfile(false);
      setUserProfile(null);
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserProfile(null);
    setIsAdmin(false);
    setHasProfile(false);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      userProfile,
      isAdmin,
      isLoading,
      hasProfile,
      signUp,
      signIn,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface Tenant {
  id: string;
  nome: string;
  plano: 'basic' | 'professional' | 'enterprise';
  status: 'active' | 'inactive' | 'suspended' | 'trial';
  created_at: string;
}

interface UserProfile {
  id: string;
  tenant_id: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: 'owner' | 'admin' | 'manager' | 'employee';
  status: 'active' | 'inactive' | 'pending';
}

interface TenantContextType {
  tenant: Tenant | null;
  userProfile: UserProfile | null;
  isLoading: boolean;
  hasProfile: boolean;
  isTenantOwner: boolean;
  isTenantAdmin: boolean;
  refreshProfile: () => Promise<void>;
  createTenantWithOwner: (tenantName: string) => Promise<{ success: boolean; error?: string }>;
  acceptInvite: (inviteCode: string) => Promise<{ success: boolean; error?: string }>;
  validateInviteCode: (code: string) => Promise<{ valid: boolean; tenant_name?: string; role?: string }>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

// Helper to make typed requests to new tables
async function fetchFromTable<T>(table: string, query: string): Promise<{ data: T | null; error: any }> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/${table}?${query}`;
  const response = await fetch(url, {
    headers: {
      'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    return { data: null, error: await response.text() };
  }
  
  const data = await response.json();
  return { data: Array.isArray(data) ? data[0] : data, error: null };
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const hasProfile = !!userProfile?.tenant_id;
  const isTenantOwner = userProfile?.role === 'owner';
  const isTenantAdmin = userProfile?.role === 'owner' || userProfile?.role === 'admin';

  const fetchProfile = async () => {
    if (!user) {
      setUserProfile(null);
      setTenant(null);
      setIsLoading(false);
      return;
    }

    try {
      // Fetch user profile using REST API
      const { data: profile, error: profileError } = await fetchFromTable<UserProfile>(
        'users_profile',
        `id=eq.${user.id}&select=*`
      );

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        setUserProfile(null);
        setTenant(null);
        setIsLoading(false);
        return;
      }

      if (profile) {
        setUserProfile(profile);

        // Fetch tenant if profile has tenant_id
        if (profile.tenant_id) {
          const { data: tenantData, error: tenantError } = await fetchFromTable<Tenant>(
            'tenants',
            `id=eq.${profile.tenant_id}&select=*`
          );

          if (tenantError) {
            console.error('Error fetching tenant:', tenantError);
          } else if (tenantData) {
            setTenant(tenantData);
          }
        }
      } else {
        setUserProfile(null);
        setTenant(null);
      }
    } catch (err) {
      console.error('Error in fetchProfile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchProfile();
    }
  }, [user, authLoading]);

  const refreshProfile = async () => {
    setIsLoading(true);
    await fetchProfile();
  };

  const createTenantWithOwner = async (tenantName: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      // Call RPC function via REST API
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/create_tenant_with_owner`;
      const session = await supabase.auth.getSession();
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${session.data.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          _tenant_nome: tenantName,
          _user_id: user.id,
          _user_name: user.user_metadata?.full_name || user.email || '',
          _user_email: user.email || ''
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error creating tenant:', errorText);
        return { success: false, error: errorText };
      }

      const result = await response.json() as { success: boolean; error?: string; tenant_id?: string };
      
      if (result.success) {
        await refreshProfile();
      }

      return { success: result.success, error: result.error };
    } catch (err) {
      console.error('Error in createTenantWithOwner:', err);
      return { success: false, error: 'Failed to create tenant' };
    }
  };

  const validateInviteCode = async (code: string): Promise<{ valid: boolean; tenant_name?: string; role?: string }> => {
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/tenant_invites?invite_code=eq.${code}&status=eq.pending&expires_at=gt.${new Date().toISOString()}&select=id,role,tenant_id,tenants(nome)`;
      const session = await supabase.auth.getSession();
      
      const response = await fetch(url, {
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${session.data.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        return { valid: false };
      }

      const data = await response.json();
      
      if (!data || data.length === 0) {
        return { valid: false };
      }

      const invite = data[0];
      return { 
        valid: true, 
        tenant_name: invite.tenants?.nome,
        role: invite.role
      };
    } catch (err) {
      console.error('Error validating invite:', err);
      return { valid: false };
    }
  };

  const acceptInvite = async (inviteCode: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      // Call RPC function via REST API
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/accept_tenant_invite`;
      const session = await supabase.auth.getSession();
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${session.data.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          _invite_code: inviteCode,
          _user_id: user.id,
          _user_name: user.user_metadata?.full_name || user.email || '',
          _user_email: user.email || ''
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error accepting invite:', errorText);
        return { success: false, error: errorText };
      }

      const result = await response.json() as { success: boolean; error?: string };
      
      if (result.success) {
        await refreshProfile();
      }

      return { success: result.success, error: result.error };
    } catch (err) {
      console.error('Error in acceptInvite:', err);
      return { success: false, error: 'Failed to accept invite' };
    }
  };

  return (
    <TenantContext.Provider value={{
      tenant,
      userProfile,
      isLoading: isLoading || authLoading,
      hasProfile,
      isTenantOwner,
      isTenantAdmin,
      refreshProfile,
      createTenantWithOwner,
      acceptInvite,
      validateInviteCode
    }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}

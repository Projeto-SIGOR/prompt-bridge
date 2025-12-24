import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface VehicleCrew {
  id: string;
  vehicle_id: string;
  user_id: string;
  joined_at: string;
  left_at: string | null;
  is_active: boolean;
  vehicle?: {
    id: string;
    identifier: string;
    type: string;
    status: string;
    base?: {
      id: string;
      name: string;
    };
  };
  profile?: {
    id: string;
    full_name: string;
  };
}

interface Vehicle {
  id: string;
  identifier: string;
  type: string;
  status: string;
  base_id: string;
  base?: {
    id: string;
    name: string;
    organization_id: string;
  };
}

export function useVehicleCrew() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [currentCrew, setCurrentCrew] = useState<VehicleCrew | null>(null);
  const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([]);
  const [crewMembers, setCrewMembers] = useState<VehicleCrew[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch current user's active crew assignment
  const fetchCurrentCrew = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('vehicle_crew')
        .select(`
          *,
          vehicle:vehicles(
            id,
            identifier,
            type,
            status,
            base:bases(id, name)
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      setCurrentCrew(data as VehicleCrew | null);
    } catch (error) {
      console.error('Error fetching current crew:', error);
    }
  };

  // Fetch available vehicles for the user's organization
  const fetchAvailableVehicles = async () => {
    if (!profile?.organization_id) return;

    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select(`
          id,
          identifier,
          type,
          status,
          base_id,
          base:bases(id, name, organization_id)
        `)
        .eq('status', 'available');

      if (error) throw error;
      
      // Filter vehicles by user's organization
      const orgVehicles = (data || []).filter(
        (v: any) => v.base?.organization_id === profile.organization_id
      );
      
      setAvailableVehicles(orgVehicles as Vehicle[]);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    }
  };

  // Fetch all crew members for a specific vehicle
  const fetchCrewMembers = async (vehicleId: string) => {
    try {
      const { data, error } = await supabase
        .from('vehicle_crew')
        .select(`
          *,
          profile:profiles(id, full_name)
        `)
        .eq('vehicle_id', vehicleId)
        .eq('is_active', true);

      if (error) throw error;
      setCrewMembers((data || []) as unknown as VehicleCrew[]);
    } catch (error) {
      console.error('Error fetching crew members:', error);
    }
  };

  // Join a vehicle (start shift)
  const joinVehicle = async (vehicleId: string) => {
    if (!user) return;

    try {
      // First check if already in a vehicle
      if (currentCrew) {
        toast({
          title: 'Já em serviço',
          description: 'Você já está em uma viatura. Saia primeiro antes de entrar em outra.',
          variant: 'destructive',
        });
        return;
      }

      // Insert crew record
      const { error: insertError } = await supabase
        .from('vehicle_crew')
        .insert({
          vehicle_id: vehicleId,
          user_id: user.id,
        });

      if (insertError) throw insertError;

      // Update vehicle status to busy if needed
      const { data: crewCount } = await supabase
        .from('vehicle_crew')
        .select('id', { count: 'exact' })
        .eq('vehicle_id', vehicleId)
        .eq('is_active', true);

      if (crewCount && crewCount.length === 1) {
        // First person joining, mark vehicle as busy
        await supabase
          .from('vehicles')
          .update({ status: 'busy' })
          .eq('id', vehicleId);
      }

      toast({
        title: 'Entrada registrada',
        description: 'Você entrou em serviço na viatura.',
      });

      await fetchCurrentCrew();
      await fetchAvailableVehicles();
    } catch (error: any) {
      console.error('Error joining vehicle:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível entrar na viatura.',
        variant: 'destructive',
      });
    }
  };

  // Leave vehicle (end shift)
  const leaveVehicle = async () => {
    if (!user || !currentCrew) return;

    try {
      // Update crew record
      const { error: updateError } = await supabase
        .from('vehicle_crew')
        .update({
          is_active: false,
          left_at: new Date().toISOString(),
        })
        .eq('id', currentCrew.id);

      if (updateError) throw updateError;

      // Check if any other crew members are still active
      const { data: remainingCrew } = await supabase
        .from('vehicle_crew')
        .select('id')
        .eq('vehicle_id', currentCrew.vehicle_id)
        .eq('is_active', true)
        .neq('id', currentCrew.id);

      if (!remainingCrew || remainingCrew.length === 0) {
        // No more crew, mark vehicle as available
        await supabase
          .from('vehicles')
          .update({ status: 'available' })
          .eq('id', currentCrew.vehicle_id);
      }

      toast({
        title: 'Saída registrada',
        description: 'Você saiu de serviço da viatura.',
      });

      setCurrentCrew(null);
      await fetchAvailableVehicles();
    } catch (error: any) {
      console.error('Error leaving vehicle:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível sair da viatura.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchCurrentCrew(), fetchAvailableVehicles()]);
      setLoading(false);
    };

    if (user) {
      init();
    }

    // Real-time subscription
    const channel = supabase
      .channel('vehicle-crew-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vehicle_crew' },
        () => {
          fetchCurrentCrew();
          if (currentCrew) {
            fetchCrewMembers(currentCrew.vehicle_id);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vehicles' },
        () => fetchAvailableVehicles()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, profile?.organization_id]);

  return {
    currentCrew,
    availableVehicles,
    crewMembers,
    loading,
    joinVehicle,
    leaveVehicle,
    fetchCrewMembers,
    refetch: async () => {
      await Promise.all([fetchCurrentCrew(), fetchAvailableVehicles()]);
    },
  };
}
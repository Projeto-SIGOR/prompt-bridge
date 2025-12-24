-- Table for tracking vehicle crew assignments
CREATE TABLE public.vehicle_crew (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  left_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(vehicle_id, user_id, is_active) DEFERRABLE INITIALLY DEFERRED
);

-- Enable RLS
ALTER TABLE public.vehicle_crew ENABLE ROW LEVEL SECURITY;

-- Policies for vehicle_crew
CREATE POLICY "Users can view crew in their organization" 
ON public.vehicle_crew 
FOR SELECT 
USING (
  is_admin(auth.uid()) OR 
  has_role(auth.uid(), 'observer'::app_role) OR
  EXISTS (
    SELECT 1 FROM vehicles v
    JOIN bases b ON b.id = v.base_id
    JOIN profiles p ON p.organization_id = b.organization_id
    WHERE v.id = vehicle_crew.vehicle_id AND p.id = auth.uid()
  )
);

CREATE POLICY "Operational staff can manage their crew status" 
ON public.vehicle_crew 
FOR INSERT 
WITH CHECK (
  user_id = auth.uid() AND (
    has_role(auth.uid(), 'police_officer'::app_role) OR
    has_role(auth.uid(), 'samu_team'::app_role) OR
    has_role(auth.uid(), 'firefighter'::app_role)
  )
);

CREATE POLICY "Users can update their own crew status" 
ON public.vehicle_crew 
FOR UPDATE 
USING (user_id = auth.uid() OR is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_vehicle_crew_updated_at
  BEFORE UPDATE ON public.vehicle_crew
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
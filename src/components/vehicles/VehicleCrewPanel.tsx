import { useState } from 'react';
import { useVehicleCrew } from '@/hooks/useVehicleCrew';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Truck, 
  LogIn, 
  LogOut, 
  Loader2, 
  MapPin,
  Users,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function VehicleCrewPanel() {
  const { 
    currentCrew, 
    availableVehicles, 
    loading, 
    joinVehicle, 
    leaveVehicle 
  } = useVehicleCrew();
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const handleJoin = async () => {
    if (!selectedVehicle) return;
    setJoining(true);
    await joinVehicle(selectedVehicle);
    setJoining(false);
    setDialogOpen(false);
    setSelectedVehicle('');
  };

  const handleLeave = async () => {
    setLeaving(true);
    await leaveVehicle();
    setLeaving(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // User is currently in a vehicle
  if (currentCrew) {
    return (
      <Card className="border-primary/50 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Truck className="h-5 w-5 text-primary" />
              Em Serviço
            </CardTitle>
            <Badge className="bg-success text-success-foreground">Ativo</Badge>
          </div>
          <CardDescription>
            Você está em serviço na viatura abaixo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-card border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-muted-foreground" />
                <span className="font-bold text-lg">{currentCrew.vehicle?.identifier}</span>
              </div>
              <Badge variant="secondary">{currentCrew.vehicle?.type}</Badge>
            </div>
            
            {currentCrew.vehicle?.base && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <MapPin className="h-4 w-4" />
                <span>{currentCrew.vehicle.base.name}</span>
              </div>
            )}
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                Entrou às {format(new Date(currentCrew.joined_at), 'HH:mm', { locale: ptBR })}
              </span>
            </div>
          </div>

          <Button 
            variant="destructive" 
            className="w-full" 
            onClick={handleLeave}
            disabled={leaving}
          >
            {leaving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <LogOut className="h-4 w-4 mr-2" />
            )}
            Sair de Serviço
          </Button>
        </CardContent>
      </Card>
    );
  }

  // User is not in a vehicle
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Truck className="h-5 w-5" />
          Entrar em Serviço
        </CardTitle>
        <CardDescription>
          Selecione uma viatura para iniciar seu serviço
        </CardDescription>
      </CardHeader>
      <CardContent>
        {availableVehicles.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Truck className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhuma viatura disponível no momento</p>
          </div>
        ) : (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full">
                <LogIn className="h-4 w-4 mr-2" />
                Entrar em Viatura
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Selecionar Viatura</DialogTitle>
                <DialogDescription>
                  Escolha a viatura em que você irá trabalhar
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma viatura" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableVehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4" />
                          <span className="font-medium">{vehicle.identifier}</span>
                          <span className="text-muted-foreground">- {vehicle.type}</span>
                          {vehicle.base && (
                            <span className="text-xs text-muted-foreground">
                              ({vehicle.base.name})
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button 
                  className="w-full" 
                  onClick={handleJoin}
                  disabled={!selectedVehicle || joining}
                >
                  {joining ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <LogIn className="h-4 w-4 mr-2" />
                  )}
                  Confirmar Entrada
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}
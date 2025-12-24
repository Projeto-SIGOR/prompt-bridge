import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { LatLngExpression } from 'leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { MapPin, X } from 'lucide-react';

// Fix default marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Create custom red marker icon
const selectedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface LocationPickerMapProps {
  initialPosition?: { lat: number; lng: number } | null;
  onLocationSelect: (lat: number, lng: number, address?: string) => void;
  onClose: () => void;
}

function MapClickHandler({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapCenter({ center }: { center: LatLngExpression }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export function LocationPickerMap({ initialPosition, onLocationSelect, onClose }: LocationPickerMapProps) {
  // Default center: Ivaiporã, Paraná
  const defaultCenter: LatLngExpression = [-24.2469, -51.6833];
  const [selectedPosition, setSelectedPosition] = useState<{ lat: number; lng: number } | null>(initialPosition || null);
  const [address, setAddress] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Reverse geocoding to get address from coordinates
  const fetchAddress = async (lat: number, lng: number) => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'pt-BR',
          },
        }
      );
      const data = await response.json();
      if (data.display_name) {
        setAddress(data.display_name);
      }
    } catch (error) {
      console.error('Error fetching address:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMapClick = (lat: number, lng: number) => {
    setSelectedPosition({ lat, lng });
    fetchAddress(lat, lng);
  };

  const handleConfirm = () => {
    if (selectedPosition) {
      onLocationSelect(selectedPosition.lat, selectedPosition.lng, address);
    }
  };

  const center = selectedPosition 
    ? [selectedPosition.lat, selectedPosition.lng] as LatLngExpression
    : initialPosition 
      ? [initialPosition.lat, initialPosition.lng] as LatLngExpression
      : defaultCenter;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed inset-4 md:inset-10 bg-card rounded-lg shadow-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between bg-card">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Selecionar Local no Mapa</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <MapContainer
            center={center}
            zoom={14}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickHandler onLocationSelect={handleMapClick} />
            {selectedPosition && (
              <>
                <Marker 
                  position={[selectedPosition.lat, selectedPosition.lng]}
                  icon={selectedIcon}
                />
                <MapCenter center={[selectedPosition.lat, selectedPosition.lng]} />
              </>
            )}
          </MapContainer>

          {/* Instructions overlay */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-card/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg text-sm text-foreground">
            Clique no mapa para marcar o local da ocorrência
          </div>
        </div>

        {/* Footer with selected location info */}
        <div className="p-4 border-t bg-card space-y-3">
          {selectedPosition ? (
            <>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-1 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {selectedPosition.lat.toFixed(6)}, {selectedPosition.lng.toFixed(6)}
                  </p>
                  {loading ? (
                    <p className="text-sm text-muted-foreground">Buscando endereço...</p>
                  ) : address ? (
                    <p className="text-sm text-muted-foreground truncate">{address}</p>
                  ) : null}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose} className="flex-1">
                  Cancelar
                </Button>
                <Button onClick={handleConfirm} className="flex-1">
                  Confirmar Local
                </Button>
              </div>
            </>
          ) : (
            <p className="text-center text-muted-foreground text-sm">
              Nenhum local selecionado. Clique no mapa para marcar.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
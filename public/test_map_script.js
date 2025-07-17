// Script para probar el mapa manualmente en la consola del navegador
// Pegar este código en la consola del navegador

console.log('Iniciando prueba manual del mapa...');

// Buscar el controlador Stimulus
const mapController = document.querySelector('[data-controller="maps"]');
if (!mapController) {
  console.error('No se encontró el controlador de mapas');
} else {
  console.log('Controlador de mapas encontrado');
}

// Buscar el contenedor del mapa
const mapContainer = document.querySelector('[data-maps-target="mapContainer"]');
if (!mapContainer) {
  console.error('No se encontró el contenedor del mapa');
} else {
  console.log('Contenedor del mapa encontrado');
  console.log('Dimensiones del contenedor:', mapContainer.getBoundingClientRect());
}

// Verificar si Google Maps está cargado
if (typeof google !== 'undefined' && google.maps) {
  console.log('Google Maps está cargado');
} else {
  console.log('Google Maps NO está cargado');
}

// Verificar si hay mapas en el DOM
const gmStyleElements = document.querySelectorAll('.gm-style');
console.log('Elementos gm-style encontrados:', gmStyleElements.length);

// Intentar crear un mapa manualmente
if (typeof google !== 'undefined' && google.maps && mapContainer) {
  console.log('Intentando crear mapa manualmente...');

  try {
    const testMap = new google.maps.Map(mapContainer, {
      zoom: 6,
      center: { lat: 39.8283, lng: -98.5795 }
    });

    const testMarker = new google.maps.Marker({
      position: { lat: 39.8283, lng: -98.5795 },
      map: testMap,
      title: 'Prueba manual'
    });

    console.log('Mapa manual creado exitosamente');
  } catch (error) {
    console.error('Error creando mapa manual:', error);
  }
}

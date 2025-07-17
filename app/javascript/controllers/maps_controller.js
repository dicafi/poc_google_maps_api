import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["form", "resultsContainer", "mapContainer", "resultsTable"]
  static values = { 
    apiKey: String,
    tripData: Object
  }

  connect() {
    console.log('Maps controller connected')
    
    // Dar tiempo a que el DOM se estabilice antes de inicializar
    setTimeout(() => {
      this.initializeGoogleMaps()
      
      // Siempre mostrar un mapa básico al cargar
      this.showBasicMap()
      
      // Si hay datos de trip al cargar, mostrar el mapa con la ruta
      if (this.hasTripDataValue && this.tripDataValue.route_data) {
        console.log('Found trip data on connect, displaying results')
        this.displayResults(this.tripDataValue)
      }
    }, 100)
  }

  showBasicMap() {
    console.log('Showing basic map...')
    
    // Crear datos de prueba sin ruta
    const basicData = {
      route_data: null
    }
    
    // Dar tiempo para que el DOM se estabilice
    setTimeout(() => {
      this.initializeMap(basicData)
    }, 500)
  }

  disconnect() {
    // Limpiar cualquier callback global al desconectar
    if (window.initMap) {
      delete window.initMap
    }
    
    // Limpiar la promesa de carga si existe
    if (window.googleMapsLoading) {
      delete window.googleMapsLoading
    }
  }

  async initializeGoogleMaps() {
    // Evitar cargar Google Maps múltiples veces
    if (window.google && window.google.maps && window.google.maps.geometry) {
      console.log('Google Maps already loaded')
      this.mapsLoaded = true
      return Promise.resolve()
    }

    // Si ya hay un script cargándose, esperar a que termine
    if (window.googleMapsLoading) {
      console.log('Google Maps already loading, waiting...')
      return window.googleMapsLoading
    }

    console.log('Loading Google Maps...')
    
    // Crear una promesa para la carga
    window.googleMapsLoading = new Promise((resolve, reject) => {
      // Limpiar cualquier callback anterior
      delete window.initMap
      
      window.initMap = () => {
        console.log('Google Maps loaded via callback')
        this.mapsLoaded = true
        delete window.googleMapsLoading
        resolve()
      }

      // Verificar si ya existe un script similar y removerlo
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
      if (existingScript) {
        console.log('Removing existing maps script')
        existingScript.remove()
      }

      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${this.apiKeyValue}&callback=initMap&libraries=geometry&loading=async`
      script.async = true
      script.defer = true
      script.onerror = (error) => {
        console.error('Error loading Google Maps script:', error)
        delete window.googleMapsLoading
        reject(new Error('Failed to load Google Maps'))
      }
      
      console.log('Appending Google Maps script to head')
      document.head.appendChild(script)
    })

    return window.googleMapsLoading
  }

  async calculateRoute(event) {
    event.preventDefault()
    
    const formData = new FormData(this.formTarget)
    const origin = formData.get('trip[origin]')
    const destination = formData.get('trip[destination]')

    // Guardar las entradas originales para uso posterior
    this.lastOriginInput = origin
    this.lastDestinationInput = destination

    if (!origin || !destination) {
      alert('Por favor, ingresa tanto el origen como el destino')
      return
    }

    try {
      // Mostrar loading
      this.showLoading()

      const response = await fetch('/trips/calculate_route', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content
        },
        body: JSON.stringify({
          trip: {
            origin: origin,
            destination: destination
          }
        })
      })

      console.log('Response status:', response.status)
      console.log('Response headers:', response.headers)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('Response data:', data)

      if (data.success) {
        this.displayResults(data.trip)
      } else {
        this.showError(data.error || data.errors?.join(', ') || 'Error desconocido')
      }
    } catch (error) {
      console.error('Error:', error)
      this.showError(`Error de conexión: ${error.message}`)
    } finally {
      this.hideLoading()
    }
  }

  displayResults(tripData) {
    console.log('Displaying results with tripData:', tripData)
    this.showResultsContainer()
    this.updateResultsTable(tripData)
    
    // Dar tiempo para que el contenedor se muestre antes de inicializar el mapa
    setTimeout(() => {
      this.initializeMap(tripData)
    }, 200)
  }

  updateResultsTable(tripData) {
    const tbody = this.resultsTableTarget.querySelector('tbody')
    tbody.innerHTML = ''

    // Agregar fila de total
    const totalRow = document.createElement('tr')
    totalRow.className = 'bg-blue-50'
    totalRow.innerHTML = `
      <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">TOTAL</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">${tripData.total_distance_miles} millas</td>
    `
    tbody.appendChild(totalRow)

    // Agregar filas de estados
    Object.entries(tripData.state_distances_miles).forEach(([state, miles]) => {
      const row = document.createElement('tr')
      row.className = 'hover:bg-gray-50'
      row.innerHTML = `
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${state}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${miles} millas</td>
      `
      tbody.appendChild(row)
    })
  }

  async initializeMap(tripData) {
    console.log('Initializing map with tripData:', tripData)
    
    // Verificar que el contenedor del mapa esté en el DOM
    if (!this.mapContainerTarget) {
      console.error('Map container not found')
      return
    }
    
    // Verificar que el contenedor tenga dimensiones
    const rect = this.mapContainerTarget.getBoundingClientRect()
    console.log('Map container dimensions:', rect.width, 'x', rect.height)
    
    if (rect.width === 0 || rect.height === 0) {
      console.warn('Map container has zero dimensions')
      // Forzar dimensiones mínimas si es necesario
      this.mapContainerTarget.style.minHeight = '384px'
      this.mapContainerTarget.style.minWidth = '100%'
    }
    
    // Esperar a que Google Maps esté cargado
    try {
      await this.initializeGoogleMaps()
    } catch (error) {
      console.error('Failed to initialize Google Maps:', error)
      this.showError('Error cargando Google Maps')
      return
    }

    // Limpiar cualquier mapa anterior
    this.mapContainerTarget.innerHTML = ''

    console.log('Creating map...')
    
    // Crear el mapa con configuración básica
    const map = new google.maps.Map(this.mapContainerTarget, {
      zoom: 6,
      center: { lat: 39.8283, lng: -98.5795 }, // Centro de USA
      mapTypeControl: true,
      streetViewControl: true,
      fullscreenControl: true,
      gestureHandling: 'cooperative'
    })
    
    console.log('Map created successfully')
    
    // Almacenar la referencia al mapa para uso posterior
    this.map = map
    
    // Agregar un marcador de prueba inmediatamente
    const testMarker = new google.maps.Marker({
      position: { lat: 39.8283, lng: -98.5795 },
      map: map,
      title: 'Test Marker - Centro de USA',
      icon: {
        url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
        scaledSize: new google.maps.Size(32, 32)
      }
    })
    
    console.log('Test marker added')
    
    // Forzar resize del mapa después de varios delays
    setTimeout(() => {
      console.log('First resize trigger')
      google.maps.event.trigger(map, 'resize')
      map.setCenter({ lat: 39.8283, lng: -98.5795 })
    }, 100)
    
    setTimeout(() => {
      console.log('Second resize trigger')
      google.maps.event.trigger(map, 'resize')
    }, 500)
    
    setTimeout(() => {
      console.log('Third resize trigger')
      google.maps.event.trigger(map, 'resize')
    }, 1000)

    // Solo procesar los datos de ruta si existen
    if (tripData && tripData.route_data && tripData.route_data.polyline && tripData.route_data.legs && tripData.route_data.legs.length > 0) {
      console.log('Processing route data...')
      this.processRouteData(map, tripData, testMarker)
    } else {
      console.log('No route data available, showing test marker only')
    }
  }
  
  processRouteData(map, tripData, testMarker) {
    console.log('Route data available:', tripData.route_data)
    
    // Usar el polyline directamente para mostrar la ruta
    try {
      const decodedPath = google.maps.geometry.encoding.decodePath(tripData.route_data.polyline)
      
      const polyline = new google.maps.Polyline({
        path: decodedPath,
        geodesic: true,
        strokeColor: '#4F46E5',
        strokeOpacity: 0.8,
        strokeWeight: 4
      })
      
      polyline.setMap(map)
      console.log('Polyline rendered successfully')
      
      // Remover el marcador de prueba
      testMarker.setMap(null)
      
      // Agregar marcadores para el inicio y fin
      const legs = tripData.route_data.legs
      const startAddress = legs[0].start_address
      const endAddress = legs[legs.length - 1].end_address
      
      // Obtener las coordenadas del polyline para los marcadores
      const startLatLng = decodedPath[0]
      const endLatLng = decodedPath[decodedPath.length - 1]
      
      // Usar marcadores clásicos
      const startMarker = new google.maps.Marker({
        position: startLatLng,
        map: map,
        title: `Inicio: ${startAddress}`,
        icon: {
          url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
          scaledSize: new google.maps.Size(32, 32)
        }
      })
      
      const endMarker = new google.maps.Marker({
        position: endLatLng,
        map: map,
        title: `Destino: ${endAddress}`,
        icon: {
          url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
          scaledSize: new google.maps.Size(32, 32)
        }
      })
      
      console.log('Route markers created successfully')
      
      // Ajustar el zoom para mostrar toda la ruta
      const bounds = new google.maps.LatLngBounds()
      decodedPath.forEach(point => bounds.extend(point))
      map.fitBounds(bounds)
      
      // Agregar un pequeño padding
      setTimeout(() => {
        map.panBy(0, -50)
      }, 100)
      
    } catch (error) {
      console.error('Error processing route data:', error)
      
      // Fallback: hacer una nueva solicitud a la API de Google
      this.fallbackToDirectionsAPI(map, tripData)
    }
  }

  fallbackToDirectionsAPI(map, tripData) {
    const directionsService = new google.maps.DirectionsService()
    const directionsRenderer = new google.maps.DirectionsRenderer({
      suppressMarkers: false,
      polylineOptions: {
        strokeColor: '#4F46E5',
        strokeWeight: 4,
        strokeOpacity: 0.8
      }
    })

    directionsRenderer.setMap(map)
    
    const legs = tripData.route_data.legs
    const originAddress = legs[0].start_address
    const destinationAddress = legs[legs.length - 1].end_address
    
    console.log('Fallback: Making new directions request')
    console.log('Origin:', originAddress, 'Destination:', destinationAddress)
    
    // Convertir coordenadas a direcciones más legibles si es necesario
    let origin = originAddress
    let destination = destinationAddress
    
    // Si las direcciones son coordenadas, usar las entradas originales del formulario
    if (originAddress.includes(',') && originAddress.match(/^[\d\.\-\s,]+$/)) {
      origin = this.lastOriginInput || originAddress
    }
    if (destinationAddress.includes(',') && destinationAddress.match(/^[\d\.\-\s,]+$/)) {
      destination = this.lastDestinationInput || destinationAddress
    }
    
    const request = {
      origin: origin,
      destination: destination,
      travelMode: google.maps.TravelMode.DRIVING,
      optimizeWaypoints: false
    }

    console.log('Making directions request:', request)
    
    directionsService.route(request, (result, status) => {
      console.log('Directions result:', result, 'Status:', status)
      
      if (status === 'OK') {
        directionsRenderer.setDirections(result)
        console.log('Route rendered successfully')
      } else {
        console.error('Error displaying route:', status)
        if (status === 'REQUEST_DENIED') {
          this.showError('Error de API: La clave de Google Maps no tiene permisos para el servicio de Directions. Verifica que esté habilitada la "Directions API" en Google Cloud Console.')
        } else {
          this.showError(`Error mostrando la ruta en el mapa: ${status}`)
        }
      }
    })
  }

  showResultsContainer() {
    this.resultsContainerTarget.classList.remove('hidden')
  }

  hideResultsContainer() {
    this.resultsContainerTarget.classList.add('hidden')
  }

  showLoading() {
    const submitButton = this.formTarget.querySelector('button[type="submit"]') || 
                        this.formTarget.querySelector('input[type="submit"]')
    if (submitButton) {
      submitButton.disabled = true
      submitButton.textContent = 'Calculando...'
    }
  }

  hideLoading() {
    const submitButton = this.formTarget.querySelector('button[type="submit"]') || 
                        this.formTarget.querySelector('input[type="submit"]')
    if (submitButton) {
      submitButton.disabled = false
      submitButton.textContent = 'Calcular Ruta'
    }
  }

  showError(message) {
    // Crear o actualizar mensaje de error
    let errorDiv = document.getElementById('error-message')
    if (!errorDiv) {
      errorDiv = document.createElement('div')
      errorDiv.id = 'error-message'
      errorDiv.className = 'mb-4 p-4 text-red-700 bg-red-100 border border-red-300 rounded-md'
      this.formTarget.parentNode.insertBefore(errorDiv, this.formTarget)
    }
    errorDiv.textContent = message
    
    // Auto-hide después de 5 segundos
    setTimeout(() => {
      if (errorDiv) {
        errorDiv.remove()
      }
    }, 5000)
  }
}

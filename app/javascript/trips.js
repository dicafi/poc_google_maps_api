// Trip Route Calculator JavaScript

let map;
let directionsService;
let directionsRenderer;

// State colors for route visualization
const STATE_COLORS = {
  'AL': '#FF6B6B', 'AK': '#4ECDC4', 'AZ': '#45B7D1', 'AR': '#96CEB4', 'CA': '#FECA57',
  'CO': '#FF9FF3', 'CT': '#54A0FF', 'DE': '#5F27CD', 'FL': '#00D2D3', 'GA': '#FF9F43',
  'HI': '#10AC84', 'ID': '#EE5A24', 'IL': '#0984E3', 'IN': '#6C5CE7', 'IA': '#A29BFE',
  'KS': '#FD79A8', 'KY': '#E17055', 'LA': '#00B894', 'ME': '#FDCB6E', 'MD': '#E84393',
  'MA': '#2D3436', 'MI': '#00CEC9', 'MN': '#6C5CE7', 'MS': '#A29BFE', 'MO': '#FD79A8',
  'MT': '#E17055', 'NE': '#00B894', 'NV': '#FDCB6E', 'NH': '#E84393', 'NJ': '#2D3436',
  'NM': '#00CEC9', 'NY': '#74B9FF', 'NC': '#0984E3', 'ND': '#A29BFE', 'OH': '#FD79A8',
  'OK': '#E17055', 'OR': '#00B894', 'PA': '#FDCB6E', 'RI': '#E84393', 'SC': '#2D3436',
  'SD': '#00CEC9', 'TN': '#74B9FF', 'TX': '#0984E3', 'UT': '#A29BFE', 'VT': '#FD79A8',
  'VA': '#E17055', 'WA': '#00B894', 'WV': '#FDCB6E', 'WI': '#E84393', 'WY': '#2D3436'
};

function initMap() {
  // Initialize map centered on USA
  map = new google.maps.Map(document.getElementById('map'), {
    zoom: 4,
    center: { lat: 39.8283, lng: -98.5795 }, // Geographic center of USA
    mapTypeId: 'roadmap'
  });

  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer({
    suppressMarkers: false,
    polylineOptions: {
      strokeColor: '#4285F4',
      strokeWeight: 4,
      strokeOpacity: 0.8
    }
  });

  directionsRenderer.setMap(map);
}

// Form submission handler
document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('route-form');
  const loadingDiv = document.getElementById('loading');
  const errorDiv = document.getElementById('error-display');
  const resultsContainer = document.getElementById('results-container');
  const calculateBtn = document.getElementById('calculate-btn');

  form.addEventListener('submit', function(e) {
    e.preventDefault();

    // Show loading state
    calculateBtn.disabled = true;
    loadingDiv.classList.remove('hidden');
    errorDiv.classList.add('hidden');
    resultsContainer.classList.add('hidden');

    const formData = new FormData(form);

    fetch(form.action, {
      method: 'POST',
      body: formData,
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
      }
    })
    .then(response => response.json())
    .then(data => {
      loadingDiv.classList.add('hidden');
      calculateBtn.disabled = false;

      if (data.success) {
        displayResults(data.trip);
        displayRouteOnMap(data.trip);
      } else {
        showError(data.error || data.errors?.join(', ') || 'Error desconocido');
      }
    })
    .catch(error => {
      console.error('Error:', error);
      loadingDiv.classList.add('hidden');
      calculateBtn.disabled = false;
      showError('Error de conexión. Por favor intenta de nuevo.');
    });
  });

  function showError(message) {
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
  }

  function displayResults(trip) {
    // Show total distance
    document.getElementById('total-distance').textContent = trip.total_distance_miles + ' millas';

    // Populate states table
    const tableBody = document.getElementById('states-table-body');
    tableBody.innerHTML = '';

    const stateDistances = trip.state_distances_miles;
    const totalDistance = trip.total_distance_miles;

    // Sort states by distance (descending)
    const sortedStates = Object.entries(stateDistances)
      .sort(([,a], [,b]) => b - a);

    sortedStates.forEach(([state, miles]) => {
      const percentage = ((miles / totalDistance) * 100).toFixed(1);
      const color = STATE_COLORS[state] || '#6B7280';

      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="flex items-center">
            <div class="w-4 h-4 rounded-full mr-3" style="background-color: ${color}"></div>
            <span class="text-sm font-medium text-gray-900">${state}</span>
          </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          ${miles} millas
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          ${percentage}%
        </td>
      `;
      tableBody.appendChild(row);
    });

    resultsContainer.classList.remove('hidden');
  }

  function displayRouteOnMap(trip) {
    const origin = document.getElementById('trip_origin').value;
    const destination = document.getElementById('trip_destination').value;

    const request = {
      origin: origin,
      destination: destination,
      travelMode: google.maps.TravelMode.DRIVING,
      unitSystem: google.maps.UnitSystem.IMPERIAL
    };

    directionsService.route(request, function(result, status) {
      if (status === 'OK') {
        directionsRenderer.setDirections(result);

        // Customize the route polyline with different colors for different states
        // This is a simplified version - for production, you'd want to
        // decode the polyline and color each segment based on state
        customizeRouteVisualization(trip);
      } else {
        console.error('Directions request failed due to ' + status);
      }
    });
  }

  function customizeRouteVisualization(trip) {
    // This function would implement more sophisticated route coloring
    // For now, we'll add markers for state boundaries

    // Add a legend for state colors
    createStateLegend(trip.state_distances_miles);
  }

  function createStateLegend(stateDistances) {
    // Remove existing legend if any
    const existingLegend = document.getElementById('map-legend');
    if (existingLegend) {
      existingLegend.remove();
    }

    // Create legend
    const legend = document.createElement('div');
    legend.id = 'map-legend';
    legend.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      background: white;
      padding: 10px;
      border-radius: 5px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      font-size: 12px;
      max-height: 200px;
      overflow-y: auto;
      z-index: 1000;
    `;

    let legendHTML = '<strong>Estados en la Ruta:</strong><br>';
    Object.entries(stateDistances).forEach(([state, miles]) => {
      const color = STATE_COLORS[state] || '#6B7280';
      legendHTML += `
        <div style="margin: 5px 0; display: flex; align-items: center;">
          <div style="width: 12px; height: 12px; background-color: ${color}; margin-right: 5px; border-radius: 2px;"></div>
          <span>${state}: ${miles.toFixed(1)} mi</span>
        </div>
      `;
    });

    legend.innerHTML = legendHTML;

    // Add legend to map container
    document.getElementById('map').style.position = 'relative';
    document.getElementById('map').appendChild(legend);
  }
});

// Utility function to get state abbreviation from full name
function getStateAbbreviation(stateName) {
  const states = {
    'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
    'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
    'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
    'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
    'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
    'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
    'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
    'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
    'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
    'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY'
  };
  return states[stateName] || stateName;
}

class GoogleMapsService
  include HTTParty

  ROUTES_API_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes'
  GEOCODING_URL = 'https://maps.googleapis.com/maps/api/geocode/json'

  def initialize
    @api_key = ENV['GOOGLE_MAPS_API_KEY']
    raise 'Google Maps API key not found' if @api_key.blank?
  end

  def calculate_route_with_states(origin, destination)
    directions_data = get_directions_v2(origin, destination)
    return nil unless directions_data && directions_data['routes']&.any?

    route = directions_data['routes'].first
    legs = route['legs']

    # Get detailed steps for state analysis
    all_steps = legs.flat_map { |leg| leg['steps'] }

    # Calculate distances by state with better precision
    state_distances = calculate_state_distances_detailed(all_steps)

    # Total distance in meters
    total_distance = route['distanceMeters']

    {
      total_distance_meters: total_distance,
      state_distances: state_distances,
      route_data: {
        polyline: route['polyline']['encodedPolyline'],
        legs: legs.map do |leg|
          {
            start_address: format_location(leg['startLocation']),
            end_address: format_location(leg['endLocation']),
            distance: { value: leg['distanceMeters'], text: "#{(leg['distanceMeters'] / 1609.34).round(1)} mi" },
            duration: { value: leg['duration'], text: format_duration(leg['duration']) }
          }
        end
      }
    }
  end

  private

  def get_directions_v2(origin, destination)
    headers = {
      'Content-Type' => 'application/json',
      'X-Goog-Api-Key' => @api_key,
      'X-Goog-FieldMask' => 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.steps,routes.legs.startLocation,routes.legs.endLocation,routes.legs.distanceMeters,routes.legs.duration'
    }

    body = {
      origin: {
        address: origin
      },
      destination: {
        address: destination
      },
      travelMode: 'DRIVE',
      units: 'IMPERIAL',
      computeAlternativeRoutes: false
    }.to_json

    response = self.class.post(ROUTES_API_URL,
      headers: headers,
      body: body
    )

    if response.success?
      response.parsed_response
    else
      Rails.logger.error "Routes API Error: #{response.code} - #{response.body}"
      nil
    end
  rescue => e
    Rails.logger.error "Error calling Routes API: #{e.message}"
    nil
  end

  def calculate_state_distances_detailed(steps)
    state_distances = Hash.new(0)

    steps.each do |step|
      # Get start and end coordinates from the new API format
      start_lat = step.dig('startLocation', 'latLng', 'latitude')
      start_lng = step.dig('startLocation', 'latLng', 'longitude')
      end_lat = step.dig('endLocation', 'latLng', 'latitude')
      end_lng = step.dig('endLocation', 'latLng', 'longitude')

      next unless start_lat && start_lng && end_lat && end_lng

      # Get state for start and end locations
      start_state = get_state_from_coordinates(start_lat, start_lng)
      end_state = get_state_from_coordinates(end_lat, end_lng)

      distance_meters = step['distanceMeters'] || 0

      if start_state == end_state && start_state
        # Step is entirely within one state
        state_distances[start_state] += distance_meters
      elsif start_state && end_state && start_state != end_state
        # Step crosses state boundary - split the distance
        state_distances[start_state] += distance_meters / 2
        state_distances[end_state] += distance_meters / 2
      elsif start_state
        # Only start state is known
        state_distances[start_state] += distance_meters
      elsif end_state
        # Only end state is known
        state_distances[end_state] += distance_meters
      end
    end

    state_distances
  end

  def get_state_from_coordinates(lat, lng)
    # Use the legacy geocoding API which still works
    options = {
      query: {
        latlng: "#{lat},#{lng}",
        key: @api_key,
        result_type: 'administrative_area_level_1'
      }
    }

    response = self.class.get(GEOCODING_URL, options)
    data = response.parsed_response

    return nil unless data['status'] == 'OK' && data['results']&.any?

    # Extract state from the first result
    result = data['results'].first
    state_component = result['address_components']&.find do |component|
      component['types']&.include?('administrative_area_level_1')
    end

    state_component ? state_component['short_name'] : nil
  rescue => e
    Rails.logger.error "Error getting state from coordinates (#{lat}, #{lng}): #{e.message}"
    nil
  end

  def format_location(location)
    if location && location['latLng']
      lat = location['latLng']['latitude']
      lng = location['latLng']['longitude']
      "#{lat.round(6)}, #{lng.round(6)}"
    else
      'Unknown location'
    end
  end

  def format_duration(duration)
    # Duration comes as "3600s" format, convert to readable format
    seconds = duration.to_s.gsub('s', '').to_i
    hours = seconds / 3600
    minutes = (seconds % 3600) / 60

    if hours > 0
      "#{hours}h #{minutes}m"
    else
      "#{minutes}m"
    end
  end
end

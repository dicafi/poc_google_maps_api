class TripsController < ApplicationController
  before_action :set_google_maps_api_key
  skip_before_action :verify_authenticity_token, only: [ :calculate_route ]

  def index
    @trip = Trip.new
    @recent_trips = Trip.order(created_at: :desc).limit(10)
    @latest_trip = @recent_trips.first
  end

  def calculate_route
    @trip = Trip.new(trip_params)

    if @trip.valid?
      begin
        service = GoogleMapsService.new
        route_data = service.calculate_route_with_states(@trip.origin, @trip.destination)

        if route_data
          @trip.assign_attributes(route_data)
          @trip.save!

          respond_to do |format|
            format.html {
              @recent_trips = Trip.order(created_at: :desc).limit(10)
              redirect_to trips_path, notice: 'Ruta calculada exitosamente'
            }
            format.json {
              render json: {
                success: true,
                trip: {
                  id: @trip.id,
                  total_distance_miles: @trip.total_distance_miles.round(2),
                  state_distances_miles: @trip.state_distances_miles.transform_values { |v|
 v.round(2) },
                  route_data: @trip.route_data
                }
              }
            }
          end
        else
          respond_to do |format|
            format.html {
              @recent_trips = Trip.order(created_at: :desc).limit(10)
              redirect_to trips_path,
alert: 'No se pudo calcular la ruta. Verifica las direcciones ingresadas.'
            }
            format.json {
              render json: {
                success: false,
                error: 'No se pudo calcular la ruta. Verifica las direcciones ingresadas.'
              }
            }
          end
        end
      rescue => e
        Rails.logger.error "Error calculating route: #{e.message}"
        respond_to do |format|
          format.html {
            @recent_trips = Trip.order(created_at: :desc).limit(10)
            redirect_to trips_path,
alert: 'Error interno del servidor. Verifica tu API key de Google Maps.'
          }
          format.json {
            render json: {
              success: false,
              error: 'Error interno del servidor. Verifica tu API key de Google Maps.'
            }
          }
        end
      end
    else
      respond_to do |format|
        format.html {
          @recent_trips = Trip.order(created_at: :desc).limit(10)
          render :index
        }
        format.json {
          render json: {
            success: false,
            errors: @trip.errors.full_messages
          }
        }
      end
    end
  end

  private

  def trip_params
    params.require(:trip).permit(:origin, :destination)
  end

  def set_google_maps_api_key
    @google_maps_api_key = ENV['GOOGLE_MAPS_API_KEY']
  end
end

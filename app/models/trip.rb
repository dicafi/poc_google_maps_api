class Trip < ApplicationRecord
  validates :origin, presence: true
  validates :destination, presence: true

  def total_distance_miles
    total_distance_meters.to_f / 1609.34 if total_distance_meters
  end

  def state_distances_miles
    return {} unless state_distances

    state_distances.transform_values { |meters| meters.to_f / 1609.34 }
  end
end

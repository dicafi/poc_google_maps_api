class CreateTrips < ActiveRecord::Migration[8.0]
  def change
    create_table :trips do |t|
      t.string :origin, null: false
      t.string :destination, null: false
      t.integer :total_distance_meters
      t.json :state_distances
      t.json :route_data

      t.timestamps
    end

    add_index :trips, [:origin, :destination]
  end
end

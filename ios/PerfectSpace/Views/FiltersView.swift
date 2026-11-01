import SwiftUI

struct FiltersView: View {
    @State private var listingType: ListingType? = nil
    @State private var selectedTypes: Set<PropertyType> = []
    @State private var selectedPriceRange = 0
    @State private var selectedBedrooms: Int? = nil
    @State private var selectedCity = "Any"
    @State private var minPrice = ""
    @State private var maxPrice = ""

    let priceRanges = ["Any", "$0 - $500", "$500 - $1,000", "$1,000 - $2,000", "$2,000 - $5,000", "$5,000+"]
    let bedroomOptions = [0, 1, 2, 3, 4]
    let cities = ["Any", "New York", "San Francisco", "Boston", "Austin", "Chicago"]

    var body: some View {
        Form {
            Section("Listing Type") {
                Picker("Type", selection: Binding(
                    get: { listingType?.rawValue ?? "any" },
                    set: { val in listingType = val == "any" ? nil : ListingType(rawValue: val) }
                )) {
                    Text("Any").tag("any")
                    Text("For Rent").tag(ListingType.rent.rawValue)
                    Text("For Sale").tag(ListingType.sale.rawValue)
                }
            }

            Section("Property Type") {
                ForEach(PropertyType.allCases) { type in
                    Toggle(type.displayName, isOn: Binding(
                        get: { selectedTypes.contains(type) },
                        set: { isOn in if isOn { selectedTypes.insert(type) } else { selectedTypes.remove(type) } }
                    ))
                }
            }

            Section("Price Range") {
                Picker("Range", selection: $selectedPriceRange) {
                    ForEach(priceRanges.indices, id: \.self) { idx in
                        Text(priceRanges[idx]).tag(idx)
                    }
                }
                HStack {
                    TextField("Min $", text: $minPrice).keyboardType(.numberPad)
                    Text("—")
                    TextField("Max $", text: $maxPrice).keyboardType(.numberPad)
                }
            }

            Section("Bedrooms") {
                Picker("Bedrooms", selection: Binding(
                    get: { selectedBedrooms ?? -1 },
                    set: { val in selectedBedrooms = val == -1 ? nil : val }
                )) {
                    Text("Any").tag(-1)
                    ForEach(bedroomOptions, id: \.self) { n in
                        Text(n == 4 ? "4+" : "\(n)").tag(n)
                    }
                }
            }

            Section("City") {
                Picker("City", selection: $selectedCity) {
                    ForEach(cities, id: \.self) { Text($0).tag($0) }
                }
            }

            Section {
                Button("Apply Filters") {
                    // Filters would be applied to the data query
                }
                .frame(maxWidth: .infinity)
                .listRowBackground(Theme.primary)
                .foregroundStyle(.white)
            }
        }
        .navigationTitle("Filters")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Reset") {
                    listingType = nil
                    selectedTypes.removeAll()
                    selectedPriceRange = 0
                    selectedBedrooms = nil
                    selectedCity = "Any"
                    minPrice = ""
                    maxPrice = ""
                }
            }
        }
    }
}

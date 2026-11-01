import SwiftUI

struct AddPropertyView: View {
    @EnvironmentObject var auth: AuthService
    @EnvironmentObject var data: DataService
    @Environment(\.dismiss) var dismiss
    @State private var title = ""
    @State private var description = ""
    @State private var type: PropertyType = .apartment
    @State private var listingType: ListingType = .rent
    @State private var price = ""
    @State private var bedrooms = ""
    @State private var bathrooms = ""
    @State private var area = ""
    @State private var address = ""
    @State private var city = ""
    @State private var amenities = ""
    @State private var selectedCurrency = currencyOptions[0]
    @State private var showCurrencyPicker = false
    @State private var isLoading = false
    @State private var showSuccess = false

    var body: some View {
        Form {
            Section("Listing Type") {
                Picker("Type", selection: $listingType) {
                    Text("For Rent").tag(ListingType.rent)
                    Text("For Sale").tag(ListingType.sale)
                }
                .pickerStyle(.segmented)
            }

            Section("Property Type") {
                Picker("Category", selection: $type) {
                    ForEach(PropertyType.allCases) { t in
                        Text(t.displayName).tag(t)
                    }
                }
                .pickerStyle(.menu)
            }

            Section("Details") {
                TextField("Title *", text: $title)
                TextField("Description *", text: $description, axis: .vertical)
                    .lineLimit(3...5)

                Button {
                    showCurrencyPicker.toggle()
                } label: {
                    HStack {
                        Text("Currency").foregroundStyle(.secondary)
                        Spacer()
                        Text("\(selectedCurrency.symbol) \(selectedCurrency.country) (\(selectedCurrency.code))")
                            .foregroundStyle(Theme.primary)
                    }
                }

                if showCurrencyPicker {
                    Picker("Currency", selection: $selectedCurrency) {
                        ForEach(currencyOptions) { c in
                            Text("\(c.symbol) \(c.country) (\(c.code))").tag(c)
                        }
                    }
                    .pickerStyle(.wheel)
                    .frame(height: 120)
                }

                TextField("Price *", text: $price).keyboardType(.numberPad)
                HStack {
                    TextField("Bedrooms", text: $bedrooms).keyboardType(.numberPad)
                    TextField("Bathrooms", text: $bathrooms).keyboardType(.numberPad)
                }
                TextField("Area (sq ft)", text: $area).keyboardType(.numberPad)
            }

            Section("Location") {
                TextField("Address *", text: $address)
                TextField("City *", text: $city)
            }

            Section("Amenities") {
                TextField("WiFi, Parking, Pool (comma-separated)", text: $amenities)
            }
        }
        .navigationTitle("Add Property")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") { dismiss() }
            }
            ToolbarItem(placement: .confirmationAction) {
                Button("Submit") { handleSubmit() }
                    .disabled(isLoading || title.isEmpty || description.isEmpty || price.isEmpty || address.isEmpty || city.isEmpty)
            }
        }
        .alert("Submitted for Review", isPresented: $showSuccess) {
            Button("OK") { dismiss() }
        } message: {
            Text("Your property has been submitted and will appear on the platform once approved by an admin.")
        }
    }

    private func handleSubmit() {
        guard let user = auth.user else { return }
        isLoading = true

        let fallbackImages: [String] = [
            "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800",
            "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
            "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800"
        ]

        let property = Property(
            id: "p_\(Int(Date().timeIntervalSince1970))",
            title: title.trimmingCharacters(in: .whitespaces),
            description: description.trimmingCharacters(in: .whitespaces),
            type: type, listingType: listingType,
            price: Double(price) ?? 0, currency: selectedCurrency.symbol,
            period: listingType == .rent ? "/mo" : nil,
            bedrooms: Int(bedrooms) ?? 0, bathrooms: Int(bathrooms) ?? 1,
            area: Int(area) ?? 0,
            address: address.trimmingCharacters(in: .whitespaces),
            city: city.trimmingCharacters(in: .whitespaces),
            latitude: 40.7128, longitude: -74.006,
            images: fallbackImages,
            amenities: amenities.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty },
            ownerId: user.id, ownerName: user.name, ownerAvatar: user.avatar,
            rating: 0, reviewCount: 0, featured: false, status: .pending,
            createdAt: ISO8601DateFormatter().string(from: Date()).split(separator: "T").first.map(String.init) ?? ""
        )

        Task {
            do {
                try await data.addProperty(property)
                isLoading = false
                showSuccess = true
            } catch {
                isLoading = false
                print("[AddProperty] Error: \(error.localizedDescription)")
            }
        }
    }
}

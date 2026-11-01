import SwiftUI

struct ExploreView: View {
    @EnvironmentObject var data: DataService
    @State private var searchQuery = ""
    @State private var showMap = false

    var body: some View {
        Group {
            if showMap {
                mapView
            } else {
                listView
            }
        }
        .background(Theme.background)
        .safeAreaInset(edge: .top) {
            headerView
        }
    }

    private var headerView: some View {
        VStack(spacing: 14) {
            Text("Explore").font(.system(size: 28, weight: .heavy)).frame(maxWidth: .infinity, alignment: .leading)

            HStack(spacing: 8) {
                HStack(spacing: 8) {
                    Image(systemName: "magnifyingglass").foregroundStyle(Theme.textSecondary)
                    TextField("Search properties...", text: $searchQuery)
                }
                .padding(.horizontal, 14).padding(.vertical, 12)
                .background(Theme.background).clipShape(.rect(cornerRadius: 14))

                Button { withAnimation { showMap.toggle() } } label: {
                    Image(systemName: showMap ? "list.bullet" : "map")
                        .foregroundStyle(showMap ? .white : Theme.textSecondary)
                        .frame(width: 44, height: 44)
                        .background(showMap ? Theme.primary : Theme.background)
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Theme.border, lineWidth: 1))
                        .clipShape(.rect(cornerRadius: 12))
                }

                NavigationLink {
                    FiltersView()
                } label: {
                    Image(systemName: "line.3.horizontal.decrease")
                        .foregroundStyle(Theme.primary)
                        .frame(width: 44, height: 44)
                        .background(Theme.primaryLight)
                        .clipShape(.rect(cornerRadius: 12))
                }
            }
        }
        .padding(.horizontal, 20).padding(.bottom, 16)
        .background(Color.white)
    }

    private var listView: some View {
        ScrollView {
            VStack(spacing: 16) {
                Text("\(filteredProperties.count) properties found")
                    .font(.subheadline).foregroundStyle(Theme.textSecondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 20)

                ForEach(filteredProperties) { property in
                    NavigationLink {
                        PropertyDetailView(property: property)
                    } label: {
                        PropertyCardView(property: property)
                    }
                    .buttonStyle(.plain)
                    .padding(.horizontal, 20)
                }
            }
            .padding(.vertical, 12)
        }
    }

    private var mapView: some View {
        ZStack {
            Theme.primaryLight.ignoresSafeArea()

            VStack(spacing: 12) {
                Image(systemName: "mappin.and.ellipse").font(.system(size: 48)).foregroundStyle(Theme.primary)
                Text("Map View").font(.title3).fontWeight(.bold)
                Text("\(filteredProperties.count) properties in your area").font(.subheadline).foregroundStyle(Theme.textSecondary)

                ForEach(filteredProperties.prefix(5)) { property in
                    NavigationLink {
                        PropertyDetailView(property: property)
                    } label: {
                        HStack(spacing: 8) {
                            Image(systemName: "mappin.and.ellipse").foregroundStyle(Theme.primary)
                            Text(property.title).font(.subheadline).fontWeight(.semibold).lineLimit(1)
                            Spacer()
                            Text(property.formattedPrice).font(.subheadline).fontWeight(.bold).foregroundStyle(Theme.primary)
                        }
                        .padding(.horizontal, 14).padding(.vertical, 12)
                        .background(Color.white).clipShape(.rect(cornerRadius: 12))
                        .shadow(color: .black.opacity(0.06), radius: 6, y: 2)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(20)
        }
    }

    private var filteredProperties: [Property] {
        guard !searchQuery.trimmingCharacters(in: .whitespaces).isEmpty else { return data.activeProperties }
        let q = searchQuery.lowercased()
        return data.activeProperties.filter { $0.title.lowercased().contains(q) || $0.city.lowercased().contains(q) || $0.type.rawValue.contains(q) }
    }
}

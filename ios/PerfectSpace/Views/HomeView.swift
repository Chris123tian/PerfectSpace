import SwiftUI

struct HomeView: View {
    @EnvironmentObject var auth: AuthService
    @EnvironmentObject var data: DataService
    @State private var searchQuery = ""
    @State private var selectedCategory: PropertyType? = nil

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                if auth.user?.role == .landlord {
                    addPropertyBanner
                }

                categoriesSection

                if !featuredProperties.isEmpty && selectedCategory == nil && searchQuery.isEmpty {
                    featuredSection
                }

                allPropertiesSection
            }
            .padding(.vertical, 16)
        }
        .background(Theme.background)
        .safeAreaInset(edge: .top) {
            headerView
        }
    }

    private var headerView: some View {
        VStack(spacing: 16) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("\(greeting), \(auth.user?.name.split(separator: " ").first.map(String.init) ?? "there")")
                        .font(.subheadline).foregroundStyle(Theme.textSecondary)
                    Text("Perfect Space")
                        .font(.system(size: 24, weight: .heavy))
                        .foregroundStyle(Theme.textPrimary)
                }
                Spacer()
                if let avatarURL = auth.user?.avatar {
                    RemoteImage(url: avatarURL)
                        .frame(width: 44, height: 44)
                        .clipShape(Circle())
                        .overlay(Circle().stroke(Theme.primaryLight, lineWidth: 2))
                }
            }

            HStack(spacing: 10) {
                HStack(spacing: 8) {
                    Image(systemName: "magnifyingglass").foregroundStyle(Theme.textSecondary)
                    TextField("Search by location, type...", text: $searchQuery)
                        .textInputAutocapitalization(.never)
                }
                .padding(.horizontal, 14).padding(.vertical, 12)
                .background(Theme.background)
                .clipShape(.rect(cornerRadius: 14))

                NavigationLink {
                    FiltersView()
                } label: {
                    Image(systemName: "line.3.horizontal.decrease")
                        .foregroundStyle(.white)
                        .frame(width: 48, height: 48)
                        .background(Theme.primary)
                        .clipShape(.rect(cornerRadius: 14))
                }
            }
        }
        .padding(.horizontal, 20).padding(.bottom, 16)
        .background(Color.white)
        .clipShape(.rect(cornerRadii: .init(bottomLeading: 24, bottomTrailing: 24)))
        .shadow(color: .black.opacity(0.04), radius: 8, y: 2)
    }

    private var greeting: String {
        let hour = Calendar.current.component(.hour, from: Date())
        if hour < 12 { return "Good morning" }
        if hour < 18 { return "Good afternoon" }
        return "Good evening"
    }

    private var addPropertyBanner: some View {
        NavigationLink {
            AddPropertyView()
        } label: {
            HStack(spacing: 12) {
                Image(systemName: "plus").font(.title3)
                VStack(alignment: .leading, spacing: 2) {
                    Text("List a Property").font(.headline).foregroundStyle(.white)
                    Text("Reach thousands of renters").font(.caption).foregroundStyle(.white.opacity(0.8))
                }
                Spacer()
                Image(systemName: "chevron.right").foregroundStyle(.white.opacity(0.7))
            }
            .padding(16).background(Theme.primary).clipShape(.rect(cornerRadius: 16))
            .foregroundStyle(.white)
        }
        .padding(.horizontal, 20)
    }

    private var categoriesSection: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                categoryChip(nil, label: "All", color: Theme.primary, icon: "house.fill")
                ForEach(PropertyType.allCases) { type in
                    categoryChip(type, label: type.displayName + "s", color: Theme.categoryColor(type), icon: type.icon)
                }
            }
            .padding(.horizontal, 20)
        }
    }

    private func categoryChip(_ type: PropertyType?, label: String, color: Color, icon: String) -> some View {
        Button {
            withAnimation(.spring(response: 0.3)) { selectedCategory = type }
        } label: {
            HStack(spacing: 8) {
                Image(systemName: icon).font(.system(size: 16))
                    .frame(width: 28, height: 28)
                    .background(selectedCategory == type ? Color.white.opacity(0.25) : color.opacity(0.1))
                    .clipShape(Circle())
                    .foregroundStyle(selectedCategory == type ? .white : color)
                Text(label).font(.subheadline).fontWeight(.semibold)
                    .foregroundStyle(selectedCategory == type ? .white : Theme.textSecondary)
            }
            .padding(.horizontal, 14).padding(.vertical, 10)
            .background(selectedCategory == type ? color : Color.white)
            .overlay(Capsule().stroke(Theme.border, lineWidth: selectedCategory == type ? 0 : 1))
            .clipShape(Capsule())
        }
    }

    private var featuredSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text("Featured").font(.title3).fontWeight(.bold)
                Spacer()
            }
            .padding(.horizontal, 20)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(featuredProperties) { property in
                        NavigationLink {
                            PropertyDetailView(property: property)
                        } label: {
                            featuredSlide(property)
                        }
                    }
                }
                .padding(.horizontal, 20)
            }
        }
    }

    private func featuredSlide(_ property: Property) -> some View {
        ZStack {
            RemoteImage(url: property.images.first ?? "")
                .frame(width: UIScreen.main.bounds.width - 40, height: 200)
                .clipped()
            LinearGradient(colors: [.clear, .black.opacity(0.5)], startPoint: .top, endPoint: .bottom)

            VStack {
                HStack(spacing: 8) {
                    HStack(spacing: 4) {
                        Image(systemName: "star.fill").font(.system(size: 10)).foregroundStyle(Theme.accent)
                        Text("Featured").font(.system(size: 11)).fontWeight(.bold).foregroundStyle(Theme.accent)
                    }
                    .padding(.horizontal, 10).padding(.vertical, 5)
                    .background(Color.white.opacity(0.95)).clipShape(Capsule())

                    Text(property.type.displayName)
                        .font(.system(size: 11)).fontWeight(.semibold).foregroundStyle(.white)
                        .padding(.horizontal, 10).padding(.vertical, 5)
                        .background(Color.black.opacity(0.5)).clipShape(Capsule())
                    Spacer()
                }

                Spacer()

                VStack(alignment: .leading, spacing: 4) {
                    Text(property.title).font(.title3).fontWeight(.heavy).foregroundStyle(.white).lineLimit(1)
                    HStack(spacing: 4) {
                        Image(systemName: "mappin.and.ellipse").font(.caption).foregroundStyle(.white.opacity(0.8))
                        Text(property.city).font(.subheadline).foregroundStyle(.white.opacity(0.85))
                    }
                    HStack {
                        Text(property.formattedPrice).font(.title3).fontWeight(.heavy).foregroundStyle(.white)
                        Spacer()
                        HStack(spacing: 4) {
                            Image(systemName: "star.fill").font(.caption).foregroundStyle(Theme.accent)
                            Text(String(format: "%.1f", property.rating)).font(.subheadline).fontWeight(.bold).foregroundStyle(.white)
                        }
                        .padding(.horizontal, 8).padding(.vertical, 4)
                        .background(Color.white.opacity(0.2)).clipShape(.rect(cornerRadius: 10))
                    }
                }
            }
            .padding(16)
        }
        .frame(width: UIScreen.main.bounds.width - 40, height: 200)
        .clipShape(.rect(cornerRadius: 18))
    }

    private var allPropertiesSection: some View {
        VStack(spacing: 14) {
            HStack {
                Text(selectedCategory == nil ? "All Properties" : "\(selectedCategory!.displayName)s")
                    .font(.title3).fontWeight(.bold)
                Spacer()
                Text("\(filteredProperties.count) results").font(.subheadline).foregroundStyle(Theme.textSecondary)
            }
            .padding(.horizontal, 20)

            if filteredProperties.isEmpty {
                VStack(spacing: 12) {
                    Image(systemName: "magnifyingglass").font(.system(size: 48)).foregroundStyle(Theme.textLight)
                    Text("No properties found").font(.headline)
                    Text("Try adjusting your search or filters").font(.subheadline).foregroundStyle(Theme.textSecondary)
                }
                .frame(maxWidth: .infinity).padding(.vertical, 60)
            } else {
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
        }
    }

    private var featuredProperties: [Property] {
        data.activeProperties.filter { $0.featured }
    }

    private var filteredProperties: [Property] {
        var result = data.activeProperties
        if let cat = selectedCategory { result = result.filter { $0.type == cat } }
        if !searchQuery.trimmingCharacters(in: .whitespaces).isEmpty {
            let q = searchQuery.lowercased()
            result = result.filter { $0.title.lowercased().contains(q) || $0.city.lowercased().contains(q) || $0.address.lowercased().contains(q) }
        }
        return result
    }
}

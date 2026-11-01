import SwiftUI

struct AdminView: View {
    @EnvironmentObject var auth: AuthService
    @EnvironmentObject var data: DataService
    @State private var selectedTab: AdminTab = .overview
    @State private var allUsers: [User] = []

    enum AdminTab: String, CaseIterable {
        case overview, pending, users, properties
        var displayName: String { self == .pending ? "Pending" : rawValue.capitalized }
    }

    var body: some View {
        VStack(spacing: 0) {
            tabSelector

            switch selectedTab {
            case .overview: overviewTab
            case .pending: pendingTab
            case .users: usersTab
            case .properties: propertiesTab
            }
        }
        .background(Theme.background)
        .navigationTitle("Admin Dashboard")
        .navigationBarTitleDisplayMode(.inline)
        .task { await loadUsers() }
    }

    private var tabSelector: some View {
        HStack(spacing: 8) {
            ForEach(AdminTab.allCases, id: \.self) { tab in
                Button {
                    selectedTab = tab
                    if tab == .users { Task { await loadUsers() } }
                } label: {
                    HStack(spacing: 4) {
                        Text(tab.displayName).font(.subheadline).fontWeight(.semibold)
                        if tab == .pending && !data.pendingProperties.isEmpty {
                            Text("\(data.pendingProperties.count)")
                                .font(.caption2).fontWeight(.bold).foregroundStyle(.white)
                                .padding(.horizontal, 4).padding(.vertical, 2)
                                .background(Theme.error).clipShape(.rect(cornerRadius: 8))
                        }
                    }
                    .frame(maxWidth: .infinity).padding(.vertical, 8)
                    .background(selectedTab == tab ? Theme.primary : Theme.background)
                    .foregroundStyle(selectedTab == tab ? .white : Theme.textSecondary)
                    .clipShape(.rect(cornerRadius: 12))
                }
            }
        }
        .padding(.horizontal, 20).padding(.bottom, 12)
        .background(Color.white)
    }

    private var overviewTab: some View {
        ScrollView {
            VStack(spacing: 16) {
                LazyVGrid(columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)], spacing: 12) {
                    statCard(icon: "person.2.fill", value: "\(allUsers.count)", label: "Total Users", color: Theme.primary)
                    statCard(icon: "building.2.fill", value: "\(data.properties.count)", label: "Properties", color: Theme.accent)
                    statCard(icon: "calendar", value: "\(data.bookings.count)", label: "Bookings", color: Theme.success)
                    statCard(icon: "shield", value: "\(data.pendingProperties.count)", label: "Pending", color: Theme.warning)
                }
                .padding(.horizontal, 20)

                VStack(spacing: 12) {
                    breakdownRow(label: "Landlords", value: "\(allUsers.filter { $0.role == .landlord }.count)", color: Theme.primary)
                    breakdownRow(label: "Renters", value: "\(allUsers.filter { $0.role == .renter }.count)", color: Theme.categoryApartment)
                    breakdownRow(label: "Featured", value: "\(data.properties.filter { $0.featured }.count)", color: Theme.accent)
                    breakdownRow(label: "Active", value: "\(data.activeProperties.count)", color: Theme.success)
                }
                .padding(16).background(Color.white).clipShape(.rect(cornerRadius: 16))
                .padding(.horizontal, 20)

                VStack(spacing: 8) {
                    quickAction(icon: "person.2.fill", label: "Manage Users") { selectedTab = .users }
                    if !data.pendingProperties.isEmpty {
                        quickAction(icon: "shield", label: "Review Pending (\(data.pendingProperties.count))") { selectedTab = .pending }
                    }
                    quickAction(icon: "building.2.fill", label: "Manage Properties") { selectedTab = .properties }
                }
                .padding(.horizontal, 20)
            }
            .padding(.vertical, 16)
        }
    }

    private func statCard(icon: String, value: String, label: String, color: Color) -> some View {
        VStack(spacing: 8) {
            Image(systemName: icon).foregroundStyle(color)
            Text(value).font(.title).fontWeight(.heavy)
            Text(label).font(.caption).foregroundStyle(Theme.textSecondary)
        }
        .frame(maxWidth: .infinity).padding(16)
        .background(color.opacity(0.1)).clipShape(.rect(cornerRadius: 16))
    }

    private func breakdownRow(label: String, value: String, color: Color) -> some View {
        HStack {
            HStack(spacing: 10) {
                Circle().fill(color).frame(width: 10, height: 10)
                Text(label).font(.subheadline)
            }
            Spacer()
            Text(value).font(.headline).fontWeight(.bold)
        }
    }

    private func quickAction(icon: String, label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 12) {
                Image(systemName: icon).foregroundStyle(Theme.primary)
                Text(label).font(.subheadline).fontWeight(.semibold)
                Spacer()
                Image(systemName: "chevron.right").foregroundStyle(Theme.textLight)
            }
            .padding(16).background(Color.white).clipShape(.rect(cornerRadius: 14))
        }
        .buttonStyle(.plain)
    }

    private var pendingTab: some View {
        ScrollView {
            VStack(spacing: 12) {
                if data.pendingProperties.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "shield").font(.system(size: 48)).foregroundStyle(Theme.success)
                        Text("All caught up!").font(.title3).fontWeight(.bold)
                        Text("No properties waiting for approval").font(.subheadline).foregroundStyle(Theme.textSecondary)
                    }
                    .frame(maxWidth: .infinity).padding(.vertical, 80)
                } else {
                    ForEach(data.pendingProperties) { property in
                        pendingCard(property)
                    }
                }
            }
            .padding(20)
        }
    }

    private func pendingCard(_ property: Property) -> some View {
        VStack(spacing: 0) {
            HStack(spacing: 12) {
                RemoteImage(url: property.images.first ?? "")
                    .frame(width: 70, height: 70).clipShape(.rect(cornerRadius: 10))
                VStack(alignment: .leading, spacing: 4) {
                    Text(property.title).font(.subheadline).fontWeight(.bold).lineLimit(1)
                    Text("by \(property.ownerName)").font(.caption).foregroundStyle(Theme.textSecondary)
                    Text(property.formattedPrice).font(.headline).fontWeight(.heavy).foregroundStyle(Theme.primary)
                    Text("Submitted \(property.createdAt)").font(.caption2).foregroundStyle(Theme.textLight)
                }
                Spacer()
            }
            .padding(12)

            HStack(spacing: 6) {
                ForEach(property.images.prefix(3), id: \.self) { img in
                    RemoteImage(url: img)
                        .frame(width: 80, height: 56).clipShape(.rect(cornerRadius: 8))
                }
            }
            .padding(.horizontal, 12).padding(.bottom, 10)

            HStack(spacing: 10) {
                Button { Task { try? await data.rejectProperty(property.id) } } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "shield.slash")
                        Text("Reject")
                    }
                    .frame(maxWidth: .infinity).padding(.vertical, 10)
                    .background(Theme.error.opacity(0.1)).foregroundStyle(Theme.error)
                    .clipShape(.rect(cornerRadius: 10))
                }
                Button { Task { try? await data.approveProperty(property.id) } } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "shield")
                        Text("Approve")
                    }
                    .frame(maxWidth: .infinity).padding(.vertical, 10)
                    .background(Theme.success).foregroundStyle(.white)
                    .clipShape(.rect(cornerRadius: 10))
                }
            }
            .padding(10)
        }
        .background(Color.white)
        .clipShape(.rect(cornerRadius: 14))
        .overlay(alignment: .leading) { Rectangle().fill(Theme.warning).frame(width: 3) }
    }

    private var usersTab: some View {
        ScrollView {
            VStack(spacing: 8) {
                ForEach(allUsers) { user in
                    userCard(user)
                }
            }
            .padding(20)
        }
    }

    private func userCard(_ user: User) -> some View {
        HStack(spacing: 12) {
            RemoteImage(url: user.avatar)
                .frame(width: 48, height: 48).clipShape(Circle())
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Text(user.name).font(.subheadline).fontWeight(.bold)
                    if user.verified { Image(systemName: "shield.fill").font(.caption).foregroundStyle(Theme.success) }
                }
                Text(user.email).font(.caption).foregroundStyle(Theme.textSecondary)
                HStack(spacing: 8) {
                    Text(user.role.displayName)
                        .font(.caption2).fontWeight(.semibold)
                        .padding(.horizontal, 8).padding(.vertical, 2)
                        .background(roleColor(user.role).opacity(0.15))
                        .foregroundStyle(roleColor(user.role))
                        .clipShape(.rect(cornerRadius: 8))
                    Text(user.isActive ? "Active" : "Inactive")
                        .font(.caption2).fontWeight(.semibold)
                        .foregroundStyle(user.isActive ? Theme.success : Theme.error)
                }
            }
            Spacer()
            HStack(spacing: 6) {
                Button { Task { _ = try? await auth.updateUserAdmin(userId: user.id, updates: ["verified": AnyCodable(!user.verified)]); await loadUsers() } } label: {
                    Image(systemName: user.verified ? "shield.fill" : "shield")
                        .foregroundStyle(user.verified ? Theme.success : Theme.textLight)
                        .frame(width: 36, height: 36).background(Theme.background).clipShape(.rect(cornerRadius: 10))
                }
                if user.role != .admin {
                    Button { Task { _ = try? await auth.updateUserAdmin(userId: user.id, updates: ["isActive": AnyCodable(!user.isActive)]); await loadUsers() } } label: {
                        Image(systemName: user.isActive ? "person.crop.circle.badges.minus" : "person.crop.circle.badges.plus")
                            .foregroundStyle(user.isActive ? Theme.error : Theme.success)
                            .frame(width: 36, height: 36).background(Theme.background).clipShape(.rect(cornerRadius: 10))
                    }
                }
            }
        }
        .padding(14).background(Color.white).clipShape(.rect(cornerRadius: 14))
    }

    private func roleColor(_ role: UserRole) -> Color {
        switch role {
        case .admin: return Theme.error
        case .landlord: return Theme.primary
        case .renter: return Theme.categoryApartment
        }
    }

    private var propertiesTab: some View {
        ScrollView {
            VStack(spacing: 10) {
                ForEach(data.properties) { property in
                    propertyCard(property)
                }
            }
            .padding(20)
        }
    }

    private func propertyCard(_ property: Property) -> some View {
        VStack(spacing: 0) {
            HStack(spacing: 12) {
                RemoteImage(url: property.images.first ?? "")
                    .frame(width: 70, height: 70).clipShape(.rect(cornerRadius: 10))
                VStack(alignment: .leading, spacing: 4) {
                    Text(property.title).font(.subheadline).fontWeight(.bold).lineLimit(1)
                    Text("by \(property.ownerName)").font(.caption).foregroundStyle(Theme.textSecondary)
                    Text(property.formattedPrice).font(.headline).fontWeight(.heavy).foregroundStyle(Theme.primary)
                    Text(property.status.displayName)
                        .font(.caption2).fontWeight(.semibold)
                        .padding(.horizontal, 8).padding(.vertical, 2)
                        .background(property.status == .active ? Theme.success.opacity(0.15) : Theme.warning.opacity(0.15))
                        .foregroundStyle(property.status == .active ? Theme.success : Theme.warning)
                        .clipShape(.rect(cornerRadius: 8))
                }
                Spacer()
            }
            .padding(12)

            HStack(spacing: 8) {
                NavigationLink {
                    PropertyDetailView(property: property)
                } label: {
                    Image(systemName: "eye").foregroundStyle(Theme.primary)
                        .frame(maxWidth: .infinity).padding(.vertical, 8)
                        .background(Theme.background).clipShape(.rect(cornerRadius: 8))
                }
                .buttonStyle(.plain)

                Button { Task { try? await data.deleteProperty(property.id) } } label: {
                    Image(systemName: "trash").foregroundStyle(Theme.error)
                        .frame(maxWidth: .infinity).padding(.vertical, 8)
                        .background(Theme.error.opacity(0.1)).clipShape(.rect(cornerRadius: 8))
                }
            }
            .padding(8)
        }
        .background(Color.white).clipShape(.rect(cornerRadius: 14))
    }

    private func loadUsers() async {
        do { allUsers = try await auth.getAllUsers() }
        catch { print("[Admin] Load users error: \(error.localizedDescription)") }
    }
}

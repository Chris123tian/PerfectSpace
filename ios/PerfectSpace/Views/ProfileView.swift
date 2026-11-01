import SwiftUI

struct ProfileView: View {
    @EnvironmentObject var auth: AuthService
    @EnvironmentObject var data: DataService

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                profileCard
                statsRow
                if let bio = auth.user?.bio, !bio.isEmpty { bioCard(bio) }
                menuSections
                logoutButton
                Text("Perfect Space v1.0.0").font(.caption).foregroundStyle(Theme.textLight)
            }
            .padding(.bottom, 30)
        }
        .background(Theme.background)
        .safeAreaInset(edge: .top) {
            Text("Profile")
                .font(.system(size: 28, weight: .heavy))
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 20).padding(.bottom, 16)
                .background(Color.white)
        }
    }

    private var profileCard: some View {
        HStack(spacing: 14) {
            if let avatar = auth.user?.avatar {
                RemoteImage(url: avatar)
                    .frame(width: 64, height: 64)
                    .clipShape(Circle())
                    .overlay(Circle().stroke(Theme.primaryLight, lineWidth: 3))
            }
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Text(auth.user?.name ?? "").font(.headline)
                    if auth.user?.verified == true {
                        Image(systemName: "checkmark.seal.fill").foregroundStyle(Theme.primary)
                    }
                }
                if let role = auth.user?.role {
                    Text(role.displayName)
                        .font(.caption).fontWeight(.semibold)
                        .padding(.horizontal, 8).padding(.vertical, 2)
                        .background(roleBadgeColor.opacity(0.15))
                        .foregroundStyle(roleBadgeColor)
                        .clipShape(.rect(cornerRadius: 8))
                }
                Text("Member since \(auth.user?.memberSince ?? "")").font(.caption).foregroundStyle(Theme.textLight)
            }
            Spacer()
            NavigationLink {
                EditProfileView()
            } label: {
                Text("Edit").font(.subheadline).fontWeight(.semibold).foregroundStyle(Theme.primary)
                    .padding(.horizontal, 16).padding(.vertical, 8)
                    .background(Theme.primaryLight).clipShape(.capsule())
            }
        }
        .padding(16)
        .background(Color.white)
        .clipShape(.rect(cornerRadius: 16))
        .shadow(color: .black.opacity(0.06), radius: 8, y: 2)
        .padding(.horizontal, 20)
    }

    private var roleBadgeColor: Color {
        switch auth.user?.role {
        case .admin: return Theme.error
        case .landlord: return Theme.primary
        default: return Theme.categoryApartment
        }
    }

    private var statsRow: some View {
        HStack {
            statItem(value: auth.user?.rating ?? 0 > 0 ? String(format: "%.1f", auth.user?.rating ?? 0) : "-", label: "Rating")
            Divider().frame(height: 30)
            statItem(value: "\(auth.user?.reviewsCount ?? 0)", label: "Reviews")
            Divider().frame(height: 30)
            statItem(value: "\(auth.user?.role == .landlord ? data.myProperties.count : data.savedPropertyIds.count)", label: auth.user?.role == .landlord ? "Listings" : "Saved")
        }
        .padding(16)
        .background(Color.white)
        .clipShape(.rect(cornerRadius: 16))
        .shadow(color: .black.opacity(0.04), radius: 6, y: 2)
        .padding(.horizontal, 20)
    }

    private func statItem(value: String, label: String) -> some View {
        VStack(spacing: 2) {
            Text(value).font(.title2).fontWeight(.heavy)
            Text(label).font(.caption).foregroundStyle(Theme.textSecondary)
        }
        .frame(maxWidth: .infinity)
    }

    private func bioCard(_ bio: String) -> some View {
        Text(bio).font(.subheadline).foregroundStyle(Theme.textSecondary)
            .padding(16).background(Color.white)
            .clipShape(.rect(cornerRadius: 16))
            .padding(.horizontal, 20)
    }

    @ViewBuilder
    private var menuSections: some View {
        let sections = buildMenuSections()
        ForEach(sections.indices, id: \.self) { idx in
            VStack(alignment: .leading, spacing: 8) {
                Text(sections[idx].title)
                    .font(.caption).fontWeight(.semibold).foregroundStyle(Theme.textSecondary)
                    .textCase(.uppercase)
                    .padding(.horizontal, 20)
                VStack(spacing: 0) {
                    ForEach(sections[idx].items.indices, id: \.self) { itemIdx in
                        let item = sections[idx].items[itemIdx]
                        menuRow(item)
                        if itemIdx < sections[idx].items.count - 1 {
                            Divider().padding(.leading, 64)
                        }
                    }
                }
                .background(Color.white)
                .clipShape(.rect(cornerRadius: 16))
                .padding(.horizontal, 20)
            }
        }
    }

    private func menuRow(_ item: MenuItem) -> some View {
        NavigationLink {
            switch item.destination {
            case .myListings: MyListingsView()
            case .addProperty: AddPropertyView()
            case .bookings: BookingsView()
            case .saved: SavedView()
            case .admin: AdminView()
            case .notifications: NotificationsView()
            case .myReviews: MyReviewsView()
            case .settings: SettingsView()
            case .tenantRights: TenantRightsView()
            default: EmptyView()
            }
        } label: {
            HStack(spacing: 12) {
                Image(systemName: item.icon)
                    .frame(width: 36, height: 36)
                    .background(Theme.background).clipShape(.rect(cornerRadius: 10))
                    .foregroundStyle(item.iconColor)
                VStack(alignment: .leading) {
                    Text(item.label).font(.subheadline)
                    if let sub = item.subtitle { Text(sub).font(.caption).foregroundStyle(Theme.textLight) }
                }
                Spacer()
                if let badge = item.badge {
                    Text("\(badge)").font(.caption).fontWeight(.bold).foregroundStyle(.white)
                        .padding(.horizontal, 6).padding(.vertical, 2)
                        .background(Theme.error).clipShape(.rect(cornerRadius: 10))
                }
                Image(systemName: "chevron.right").foregroundStyle(Theme.textLight)
            }
            .padding(.horizontal, 16).padding(.vertical, 14)
        }
        .buttonStyle(.plain)
    }

    private var logoutButton: some View {
        Button {
            auth.logout()
        } label: {
            HStack(spacing: 8) {
                Image(systemName: "rectangle.portrait.and.arrow.right").foregroundStyle(Theme.error)
                Text("Log Out").fontWeight(.semibold).foregroundStyle(Theme.error)
            }
            .frame(maxWidth: .infinity).padding(.vertical, 14)
            .background(Color.white)
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Theme.error.opacity(0.3), lineWidth: 1))
            .clipShape(.rect(cornerRadius: 14))
        }
        .padding(.horizontal, 20)
    }

    private func buildMenuSections() -> [MenuSection] {
        var sections: [MenuSection] = []
        guard let user = auth.user else { return sections }

        let pendingBookings = data.userBookings.filter { $0.status == .pending }.count

        if user.role == .landlord {
            sections.append(MenuSection(title: "Property Management", items: [
                MenuItem(icon: "house.fill", iconColor: Theme.primary, label: "My Listings", subtitle: "\(data.myProperties.count) properties", destination: .myListings),
                MenuItem(icon: "plus", iconColor: Theme.success, label: "Add New Property", destination: .addProperty),
                MenuItem(icon: "calendar", iconColor: Theme.accent, label: "Viewing Requests", subtitle: pendingBookings > 0 ? "\(pendingBookings) pending" : "No pending", badge: pendingBookings > 0 ? pendingBookings : nil, destination: .bookings),
            ]))
        }

        if user.role == .renter {
            sections.append(MenuSection(title: "My Activity", items: [
                MenuItem(icon: "heart.fill", iconColor: Theme.error, label: "Saved Properties", subtitle: "\(data.savedPropertyIds.count) saved", destination: .saved),
                MenuItem(icon: "calendar", iconColor: Theme.accent, label: "My Bookings", subtitle: pendingBookings > 0 ? "\(pendingBookings) pending" : "No pending", badge: pendingBookings > 0 ? pendingBookings : nil, destination: .bookings),
            ]))
        }

        if user.role == .admin {
            sections.append(MenuSection(title: "Administration", items: [
                MenuItem(icon: "shield.checkered", iconColor: Theme.primary, label: "Admin Dashboard", subtitle: "Manage platform", destination: .admin),
                MenuItem(icon: "calendar", iconColor: Theme.accent, label: "All Bookings", destination: .bookings),
            ]))
        }

        sections.append(MenuSection(title: "Account", items: [
            MenuItem(icon: "bell.fill", iconColor: Theme.categoryOffice, label: "Notifications", subtitle: data.unreadNotificationCount > 0 ? "\(data.unreadNotificationCount) unread" : nil, badge: data.unreadNotificationCount > 0 ? data.unreadNotificationCount : nil, destination: .notifications),
            MenuItem(icon: "star.fill", iconColor: Theme.accent, label: "My Reviews", subtitle: "\(user.reviewsCount) reviews", destination: .myReviews),
            MenuItem(icon: "shield.fill", iconColor: Theme.success, label: "Verification", subtitle: user.verified ? "Verified" : "Not verified", destination: .none),
        ]))

        sections.append(MenuSection(title: "Resources", items: [
            MenuItem(icon: "doc.text.fill", iconColor: Theme.categoryApartment, label: "Tenant Rights Guide", destination: .tenantRights),
            MenuItem(icon: "phone.fill", iconColor: Theme.error, label: "Emergency Contacts", destination: .none),
        ]))

        sections.append(MenuSection(title: "Support", items: [
            MenuItem(icon: "questionmark.circle", iconColor: Theme.textSecondary, label: "Help Center", destination: .none),
            MenuItem(icon: "gear", iconColor: Theme.textSecondary, label: "Settings", destination: .settings),
        ]))

        return sections
    }
}

struct MenuSection {
    let title: String
    let items: [MenuItem]
}

struct MenuItem {
    let icon: String
    let iconColor: Color
    let label: String
    var subtitle: String? = nil
    var badge: Int? = nil
    let destination: MenuDestination
}

enum MenuDestination {
    case myListings, addProperty, bookings, saved, admin, notifications, myReviews, settings, tenantRights, none
}

import SwiftUI

struct MyListingsView: View {
    @EnvironmentObject var data: DataService

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                if data.myProperties.isEmpty {
                    emptyState
                } else {
                    ForEach(data.myProperties) { property in
                        listingCard(property)
                    }
                }
            }
            .padding(20)
        }
        .background(Theme.background)
        .navigationTitle("My Listings")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                NavigationLink {
                    AddPropertyView()
                } label: {
                    Image(systemName: "plus")
                }
            }
        }
    }

    private func listingCard(_ property: Property) -> some View {
        VStack(spacing: 0) {
            NavigationLink {
                PropertyDetailView(property: property)
            } label: {
                HStack(spacing: 12) {
                    RemoteImage(url: property.images.first ?? "")
                        .frame(width: 70, height: 70).clipShape(.rect(cornerRadius: 12))
                    VStack(alignment: .leading, spacing: 4) {
                        Text(property.title).font(.subheadline).fontWeight(.bold).lineLimit(1)
                        Text(property.city).font(.caption).foregroundStyle(Theme.textSecondary)
                        Text(property.formattedPrice).font(.headline).fontWeight(.heavy).foregroundStyle(Theme.primary)
                    }
                    Spacer()
                }
                .padding(14)
            }
            .buttonStyle(.plain)

            HStack {
                Text(statusLabel(property.status))
                    .font(.caption).fontWeight(.semibold)
                    .padding(.horizontal, 10).padding(.vertical, 4)
                    .background(statusColor(property.status).opacity(0.15))
                    .foregroundStyle(statusColor(property.status))
                    .clipShape(.rect(cornerRadius: 8))
                Spacer()
                Text(property.rating > 0 ? "★ \(String(format: "%.1f", property.rating))" : "No ratings")
                    .font(.caption).foregroundStyle(Theme.textSecondary)
            }
            .padding(.horizontal, 14).padding(.bottom, 14)
        }
        .background(Color.white).clipShape(.rect(cornerRadius: 16))
        .shadow(color: .black.opacity(0.06), radius: 8, y: 2)
    }

    private func statusLabel(_ status: PropertyStatus) -> String {
        switch status {
        case .pending: return "Pending Approval"
        case .rejected: return "Rejected"
        default: return status.displayName
        }
    }

    private func statusColor(_ status: PropertyStatus) -> Color {
        switch status {
        case .active: return Theme.success
        case .pending: return Theme.warning
        case .rejected: return Theme.error
        case .archived: return Theme.textLight
        }
    }

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "house").font(.system(size: 56)).foregroundStyle(Theme.textLight)
            Text("No listings yet").font(.headline)
            Text("Tap + to add your first property").font(.subheadline).foregroundStyle(Theme.textSecondary)
        }
        .frame(maxWidth: .infinity).padding(.vertical, 80)
    }
}

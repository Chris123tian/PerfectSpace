import SwiftUI

struct BookingsView: View {
    @EnvironmentObject var auth: AuthService
    @EnvironmentObject var data: DataService
    @State private var selectedStatus: BookingStatus? = nil

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                statusFilter
                ForEach(filteredBookings) { booking in
                    bookingCard(booking)
                }
                if filteredBookings.isEmpty {
                    emptyState
                }
            }
            .padding(20)
        }
        .background(Theme.background)
        .navigationTitle("Bookings")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var statusFilter: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                filterChip(nil, label: "All")
                ForEach(BookingStatus.allCases, id: \.self) { status in
                    filterChip(status, label: status.displayName)
                }
            }
        }
    }

    private func filterChip(_ status: BookingStatus?, label: String) -> some View {
        Button { selectedStatus = status } label: {
            Text(label)
                .font(.subheadline).fontWeight(.semibold)
                .padding(.horizontal, 12).padding(.vertical, 6)
                .background(selectedStatus == status ? Theme.primary : Theme.background)
                .foregroundStyle(selectedStatus == status ? .white : Theme.textSecondary)
                .clipShape(.rect(cornerRadius: 16))
        }
    }

    private var filteredBookings: [Booking] {
        guard let status = selectedStatus else { return data.userBookings }
        return data.userBookings.filter { $0.status == status }
    }

    private func bookingCard(_ booking: Booking) -> some View {
        VStack(spacing: 0) {
            NavigationLink {
                if let prop = data.properties.first(where: { $0.id == booking.propertyId }) {
                    PropertyDetailView(property: prop)
                }
            } label: {
                HStack(spacing: 12) {
                    RemoteImage(url: booking.propertyImage)
                        .frame(width: 70, height: 70).clipShape(.rect(cornerRadius: 12))
                    VStack(alignment: .leading, spacing: 4) {
                        Text(booking.propertyTitle).font(.subheadline).fontWeight(.bold).lineLimit(1)
                        HStack(spacing: 4) {
                            Image(systemName: "calendar").font(.caption)
                            Text("\(booking.date) at \(booking.time)").font(.caption).foregroundStyle(Theme.textSecondary)
                        }
                        Text(auth.user?.role == .landlord ? "Renter: \(booking.renterName)" : "Owner: \(booking.ownerName)")
                            .font(.caption).foregroundStyle(Theme.primary)
                    }
                    Spacer()
                }
                .padding(14)
            }
            .buttonStyle(.plain)

            HStack {
                HStack(spacing: 6) {
                    Circle().fill(statusColor(booking.status)).frame(width: 6, height: 6)
                    Text(booking.status.displayName)
                        .font(.caption).fontWeight(.semibold)
                        .foregroundStyle(statusColor(booking.status))
                }
                .padding(.horizontal, 10).padding(.vertical, 4)
                .background(statusColor(booking.status).opacity(0.15))
                .clipShape(.rect(cornerRadius: 12))

                Spacer()

                if (auth.user?.role == .landlord || auth.user?.role == .admin) && booking.status == .pending {
                    HStack(spacing: 8) {
                        Button { Task { try? await data.updateBookingStatus(id: booking.id, status: .confirmed) } } label: {
                            HStack(spacing: 4) {
                                Image(systemName: "checkmark")
                                Text("Confirm")
                            }
                            .font(.caption).fontWeight(.semibold)
                            .padding(.horizontal, 14).padding(.vertical, 8)
                            .background(Theme.success).foregroundStyle(.white)
                            .clipShape(.rect(cornerRadius: 10))
                        }
                        Button { Task { try? await data.updateBookingStatus(id: booking.id, status: .cancelled) } } label: {
                            Image(systemName: "xmark")
                                .foregroundStyle(Theme.error)
                                .padding(.horizontal, 10).padding(.vertical, 8)
                                .background(Theme.error.opacity(0.1))
                                .clipShape(.rect(cornerRadius: 10))
                        }
                    }
                } else if auth.user?.role == .renter && booking.status == .pending {
                    Button { Task { try? await data.updateBookingStatus(id: booking.id, status: .cancelled) } } label: {
                        Text("Cancel")
                            .font(.caption).fontWeight(.semibold).foregroundStyle(Theme.error)
                            .padding(.horizontal, 14).padding(.vertical, 8)
                            .background(Theme.error.opacity(0.1))
                            .clipShape(.rect(cornerRadius: 10))
                    }
                }
            }
            .padding(.horizontal, 14).padding(.bottom, 14)
        }
        .background(Color.white).clipShape(.rect(cornerRadius: 16))
        .shadow(color: .black.opacity(0.06), radius: 8, y: 2)
    }

    private func statusColor(_ status: BookingStatus) -> Color {
        switch status {
        case .pending: return Theme.warning
        case .confirmed: return Theme.success
        case .completed: return Theme.primary
        case .cancelled: return Theme.error
        }
    }

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "calendar").font(.system(size: 56)).foregroundStyle(Theme.textLight)
            Text("No bookings").font(.headline)
            Text("Your viewing requests will appear here").font(.subheadline).foregroundStyle(Theme.textSecondary)
        }
        .frame(maxWidth: .infinity).padding(.vertical, 80)
    }
}

import SwiftUI

struct NotificationsView: View {
    @EnvironmentObject var data: DataService

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                if data.userNotifications.isEmpty {
                    emptyState
                } else {
                    ForEach(data.userNotifications) { notif in
                        notificationRow(notif)
                        Divider().padding(.leading, 68)
                    }
                }
            }
        }
        .background(Theme.background)
        .navigationTitle("Notifications")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if data.unreadNotificationCount > 0 {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Mark All Read") {
                        Task { await data.markAllNotificationsRead() }
                    }
                    .font(.subheadline).foregroundStyle(Theme.primary)
                }
            }
        }
    }

    private func notificationRow(_ notif: AppNotification) -> some View {
        Button {
            if !notif.read { Task { await data.markNotificationRead(id: notif.id) } }
        } label: {
            HStack(spacing: 12) {
                Image(systemName: iconForType(notif.type))
                    .frame(width: 40, height: 40)
                    .background(notif.read ? Theme.background : Theme.primaryLight)
                    .foregroundStyle(colorForType(notif.type))
                    .clipShape(.rect(cornerRadius: 12))

                VStack(alignment: .leading, spacing: 2) {
                    Text(notif.title)
                        .font(.subheadline)
                        .fontWeight(notif.read ? .semibold : .bold)
                    Text(notif.message)
                        .font(.caption)
                        .foregroundStyle(Theme.textSecondary)
                        .lineLimit(2)
                    Text(formatTime(notif.createdAt))
                        .font(.caption2)
                        .foregroundStyle(Theme.textLight)
                }
                Spacer()
                if !notif.read {
                    Circle().fill(Theme.primary).frame(width: 8, height: 8)
                }
            }
            .padding(.horizontal, 20).padding(.vertical, 14)
            .background(notif.read ? Color.white : Theme.primaryLight.opacity(0.4))
        }
        .buttonStyle(.plain)
    }

    private func iconForType(_ type: String) -> String {
        switch type {
        case "booking": return "calendar"
        case "message": return "message.fill"
        case "review": return "star.fill"
        case "system": return "shield.fill"
        case "property": return "building.2.fill"
        default: return "bell.fill"
        }
    }

    private func colorForType(_ type: String) -> Color {
        switch type {
        case "booking": return Theme.accent
        case "message": return Theme.primary
        case "review": return Theme.warning
        case "system": return Theme.categoryOffice
        case "property": return Theme.success
        default: return Theme.textSecondary
        }
    }

    private func formatTime(_ iso: String) -> String {
        let formatter = ISO8601DateFormatter()
        guard let date = formatter.date(from: iso) else { return "" }
        let diff = Date().timeIntervalSince(date)
        if diff < 60 { return "Just now" }
        if diff < 3600 { return "\(Int(diff / 60))m ago" }
        if diff < 86400 { return "\(Int(diff / 3600))h ago" }
        return date.formatted(.dateTime.month().day())
    }

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "bell").font(.system(size: 56)).foregroundStyle(Theme.textLight)
            Text("No notifications").font(.headline)
            Text("You're all caught up!").font(.subheadline).foregroundStyle(Theme.textSecondary)
        }
        .frame(maxWidth: .infinity).padding(.vertical, 80)
    }
}

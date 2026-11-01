import SwiftUI

struct MessagesView: View {
    @EnvironmentObject var data: DataService
    @EnvironmentObject var auth: AuthService

    var body: some View {
        List {
            ForEach(sortedConversations) { conv in
                NavigationLink {
                    ChatView(conversation: conv)
                } label: {
                    conversationRow(conv)
                }
                .buttonStyle(.plain)
                .listRowSeparator(.hidden)
                .listRowInsets(EdgeInsets())
            }
        }
        .listStyle(.plain)
        .background(Theme.background)
        .safeAreaInset(edge: .top) {
            Text("Messages")
                .font(.system(size: 28, weight: .heavy))
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 20).padding(.bottom, 16)
                .background(Color.white)
        }
        .overlay {
            if sortedConversations.isEmpty {
                emptyState
            }
        }
    }

    private var sortedConversations: [Conversation] {
        data.userConversations.sorted { $0.lastMessageTime > $1.lastMessageTime }
    }

    private func conversationRow(_ conv: Conversation) -> some View {
        let other = conv.otherParticipant(currentUserId: auth.user?.id ?? "")
        let unread = auth.user.flatMap { conv.unreadCount[$0.id] } ?? 0

        return HStack(spacing: 14) {
            ZStack(alignment: .topTrailing) {
                RemoteImage(url: other.avatar)
                    .frame(width: 54, height: 54)
                    .clipShape(Circle())
                if unread > 0 {
                    Circle().fill(Theme.primary).frame(width: 14, height: 14)
                        .overlay(Circle().stroke(.white, lineWidth: 2))
                }
            }
            VStack(alignment: .leading, spacing: 2) {
                HStack {
                    Text(other.name).font(.headline)
                    Spacer()
                    Text(formatTime(conv.lastMessageTime)).font(.caption).foregroundStyle(Theme.textLight)
                }
                Text(conv.propertyTitle).font(.caption).foregroundStyle(Theme.primary)
                Text(conv.lastMessage).font(.subheadline).foregroundStyle(unread > 0 ? Theme.textPrimary : Theme.textSecondary).lineLimit(2)
            }
            if unread > 0 {
                Text("\(unread)").font(.caption).fontWeight(.bold).foregroundStyle(.white)
                    .padding(.horizontal, 6).padding(.vertical, 2)
                    .background(Theme.primary).clipShape(.rect(cornerRadius: 10))
            }
        }
        .padding(.horizontal, 20).padding(.vertical, 14)
        .background(Color.white)
    }

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "message").font(.system(size: 56)).foregroundStyle(Theme.textLight)
            Text("No messages yet").font(.title3).fontWeight(.semibold)
            Text("Start a conversation by contacting a property owner")
                .font(.subheadline).foregroundStyle(Theme.textSecondary).multilineTextAlignment(.center)
        }
        .padding(.horizontal, 40)
    }

    private func formatTime(_ iso: String) -> String {
        let formatter = ISO8601DateFormatter()
        guard let date = formatter.date(from: iso) else { return "" }
        let diff = Date().timeIntervalSince(date)
        if diff < 60 { return "Just now" }
        if diff < 3600 { return "\(Int(diff / 60))m ago" }
        if diff < 86400 { return "\(Int(diff / 3600))h ago" }
        if diff < 172800 { return "Yesterday" }
        return date.formatted(.dateTime.month().day())
    }
}

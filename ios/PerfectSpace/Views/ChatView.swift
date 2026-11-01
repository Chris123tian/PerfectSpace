import SwiftUI

struct ChatView: View {
    let conversation: Conversation
    @EnvironmentObject var data: DataService
    @EnvironmentObject var auth: AuthService
    @State private var messageText = ""

    var body: some View {
        VStack(spacing: 0) {
            ScrollViewReader { proxy in
                ScrollView {
                    VStack(spacing: 12) {
                        ForEach(messages) { msg in
                            messageBubble(msg)
                                .id(msg.id)
                        }
                    }
                    .padding(16)
                }
                .onChange(of: messages.count) { _, _ in
                    withAnimation {
                        proxy.scrollTo(messages.last?.id, anchor: .bottom)
                    }
                }
            }

            inputBar
        }
        .background(Theme.background)
        .navigationTitle(otherParticipant.name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                NavigationLink {
                    if let prop = data.properties.first(where: { $0.id == conversation.propertyId }) {
                        PropertyDetailView(property: prop)
                    }
                } label: {
                    Image(systemName: "house").foregroundStyle(Theme.primary)
                }
            }
        }
    }

    private var messages: [ChatMessage] {
        data.conversationMessages(conversation.id).sorted { $0.timestamp < $1.timestamp }
    }

    private var otherParticipant: (name: String, avatar: String) {
        conversation.otherParticipant(currentUserId: auth.user?.id ?? "")
    }

    private func messageBubble(_ msg: ChatMessage) -> some View {
        let isMe = msg.senderId == auth.user?.id

        return HStack {
            if !isMe {
                RemoteImage(url: otherParticipant.avatar)
                    .frame(width: 28, height: 28).clipShape(Circle())
            }
            VStack(alignment: .leading, spacing: 4) {
                Text(msg.text).font(.body)
                Text(formatTime(msg.timestamp)).font(.caption2)
            }
            .padding(.horizontal, 14).padding(.vertical, 10)
            .background(isMe ? Theme.primary : Color.white)
            .foregroundStyle(isMe ? .white : Theme.textPrimary)
            .clipShape(.rect(cornerRadius: 18))
            if isMe { Spacer() } else { Spacer().frame(width: 0) }
        }
        .frame(maxWidth: .infinity, alignment: isMe ? .trailing : .leading)
    }

    private var inputBar: some View {
        HStack(spacing: 10) {
            TextField("Type a message...", text: $messageText, axis: .vertical)
                .lineLimit(1...5)
                .padding(.horizontal, 16).padding(.vertical, 10)
                .background(Theme.background).clipShape(.rect(cornerRadius: 20))
            Button {
                sendMessage()
            } label: {
                Image(systemName: "paperplane.fill")
                    .foregroundStyle(messageText.trimmingCharacters(in: .whitespaces).isEmpty ? Theme.textLight : .white)
                    .frame(width: 44, height: 44)
                    .background(messageText.trimmingCharacters(in: .whitespaces).isEmpty ? Theme.border : Theme.primary)
                    .clipShape(Circle())
            }
            .disabled(messageText.trimmingCharacters(in: .whitespaces).isEmpty)
        }
        .padding(.horizontal, 16).padding(.vertical, 10)
        .background(Color.white)
        .overlay(Rectangle().fill(Theme.borderLight).frame(height: 1), alignment: .top)
    }

    private func sendMessage() {
        let text = messageText.trimmingCharacters(in: .whitespaces)
        guard !text.isEmpty else { return }
        messageText = ""
        Task {
            do { try await data.sendMessage(conversationId: conversation.id, text: text) }
            catch { print("[Chat] Send error: \(error.localizedDescription)") }
        }
    }

    private func formatTime(_ iso: String) -> String {
        let formatter = ISO8601DateFormatter()
        guard let date = formatter.date(from: iso) else { return "" }
        return date.formatted(.dateTime.hour().minute())
    }
}

import Foundation
import SwiftUI

@MainActor
final class DataService: ObservableObject {
    @Published var properties: [Property] = []
    @Published var conversations: [Conversation] = []
    @Published var chatMessages: [ChatMessage] = []
    @Published var bookings: [Booking] = []
    @Published var notifications: [AppNotification] = []
    @Published var reviews: [Review] = []
    @Published var savedPropertyIds: [String] = []
    @Published var allUsers: [User] = []
    @Published var isLoading = false

    let auth: AuthService
    private var timer: Timer?
    private var reviewTimer: Timer?

    init(auth: AuthService) {
        self.auth = auth
    }

    func startPolling() {
        Task { await refreshAll() }
        timer = Timer.scheduledTimer(withTimeInterval: 3.0, repeats: true) { [weak self] _ in
            Task { await self?.refreshAll() }
        }
        reviewTimer = Timer.scheduledTimer(withTimeInterval: 5.0, repeats: true) { [weak self] _ in
            Task { await self?.fetchReviews() }
        }
    }

    func stopPolling() {
        timer?.invalidate()
        timer = nil
        reviewTimer?.invalidate()
        reviewTimer = nil
    }

    func refreshAll() async {
        async let props: () = fetchProperties()
        async let convs: () = fetchConversations()
        async let msgs: () = fetchMessages()
        async let books: () = fetchBookings()
        async let notifs: () = fetchNotifications()
        async let saved: () = fetchSaved()
        _ = await (props, convs, msgs, books, notifs, saved)
    }

    private func fetchProperties() async {
        struct Q: Encodable { let _: String? = nil }
        do {
            properties = try await APIClient.shared.trpcQuery("properties.list", input: Optional<Q>.none)
        } catch { print("[Data] Properties error: \(error.localizedDescription)") }
    }

    private func fetchConversations() async {
        struct Q: Encodable { let _: String? = nil }
        do {
            conversations = try await APIClient.shared.trpcQuery("conversations.list", input: Optional<Q>.none)
        } catch { print("[Data] Conversations error: \(error.localizedDescription)") }
    }

    private func fetchMessages() async {
        struct Q: Encodable { let _: String? = nil }
        do {
            chatMessages = try await APIClient.shared.trpcQuery("conversations.allMessages", input: Optional<Q>.none)
        } catch { print("[Data] Messages error: \(error.localizedDescription)") }
    }

    private func fetchBookings() async {
        struct Q: Encodable { let _: String? = nil }
        do {
            bookings = try await APIClient.shared.trpcQuery("bookings.list", input: Optional<Q>.none)
        } catch { print("[Data] Bookings error: \(error.localizedDescription)") }
    }

    private func fetchNotifications() async {
        struct Q: Encodable { let _: String? = nil }
        do {
            notifications = try await APIClient.shared.trpcQuery("notifications.list", input: Optional<Q>.none)
        } catch { print("[Data] Notifications error: \(error.localizedDescription)") }
    }

    func fetchReviews() async {
        struct Q: Encodable { let _: String? = nil }
        do {
            reviews = try await APIClient.shared.trpcQuery("reviews.list", input: Optional<Q>.none)
        } catch { print("[Data] Reviews error: \(error.localizedDescription)") }
    }

    private func fetchSaved() async {
        guard let userId = auth.user?.id else { return }
        struct SavedInput: Encodable { let userId: String }
        do {
            savedPropertyIds = try await APIClient.shared.trpcQuery("properties.getSaved", input: SavedInput(userId: userId))
        } catch { print("[Data] Saved error: \(error.localizedDescription)") }
    }

    func addProperty(_ property: Property) async throws {
        struct AddInput: Encodable { let property: Property }
        struct EmptyResult: Decodable { let id: String }
        _ = try await APIClient.shared.trpcMutation("properties.add", input: AddInput(property: property)) as EmptyResult
        await fetchProperties()
    }

    func approveProperty(_ id: String) async throws {
        struct ApproveInput: Encodable { let id: String }
        struct EmptyResult: Decodable { let id: String }
        _ = try await APIClient.shared.trpcMutation("properties.approve", input: ApproveInput(id: id)) as EmptyResult
        await fetchProperties()
        await fetchNotifications()
    }

    func rejectProperty(_ id: String) async throws {
        struct RejectInput: Encodable { let id: String }
        struct EmptyResult: Decodable { let id: String }
        _ = try await APIClient.shared.trpcMutation("properties.reject", input: RejectInput(id: id)) as EmptyResult
        await fetchProperties()
        await fetchNotifications()
    }

    func deleteProperty(_ id: String) async throws {
        struct DeleteInput: Encodable { let id: String }
        struct EmptyResult: Decodable { let success: Bool }
        _ = try await APIClient.shared.trpcMutation("properties.delete", input: DeleteInput(id: id)) as EmptyResult
        await fetchProperties()
    }

    func toggleSave(propertyId: String) async throws {
        guard let userId = auth.user?.id else { return }
        struct SaveInput: Encodable { let userId: String; let propertyId: String }
        savedPropertyIds = try await APIClient.shared.trpcMutation("properties.toggleSave", input: SaveInput(userId: userId, propertyId: propertyId))
    }

    func sendMessage(conversationId: String, text: String) async throws {
        guard let userId = auth.user?.id else { return }
        struct SendInput: Encodable { let conversationId: String; let senderId: String; let text: String }
        struct MsgResult: Decodable { let id: String }
        _ = try await APIClient.shared.trpcMutation("conversations.sendMessage", input: SendInput(conversationId: conversationId, senderId: userId, text: text)) as MsgResult
        await fetchMessages()
        await fetchConversations()
    }

    func startConversation(otherUserId: String, otherUserName: String, otherUserAvatar: String, propertyId: String, propertyTitle: String, propertyImage: String, initialMessage: String) async throws -> String {
        guard let userId = auth.user?.id, let userName = auth.user?.name, let userAvatar = auth.user?.avatar else {
            throw APIError.serverError("Not authenticated")
        }
        struct StartInput: Encodable {
            let userId: String; let userName: String; let userAvatar: String
            let otherUserId: String; let otherUserName: String; let otherUserAvatar: String
            let propertyId: String; let propertyTitle: String; let propertyImage: String
            let initialMessage: String
        }
        return try await APIClient.shared.trpcMutation("conversations.startConversation", input: StartInput(
            userId: userId, userName: userName, userAvatar: userAvatar,
            otherUserId: otherUserId, otherUserName: otherUserName, otherUserAvatar: otherUserAvatar,
            propertyId: propertyId, propertyTitle: propertyTitle, propertyImage: propertyImage,
            initialMessage: initialMessage
        ))
    }

    func createBooking(_ booking: Booking) async throws {
        struct BookingInput: Encodable { let booking: Booking }
        struct EmptyResult: Decodable { let id: String }
        _ = try await APIClient.shared.trpcMutation("bookings.create", input: BookingInput(booking: booking)) as EmptyResult
        await fetchBookings()
        await fetchNotifications()
    }

    func updateBookingStatus(id: String, status: BookingStatus) async throws {
        guard let userId = auth.user?.id, let role = auth.user?.role else { return }
        struct UpdateInput: Encodable { let id: String; let status: BookingStatus; let currentUserId: String; let currentUserRole: String }
        struct EmptyResult: Decodable { let id: String }
        _ = try await APIClient.shared.trpcMutation("bookings.updateStatus", input: UpdateInput(id: id, status: status, currentUserId: userId, currentUserRole: role.rawValue)) as EmptyResult
        await fetchBookings()
        await fetchNotifications()
    }

    func addReview(propertyId: String, rating: Int, comment: String) async throws {
        guard let userId = auth.user?.id, let userName = auth.user?.name, let userAvatar = auth.user?.avatar else {
            throw APIError.serverError("Not authenticated")
        }
        struct ReviewInput: Encodable { let propertyId: String; let userId: String; let userName: String; let userAvatar: String; let rating: Int; let comment: String }
        struct EmptyResult: Decodable { let id: String }
        _ = try await APIClient.shared.trpcMutation("reviews.add", input: ReviewInput(propertyId: propertyId, userId: userId, userName: userName, userAvatar: userAvatar, rating: rating, comment: comment)) as EmptyResult
        await fetchReviews()
        await fetchProperties()
    }

    func markNotificationRead(id: String) async {
        struct ReadInput: Encodable { let id: String }
        struct EmptyResult: Decodable { let success: Bool }
        do {
            _ = try await APIClient.shared.trpcMutation("notifications.markRead", input: ReadInput(id: id)) as EmptyResult
            await fetchNotifications()
        } catch { print("[Data] Mark read error: \(error.localizedDescription)") }
    }

    func markAllNotificationsRead() async {
        guard let userId = auth.user?.id, let role = auth.user?.role else { return }
        struct MarkAllInput: Encodable { let userId: String; let role: String }
        struct EmptyResult: Decodable { let success: Bool }
        do {
            _ = try await APIClient.shared.trpcMutation("notifications.markAllRead", input: MarkAllInput(userId: userId, role: role.rawValue)) as EmptyResult
            await fetchNotifications()
        } catch { print("[Data] Mark all read error: \(error.localizedDescription)") }
    }

    // MARK: - Computed

    var activeProperties: [Property] { properties.filter { $0.status == .active } }
    var pendingProperties: [Property] { properties.filter { $0.status == .pending } }
    var myProperties: [Property] {
        guard let userId = auth.user?.id else { return [] }
        return properties.filter { $0.ownerId == userId }
    }
    var userConversations: [Conversation] {
        guard let userId = auth.user?.id else { return [] }
        return conversations.filter { $0.participantIds.contains(userId) }
    }
    var userBookings: [Booking] {
        guard let userId = auth.user?.id else { return [] }
        if auth.user?.role == .admin { return bookings }
        return bookings.filter { $0.renterId == userId || $0.ownerId == userId }
    }
    var userNotifications: [AppNotification] {
        guard let userId = auth.user?.id else { return [] }
        if auth.user?.role == .admin { return notifications }
        return notifications.filter { $0.userId == userId }
    }
    var unreadNotificationCount: Int { userNotifications.filter { !$0.read }.count }

    func conversationMessages(_ conversationId: String) -> [ChatMessage] {
        chatMessages.filter { $0.conversationId == conversationId }
    }

    func propertyReviews(_ propertyId: String) -> [Review] {
        reviews.filter { $0.propertyId == propertyId }
    }

    func isSaved(_ propertyId: String) -> Bool {
        savedPropertyIds.contains(propertyId)
    }
}

import Foundation

enum PropertyType: String, Codable, CaseIterable, Identifiable {
    case apartment, office, hostel, room, hotel
    var id: String { rawValue }
    var displayName: String { rawValue.capitalized }
    var icon: String {
        switch self {
        case .apartment: return "building.2.fill"
        case .office: return "building.2.fill"
        case .hostel: return "bed.double.fill"
        case .room: return "door.left.hand.open"
        case .hotel: return "bell.concierge.fill"
        }
    }
}

enum ListingType: String, Codable, CaseIterable {
    case rent, sale
    var displayName: String { self == .rent ? "For Rent" : "For Sale" }
}

enum UserRole: String, Codable, CaseIterable {
    case renter, landlord, admin
    var displayName: String {
        switch self {
        case .renter: return "Renter"
        case .landlord: return "Property Owner"
        case .admin: return "Administrator"
        }
    }
}

enum BookingStatus: String, Codable, CaseIterable {
    case pending, confirmed, cancelled, completed
    var displayName: String { rawValue.capitalized }
}

enum PropertyStatus: String, Codable, CaseIterable {
    case active, pending, rejected, archived
    var displayName: String { rawValue.capitalized }
}

struct Property: Identifiable, Codable, Hashable {
    let id: String
    var title: String
    var description: String
    var type: PropertyType
    var listingType: ListingType
    var price: Double
    var currency: String
    var period: String?
    var bedrooms: Int
    var bathrooms: Int
    var area: Int
    var address: String
    var city: String
    var latitude: Double
    var longitude: Double
    var images: [String]
    var amenities: [String]
    var ownerId: String
    var ownerName: String
    var ownerAvatar: String
    var rating: Double
    var reviewCount: Int
    var featured: Bool
    var status: PropertyStatus
    var createdAt: String

    var formattedPrice: String {
        if price >= 1_000_000 {
            return "\(currency)\(String(format: "%.1fM", price / 1_000_000))"
        }
        return "\(currency)\(Int(price).formatted(.number.grouping(.never)))"
    }
}

struct User: Identifiable, Codable, Hashable {
    let id: String
    var name: String
    var email: String
    var password: String
    var avatar: String
    var phone: String
    var role: UserRole
    var bio: String
    var propertiesCount: Int
    var reviewsCount: Int
    var rating: Double
    var memberSince: String
    var verified: Bool
    var isActive: Bool
}

struct ChatMessage: Identifiable, Codable, Hashable {
    let id: String
    let conversationId: String
    let senderId: String
    let text: String
    let timestamp: String
}

struct Conversation: Identifiable, Codable, Hashable {
    let id: String
    let participantIds: [String]
    let participantNames: [String]
    let participantAvatars: [String]
    let propertyId: String
    let propertyTitle: String
    let propertyImage: String
    var lastMessage: String
    var lastMessageTime: String
    var unreadCount: [String: Int]

    func otherParticipant(currentUserId: String) -> (name: String, avatar: String) {
        let idx = participantIds.firstIndex(of: currentUserId) ?? 0
        let otherIdx = idx == 0 ? 1 : 0
        return (participantNames[otherIdx], participantAvatars[otherIdx])
    }
}

struct Review: Identifiable, Codable, Hashable {
    let id: String
    let propertyId: String
    let userId: String
    let userName: String
    let userAvatar: String
    let rating: Int
    let comment: String
    let date: String
}

struct Booking: Identifiable, Codable, Hashable {
    let id: String
    let propertyId: String
    let propertyTitle: String
    let propertyImage: String
    let renterId: String
    let renterName: String
    let renterAvatar: String
    let ownerId: String
    let ownerName: String
    let date: String
    let time: String
    var status: BookingStatus
    let notes: String
    let createdAt: String
}

struct AppNotification: Identifiable, Codable, Hashable {
    let id: String
    let userId: String
    let title: String
    let message: String
    let type: String
    var read: Bool
    let createdAt: String
    let data: [String: String]?
}

struct UserSettings: Codable {
    var pushEnabled: Bool = true
    var emailEnabled: Bool = true
    var darkMode: Bool = false
}

struct CurrencyOption: Identifiable, Hashable {
    let country: String
    let code: String
    let symbol: String
    var id: String { code }
}

let currencyOptions: [CurrencyOption] = [
    .init(country: "United States", code: "USD", symbol: "$"),
    .init(country: "United Kingdom", code: "GBP", symbol: "£"),
    .init(country: "European Union", code: "EUR", symbol: "€"),
    .init(country: "Canada", code: "CAD", symbol: "CA$"),
    .init(country: "Australia", code: "AUD", symbol: "A$"),
    .init(country: "Nigeria", code: "NGN", symbol: "₦"),
    .init(country: "South Africa", code: "ZAR", symbol: "R"),
    .init(country: "Kenya", code: "KES", symbol: "KSh"),
    .init(country: "Ghana", code: "GHS", symbol: "GH₵"),
    .init(country: "India", code: "INR", symbol: "₹"),
    .init(country: "Japan", code: "JPY", symbol: "¥"),
    .init(country: "China", code: "CNY", symbol: "¥"),
    .init(country: "Brazil", code: "BRL", symbol: "R$"),
    .init(country: "Mexico", code: "MXN", symbol: "MX$"),
    .init(country: "UAE", code: "AED", symbol: "د.إ"),
    .init(country: "Saudi Arabia", code: "SAR", symbol: "﷼"),
    .init(country: "Egypt", code: "EGP", symbol: "E£"),
    .init(country: "Tanzania", code: "TZS", symbol: "TSh"),
]

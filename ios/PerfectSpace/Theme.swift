import SwiftUI

enum Theme {
    static let primary = Color(hex: 0x0A7E6C)
    static let primaryLight = Color(hex: 0xE8F5F1)
    static let primaryDark = Color(hex: 0x065C4F)
    static let accent = Color(hex: 0xE8A838)
    static let accentLight = Color(hex: 0xFFF3DC)
    static let background = Color(hex: 0xF7F5F2)
    static let card = Color.white
    static let textPrimary = Color(hex: 0x1A1A2E)
    static let textSecondary = Color(hex: 0x6B7280)
    static let textLight = Color(hex: 0x9CA3AF)
    static let border = Color(hex: 0xE5E7EB)
    static let borderLight = Color(hex: 0xF3F4F6)
    static let success = Color(hex: 0x10B981)
    static let error = Color(hex: 0xEF4444)
    static let warning = Color(hex: 0xF59E0B)

    static let categoryApartment = Color(hex: 0x3B82F6)
    static let categoryOffice = Color(hex: 0x8B5CF6)
    static let categoryHostel = Color(hex: 0xEC4899)
    static let categoryRoom = Color(hex: 0xF97316)
    static let categoryHotel = Color(hex: 0x14B8A6)

    static func categoryColor(_ type: PropertyType) -> Color {
        switch type {
        case .apartment: return categoryApartment
        case .office: return categoryOffice
        case .hostel: return categoryHostel
        case .room: return categoryRoom
        case .hotel: return categoryHotel
        }
    }
}

extension Color {
    init(hex: UInt32, alpha: Double = 1.0) {
        let r = Double((hex >> 16) & 0xFF) / 255.0
        let g = Double((hex >> 8) & 0xFF) / 255.0
        let b = Double(hex & 0xFF) / 255.0
        self.init(.sRGB, red: r, green: g, blue: b, opacity: alpha)
    }
}

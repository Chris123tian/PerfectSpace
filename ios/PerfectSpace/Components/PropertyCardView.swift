import SwiftUI

struct PropertyCardView: View {
    let property: Property
    @State private var isPressed = false

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            imageSection
            infoSection
        }
        .background(Color.white)
        .clipShape(.rect(cornerRadius: 16))
        .shadow(color: .black.opacity(0.08), radius: 12, y: 4)
        .scaleEffect(isPressed ? 0.97 : 1)
        .animation(.spring(response: 0.3), value: isPressed)
    }

    private var imageSection: some View {
        ZStack(alignment: .top) {
            RemoteImage(url: property.images.first ?? "")
                .frame(height: 200)
                .clipped()

            HStack(spacing: 8) {
                Text(property.type.displayName)
                    .font(.caption).fontWeight(.bold)
                    .foregroundStyle(.white)
                    .padding(.horizontal, 10).padding(.vertical, 5)
                    .background(Theme.categoryColor(property.type))
                    .clipShape(.capsule)

                Text(property.listingType.displayName)
                    .font(.caption).fontWeight(.semibold)
                    .foregroundStyle(.white)
                    .padding(.horizontal, 10).padding(.vertical, 5)
                    .background(Color.black.opacity(0.6))
                    .clipShape(.capsule())
            }
            .padding(12)

            if property.featured {
                HStack(spacing: 4) {
                    Image(systemName: "star.fill").font(.system(size: 10))
                    Text("Featured").font(.system(size: 10)).fontWeight(.bold)
                }
                .foregroundStyle(Theme.accent)
                .padding(.horizontal, 8).padding(.vertical, 4)
                .background(Color.white.opacity(0.95))
                .clipShape(.rect(cornerRadius: 12))
                .frame(maxWidth: .infinity, alignment: .trailing)
                .padding(12)
            }
        }
    }

    private var infoSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(property.formattedPrice)
                    .font(.title2).fontWeight(.heavy)
                    .foregroundStyle(Theme.primary)
                if let period = property.period {
                    Text(period).font(.subheadline).foregroundStyle(Theme.textSecondary)
                }
                Spacer()
                HStack(spacing: 4) {
                    Image(systemName: "star.fill").font(.caption).foregroundStyle(Theme.accent)
                    Text(String(format: "%.1f", property.rating)).font(.subheadline).fontWeight(.bold)
                    Text("(\(property.reviewCount))").font(.caption).foregroundStyle(Theme.textSecondary)
                }
            }
            Text(property.title).font(.headline).lineLimit(1)
            HStack(spacing: 4) {
                Image(systemName: "mappin.and.ellipse").font(.caption).foregroundStyle(Theme.primary)
                Text("\(property.address), \(property.city)").font(.subheadline).foregroundStyle(Theme.textSecondary).lineLimit(1)
            }
            HStack(spacing: 16) {
                if property.bedrooms > 0 {
                    Label("\(property.bedrooms) Bed\(property.bedrooms == 1 ? "" : "s")", systemImage: "bed.fill")
                }
                Label("\(property.bathrooms) Bath\(property.bathrooms == 1 ? "" : "s")", systemImage: " shower.fill")
                Label("\(property.area) ft²", systemImage: "square")
            }
            .font(.caption).foregroundStyle(Theme.textSecondary)
            .padding(.top, 4)
        }
        .padding(16)
    }
}

struct RemoteImage: View {
    let url: String
    @State private var data: Data?

    var body: some View {
        Group {
            if let data, let uiImage = UIImage(data: data) {
                Image(uiImage: uiImage).resizable().aspectRatio(contentMode: .fill)
            } else {
                Rectangle().fill(Theme.borderLight).overlay(ProgressView())
            }
        }
        .task(id: url) {
            guard data == nil, let imageURL = URL(string: url) else { return }
            do {
                let (downloaded, _) = try await URLSession.shared.data(from: imageURL)
                await MainActor.run { self.data = downloaded }
            } catch { print("[Image] Load error: \(error.localizedDescription)") }
        }
    }
}

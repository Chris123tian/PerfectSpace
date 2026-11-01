import SwiftUI

struct PropertyDetailView: View {
    let property: Property
    @EnvironmentObject var data: DataService
    @EnvironmentObject var auth: AuthService
    @State private var activeImageIndex = 0
    @State private var showGallery = false
    @State private var showReviewForm = false
    @State private var reviewRating = 5
    @State private var reviewComment = ""
    @State private var isSaved = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                imageGallery
                contentSection
            }
            .padding(.bottom, 100)
        }
        .ignoresSafeArea(edges: .top)
        .overlay(alignment: .bottom) { bottomBar }
        .fullScreenCover(isPresented: $showGallery) {
            GalleryView(images: property.images, startIndex: activeImageIndex)
        }
        .onAppear { isSaved = data.isSaved(property.id) }
    }

    private var imageGallery: some View {
        ZStack(alignment: .top) {
            TabView(selection: $activeImageIndex) {
                ForEach(Array(property.images.enumerated()), id: \.offset) { idx, img in
                    RemoteImage(url: img)
                        .tag(idx)
                        .onTapGesture { showGallery = true }
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
            .frame(height: 320)

            HStack {
                Button {
                    // dismiss handled by NavigationStack
                } label: {
                    Image(systemName: "chevron.left")
                        .padding(12)
                        .background(Color.white.opacity(0.9))
                        .clipShape(Circle())
                }
                Spacer()
                Button { handleShare() } label: {
                    Image(systemName: "square.and.arrow.up")
                        .padding(12)
                        .background(Color.white.opacity(0.9))
                        .clipShape(Circle())
                }
                Button { handleSave() } label: {
                    Image(systemName: isSaved ? "heart.fill" : "heart")
                        .foregroundStyle(isSaved ? Theme.error : Theme.textPrimary)
                        .padding(12)
                        .background(Color.white.opacity(0.9))
                        .clipShape(Circle())
                }
            }
            .padding(.horizontal, 16).padding(.top, 56)

            HStack(spacing: 6) {
                ForEach(0..<property.images.count, id: \.self) { idx in
                    Capsule()
                        .fill(idx == activeImageIndex ? Color.white : Color.white.opacity(0.5))
                        .frame(width: idx == activeImageIndex ? 24 : 8, height: 8)
                }
            }
            .frame(maxWidth: .infinity, alignment: .center)
            .padding(.bottom, 16)
        }
        .frame(height: 320)
    }

    private var contentSection: some View {
        VStack(alignment: .leading, spacing: 20) {
            HStack(spacing: 8) {
                Text(property.type.displayName)
                    .font(.caption).fontWeight(.bold).foregroundStyle(.white)
                    .padding(.horizontal, 12).padding(.vertical, 6)
                    .background(Theme.categoryColor(property.type)).clipShape(.capsule)
                Text(property.listingType.displayName)
                    .font(.caption).fontWeight(.semibold).foregroundStyle(.white)
                    .padding(.horizontal, 12).padding(.vertical, 6)
                    .background(Theme.textPrimary).clipShape(.capsule)
            }

            Text(property.title).font(.title).fontWeight(.heavy)

            HStack(spacing: 6) {
                Image(systemName: "mappin.and.ellipse").foregroundStyle(Theme.primary)
                Text("\(property.address), \(property.city)").font(.subheadline).foregroundStyle(Theme.textSecondary)
            }

            HStack {
                Text(property.formattedPrice).font(.system(size: 28, weight: .heavy)).foregroundStyle(Theme.primary)
                if let period = property.period {
                    Text(period).font(.headline).foregroundStyle(Theme.textSecondary)
                }
                Spacer()
                HStack(spacing: 4) {
                    Image(systemName: "star.fill").foregroundStyle(Theme.accent)
                    Text(property.rating > 0 ? String(format: "%.1f", property.rating) : "-").fontWeight(.bold)
                    Text("(\(property.reviewCount))").foregroundStyle(Theme.textSecondary)
                }
                .padding(.horizontal, 10).padding(.vertical, 6)
                .background(Theme.accentLight).clipShape(.rect(cornerRadius: 12))
            }

            statsCard

            descriptionSection
            amenitiesSection
            ownerSection
            reviewsSection
        }
        .padding(.horizontal, 20)
    }

    private var statsCard: some View {
        HStack {
            if property.bedrooms > 0 {
                statBox(icon: "bed.fill", value: "\(property.bedrooms)", label: property.bedrooms == 1 ? "Bedroom" : "Bedrooms")
            }
            statBox(icon: "shower.fill", value: "\(property.bathrooms)", label: property.bathrooms == 1 ? "Bathroom" : "Bathrooms")
            statBox(icon: "square", value: "\(property.area)", label: "Sq. Ft.")
        }
        .padding(16)
        .background(Theme.background)
        .clipShape(.rect(cornerRadius: 16))
    }

    private func statBox(icon: String, value: String, label: String) -> some View {
        VStack(spacing: 6) {
            Image(systemName: icon).foregroundStyle(Theme.primary)
                .frame(width: 40, height: 40)
                .background(Theme.primaryLight).clipShape(.rect(cornerRadius: 12))
            Text(value).font(.headline).fontWeight(.bold)
            Text(label).font(.caption).foregroundStyle(Theme.textSecondary)
        }
        .frame(maxWidth: .infinity)
    }

    private var descriptionSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Description").font(.title3).fontWeight(.bold)
            Text(property.description).font(.subheadline).foregroundStyle(Theme.textSecondary).lineSpacing(6)
        }
    }

    private var amenitiesSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Amenities").font(.title3).fontWeight(.bold)
            FlowLayout(spacing: 8) {
                ForEach(property.amenities, id: \.self) { amenity in
                    HStack(spacing: 6) {
                        Image(systemName: "checkmark").foregroundStyle(Theme.primary)
                        Text(amenity).font(.subheadline).foregroundStyle(Theme.primary)
                    }
                    .padding(.horizontal, 12).padding(.vertical, 8)
                    .background(Theme.primaryLight).clipShape(.rect(cornerRadius: 12))
                }
            }
        }
    }

    private var ownerSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Owner").font(.title3).fontWeight(.bold)
            HStack(spacing: 12) {
                RemoteImage(url: property.ownerAvatar)
                    .frame(width: 50, height: 50).clipShape(Circle())
                VStack(alignment: .leading) {
                    Text(property.ownerName).font(.headline)
                    Text("Property Owner").font(.subheadline).foregroundStyle(Theme.textSecondary)
                }
                Spacer()
                Button { handleContact() } label: {
                    Image(systemName: "message.fill").foregroundStyle(Theme.primary)
                        .frame(width: 40, height: 40)
                        .background(Theme.primaryLight).clipShape(Circle())
                }
            }
            .padding(14).background(Theme.background).clipShape(.rect(cornerRadius: 16))
        }
    }

    private var reviewsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Reviews (\(data.propertyReviews(property.id).count))").font(.title3).fontWeight(.bold)
                Spacer()
                if auth.user != nil && property.ownerId != auth.user?.id {
                    Button(showReviewForm ? "Cancel" : "Write Review") {
                        withAnimation { showReviewForm.toggle() }
                    }
                    .font(.subheadline).fontWeight(.semibold).foregroundStyle(Theme.primary)
                }
            }

            if showReviewForm {
                VStack(spacing: 12) {
                    HStack(spacing: 8) {
                        ForEach(1...5, id: \.self) { star in
                            Image(systemName: star <= reviewRating ? "star.fill" : "star")
                                .foregroundStyle(Theme.accent)
                                .font(.title2)
                                .onTapGesture { reviewRating = star }
                        }
                    }
                    TextField("Write your review...", text: $reviewComment, axis: .vertical)
                        .lineLimit(3...6)
                        .padding(12).background(Color.white)
                        .clipShape(.rect(cornerRadius: 12))
                    Button {
                        submitReview()
                    } label: {
                        HStack(spacing: 8) {
                            Image(systemName: "paperplane.fill")
                            Text("Submit Review")
                        }
                        .frame(maxWidth: .infinity).padding(.vertical, 12)
                        .background(Theme.primary).foregroundStyle(.white)
                        .clipShape(.rect(cornerRadius: 12))
                    }
                }
                .padding(14).background(Theme.background).clipShape(.rect(cornerRadius: 14))
            }

            ForEach(data.propertyReviews(property.id).prefix(5)) { review in
                VStack(alignment: .leading, spacing: 8) {
                    HStack(spacing: 10) {
                        RemoteImage(url: review.userAvatar)
                            .frame(width: 36, height: 36).clipShape(Circle())
                        VStack(alignment: .leading) {
                            Text(review.userName).font(.subheadline).fontWeight(.semibold)
                            Text(review.date).font(.caption).foregroundStyle(Theme.textLight)
                        }
                        Spacer()
                        HStack(spacing: 4) {
                            Image(systemName: "star.fill").font(.caption).foregroundStyle(Theme.accent)
                            Text("\(review.rating)").font(.subheadline).fontWeight(.bold)
                        }
                        .padding(.horizontal, 8).padding(.vertical, 4)
                        .background(Theme.accentLight).clipShape(.rect(cornerRadius: 8))
                    }
                    Text(review.comment).font(.subheadline).foregroundStyle(Theme.textSecondary)
                }
                .padding(14).background(Theme.background).clipShape(.rect(cornerRadius: 14))
            }
        }
    }

    private var bottomBar: some View {
        HStack {
            VStack(alignment: .leading) {
                Text(property.formattedPrice).font(.title2).fontWeight(.heavy).foregroundStyle(Theme.primary)
                if let period = property.period {
                    Text(period).font(.caption).foregroundStyle(Theme.textSecondary)
                }
            }
            Spacer()
            Button { handleScheduleViewing() } label: {
                HStack(spacing: 6) {
                    Image(systemName: "calendar")
                    Text("Visit")
                }
                .padding(.horizontal, 16).padding(.vertical, 12)
                .background(Theme.primaryLight).foregroundStyle(Theme.primary)
                .clipShape(.rect(cornerRadius: 14))
            }
            Button { handleContact() } label: {
                HStack(spacing: 6) {
                    Image(systemName: "message.fill")
                    Text("Contact")
                }
                .padding(.horizontal, 20).padding(.vertical, 12)
                .background(Theme.primary).foregroundStyle(.white)
                .clipShape(.rect(cornerRadius: 14))
            }
        }
        .padding(.horizontal, 20).padding(.vertical, 12)
        .background(Color.white)
        .overlay(Rectangle().fill(Theme.borderLight).frame(height: 1), alignment: .top)
        .shadow(color: .black.opacity(0.06), radius: 12, y: -4)
    }

    private func handleSave() {
        Task {
            do { try await data.toggleSave(propertyId: property.id); isSaved.toggle() }
            catch { print("[Property] Save error: \(error.localizedDescription)") }
        }
    }

    private func handleShare() {}

    private func handleContact() {
        guard auth.user != nil, property.ownerId != auth.user?.id else { return }
        Task {
            do {
                let convId = try await data.startConversation(
                    otherUserId: property.ownerId,
                    otherUserName: property.ownerName,
                    otherUserAvatar: property.ownerAvatar,
                    propertyId: property.id,
                    propertyTitle: property.title,
                    propertyImage: property.images.first ?? "",
                    initialMessage: "Hi! I'm interested in \(property.title)."
                )
                print("[Property] Started conversation: \(convId)")
            } catch { print("[Property] Contact error: \(error.localizedDescription)") }
        }
    }

    private func handleScheduleViewing() {
        guard auth.user != nil, property.ownerId != auth.user?.id else { return }
        let date = Date().addingTimeInterval(3 * 86400)
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let booking = Booking(
            id: "b_\(Date().timeIntervalSince1970)",
            propertyId: property.id, propertyTitle: property.title,
            propertyImage: property.images.first ?? "",
            renterId: auth.user?.id ?? "", renterName: auth.user?.name ?? "", renterAvatar: auth.user?.avatar ?? "",
            ownerId: property.ownerId, ownerName: property.ownerName,
            date: formatter.string(from: date), time: "2:00 PM",
            status: .pending, notes: "Scheduled via app", createdAt: ISO8601DateFormatter().string(from: Date())
        )
        Task { do { try await data.createBooking(booking) } catch { print("[Property] Booking error: \(error.localizedDescription)") } }
    }

    private func submitReview() {
        guard !reviewComment.trimmingCharacters(in: .whitespaces).isEmpty else { return }
        Task {
            do {
                try await data.addReview(propertyId: property.id, rating: reviewRating, comment: reviewComment.trimmingCharacters(in: .whitespaces))
                showReviewForm = false
                reviewComment = ""
                reviewRating = 5
            } catch { print("[Property] Review error: \(error.localizedDescription)") }
        }
    }
}

struct GalleryView: View {
    let images: [String]
    @State var startIndex: Int
    @Environment(\.dismiss) var dismiss

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            TabView(selection: $startIndex) {
                ForEach(Array(images.enumerated()), id: \.offset) { idx, img in
                    RemoteImage(url: img).aspectRatio(contentMode: .fit).tag(idx)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .always))
            VStack {
                HStack {
                    Button { dismiss() } label: {
                        Image(systemName: "xmark").foregroundStyle(.white).padding(12)
                            .background(Color.white.opacity(0.15)).clipShape(Circle())
                    }
                    Spacer()
                    Text("\(startIndex + 1) / \(images.count)").foregroundStyle(.white)
                    Spacer().frame(width: 40)
                }
                .padding(.horizontal, 16).padding(.top, 8)
                Spacer()
            }
        }
    }
}

struct FlowLayout: Layout {
    var spacing: CGFloat = 8
    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let maxWidth = proposal.width ?? .infinity
        var x: CGFloat = 0; var y: CGFloat = 0; var rowHeight: CGFloat = 0
        for sub in subviews {
            let size = sub.sizeThatFits(.unspecified)
            if x + size.width > maxWidth { x = 0; y += rowHeight + spacing; rowHeight = 0 }
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
        return CGSize(width: maxWidth, height: y + rowHeight)
    }
    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX; var y = bounds.minY; var rowHeight: CGFloat = 0
        for sub in subviews {
            let size = sub.sizeThatFits(.unspecified)
            if x + size.width > bounds.maxX { x = bounds.minX; y += rowHeight + spacing; rowHeight = 0 }
            sub.place(at: CGPoint(x: x, y: y), proposal: .init(size))
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
    }
}

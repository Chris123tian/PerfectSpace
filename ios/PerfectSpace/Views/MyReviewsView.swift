import SwiftUI

struct MyReviewsView: View {
    @EnvironmentObject var auth: AuthService
    @EnvironmentObject var data: DataService

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                if myReviews.isEmpty {
                    emptyState
                } else {
                    ForEach(myReviews) { review in
                        NavigationLink {
                            if let prop = data.properties.first(where: { $0.id == review.propertyId }) {
                                PropertyDetailView(property: prop)
                            }
                        } label: {
                            reviewCard(review)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .padding(20)
        }
        .background(Theme.background)
        .navigationTitle("My Reviews")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var myReviews: [Review] {
        guard let userId = auth.user?.id else { return [] }
        return data.reviews.filter { $0.userId == userId }
    }

    private func reviewCard(_ review: Review) -> some View {
        HStack(spacing: 12) {
            if let prop = data.properties.first(where: { $0.id == review.propertyId }) {
                RemoteImage(url: prop.images.first ?? "")
                    .frame(width: 70, height: 70).clipShape(.rect(cornerRadius: 12))
            }
            VStack(alignment: .leading, spacing: 4) {
                Text(data.properties.first(where: { $0.id == review.propertyId })?.title ?? "Unknown")
                    .font(.subheadline).fontWeight(.bold).lineLimit(1)
                HStack(spacing: 2) {
                    ForEach(1...5, id: \.self) { star in
                        Image(systemName: star <= review.rating ? "star.fill" : "star")
                            .font(.caption)
                            .foregroundStyle(Theme.accent)
                    }
                    Text("\(review.rating)/5").font(.caption).fontWeight(.semibold).foregroundStyle(Theme.textSecondary).padding(.leading, 6)
                }
                Text(review.comment).font(.caption).foregroundStyle(Theme.textSecondary).lineLimit(2)
                Text(review.date).font(.caption2).foregroundStyle(Theme.textLight)
            }
            Spacer()
        }
        .padding(12).background(Color.white).clipShape(.rect(cornerRadius: 16))
        .shadow(color: .black.opacity(0.06), radius: 8, y: 2)
    }

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "star").font(.system(size: 56)).foregroundStyle(Theme.textLight)
            Text("No reviews yet").font(.headline)
            Text("Visit properties and leave reviews to help other renters")
                .font(.subheadline).foregroundStyle(Theme.textSecondary).multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity).padding(.vertical, 80).padding(.horizontal, 40)
    }
}

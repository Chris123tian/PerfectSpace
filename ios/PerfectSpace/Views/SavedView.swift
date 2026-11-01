import SwiftUI

struct SavedView: View {
    @EnvironmentObject var data: DataService

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                if savedProperties.isEmpty {
                    emptyState
                } else {
                    ForEach(savedProperties) { property in
                        NavigationLink {
                            PropertyDetailView(property: property)
                        } label: {
                            PropertyCardView(property: property)
                        }
                        .buttonStyle(.plain)
                        .padding(.horizontal, 20)
                    }
                }
            }
            .padding(.vertical, 16)
        }
        .background(Theme.background)
        .navigationTitle("Saved Properties")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var savedProperties: [Property] {
        data.activeProperties.filter { data.savedPropertyIds.contains($0.id) }
    }

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "heart").font(.system(size: 56)).foregroundStyle(Theme.textLight)
            Text("No saved properties").font(.headline)
            Text("Tap the heart icon on properties you like to save them here")
                .font(.subheadline).foregroundStyle(Theme.textSecondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity).padding(.vertical, 80).padding(.horizontal, 40)
    }
}

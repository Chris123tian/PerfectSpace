import SwiftUI

struct MainTabView: View {
    @EnvironmentObject var data: DataService
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            NavigationStack {
                HomeView()
            }
            .tabItem {
                Label("Home", systemImage: "house.fill")
            }
            .tag(0)

            NavigationStack {
                ExploreView()
            }
            .tabItem {
                Label("Explore", systemImage: "magnifyingglass")
            }
            .tag(1)

            NavigationStack {
                MessagesView()
            }
            .tabItem {
                Label("Messages", systemImage: "message.fill")
            }
            .badge(unreadMessages)
            .tag(2)

            NavigationStack {
                ProfileView()
            }
            .tabItem {
                Label("Profile", systemImage: "person.fill")
            }
            .badge(data.unreadNotificationCount)
            .tag(3)
        }
        .tint(Theme.primary)
    }

    private var unreadMessages: Int {
        guard let userId = data.auth.user?.id else { return 0 }
        return data.userConversations.reduce(0) { $0 + ($1.unreadCount[userId] ?? 0) }
    }
}

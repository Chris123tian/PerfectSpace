import SwiftUI

@main
struct PerfectSpaceApp: App {
    @StateObject private var authService = AuthService()
    @StateObject private var dataService: DataService

    init() {
        let auth = AuthService()
        _authService = StateObject(wrappedValue: auth)
        _dataService = StateObject(wrappedValue: DataService(auth: auth))
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(authService)
                .environmentObject(dataService)
                .task {
                    dataService.startPolling()
                    await authService.fetchSettings()
                }
        }
    }
}

struct RootView: View {
    @EnvironmentObject var auth: AuthService

    var body: some View {
        Group {
            if auth.isLoading {
                SplashView()
            } else if let user = auth.user {
                MainTabView()
                    .id(user.id)
            } else {
                LoginView()
            }
        }
        .tint(Theme.primary)
    }
}

struct SplashView: View {
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "building.2.fill")
                .font(.system(size: 48))
                .foregroundStyle(Theme.primary)
            Text("Perfect Space")
                .font(.title.bold())
                .foregroundStyle(Theme.primary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Theme.background)
    }
}

import Foundation

@MainActor
final class AuthService: ObservableObject {
    @Published var user: User?
    @Published var isLoading = true
    @Published var loginError: String?
    @Published var signupError: String?
    @Published var settings = UserSettings()

    private let defaults = UserDefaults.standard
    private let userKey = "ps_current_user"

    init() {
        restoreSession()
    }

    private func restoreSession() {
        if let data = defaults.data(forKey: userKey),
           let savedUser = try? JSONDecoder().decode(User.self, from: data) {
            self.user = savedUser
            print("[Auth] Restored session: \(savedUser.name)")
        }
        isLoading = false
    }

    func login(email: String, password: String) async throws {
        loginError = nil
        let result: User = try await APIClient.shared.trpcMutation(
            "auth.login",
            input: LoginInput(email: email, password: password)
        )
        saveUser(result)
    }

    func signup(name: String, email: String, password: String, phone: String, role: UserRole) async throws {
        signupError = nil
        let result: User = try await APIClient.shared.trpcMutation(
            "auth.signup",
            input: SignupInput(name: name, email: email, password: password, phone: phone, role: role)
        )
        saveUser(result)
    }

    func updateProfile(updates: [String: AnyCodable]) async throws {
        guard let userId = user?.id else { throw APIError.serverError("Not authenticated") }
        let result: User = try await APIClient.shared.trpcMutation(
            "auth.updateProfile",
            input: UpdateProfileInput(userId: userId, updates: updates)
        )
        saveUser(result)
    }

    func deleteAccount() async throws {
        guard let userId = user?.id else { throw APIError.serverError("Not authenticated") }
        struct DeleteInput: Encodable { let userId: String }
        struct EmptyResult: Decodable { let success: Bool }
        _ = try await APIClient.shared.trpcMutation(
            "auth.deleteAccount",
            input: DeleteInput(userId: userId)
        ) as EmptyResult
        logout()
    }

    func logout() {
        defaults.removeObject(forKey: userKey)
        user = nil
        settings = UserSettings()
    }

    func fetchSettings() async {
        guard let userId = user?.id else { return }
        do {
            struct SettingsInput: Encodable { let userId: String }
            settings = try await APIClient.shared.trpcQuery(
                "auth.getSettings",
                input: SettingsInput(userId: userId)
            )
        } catch {
            print("[Auth] Failed to fetch settings: \(error.localizedDescription)")
        }
    }

    func updateSettings(pushEnabled: Bool? = nil, emailEnabled: Bool? = nil, darkMode: Bool? = nil) async {
        guard let userId = user?.id else { return }
        struct SettingsUpdateInput: Encodable {
            let userId: String
            let settings: SettingsPayload
        }
        struct SettingsPayload: Encodable {
            let pushEnabled: Bool?
            let emailEnabled: Bool?
            let darkMode: Bool?
        }
        do {
            settings = try await APIClient.shared.trpcMutation(
                "auth.updateSettings",
                input: SettingsUpdateInput(
                    userId: userId,
                    settings: SettingsPayload(
                        pushEnabled: pushEnabled,
                        emailEnabled: emailEnabled,
                        darkMode: darkMode
                    )
                )
            )
        } catch {
            print("[Auth] Failed to update settings: \(error.localizedDescription)")
        }
    }

    func getAllUsers() async throws -> [User] {
        struct EmptyInput: Encodable { let _: String? = nil }
        return try await APIClient.shared.trpcQuery("auth.getAllUsers", input: Optional<EmptyInput>.none)
    }

    func updateUserAdmin(userId: String, updates: [String: AnyCodable]) async throws -> User {
        try await APIClient.shared.trpcMutation(
            "auth.updateUserAdmin",
            input: UpdateProfileInput(userId: userId, updates: updates)
        )
    }

    private func saveUser(_ newUser: User) {
        user = newUser
        if let data = try? JSONEncoder().encode(newUser) {
            defaults.set(data, forKey: userKey)
        }
        print("[Auth] Saved user: \(newUser.name)")
    }
}

struct LoginInput: Encodable {
    let email: String
    let password: String
}

struct SignupInput: Encodable {
    let name: String
    let email: String
    let password: String
    let phone: String
    let role: UserRole
}

struct UpdateProfileInput: Encodable {
    let userId: String
    let updates: [String: AnyCodable]
}

struct AnyCodable: Codable {
    let value: Any
    init(_ value: Any) { self.value = value }
    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let v = try? container.decode(Bool.self) { value = v }
        else if let v = try? container.decode(Double.self) { value = v }
        else if let v = try? container.decode(String.self) { value = v }
        else if let v = try? container.decode([AnyCodable].self) { value = v.map { $0.value } }
        else { value = "" }
    }
    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch value {
        case let v as Bool: try container.encode(v)
        case let v as Double: try container.encode(v)
        case let v as Int: try container.encode(v)
        case let v as String: try container.encode(v)
        case let v as [Any]: try container.encode(v.map { AnyCodable($0) })
        default: try container.encodeNil()
        }
    }
}

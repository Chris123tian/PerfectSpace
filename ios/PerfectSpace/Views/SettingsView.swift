import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var auth: AuthService
    @State private var showPasswordForm = false
    @State private var currentPassword = ""
    @State private var newPassword = ""
    @State private var confirmPassword = ""
    @State private var showCurrent = false
    @State private var showNew = false

    var body: some View {
        Form {
            Section("Notifications") {
                Toggle("Push Notifications", isOn: Binding(
                    get: { auth.settings.pushEnabled },
                    set: { val in Task { await auth.updateSettings(pushEnabled: val) } }
                ))
                Toggle("Email Notifications", isOn: Binding(
                    get: { auth.settings.emailEnabled },
                    set: { val in Task { await auth.updateSettings(emailEnabled: val) } }
                ))
            }

            Section("Appearance") {
                Toggle("Dark Mode", isOn: Binding(
                    get: { auth.settings.darkMode },
                    set: { val in Task { await auth.updateSettings(darkMode: val) } }
                ))
            }

            Section {
                DisclosureGroup("Change Password", isExpanded: $showPasswordForm) {
                    HStack {
                        Group {
                            if showCurrent { TextField("Current password", text: $currentPassword) }
                            else { SecureField("Current password", text: $currentPassword) }
                        }
                        Button { showCurrent.toggle() } label: {
                            Image(systemName: showCurrent ? "eye.slash" : "eye").foregroundStyle(Theme.textSecondary)
                        }
                    }
                    HStack {
                        Group {
                            if showNew { TextField("New password (min 6 chars)", text: $newPassword) }
                            else { SecureField("New password (min 6 chars)", text: $newPassword) }
                        }
                        Button { showNew.toggle() } label: {
                            Image(systemName: showNew ? "eye.slash" : "eye").foregroundStyle(Theme.textSecondary)
                        }
                    }
                    SecureField("Confirm new password", text: $confirmPassword)
                    Button("Update Password") { handleChangePassword() }
                        .frame(maxWidth: .infinity).padding(.vertical, 12)
                        .background(Theme.primary).foregroundStyle(.white)
                        .clipShape(.rect(cornerRadius: 12))
                        .listRowBackground(Color.clear)
                        .padding(.top, 4)
                }
            }

            Section("About") {
                HStack {
                    Label("About Perfect Space", systemImage: "info.circle")
                    Spacer()
                    Text("v1.0.0").foregroundStyle(.secondary)
                }
            }

            Section {
                Button(role: .destructive) {
                    Task {
                        do {
                            try await auth.deleteAccount()
                        } catch {
                            print("[Settings] Delete error: \(error.localizedDescription)")
                        }
                    }
                } label: {
                    Label("Delete Account", systemImage: "trash")
                        .foregroundStyle(Theme.error)
                }
            }
        }
        .navigationTitle("Settings")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func handleChangePassword() {
        guard currentPassword == auth.user?.password else { return }
        guard newPassword.count >= 6 else { return }
        guard newPassword == confirmPassword else { return }
        Task {
            do {
                try await auth.updateProfile(updates: ["password": AnyCodable(newPassword)])
                showPasswordForm = false
                currentPassword = ""
                newPassword = ""
                confirmPassword = ""
            } catch { print("[Settings] Password error: \(error.localizedDescription)") }
        }
    }
}

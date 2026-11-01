import SwiftUI

struct EditProfileView: View {
    @EnvironmentObject var auth: AuthService
    @Environment(\.dismiss) var dismiss
    @State private var name = ""
    @State private var phone = ""
    @State private var bio = ""
    @State private var avatarURL = ""
    @State private var isSaving = false

    var body: some View {
        Form {
            Section {
                HStack {
                    Spacer()
                    RemoteImage(url: avatarURL)
                        .frame(width: 90, height: 90)
                        .clipShape(Circle())
                        .overlay(Circle().stroke(Theme.primaryLight, lineWidth: 3))
                    Spacer()
                }
                .listRowBackground(Color.clear)
            }

            Section("Details") {
                TextField("Name", text: $name)
                HStack {
                    Text("Email").foregroundStyle(.secondary)
                    Spacer()
                    Text(auth.user?.email ?? "").foregroundStyle(Theme.textLight)
                }
                TextField("Phone", text: $phone).keyboardType(.phonePad)
            }

            Section("Bio") {
                TextField("Tell us about yourself...", text: $bio, axis: .vertical)
                    .lineLimit(3...6)
                Text("\(bio.count)/200").font(.caption2).foregroundStyle(Theme.textLight)
            }

            Section("Account Info") {
                infoRow("Role", value: auth.user?.role.displayName ?? "")
                infoRow("Member Since", value: auth.user?.memberSince ?? "")
                infoRow("Verified", value: auth.user?.verified == true ? "Yes" : "No")
            }
        }
        .navigationTitle("Edit Profile")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") { dismiss() }
            }
            ToolbarItem(placement: .confirmationAction) {
                Button("Save") { handleSave() }
                    .disabled(isSaving || name.trimmingCharacters(in: .whitespaces).isEmpty)
            }
        }
        .onAppear {
            name = auth.user?.name ?? ""
            phone = auth.user?.phone ?? ""
            bio = auth.user?.bio ?? ""
            avatarURL = auth.user?.avatar ?? ""
        }
    }

    private func infoRow(_ label: String, value: String) -> some View {
        HStack {
            Text(label).foregroundStyle(.secondary)
            Spacer()
            Text(value)
        }
    }

    private func handleSave() {
        isSaving = true
        var updates: [String: AnyCodable] = [
            "name": AnyCodable(name.trimmingCharacters(in: .whitespaces)),
            "phone": AnyCodable(phone.trimmingCharacters(in: .whitespaces)),
            "bio": AnyCodable(bio.trimmingCharacters(in: .whitespaces)),
        ]
        if avatarURL != auth.user?.avatar {
            updates["avatar"] = AnyCodable(avatarURL)
        }
        Task {
            do {
                try await auth.updateProfile(updates: updates)
                isSaving = false
                dismiss()
            } catch {
                isSaving = false
                print("[EditProfile] Error: \(error.localizedDescription)")
            }
        }
    }
}

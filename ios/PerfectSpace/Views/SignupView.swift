import SwiftUI

struct SignupView: View {
    @EnvironmentObject var auth: AuthService
    @Environment(\.dismiss) var dismiss
    @State private var name = ""
    @State private var email = ""
    @State private var password = ""
    @State private var phone = ""
    @State private var role: UserRole = .renter
    @State private var showPassword = false
    @State private var errors: [String: String] = [:]
    @State private var shake = false

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                Text("Join Perfect Space")
                    .font(.system(size: 26, weight: .heavy))
                    .foregroundStyle(Theme.textPrimary)
                    .frame(maxWidth: .infinity, alignment: .leading)

                Text("Choose your role to get started")
                    .font(.subheadline).foregroundStyle(Theme.textSecondary)

                HStack(spacing: 12) {
                    roleCard(.renter, icon: "house.fill", label: "Renter", desc: "Find properties")
                    roleCard(.landlord, icon: "building.2.fill", label: "Landlord", desc: "List properties")
                }

                if let error = auth.signupError {
                    Text(error).font(.subheadline).foregroundStyle(Theme.error)
                        .frame(maxWidth: .infinity).padding(12)
                        .background(Theme.error.opacity(0.1)).clipShape(.rect(cornerRadius: 12))
                }

                inputField("Full Name", text: $name, placeholder: "John Doe", error: errors["name"])
                inputField("Email", text: $email, placeholder: "your@email.com", keyboardType: .emailAddress, error: errors["email"])
                inputField("Phone", text: $phone, placeholder: "+1 (555) 000-0000", keyboardType: .phonePad, error: errors["phone"])

                VStack(alignment: .leading, spacing: 8) {
                    Text("Password").font(.subheadline).fontWeight(.semibold)
                    HStack {
                        SecureField("Min 6 characters", text: $password)
                        Button { showPassword.toggle() } label: {
                            Image(systemName: showPassword ? "eye.slash" : "eye").foregroundStyle(Theme.textLight)
                        }
                    }
                    .padding(14).background(Theme.background).clipShape(.rect(cornerRadius: 14))
                    .overlay(RoundedRectangle(cornerRadius: 14).stroke(errors["password"] != nil ? Theme.error : Color.clear, lineWidth: 1.5))
                    if let e = errors["password"] { Text(e).font(.caption).foregroundStyle(Theme.error) }
                }

                Button(action: handleSignup) {
                    HStack(spacing: 8) {
                        if auth.isLoading { ProgressView().tint(.white) }
                        Text("Create Account").fontWeight(.bold)
                        Image(systemName: "arrow.right")
                    }
                    .frame(maxWidth: .infinity).padding(.vertical, 16)
                    .background(Theme.primary).foregroundStyle(.white)
                    .clipShape(.rect(cornerRadius: 14))
                }
                .disabled(auth.isLoading)
                .offset(x: shake ? 10 : 0)

                HStack(spacing: 4) {
                    Text("Already have an account?").font(.subheadline).foregroundStyle(Theme.textSecondary)
                    Button("Sign In") { dismiss() }.font(.subheadline).fontWeight(.bold).foregroundStyle(Theme.primary)
                }
            }
            .padding(.horizontal, 24).padding(.top, 28).padding(.bottom, 24)
        }
        .background(Color.white)
        .navigationTitle("Create Account")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func roleCard(_ r: UserRole, icon: String, label: String, desc: String) -> some View {
        Button { role = r } label: {
            VStack(spacing: 6) {
                Image(systemName: icon).font(.title2)
                Text(label).font(.subheadline).fontWeight(.bold)
                Text(desc).font(.caption).foregroundStyle(Theme.textLight)
            }
            .frame(maxWidth: .infinity).padding(.vertical, 18)
            .background(role == r ? Theme.primaryLight : Theme.background)
            .overlay(RoundedRectangle(cornerRadius: 16).stroke(role == r ? Theme.primary : Color.clear, lineWidth: 2))
            .clipShape(.rect(cornerRadius: 16))
            .foregroundStyle(role == r ? Theme.primary : Theme.textSecondary)
        }
    }

    private func inputField(_ label: String, text: Binding<String>, placeholder: String, keyboardType: UIKeyboardType = .default, error: String?) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label).font(.subheadline).fontWeight(.semibold)
            TextField(placeholder, text: text)
                .keyboardType(keyboardType)
                .textInputAutocapitalization(keyboardType == .emailAddress ? .never : .sentences)
                .padding(14).background(Theme.background)
                .clipShape(.rect(cornerRadius: 14))
                .overlay(RoundedRectangle(cornerRadius: 14).stroke(error != nil ? Theme.error : Color.clear, lineWidth: 1.5))
            if let e = error { Text(e).font(.caption).foregroundStyle(Theme.error) }
        }
    }

    private func handleSignup() {
        errors = [:]
        if name.trimmingCharacters(in: .whitespaces).isEmpty { errors["name"] = "Name is required" }
        if email.trimmingCharacters(in: .whitespaces).isEmpty { errors["email"] = "Email is required" }
        else if !email.contains("@") { errors["email"] = "Enter a valid email" }
        if password.isEmpty { errors["password"] = "Password is required" }
        else if password.count < 6 { errors["password"] = "Minimum 6 characters" }
        if phone.trimmingCharacters(in: .whitespaces).isEmpty { errors["phone"] = "Phone is required" }
        guard errors.isEmpty else { withAnimation(.easeInOut(duration: 0.05).repeatCount(3)) { shake.toggle() }; return }

        Task {
            do {
                try await auth.signup(name: name.trimmingCharacters(in: .whitespaces), email: email.trimmingCharacters(in: .whitespaces), password: password, phone: phone.trimmingCharacters(in: .whitespaces), role: role)
            } catch {
                auth.signupError = error.localizedDescription
                withAnimation(.easeInOut(duration: 0.05).repeatCount(3)) { shake.toggle() }
            }
        }
    }
}

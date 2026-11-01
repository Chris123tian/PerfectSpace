import SwiftUI

struct LoginView: View {
    @EnvironmentObject var auth: AuthService
    @State private var email = ""
    @State private var password = ""
    @State private var showPassword = false
    @State private var errors: [String: String] = [:]
    @State private var shake = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    headerSection
                    formSection
                }
                .padding(.bottom, 24)
            }
            .background(Color.white)
            .ignoresSafeArea(edges: .top)
            .navigationDestination(isPresented: $showSignup) {
                SignupView()
            }
        }
    }

    @State private var showSignup = false

    private var headerSection: some View {
        VStack(spacing: 12) {
            Image(systemName: "building.2.fill")
                .font(.system(size: 36))
                .foregroundStyle(.white)
                .frame(width: 72, height: 72)
                .background(Color.white.opacity(0.2))
                .clipShape(.rect(cornerRadius: 20))
            Text("Perfect Space")
                .font(.system(size: 32, weight: .heavy))
                .foregroundStyle(.white)
            Text("Find your perfect space")
                .font(.subheadline)
                .foregroundStyle(.white.opacity(0.8))
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 48)
        .padding(.bottom, 32)
        .background(Theme.primary)
    }

    private var formSection: some View {
        VStack(spacing: 18) {
            Text("Welcome back")
                .font(.system(size: 26, weight: .heavy))
                .foregroundStyle(Theme.textPrimary)
                .frame(maxWidth: .infinity, alignment: .leading)

            Text("Sign in to continue")
                .font(.subheadline)
                .foregroundStyle(Theme.textSecondary)

            if let error = auth.loginError {
                Text(error)
                    .font(.subheadline)
                    .foregroundStyle(Theme.error)
                    .frame(maxWidth: .infinity)
                    .padding(12)
                    .background(Theme.error.opacity(0.1))
                    .clipShape(.rect(cornerRadius: 12))
            }

            VStack(alignment: .leading, spacing: 8) {
                Text("Email").font(.subheadline).fontWeight(.semibold)
                TextField("your@email.com", text: $email)
                    .textInputAutocapitalization(.never)
                    .keyboardType(.emailAddress)
                    .textContentType(.emailAddress)
                    .padding(14)
                    .background(Theme.background)
                    .clipShape(.rect(cornerRadius: 14))
                    .overlay(RoundedRectangle(cornerRadius: 14).stroke(errors["email"] != nil ? Theme.error : Color.clear, lineWidth: 1.5))
                if let e = errors["email"] { Text(e).font(.caption).foregroundStyle(Theme.error) }
            }

            VStack(alignment: .leading, spacing: 8) {
                Text("Password").font(.subheadline).fontWeight(.semibold)
                HStack {
                    SecureField("Enter password", text: $password)
                        .textContentType(.password)
                    Button { showPassword.toggle() } label: {
                        Image(systemName: showPassword ? "eye.slash" : "eye").foregroundStyle(Theme.textLight)
                    }
                }
                .padding(14)
                .background(Theme.background)
                .clipShape(.rect(cornerRadius: 14))
                .overlay(RoundedRectangle(cornerRadius: 14).stroke(errors["password"] != nil ? Theme.error : Color.clear, lineWidth: 1.5))
                if let e = errors["password"] { Text(e).font(.caption).foregroundStyle(Theme.error) }
            }

            Button(action: handleLogin) {
                HStack(spacing: 8) {
                    if auth.isLoading { ProgressView().tint(.white) }
                    Text("Sign In").fontWeight(.bold)
                    Image(systemName: "arrow.right")
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(Theme.primary)
                .foregroundStyle(.white)
                .clipShape(.rect(cornerRadius: 14))
            }
            .disabled(auth.isLoading)
            .offset(x: shake ? 10 : 0)

            divider
            googleButton
            signupRow
            adminHint
        }
        .padding(.horizontal, 24)
        .padding(.top, 32)
    }

    private var divider: some View {
        HStack(spacing: 12) {
            Rectangle().fill(Theme.border).frame(height: 1)
            Text("or continue with").font(.caption).foregroundStyle(Theme.textLight)
            Rectangle().fill(Theme.border).frame(height: 1)
        }
    }

    private var googleButton: some View {
        Button {
            // Google sign-in would use ASAuthorizationAppleIDProvider or Google SDK
        } label: {
            HStack(spacing: 12) {
                Text("G").font(.headline).fontWeight(.bold).foregroundStyle(.white)
                    .frame(width: 28, height: 28)
                    .background(Color(red: 0.26, green: 0.52, blue: 0.96))
                    .clipShape(Circle())
                Text("Continue with Google").fontWeight(.semibold)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(Color.white)
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Theme.border, lineWidth: 1.5))
            .foregroundStyle(Theme.textPrimary)
            .clipShape(.rect(cornerRadius: 14))
        }
    }

    private var signupRow: some View {
        HStack(spacing: 4) {
            Text("Don't have an account?").font(.subheadline).foregroundStyle(Theme.textSecondary)
            Button("Sign Up") { showSignup = true }
                .font(.subheadline).fontWeight(.bold).foregroundStyle(Theme.primary)
        }
    }

    private var adminHint: some View {
        Text("Admin login: admin@perfectspace.com / admin123")
            .font(.caption).foregroundStyle(Theme.primary)
            .padding(.vertical, 10).padding(.horizontal, 16)
            .background(Theme.primaryLight)
            .clipShape(.rect(cornerRadius: 10))
    }

    private func handleLogin() {
        errors = [:]
        if email.trimmingCharacters(in: .whitespaces).isEmpty { errors["email"] = "Email is required" }
        else if !email.contains("@") { errors["email"] = "Enter a valid email" }
        if password.isEmpty { errors["password"] = "Password is required" }
        else if password.count < 6 { errors["password"] = "Password must be at least 6 characters" }
        guard errors.isEmpty else { withAnimation(.easeInOut(duration: 0.05).repeatCount(3)) { shake.toggle() }; return }

        Task {
            do {
                try await auth.login(email: email.trimmingCharacters(in: .whitespaces), password: password)
            } catch {
                auth.loginError = error.localizedDescription
                withAnimation(.easeInOut(duration: 0.05).repeatCount(3)) { shake.toggle() }
            }
        }
    }
}

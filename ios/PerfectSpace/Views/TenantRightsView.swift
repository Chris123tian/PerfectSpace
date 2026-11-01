import SwiftUI

struct TenantRightsView: View {
    @State private var expandedSection: String? = "rights"

    let sections: [(id: String, title: String, icon: String, iconColor: Color, content: String)] = [
        ("rights", "Your Rights as a Tenant", "shield.fill", Theme.primary, "As a tenant, you have several fundamental rights:\n\n• Right to a habitable dwelling\n• Right to privacy — 24-48 hours notice required\n• Right to security deposit return within 30 days\n• Right against discrimination\n• Right to a written lease\n\nAlways request a written lease agreement."),
        ("agreements", "Understanding Rental Agreements", "doc.text.fill", Theme.categoryApartment, "Key elements of a rental agreement:\n\n• Lease Term — duration of the rental\n• Rent Amount & Due Date\n• Security Deposit — amount and conditions\n• Maintenance Responsibilities\n• Rules & Restrictions\n• Termination Clause\n\nAlways read the entire agreement before signing."),
        ("disputes", "Handling Disputes", "scale.fill", Theme.accent, "Steps to resolve disputes:\n\n1. Document Everything\n2. Communicate in Writing\n3. Know Your Local Laws\n4. Seek Mediation\n5. Contact Housing Authority\n6. Legal Action as last resort"),
        ("maintenance", "Maintenance & Repairs", "house.fill", Theme.success, "Landlord is responsible for:\n• Structural repairs\n• Plumbing and electrical\n• Heating and cooling\n• Pest control (pre-existing)\n• Appliances provided\n\nYou are responsible for:\n• Keeping the unit clean\n• Minor repairs from negligence\n• Reporting issues promptly"),
        ("eviction", "Eviction Protection", "exclamationmark.triangle.fill", Theme.error, "Know your eviction rights:\n\n• Proper Notice required (3-30 days)\n• Valid Reasons needed\n• Court Process mandatory\n• Right to Respond\n• Self-help evictions are illegal\n\nIf you receive an eviction notice, seek legal counsel."),
        ("emergency", "Emergency Contacts", "phone.fill", Theme.categoryOffice, "Important contacts:\n\n• Emergency Services: 911\n• National Housing Hotline: 1-800-569-4287\n• Legal Aid: 1-800-649-9125\n• Fair Housing: 1-800-669-9777\n• Support: support@perfectspace.com"),
    ]

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                VStack(spacing: 12) {
                    Image(systemName: "shield.fill").font(.system(size: 32)).foregroundStyle(Theme.primary)
                    Text("Know Your Rights").font(.title2).fontWeight(.heavy)
                    Text("Understanding your rights as a tenant is essential for a positive rental experience.")
                        .font(.subheadline).foregroundStyle(Theme.textSecondary)
                        .multilineTextAlignment(.center)
                }
                .padding(24)
                .background(Theme.primaryLight)
                .clipShape(.rect(cornerRadius: 20))
                .padding(.horizontal, 20)

                ForEach(sections, id: \.id) { section in
                    DisclosureGroup(isExpanded: Binding(
                        get: { expandedSection == section.id },
                        set: { expandedSection = $0 ? section.id : nil }
                    )) {
                        Text(section.content)
                            .font(.subheadline).foregroundStyle(Theme.textSecondary)
                            .lineSpacing(6)
                            .padding(.top, 8)
                    } label: {
                        HStack(spacing: 12) {
                            Image(systemName: section.icon)
                                .frame(width: 40, height: 40)
                                .background(Theme.background)
                                .foregroundStyle(section.iconColor)
                                .clipShape(.rect(cornerRadius: 12))
                            Text(section.title).font(.subheadline).fontWeight(.semibold)
                        }
                    }
                    .padding(16)
                    .background(Color.white)
                    .clipShape(.rect(cornerRadius: 16))
                    .padding(.horizontal, 20)
                }

                Text("This guide provides general information only and is not legal advice. Laws vary by jurisdiction.")
                    .font(.caption).foregroundStyle(Theme.warning)
                    .multilineTextAlignment(.center)
                    .padding(16)
                    .background(Theme.warning.opacity(0.12))
                    .clipShape(.rect(cornerRadius: 14))
                    .padding(.horizontal, 20)

                Spacer().frame(height: 30)
            }
            .padding(.vertical, 16)
        }
        .background(Theme.background)
        .navigationTitle("Tenant Rights Guide")
        .navigationBarTitleDisplayMode(.inline)
    }
}

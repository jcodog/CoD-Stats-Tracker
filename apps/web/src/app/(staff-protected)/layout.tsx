import { ApplicationProviders } from "@/components/providers/ApplicationProviders"
export default function StaffProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ApplicationProviders>{children}</ApplicationProviders>
}

import './globals.css'

// export const metadata: Metadata = {
//   title: 'FraudShield SDK Tester',
//   description: 'Test the FraudShield SDK functionality',
// }

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <header className="bg-slate-800 text-white p-4">
          <h1 className="text-xl font-bold">FraudShield SDK Test UI</h1>
        </header>
        <main className="p-4">
          {children}
        </main>
      </body>
    </html>
  )
} 
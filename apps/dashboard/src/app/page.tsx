export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="max-w-5xl w-full text-center">
        <h1 className="text-6xl font-bold mb-6">
          Welcome to Pravado
        </h1>
        <p className="text-xl text-muted-foreground mb-8">
          AI-powered PR, content, and SEO orchestration platform
        </p>
        <div className="flex gap-4 justify-center">
          <a
            href="/dashboard"
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition"
          >
            Go to Dashboard
          </a>
          <a
            href="/auth/login"
            className="px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-medium hover:opacity-90 transition"
          >
            Sign In
          </a>
        </div>
      </div>
    </main>
  );
}

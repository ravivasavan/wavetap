export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="text-sm font-medium tracking-widest text-[#A8A49A] uppercase">WaveTap</p>
      <h1 className="text-5xl font-semibold text-[#1A1916] sm:text-6xl">Wave. Tap. Book.</h1>
      <p className="max-w-md text-lg text-[#5C5850]">
        A neutral, peer-to-peer way to connect with Auslan interpreters. No agencies, no
        middlemen — just match, then hand off.
      </p>
      <a
        href="/login"
        className="rounded-xl bg-[#E8694A] px-6 py-3 text-base font-medium text-white transition-colors hover:bg-[#C9523A]"
      >
        Get started
      </a>
      <p className="text-sm text-[#A8A49A]">Australia · Auslan</p>
    </main>
  );
}

import { Apple, CircleDot, Leaf, Lock, Mail, Recycle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const navigate = useNavigate();

  const handleLogin = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    localStorage.setItem('token', 'demo-token');
    navigate('/');
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 py-10">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl lg:grid-cols-2">
        <section className="relative hidden min-h-[700px] overflow-hidden bg-gradient-to-br from-green-900 via-green-700 to-slate-600 p-10 text-white lg:block">
          <div className="absolute inset-0 bg-black/20" />
          <img
            src="https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=1200"
            alt="Green movement"
            className="absolute inset-0 h-full w-full object-cover opacity-25"
          />

          <div className="relative z-10 flex h-full flex-col justify-end">
            <div className="mb-6 inline-flex items-center gap-2 text-2xl font-bold">
              <span className="rounded-lg bg-green-300/20 p-2">
                <Leaf size={20} />
              </span>
              <span>The Living Lens</span>
            </div>
            <h1 className="max-w-sm text-6xl font-black leading-[1.05] tracking-tight">
              Join the Green Movement
            </h1>
            <p className="mt-6 max-w-md text-lg text-green-100">
              Use AI precision to transform how you recycle. Your journey towards a sustainable future starts with a single scan.
            </p>
          </div>
        </section>

        <section className="p-8 sm:p-12">
          <div className="mx-auto max-w-md">
            <h2 className="text-4xl font-extrabold tracking-tight text-zinc-900">Welcome Back</h2>
            <p className="mt-2 text-zinc-500">Enter your details to access your eco-dashboard.</p>

            <div className="mt-8 grid grid-cols-2 gap-3">
              <button className="inline-flex items-center justify-center gap-2 rounded-full border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">
                <CircleDot size={14} />
                Google
              </button>
              <button className="inline-flex items-center justify-center gap-2 rounded-full border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">
                <Apple size={14} />
                Apple
              </button>
            </div>

            <div className="my-8 flex items-center gap-4 text-xs font-bold tracking-wider text-zinc-400">
              <span className="h-px flex-1 bg-zinc-200" />
              <span>OR CONTINUE WITH</span>
              <span className="h-px flex-1 bg-zinc-200" />
            </div>

            <form className="space-y-5" onSubmit={handleLogin}>
              <div>
                <label className="mb-2 block text-sm font-semibold text-zinc-700">Email Address</label>
                <div className="flex items-center rounded-xl bg-zinc-100 px-4 py-3">
                  <input
                    type="email"
                    defaultValue="hello@livinglens.ai"
                    className="w-full bg-transparent text-sm text-zinc-700 outline-none"
                    required
                  />
                  <Mail size={16} className="text-zinc-400" />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-sm font-semibold text-zinc-700">Password</label>
                  <button type="button" className="text-xs font-bold text-green-700 hover:underline">
                    Forgot?
                  </button>
                </div>
                <div className="flex items-center rounded-xl bg-zinc-100 px-4 py-3">
                  <input
                    type="password"
                    defaultValue="password"
                    className="w-full bg-transparent text-sm text-zinc-700 outline-none"
                    required
                  />
                  <Lock size={16} className="text-zinc-400" />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-zinc-600">
                <input type="checkbox" className="h-4 w-4 rounded border-zinc-300" />
                Remember this device
              </label>

              <button
                type="submit"
                className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-green-700 px-6 py-4 text-base font-bold text-white shadow-lg shadow-green-900/20 transition hover:bg-green-800"
              >
                Sign In to Lens
              </button>
            </form>

            <p className="mt-10 text-center text-sm text-zinc-500">
              New to the lens?{' '}
              <Link to="/signup" className="font-bold text-green-700 hover:underline">
                Sign Up
              </Link>
            </p>

            <div className="mt-8 flex items-center justify-center gap-6 text-zinc-300">
              <Leaf size={14} />
              <Recycle size={14} />
              <CircleDot size={14} />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

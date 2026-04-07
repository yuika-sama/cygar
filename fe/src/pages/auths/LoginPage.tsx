
import { CircleDot, Leaf, Lock, Mail, Recycle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import baseApi from '../../services/baseApi';


export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await baseApi.post('/auth/login', {
        email,
        password
      });

      const accessToken = response.data?.access_token as string | undefined;
      if (!accessToken) {
        throw new Error('Phản hồi đăng nhập không hợp lệ');
      }

      localStorage.setItem('token', accessToken);
      localStorage.setItem('accessToken', accessToken);
      navigate('/');
    } catch (err: any) {
      const message = err?.response?.data?.detail || err?.message || 'Đăng nhập thất bại';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl lg:grid-cols-2">
        <section className="relative hidden min-h-[700px] overflow-hidden bg-gradient-to-br from-emerald-950 via-green-800 to-cyan-700 p-10 text-white lg:block">
          <div className="absolute inset-0 bg-black/20" />
          <img
            src="https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=1200"
            alt="Hành trình xanh"
            className="absolute inset-0 h-full w-full object-cover opacity-25"
          />

          <div className="relative z-10 flex h-full flex-col justify-end">
            <div className="mb-6 inline-flex items-center gap-2 text-2xl font-bold">
              <span className="rounded-lg bg-green-300/20 p-2">
                <Leaf size={20} />
              </span>
              <span>CyGar</span>
            </div>
            <h1 className="max-w-sm text-6xl font-black leading-[1.05] tracking-tight">
              Tinh gọn thói quen tái chế mỗi ngày
            </h1>
            <p className="mt-6 max-w-md text-lg text-green-100">
              Chụp ảnh vật liệu, để AI nhận diện và gợi ý tái chế thực tế. Bắt đầu hành trình sống xanh chỉ với một lần quét.
            </p>
          </div>
        </section>

        <section className="p-8 sm:p-12">
          <div className="mx-auto max-w-md">
            <h2 className="text-4xl font-extrabold tracking-tight text-zinc-900">Chào mừng trở lại</h2>
            <p className="mt-2 text-zinc-500">Đăng nhập để tiếp tục sử dụng CyGar.</p>

            <div className="my-8 flex items-center gap-4 text-xs font-bold tracking-wider text-zinc-400">
              <span className="h-px flex-1 bg-zinc-200" />
            </div>


            <form className="space-y-5" onSubmit={handleLogin}>
              <div>
                <label className="mb-2 block text-sm font-semibold text-zinc-700">Địa chỉ email</label>
                <div className="flex items-center rounded-xl bg-zinc-100 px-4 py-3">
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-transparent text-sm text-zinc-700 outline-none"
                    required
                  />
                  <Mail size={16} className="text-zinc-400" />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-sm font-semibold text-zinc-700">Mật khẩu</label>
                </div>
                <div className="flex items-center rounded-xl bg-zinc-100 px-4 py-3">
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-transparent text-sm text-zinc-700 outline-none"
                    required
                  />
                  <Lock size={16} className="text-zinc-400" />
                </div>
              </div>

              {error && <div className="text-red-600 text-sm font-semibold">{error}</div>}

              <button
                type="submit"
                className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-green-700 px-6 py-4 text-base font-bold text-white shadow-lg shadow-green-900/20 transition hover:bg-green-800 disabled:opacity-60"
                disabled={loading}
              >
                {loading ? 'Đang đăng nhập...' : 'Đăng nhập vào CyGar'}
              </button>
            </form>

            <p className="mt-10 text-center text-sm text-zinc-500">
              Chưa có tài khoản?{' '}
              <Link to="https://fb.com/yonni1412" className="font-bold text-green-700 hover:underline">
                Liên hệ quản trị viên
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

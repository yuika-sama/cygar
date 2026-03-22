interface LoginPageProps {
  onLogin: () => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  return (
    <div className="h-screen flex items-center justify-center bg-green-600">
      <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md">
        <h1 className="text-3xl font-bold text-slate-800 mb-2 text-center">Chào mừng trở lại!</h1>
        <p className="text-slate-500 text-center mb-8">Hãy cùng nhau bảo vệ môi trường</p>
        <input className="w-full border p-4 rounded-xl mb-4" placeholder="Email" />
        <input className="w-full border p-4 rounded-xl mb-6" type="password" placeholder="Mật khẩu" />
        <button onClick={onLogin} className="w-full bg-green-600 text-white p-4 rounded-xl font-bold hover:bg-green-700">
          Đăng nhập
        </button>
      </div>
    </div>
  );
}

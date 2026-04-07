export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white px-8 py-10 text-xs text-slate-500 md:ml-64">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 md:flex-row">
        <div className="text-center md:text-left">
          <p className="font-bold text-slate-800">CyGar</p>
          <p className="mt-1">© 2026 CyGar. Trợ lý nhận diện và tái chế thông minh.</p>
        </div>
        <div className="flex gap-6">
          <a href="https://fb.com/yonni1412" className="transition hover:text-green-700">
            Chính sách bảo mật
          </a>
          <a href="https://fb.com/yonni1412" className="transition hover:text-green-700">
            Điều khoản sử dụng
          </a>
          <a href="https://fb.com/yonni1412" className="transition hover:text-green-700">
            Báo cáo tác động
          </a>
        </div>
      </div>
    </footer>
  );
}

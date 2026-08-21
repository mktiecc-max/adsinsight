"use client";
import { env } from "@/lib/config/env";

import Link from "next/link";
import { ArrowRight, BarChart3, Check, Mail, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Nhập một địa chỉ email hợp lệ.");
      return;
    }
    const url = env.SUPABASE_URL;
    const key = env.SUPABASE_ANON_KEY;
    if (url && key) {
      const supabase = createBrowserClient(url, key);
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (authError) {
        setError(authError.message);
        return;
      }
    }
    setSent(true);
  };

  return (
    <main className="login-page">
      <section className="login-brand-panel">
        <div className="login-logo"><span>A</span> AdsInsight</div>
        <div className="login-message">
          <div className="eyebrow">Quyết định từ dữ liệu thật</div>
          <h1>Số rẻ chưa chắc là số tốt.</h1>
          <p>
            Nhìn xuyên từ chi tiêu, tin nhắn, SĐT đến chất lượng từng bậc — để biết chính xác ngân sách nên đi đâu.
          </p>
          <div className="login-feature">
            <BarChart3 size={17} />
            <div><strong>Hai trục độc lập</strong><span>Giá mỗi SĐT và chất lượng sau khi có số</span></div>
          </div>
          <div className="login-feature">
            <ShieldCheck size={17} />
            <div><strong>Số liệu deterministic</strong><span>Code tính, AI chỉ diễn giải</span></div>
          </div>
        </div>
        <small>Webapp nội bộ · Asia/Ho_Chi_Minh · VND</small>
      </section>

      <section className="login-form-panel">
        <div className="login-form-card">
          {sent ? (
            <div className="login-sent">
              <span><Check size={20} /></span>
              <h2>Kiểm tra hộp thư</h2>
              <p>Đường dẫn đăng nhập đã được gửi tới <b>{email}</b>.</p>
              <button className="button" onClick={() => setSent(false)}>Dùng email khác</button>
              <Link href="/" className="demo-link">Tiếp tục vào bản demo <ArrowRight size={13} /></Link>
            </div>
          ) : (
            <>
              <div className="eyebrow">Đăng nhập</div>
              <h2>Chào mừng trở lại</h2>
              <p>Nhập email công việc. Bạn sẽ nhận một đường dẫn đăng nhập không cần mật khẩu.</p>
              <form onSubmit={submit}>
                <label>
                  <span>Email</span>
                  <div><Mail size={15} /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ten@congty.vn" autoFocus /></div>
                </label>
                {error ? <div className="login-error">{error}</div> : null}
                <button className="button button-primary" type="submit">
                  Gửi magic link <ArrowRight size={14} />
                </button>
              </form>
              {!env.SUPABASE_URL ? (
                <div className="demo-notice">
                  Đang chạy chế độ demo. Magic link sẽ được mô phỏng vì chưa có biến môi trường Supabase.
                </div>
              ) : null}
              <Link href="/" className="demo-link">Vào thẳng bản demo <ArrowRight size={13} /></Link>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

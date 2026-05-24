import { useState, type FormEvent } from "react";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginWithCredentials } from "@/lib/auth";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await loginWithCredentials(email.trim(), password);
    } catch (err) {
      const message = err instanceof Error ? err.message : "تعذر تسجيل الدخول.";
      setError(message);
      setSubmitting(false);
    }
  }

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans text-right">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-lg border border-border/60 p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2.5 rounded-lg text-primary text-3xl flex items-center justify-center w-12 h-12 font-bold select-none">
            ERP
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              نظام <span className="text-primary">الإدارة الداخلي</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">تسجيل الدخول للوصول إلى نظامك</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">البريد الإلكتروني</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              autoComplete="email"
              required
              disabled={submitting}
              dir="ltr"
              className="text-right"
              data-testid="input-email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">كلمة المرور</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              disabled={submitting}
              dir="ltr"
              className="text-right"
              data-testid="input-password"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 text-destructive text-sm px-3 py-2 border border-destructive/20">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={submitting || !email || !password}
            data-testid="button-login"
          >
            <LogIn className="w-4 h-4 ml-2" />
            {submitting ? "جارٍ الدخول..." : "تسجيل الدخول"}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center">
          الوصول مقصور على فريق المؤسسة المرخّص.
        </p>
      </div>
    </div>
  );
}

export default Login;

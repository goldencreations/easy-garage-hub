import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function Login() {
  const { user, isLoading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        <p className="text-sm">Loading…</p>
      </div>
    );
  }

  if (user) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const result = await login(email, password);
      if (result.ok) {
        toast.success("Signed in");
        navigate(from, { replace: true });
      } else {
        toast.error(result.error ?? "Could not sign in");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted/40 p-4">
      <div className="mb-8 flex items-center gap-3">
        <img src="/aziziumemelogo.png" alt="AZIZI AUTOMOTIVE GARAGE logo" className="h-12 w-12 rounded-xl bg-white object-contain p-1 shadow-glow" />
        <div>
          <p className="text-lg font-bold">AZIZI AUTOMOTIVE GARAGE</p>
        </div>
      </div>

      <Card className="w-full max-w-md border-border/80 shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl">Sign in</CardTitle>
          <CardDescription>Use your workshop account email and password.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="you@garage.co.tz"
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                disabled={submitting}
              />
            </div>
            <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground" disabled={submitting}>
              <LogIn className="mr-2 h-4 w-4" />
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <Button
            type="button"
            variant="link"
            className="mt-2 h-auto px-0 text-sm"
            onClick={() => navigate("/forgot-password")}
            disabled={submitting}
          >
            Forgot password?
          </Button>
        </CardContent>
      </Card>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Need access? Ask your workshop administrator.
      </p>
    </div>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { forgotPasswordRequest } from "@/lib/api";
import { toast } from "sonner";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Enter your email.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await forgotPasswordRequest(email.trim().toLowerCase());
      toast.success(response.message);
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send reset link.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/40 p-4">
      <Card className="w-full max-w-md border-border/80 shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Forgot password</CardTitle>
          <CardDescription>Enter your account email and we will send a reset link.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email</Label>
              <Input
                id="forgot-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                disabled={submitting}
              />
            </div>

            <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground" disabled={submitting}>
              <Mail className="mr-2 h-4 w-4" />
              {submitting ? "Sending…" : "Send reset link"}
            </Button>
          </form>

          <Button
            type="button"
            variant="link"
            className="mt-2 h-auto px-0 text-sm"
            onClick={() => navigate("/login")}
            disabled={submitting}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to sign in
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

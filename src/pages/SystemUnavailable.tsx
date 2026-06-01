import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SystemUnavailable() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-background via-background to-muted/50 p-6">
      <div
        className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 right-0 h-64 w-64 translate-x-1/4 translate-y-1/4 rounded-full bg-primary/5 blur-3xl"
        aria-hidden
      />

      <div className="relative z-10 mb-10 flex items-center gap-3">
        <img
          src="/aziziumemelogo.png"
          alt="AZIZI AUTOMOTIVE GARAGE logo"
          className="h-14 w-14 rounded-xl bg-white object-contain p-1 shadow-glow"
        />
        <div>
          <p className="text-lg font-bold tracking-tight">AZIZI AUTOMOTIVE GARAGE</p>
          <p className="text-sm text-muted-foreground">Workshop management</p>
        </div>
      </div>

      <Card className="relative z-10 w-full max-w-lg border-border/80 shadow-lg">
        <CardHeader className="space-y-4 pb-2 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-warning/15 text-warning">
            <AlertTriangle className="h-8 w-8" strokeWidth={1.75} aria-hidden />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl font-bold tracking-tight">Oops!</CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              The system is temporarily unavailable.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pb-8 text-center">
          <p className="text-sm leading-relaxed text-muted-foreground">
            We&apos;re unable to serve your request right now. Please check back soon or contact your
            administrator if you need immediate assistance.
          </p>
          <div className="mx-auto h-1 w-16 rounded-full bg-gradient-to-r from-transparent via-primary to-transparent opacity-60" />
        </CardContent>
      </Card>
    </div>
  );
}

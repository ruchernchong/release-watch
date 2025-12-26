"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { signIn } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const handleGitHubSignIn = () => {
    signIn.social({ provider: "github", callbackURL: "/dashboard" });
  };

  const handleGoogleSignIn = () => {
    signIn.social({ provider: "google", callbackURL: "/dashboard" });
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Welcome back</CardTitle>
          <CardDescription>
            Sign in with your GitHub or Google account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {/* TODO: Add GitHub and Google icons */}
            <Button variant="outline" onClick={handleGitHubSignIn}>
              Continue with GitHub
            </Button>
            <Button variant="outline" onClick={handleGoogleSignIn}>
              Continue with Google
            </Button>
          </div>
        </CardContent>
      </Card>
      <p className="text-muted-foreground px-6 text-center text-sm">
        By continuing, you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  );
}

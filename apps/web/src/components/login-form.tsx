import { Card, cn, Typography } from "@heroui/react";
import { LoginButtons } from "@web/components/login-buttons";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <Card.Header>
          <Card.Title>Welcome back</Card.Title>
          <Card.Description>
            Sign in with your GitHub or Google account
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <LoginButtons />
        </Card.Content>
      </Card>
      <Typography type="body-sm" color="muted">
        By continuing, you agree to our Terms of Service and Privacy Policy.
      </Typography>
    </div>
  );
}

"use client";

import {
  Avatar,
  Button,
  Card,
  Description,
  InputGroup,
  Label,
  Separator,
  Switch,
  TextField,
  Typography,
} from "@heroui/react";
import { ItemCard, ItemCardGroup } from "@heroui-pro/react";
import { SubscriptionSection } from "@web/components/settings/subscription-section";
import { useSession } from "@web/lib/auth-client";
import { Bell, Download, Shield, Trash2, User, Zap } from "lucide-react";
import { useState } from "react";

function SettingRow({
  icon: Icon,
  label,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <ItemCard variant="transparent" className="px-0 py-4">
      <ItemCard.Icon>
        <Icon className="size-4" />
      </ItemCard.Icon>
      <ItemCard.Content>
        <ItemCard.Title>{label}</ItemCard.Title>
        <ItemCard.Description>{description}</ItemCard.Description>
      </ItemCard.Content>
      <ItemCard.Action>{children}</ItemCard.Action>
    </ItemCard>
  );
}

export function SettingsSection() {
  const { data: session } = useSession();
  const user = session?.user;

  const [releaseNotifications, setReleaseNotifications] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [aiSummaries, setAiSummaries] = useState(true);

  return (
    <div className="flex w-full max-w-5xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Typography type="h1">Settings</Typography>
        <Typography color="muted">
          Manage your account preferences and notification settings.
        </Typography>
      </div>

      <div className="flex flex-col gap-8">
        {/* Profile Section */}
        <Card>
          <Card.Header className="items-start gap-4">
            <Avatar>
              <Avatar.Fallback>
                <User className="size-5" />
              </Avatar.Fallback>
            </Avatar>
            <div className="flex flex-col gap-2">
              <Card.Title>Profile</Card.Title>
              <Card.Description>
                Your personal information and account details.
              </Card.Description>
            </div>
          </Card.Header>
          <Card.Content className="gap-6">
            <div className="grid gap-6 md:grid-cols-[180px_1fr] md:items-start md:gap-8">
              <div className="flex flex-col items-start gap-4 sm:flex-row md:flex-col md:items-center">
                <Avatar size="lg">
                  {user?.image && (
                    <Avatar.Image src={user.image} alt={user.name ?? ""} />
                  )}
                  <Avatar.Fallback>
                    {user?.name?.charAt(0).toUpperCase() ?? "U"}
                  </Avatar.Fallback>
                </Avatar>
                <Button variant="outline" size="sm">
                  Change photo
                </Button>
              </div>
              <div className="flex flex-1 flex-col gap-4">
                <TextField defaultValue={user?.name ?? ""}>
                  <Label>Display name</Label>
                  <InputGroup>
                    <InputGroup.Input placeholder="Your name" />
                  </InputGroup>
                </TextField>
                <TextField
                  defaultValue={user?.email ?? ""}
                  isDisabled
                  type="email"
                >
                  <Label>Email address</Label>
                  <InputGroup>
                    <InputGroup.Input />
                  </InputGroup>
                  <Description>
                    Email cannot be changed. Contact support for assistance.
                  </Description>
                </TextField>
              </div>
            </div>
            <div className="flex justify-end">
              <Button>Save changes</Button>
            </div>
          </Card.Content>
        </Card>

        {/* Subscription Section */}
        <SubscriptionSection />

        {/* Notifications Section */}
        <Card>
          <Card.Header className="items-start gap-4">
            <Avatar>
              <Avatar.Fallback>
                <Bell className="size-5" />
              </Avatar.Fallback>
            </Avatar>
            <div className="flex flex-col gap-2">
              <Card.Title>Notifications</Card.Title>
              <Card.Description>
                Configure how and when you receive updates.
              </Card.Description>
            </div>
          </Card.Header>
          <Card.Content>
            <ItemCardGroup variant="transparent">
              <SettingRow
                icon={Zap}
                label="Release notifications"
                description="Get notified immediately when a watched repo publishes a new release."
              >
                <Switch
                  aria-label="Release notifications"
                  isSelected={releaseNotifications}
                  onChange={setReleaseNotifications}
                >
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch>
              </SettingRow>
              <Separator />
              <SettingRow
                icon={Bell}
                label="Weekly digest"
                description="Receive a weekly summary of all releases from your watched repos."
              >
                <Switch
                  aria-label="Weekly digest"
                  isSelected={weeklyDigest}
                  onChange={setWeeklyDigest}
                >
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch>
              </SettingRow>
              <Separator />
              <SettingRow
                icon={Zap}
                label="AI summaries"
                description="Include AI-generated summaries in release notifications."
              >
                <Switch
                  aria-label="AI summaries"
                  isSelected={aiSummaries}
                  onChange={setAiSummaries}
                >
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch>
              </SettingRow>
            </ItemCardGroup>
          </Card.Content>
        </Card>

        {/* Data & Privacy Section */}
        <Card>
          <Card.Header className="items-start gap-4">
            <Avatar>
              <Avatar.Fallback>
                <Shield className="size-5" />
              </Avatar.Fallback>
            </Avatar>
            <div className="flex flex-col gap-2">
              <Card.Title>Data & Privacy</Card.Title>
              <Card.Description>
                Manage your data and privacy preferences.
              </Card.Description>
            </div>
          </Card.Header>
          <Card.Content className="gap-6">
            <ItemCardGroup variant="transparent">
              <ItemCard variant="transparent" className="px-0">
                <ItemCard.Icon>
                  <Download className="size-4" />
                </ItemCard.Icon>
                <ItemCard.Content>
                  <ItemCard.Title>Export your data</ItemCard.Title>
                  <ItemCard.Description>
                    Download a copy of your subscriptions and notification
                    history.
                  </ItemCard.Description>
                </ItemCard.Content>
                <ItemCard.Action>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    Export
                  </Button>
                </ItemCard.Action>
              </ItemCard>
            </ItemCardGroup>

            <Separator />

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Typography type="h6">Danger zone</Typography>
                <Typography type="body-sm" color="muted">
                  Irreversible actions that affect your account.
                </Typography>
              </div>
              <ItemCard
                variant="outline"
                className="border-danger/30 bg-danger/5"
              >
                <ItemCard.Icon>
                  <Trash2 className="size-4 text-danger" />
                </ItemCard.Icon>
                <ItemCard.Content>
                  <ItemCard.Title>Delete account</ItemCard.Title>
                  <ItemCard.Description>
                    Permanently delete your account and all associated data.
                    This action cannot be undone.
                  </ItemCard.Description>
                </ItemCard.Content>
                <ItemCard.Action>
                  <Button
                    variant="danger-soft"
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    Delete
                  </Button>
                </ItemCard.Action>
              </ItemCard>
            </div>
          </Card.Content>
        </Card>
      </div>
    </div>
  );
}

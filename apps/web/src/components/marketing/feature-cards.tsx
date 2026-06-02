"use client";

import { ItemCard, ItemCardGroup } from "@heroui-pro/react";
import { Bell, Github, MessageCircle, Webhook } from "lucide-react";
import { Reveal } from "./reveal";

const features = [
  {
    icon: Github,
    title: "GitHub Integration",
    description: "Monitor any public GitHub repository for new releases.",
  },
  {
    icon: Bell,
    title: "Instant Notifications",
    description: "Get notified via Telegram, Discord, or webhooks.",
  },
  {
    icon: MessageCircle,
    title: "AI Summaries",
    description: "Receive concise AI-generated summaries of release notes.",
  },
  {
    icon: Webhook,
    title: "Multi-Channel",
    description: "Connect multiple notification channels to your account.",
  },
];

export function FeatureCards() {
  return (
    <ItemCardGroup layout="grid" columns={2}>
      {features.map((feature, index) => (
        <Reveal key={feature.title} delay={index * 0.08}>
          <ItemCard className="h-full transition-transform hover:-translate-y-1">
            <ItemCard.Icon>
              <feature.icon className="size-5" />
            </ItemCard.Icon>
            <ItemCard.Content>
              <ItemCard.Title>{feature.title}</ItemCard.Title>
              <ItemCard.Description>{feature.description}</ItemCard.Description>
            </ItemCard.Content>
          </ItemCard>
        </Reveal>
      ))}
    </ItemCardGroup>
  );
}

"use client";

import {
  ExternalLink,
  GitFork,
  MoreHorizontal,
  Star,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Repo {
  id: string;
  name: string;
  owner: string;
  description: string;
  stars: number;
  forks: number;
  latestRelease: string | null;
  lastChecked: string;
  language: string;
}

const MOCK_REPOS: Repo[] = [
  {
    id: "1",
    name: "react",
    owner: "facebook",
    description: "The library for web and native user interfaces.",
    stars: 231000,
    forks: 47200,
    latestRelease: "v19.0.0",
    lastChecked: "2 hours ago",
    language: "JavaScript",
  },
  {
    id: "2",
    name: "next.js",
    owner: "vercel",
    description: "The React Framework for the Web.",
    stars: 128000,
    forks: 27400,
    latestRelease: "v15.1.0",
    lastChecked: "1 hour ago",
    language: "TypeScript",
  },
  {
    id: "3",
    name: "typescript",
    owner: "microsoft",
    description:
      "TypeScript is a superset of JavaScript that compiles to clean JavaScript output.",
    stars: 102000,
    forks: 12500,
    latestRelease: "v5.7.2",
    lastChecked: "30 minutes ago",
    language: "TypeScript",
  },
  {
    id: "4",
    name: "tailwindcss",
    owner: "tailwindlabs",
    description: "A utility-first CSS framework for rapid UI development.",
    stars: 84000,
    forks: 4200,
    latestRelease: "v4.0.0",
    lastChecked: "45 minutes ago",
    language: "CSS",
  },
  {
    id: "5",
    name: "bun",
    owner: "oven-sh",
    description:
      "Incredibly fast JavaScript runtime, bundler, test runner, and package manager.",
    stars: 75000,
    forks: 2800,
    latestRelease: "v1.1.42",
    lastChecked: "15 minutes ago",
    language: "Zig",
  },
];

function formatNumber(num: number): string {
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`;
  }
  return num.toString();
}

function getLanguageColor(language: string): string {
  const colors: Record<string, string> = {
    JavaScript: "bg-yellow-400",
    TypeScript: "bg-blue-500",
    CSS: "bg-purple-500",
    Zig: "bg-orange-500",
  };
  return colors[language] || "bg-gray-400";
}

export function ReposTable() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Repository</TableHead>
          <TableHead>Latest Release</TableHead>
          <TableHead className="text-right">Stars</TableHead>
          <TableHead className="text-right">Forks</TableHead>
          <TableHead>Last Checked</TableHead>
          <TableHead className="w-[50px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {MOCK_REPOS.map((repo) => (
          <TableRow key={repo.id}>
            <TableCell>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <a
                    href={`https://github.com/${repo.owner}/${repo.name}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium hover:underline"
                  >
                    {repo.owner}/{repo.name}
                  </a>
                  <ExternalLink className="size-3 text-muted-foreground" />
                </div>
                <p className="max-w-md truncate text-muted-foreground text-xs">
                  {repo.description}
                </p>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`size-2.5 rounded-full ${getLanguageColor(repo.language)}`}
                  />
                  <span className="text-muted-foreground text-xs">
                    {repo.language}
                  </span>
                </div>
              </div>
            </TableCell>
            <TableCell>
              {repo.latestRelease ? (
                <Badge variant="secondary">{repo.latestRelease}</Badge>
              ) : (
                <span className="text-muted-foreground text-sm">—</span>
              )}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-1">
                <Star className="size-3.5 text-muted-foreground" />
                <span>{formatNumber(repo.stars)}</span>
              </div>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-1">
                <GitFork className="size-3.5 text-muted-foreground" />
                <span>{formatNumber(repo.forks)}</span>
              </div>
            </TableCell>
            <TableCell>
              <span className="text-muted-foreground text-sm">
                {repo.lastChecked}
              </span>
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm">
                    <MoreHorizontal className="size-4" />
                    <span className="sr-only">Actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() =>
                      window.open(
                        `https://github.com/${repo.owner}/${repo.name}`,
                        "_blank",
                      )
                    }
                  >
                    <ExternalLink className="size-4" />
                    View on GitHub
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive">
                    <Trash2 className="size-4" />
                    Remove
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

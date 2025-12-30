import type { GitHubRepoResponse } from "@/lib/github";

const REPO_OWNER = "ruchernchong";
const REPO_NAME = "release-watch";
const STAR_THRESHOLD = 50;

async function getGitHubStars(): Promise<number | null> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
        },
        next: { revalidate: 3600 },
      },
    );

    if (!response.ok) {
      return null;
    }

    const data: GitHubRepoResponse = await response.json();
    return data.stargazers_count;
  } catch {
    return null;
  }
}

function formatStarCount(count: number): string {
  return Intl.NumberFormat("en", {
    notation: "compact",
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(count);
}

export async function GitHubStars() {
  const stars = await getGitHubStars();

  if (stars === null || stars < STAR_THRESHOLD) {
    return null;
  }

  return (
    <a
      href={`https://github.com/${REPO_OWNER}/${REPO_NAME}`}
      className="flex h-8 items-center border border-border text-muted-foreground text-sm leading-[30px]"
      target="_blank"
      rel="noopener noreferrer"
    >
      <div className="flex items-center gap-2 border-border border-r bg-muted/50 px-3">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={16}
          height={14}
          fill="none"
          aria-hidden="true"
        >
          <path
            className="fill-muted-foreground"
            d="M5.667 10.372 8 8.943l2.333 1.447-.611-2.71 2.056-1.805-2.703-.245L8 3.057l-1.075 2.54-2.703.246 2.056 1.838-.611 2.69Zm-2.24 3.142 1.203-5.285L.444 4.857l5.334-.47L8 0l2.222 4.387 5.334.47-4.186 3.372 1.203 5.285L8 10.486l-4.573 3.028Z"
          />
        </svg>
        <span className="font-medium">Star</span>
      </div>
      <div className="px-3">{formatStarCount(stars)}</div>
    </a>
  );
}

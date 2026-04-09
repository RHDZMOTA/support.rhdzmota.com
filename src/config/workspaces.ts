// Static workspace configuration
// Add new workspaces here. Each workspace has a slug, display name,
// and an allowlist of emails or domain wildcards (e.g. "*@rhdzmota.com").

export interface WorkspaceConfig {
  slug: string;
  name: string;
  is_active: boolean;
  allowlist: string[]; // exact emails or "*@domain.com" wildcards
}

export const WORKSPACES: WorkspaceConfig[] = [
  {
    slug: "rhdzmota",
    name: "RHDZMOTA",
		is_active: true,
    allowlist: [
			"*@rhdzmota.com",
		],
  },
	{
    slug: "fahera",
    name: "FAHERA",
		is_active: true,
    allowlist: [
			"*@rhdzmota.com",
			"*@fahera.mx",
		],
  },
	{
    slug: "hergoluz",
    name: "HERGOLUZ",
		is_active: true,
    allowlist: [
			"*@rhdzmota.com",
			"*@hergoluz.mx",
		],
  },
	{
    slug: "clip",
    name: "CLIP",
		is_active: false,
    allowlist: [
			"*@rhdzmota.com",
			"*@clip.mx",
			"*@payclip.com",
		],
  },
	{
    slug: "nike",
    name: "NIKE",
		is_active: false,
    allowlist: [
			"*@rhdzmota.com",
			"*@nike.com",
		],
  },
	{
    slug: "wizeline",
    name: "WIZELINE",
		is_active: false,
    allowlist: [
			"*@rhdzmota.com",
			"*@wizeline.com",
		],
  },
	{
    slug: "kueski",
    name: "KUESKI",
		is_active: true,
    allowlist: [
			"*@rhdzmota.com",
			"*@kueski.com",
		],
  },
  // Add client/partner workspaces below:
  // {
  //   slug: "acme",
  //   name: "Acme Corp",
  //   allowlist: ["*@acme.com", "contractor@external.com"],
  // },
];

export function getWorkspaceBySlug(slug: string): WorkspaceConfig | undefined {
  return WORKSPACES.find((w) => w.slug === slug);
}

export function emailMatchesAllowlist(email: string, allowlist: string[]): boolean {
  for (const pattern of allowlist) {
    if (pattern === email) return true;
    if (pattern.startsWith("*@")) {
      const domain = pattern.slice(2);
      if (email.endsWith("@" + domain)) return true;
    }
  }
  return false;
}

export function getEligibleWorkspaces(email: string): WorkspaceConfig[] {
  return WORKSPACES.filter((w) => emailMatchesAllowlist(email, w.allowlist));
}

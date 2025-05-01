import { promises as fs } from "node:fs";
import path from "node:path";

export async function getProfileData(count: number) {
	const paddedCount = count.toString().padStart(4, "0");
	const profilePath = path.resolve(__dirname, "./profile.json");

	interface Profile {
		name?: string;
		url?: string;
		description?: string;
		location?: string;
		useRandomDescriptions?: boolean;
		descriptions?: string[];
		includePaddedCountInName?: boolean;
	}
	let profile: Profile = {};

	try {
		const data = await fs.readFile(profilePath, "utf-8");
		profile = JSON.parse(data);
	} catch {
		throw new Error("Config file not found or invalid");
	}

	const useRandomDescriptions = profile.useRandomDescriptions ?? true;
	const descriptions =
		Array.isArray(profile.descriptions) && profile.descriptions.length > 0
			? profile.descriptions
			: ["default description"];

	const description = useRandomDescriptions
		? descriptions[Math.floor(Math.random() * descriptions.length)]
		: profile.description || descriptions[0];
	const includePaddedCount = profile.includePaddedCountInName ?? true;
	const nameBase = profile.name || "default name";
	const name = includePaddedCount ? `${nameBase} #${paddedCount}` : nameBase;

	return {
		name,
		url: profile.url || "https://twitter.com/CustomProfile",
		description: profile.description || description,
		location: profile.location || "default location",
	};
}

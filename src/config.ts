import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

interface TweetConfig {
	text: string;
	image?: string;
}

interface ProfileConfig {
	name?: string;
	url?: string;
	description?: string;
	location?: string;
	useRandomDescriptions?: boolean;
	descriptions?: string[];
	includePaddedCountInName?: boolean;
	tweets?: TweetConfig[];
	retweetIds?: string[];
}

export interface ProfileData {
	name: string;
	url: string;
	location: string;
	description: string;
	profileImageUrl?: string;
	bannerImageUrl?: string;
	tweetText?: string;
	tweetImage?: string;
	retweetIds?: string[];
}

export async function getProfileData(count: number) {
	const paddedCount = count.toString().padStart(4, "0");
	const profilePath = `${process.cwd()}/profile.json`;

	let profile: ProfileConfig = {};

	try {
		const data = await fs.readFile(profilePath, "utf-8");
		profile = JSON.parse(data);
	} catch {
		throw new Error("Config file not found");
	}

	const useRandomDescriptions = profile.useRandomDescriptions ?? false;
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

	const defaultTweet: TweetConfig = {
		text: `Default tweet update #${paddedCount}`,
	};
	const tweets =
		Array.isArray(profile.tweets) && profile.tweets.length > 0
			? profile.tweets
			: [defaultTweet];

	const selectedTweetConfig = tweets[count % tweets.length];

	const tweetText = selectedTweetConfig.text.replace(/\{count\}/g, paddedCount);
	const tweetImage = selectedTweetConfig.image?.replace(
		/\{count\}/g,
		paddedCount,
	);

	return {
		name,
		url: profile.url || "https://twitter.com/CustomProfile",
		description: description || profile.description,
		location: profile.location || "default location",
		tweetText,
		tweetImage: tweetImage || undefined,
		retweetIds: profile.retweetIds || [],
	};
}

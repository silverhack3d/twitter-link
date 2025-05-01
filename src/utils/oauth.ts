/**
 * @license GPL-3.0
 * Copyright (C) 2024-2025 SilverHack3d <silverhack3d@gmail.com>
 */

import { OAuth } from "oauth";

export function getOAuthClient() {
	const errors = [];
	if (!process.env.TWITTER_CLIENT_ID) {
		errors.push("TWITTER_CLIENT_ID");
	}
	if (!process.env.TWITTER_CLIENT_SECRET) {
		errors.push("TWITTER_CLIENT_SECRET");
	}
	if (!process.env.TWITTER_CALLBACK_URL) {
		errors.push("TWITTER_CALLBACK_URL");
	}
	if (errors.length > 0) {
		throw `Missing Twitter environment variables: ${errors.join(", ")}`;
	}

	// Why OAuth 1.0A? It's the only "free" Twitter API available without paying for the premium tiers.
	// This needs to be upgraded to OAuth 2.0, but it only allows you to make 500 posts per month for each app (client_id).
	return new OAuth(
		"https://twitter.com/oauth/request_token",
		"https://twitter.com/oauth/access_token",
		process.env.TWITTER_CLIENT_ID!,
		process.env.TWITTER_CLIENT_SECRET!,
		"1.0A",
		process.env.TWITTER_CALLBACK_URL!,
		"HMAC-SHA1",
	);
}

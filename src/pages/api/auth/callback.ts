/**
 * @license GPL-3.0
 * Copyright (C) 2024-2025 SilverHack3d <silverhack3d@gmail.com>
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { getOAuthClient } from "@/utils/oauth";
import { initializeApp } from "@/lib/init";

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	await initializeApp();

	const { oauth_token, oauth_verifier } = req.query;
	const tempSecret = req.cookies.temp_oauth_secret;

	if (
		!oauth_token ||
		!oauth_verifier ||
		!tempSecret ||
		typeof oauth_token !== "string" ||
		typeof oauth_verifier !== "string"
	) {
		return res.status(400).json({ error: "Invalid OAuth parameters" });
	}

	const oauth = getOAuthClient();

	oauth.getOAuthAccessToken(
		oauth_token,
		tempSecret,
		oauth_verifier,
		async (error, accessToken, accessTokenSecret) => {
			if (error || !accessToken || !accessTokenSecret) {
				console.error("OAuth error:", error);
				return res.status(500).json({ error: "OAuth failed" });
			}

			// Set cookies
			res.setHeader("Set-Cookie", [
				"temp_oauth_secret=; Path=/; HttpOnly; Secure; Max-Age=0;",
				`oauth_token=${accessToken}; Path=/; HttpOnly; Secure; Max-Age=31536000`,
				`oauth_token_secret=${accessTokenSecret}; Path=/; HttpOnly; Secure; Max-Age=31536000`,
			]);

			res.redirect("/profile");
		},
	);
}

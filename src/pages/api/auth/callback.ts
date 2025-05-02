/**
 * @license GPL-3.0
 * Copyright (C) 2024-2025 SilverHack3d <silverhack3d@gmail.com>
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { ApiResponseError, TwitterApi } from "twitter-api-v2";
import { initializeApp } from "@/lib/init";
import {
	storeUserAppAuthorization,
	userExists,
	insertUserProfile,
} from "@/utils/db";

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

	const appKey = process.env.TWITTER_CLIENT_ID;
	const appSecret = process.env.TWITTER_CLIENT_SECRET;

	if (!appKey || !appSecret) {
		console.error(
			"Missing TWITTER_CLIENT_ID or TWITTER_CLIENT_SECRET environment variables.",
		);
		return res.status(500).json({ error: "Server configuration error." });
	}

	const tempClient = new TwitterApi({
		appKey,
		appSecret,
		accessToken: oauth_token,
		accessSecret: tempSecret,
	});

	try {
		const { accessToken, accessSecret } =
			await tempClient.login(oauth_verifier);
		if (!accessToken || !accessSecret) {
			throw new Error("Login process did not return valid access tokens.");
		}

		const permanentClient = new TwitterApi({
			appKey,
			appSecret,
			accessToken,
			accessSecret,
		});
		const userDetails = await permanentClient.v1.verifyCredentials();
		const userTwitterId = userDetails.id_str;

		console.log(
			`[User: ${userTwitterId}] Verified credentials. Name: ${userDetails.name}, ScreenName: ${userDetails.screen_name}`,
		);

		if (!(await userExists(userTwitterId))) {
			console.log(`[User: ${userTwitterId}] Profile not found. Inserting...`);
			await insertUserProfile({
				id_str: userDetails.id_str,
				screen_name: userDetails.screen_name,
				name: userDetails.name,
				description: userDetails.description ?? "",
				location: userDetails.location ?? "",
				url: userDetails.url ?? "",
			});
			console.log(`[User: ${userTwitterId}] Inserted profile.`);
		} else {
			console.log(`[User: ${userTwitterId}] Profile already exists.`);
		}

		await storeUserAppAuthorization(
			userTwitterId,
			appKey,
			accessToken,
			accessSecret,
		);
		console.log(`[User: ${userTwitterId}] Stored auth for App ${appKey}`);

		res.setHeader("Set-Cookie", [
			"temp_oauth_secret=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0",
			`oauth_token=${accessToken}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=31536000`,
			`oauth_token_secret=${accessSecret}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=31536000`,
		]);

		res.redirect("/profile");
	} catch (error) {
		console.error("OAuth error during login:", error);
		if (error instanceof ApiResponseError) {
			return res.status(error.code === 401 ? 401 : 500).json({
				error: `OAuth failed (${error.code}): ${error.message}`,
				data: error.data,
			});
		}

		return res
			.status(500)
			.json({ error: "OAuth failed during token exchange" });
	}
}

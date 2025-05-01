/**
 * @license GPL-3.0
 * Copyright (C) 2024-2025 SilverHack3d <silverhack3d@gmail.com>
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { getOAuthClient } from "@/utils/oauth";
import { getProfileData } from "@/config";
import fs from "node:fs";
import path from "node:path";
import { initializeApp } from "@/lib/init";
import { getUserDetails, getDb, getUserRecord } from "@/utils/db";

export const config = {
	api: {
		bodyParser: {
			sizeLimit: "1mb",
		},
	},
};

async function insertUserRecord(
	userInfo: {
		id_str: string;
		screen_name: string;
		name: string;
		description: string;
		location: string;
		url: string;
	},
	token: string,
	tokenSecret: string,
) {
	const db = await getDb();
	const existingUser = await getUserRecord(userInfo.id_str);

	if (existingUser) {
		if (
			existingUser.oauth_token !== token ||
			existingUser.oauth_token_secret !== tokenSecret
		) {
			await db.query(
				`UPDATE profiles SET
				oauth_token = $1,
				oauth_token_secret = $2,
				screen_name = $3,
				name = $4,
				description = $5,
				location = $6,
				url = $7
				WHERE twitter_id = $8`,
				[
					token,
					tokenSecret,
					userInfo.screen_name,
					userInfo.name,
					userInfo.description,
					userInfo.location,
					userInfo.url,
					userInfo.id_str,
				],
			);
		}

		const countResult = await db.query(
			"SELECT user_count FROM profiles WHERE twitter_id = $1",
			[userInfo.id_str],
		);
		if (countResult.rows.length === 0) {
			throw new Error("User not found in database");
		}

		return {
			existed: true,
			number: Number.parseInt(countResult.rows[0].user_count),
		};
	}

	const countResult = await db.query("SELECT COUNT(*) as count FROM profiles");
	const count = Number.parseInt(countResult.rows[0].count);

	await db.query(
		`INSERT INTO profiles (
			oauth_token,
			oauth_token_secret,
			twitter_id,
			screen_name,
			name,
			description,
			location,
			url,
			user_count
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		[
			token,
			tokenSecret,
			userInfo.id_str,
			userInfo.screen_name,
			userInfo.name,
			userInfo.description,
			userInfo.location,
			userInfo.url,
			count + 1,
		],
	);

	return { existed: false, number: count + 1 };
}

async function deleteUserRecord(twitterId: string) {
	const db = await getDb();
	await db.query("DELETE FROM profiles WHERE twitter_id = $1", [twitterId]);
}

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	await initializeApp();

	if (req.method !== "POST")
		return res.status(405).json({ error: "Method not allowed" });

	const oauthToken = req.cookies?.oauth_token ?? req.body?.oauth_token;
	const oauthTokenSecret =
		req.cookies?.oauth_token_secret ?? req.body?.oauth_token_secret;

	if (!oauthToken || !oauthTokenSecret)
		return res.status(401).json({
			error: "Cookies with oauth tokens do not exist. Try logging in first.",
		});

	try {
		const oauth = getOAuthClient();

		try {
			const userInfo: {
				id_str: string;
				screen_name: string;
				name: string;
				description: string;
				location: string;
				url: string;
			} = await getUserDetails(oauth, oauthToken, oauthTokenSecret);
			const count = await insertUserRecord(
				userInfo,
				oauthToken,
				oauthTokenSecret,
			);
			const profileData = await getProfileData(count.number);

			try {
				await new Promise((resolve, reject) => {
					oauth.post(
						"https://api.twitter.com/1.1/account/update_profile.json",
						oauthToken,
						oauthTokenSecret,
						profileData,
						"application/x-www-form-urlencoded",
						(error) => {
							if (error) reject(error);
							else resolve(null);
						},
					);
				});

				const avatarPath = path.join(process.cwd(), "public", "avatar.png");
				if (fs.existsSync(avatarPath)) {
					const base64Image = fs.readFileSync(avatarPath, {
						encoding: "base64",
					});
					await new Promise((resolve, reject) => {
						oauth.post(
							"https://api.twitter.com/1.1/account/update_profile_image.json?skip_status=true",
							oauthToken,
							oauthTokenSecret,
							{ image: base64Image },
							"application/x-www-form-urlencoded",
							(error) => {
								if (error) reject(error);
								else resolve(null);
							},
						);
					});
				}

				const bannerPath = path.join(process.cwd(), "public", "banner.png");
				if (fs.existsSync(bannerPath)) {
					const base64Banner = fs.readFileSync(bannerPath, {
						encoding: "base64",
					});
					await new Promise((resolve, reject) => {
						oauth.post(
							"https://api.twitter.com/1.1/account/update_profile_banner.json",
							oauthToken,
							oauthTokenSecret,
							{
								banner: base64Banner,
								width: "1500",
								height: "500",
								offset_left: "0",
								offset_top: "0",
							},
							"application/x-www-form-urlencoded",
							(error) => {
								if (error) reject(error);
								else resolve(null);
							},
						);
					});
				}

				// Add small delay to allow Twitter to process updates
				await new Promise((resolve) => setTimeout(resolve, 1000));

				res.status(200).json({ success: true, existed: count.existed });
			} catch (error) {
				await deleteUserRecord(userInfo.id_str);
				console.error("Profile update error:", error);
				res.status(500).json({
					error: "Failed to update profile",
					details:
						error instanceof Error
							? error.message
							: JSON.parse(error as string),
				});
			}
		} catch (err) {
			console.error("OAuth error:", err);

			try {
				if (
					err &&
					typeof err === "object" &&
					"data" in err &&
					typeof err.data === "string"
				) {
					try {
						const json = JSON.parse(err.data);
						if (json?.errors?.[0]?.message?.includes("Invalid or expired")) {
							res.setHeader("Set-Cookie", [
								"oauth_token=; Path=/; HttpOnly; Secure; Max-Age=0",
								"oauth_token_secret=; Path=/; HttpOnly; Secure; Max-Age=0",
							]);
							return res.redirect("/");
						}
					} catch (parseError) {
						console.error("Error parsing OAuth error response:", parseError);
					}
				}

				if (err && typeof err === "object" && "statusCode" in err) {
					console.error("Status code in error:", err.statusCode);

					if (err.statusCode === 401 || err.statusCode === 403) {
						res.setHeader("Set-Cookie", [
							"oauth_token=; Path=/; HttpOnly; Secure; Max-Age=0",
							"oauth_token_secret=; Path=/; HttpOnly; Secure; Max-Age=0",
						]);
						return res.redirect("/");
					}
				}
			} catch (handlingError) {
				console.error("Error while handling OAuth error:", handlingError);
			}

			return res.status(500).json({
				error: "Failed to get OAuth client",
				message: err instanceof Error ? err.message : "Unknown error",
			});
		}
	} catch (error) {
		console.error("Fatal OAuth error:", error);
		return res.status(500).json({
			error: "Failed to get OAuth client",
			message: error instanceof Error ? error.message : "Unknown error",
		});
	}
}

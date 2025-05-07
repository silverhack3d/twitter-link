/**
 * @license GPL-3.0
 * Copyright (C) 2024-2025 SilverHack3d <silverhack3d@gmail.com>
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { createAuthedClient } from "@/utils/oauth";
import { getXApiUserClientFromRequest } from "@/utils/oauth";
import { getUserRecord, getAllUserAppAuthorizations } from "@/utils/db";
import { ApiResponseError, type SendTweetV2Params } from "twitter-api-v2";
import { getProfileData } from "@/config";
import fs from "node:fs";
import path from "node:path";
import { initializeApp } from "@/lib/init";

export const config = {
	api: {
		bodyParser: {
			sizeLimit: "1mb",
		},
	},
};

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	await initializeApp();

	if (req.method !== "POST")
		return res.status(405).json({ error: "Method Not Allowed" });

	let userTwitterId: string | undefined;

	try {
		const primaryClient = getXApiUserClientFromRequest(req);
		if (!primaryClient) {
			return res.status(401).json({
				error: "Failed to initialize primary Twitter client from request",
			});
		}

		const verifiedUser = await primaryClient.v1.verifyCredentials();
		userTwitterId = verifiedUser.id_str;
		if (!userTwitterId)
			throw new Error("User ID not found from v1.verifyCredentials()");

		console.log(
			`[User: ${userTwitterId}] Verified primary credentials. Name: ${verifiedUser.name}, ScreenName: ${verifiedUser.screen_name}`,
		);

		const userRecord = await getUserRecord(userTwitterId);
		if (!userRecord) {
			console.error(
				`[User: ${userTwitterId}] User record not found in database.`,
			);
			return res.status(404).json({ error: "User record not found" });
		}

		const userAppAuthorizations =
			await getAllUserAppAuthorizations(userTwitterId);
		if (!userAppAuthorizations || userAppAuthorizations.length === 0) {
			return res.status(401).json({
				error: "User has not authorized any applications for profile updates.",
			});
		}

		console.log(
			`[User: ${userTwitterId}] There is ${userAppAuthorizations.length} app authorizations.`,
		);

		const firstAuth = userAppAuthorizations[0];
		const profileUpdateClient = createAuthedClient(
			firstAuth.app_client_id,
			firstAuth.oauth_token,
			firstAuth.oauth_token_secret,
		);

		if (!profileUpdateClient) {
			console.error(
				`[User: ${userTwitterId}] Failed to create client for profile update using app ${firstAuth.app_client_id}`,
			);
			return res.status(500).json({
				error: "Failed to create authenticated client for profile update",
			});
		}
		console.log(
			`[User: ${userTwitterId}] Using App ${firstAuth.app_client_id} for profile metadata updates`,
		);

		const profileData = await getProfileData(userRecord.user_count);
		console.log(
			`[User: ${userTwitterId}] Fetched profile configuration for count ${userRecord.user_count}`,
		);

		try {
			await profileUpdateClient.v1.updateAccountProfile({
				name: profileData.name,
				url: profileData.url,
				description: profileData.description,
				location: profileData.location,
			});
			console.log(`[User: ${userTwitterId}] Profile updated successfully`);
		} catch (error) {
			console.error(
				`[User: ${userTwitterId}] Failed to update profile metadata. Probably a rate limit error`,
				error,
			);
		}

		const avatarPath = path.join(process.cwd(), "public", "avatar.png");
		if (fs.existsSync(avatarPath)) {
			try {
				const avatarBuffer = fs.readFileSync(avatarPath);
				await profileUpdateClient.v1.updateAccountProfileImage(avatarBuffer, {
					skip_status: true,
				});
				console.log(
					`[User: ${userTwitterId}] Profile image updated successfully`,
				);
			} catch (error) {
				console.error(
					`[User: ${userTwitterId}] Failed to update profile image:`,
					error,
				);
			}
		}

		const bannerPath = path.join(process.cwd(), "public", "banner.png");
		if (fs.existsSync(bannerPath)) {
			try {
				const bannerBuffer = fs.readFileSync(bannerPath);
				await profileUpdateClient.v1.updateAccountProfileBanner(bannerBuffer, {
					width: 1500,
					height: 500,
					offset_left: 0,
					offset_top: 0,
				});
				console.log(
					`[User: ${userTwitterId}] Profile banner updated successfully`,
				);
			} catch (error) {
				console.error(
					`[User: ${userTwitterId}] Failed to update profile banner:`,
					error,
				);
			}
		}
		let tweetId = null;

		for (const auth of userAppAuthorizations) {
			console.log(
				`[User: ${userTwitterId}] Attempting to tweet with App ${auth.app_client_id}`,
			);

			const tweetClient = createAuthedClient(
				auth.app_client_id,
				auth.oauth_token,
				auth.oauth_token_secret,
			);

			if (!tweetClient) {
				console.warn(
					`[User: ${userTwitterId}] Failed to create tweet client for App ${auth.app_client_id}. Skipping`,
				);
				continue;
			}

			let authenticatedUserId: string | undefined;
			try {
				const { data: me } = await tweetClient.v2.me();
				authenticatedUserId = me.id;
				if (!authenticatedUserId) {
					console.error(
						`[User: ${userTwitterId}] Authenticated user ID not found from v2.me()`,
					);
					return res.status(401).json({
						error: "Authenticated user ID not found from v2.me()",
					});
				}
			} catch (error) {
				console.error(
					`[User: ${userTwitterId}] Failed to get user ID for client ${auth.app_client_id}:`,
					error,
				);
				continue;
			}

			try {
				let mediaId: string | null = null;

				if (profileData.tweetImage) {
					const imagePath = path.join(
						process.cwd(),
						"public",
						profileData.tweetImage,
					);
					if (fs.existsSync(imagePath)) {
						try {
							const imageBuffer = fs.readFileSync(imagePath);
							console.log(
								`[User: ${userTwitterId}] Uploading media: ${profileData.tweetImage} for App ${auth.app_client_id}`,
							);
							mediaId = await tweetClient.v1.uploadMedia(imageBuffer, {
								mimeType: "image/png",
							});
							console.log(
								`[User: ${userTwitterId}] Media uploaded successfully for App ${auth.app_client_id}: ${mediaId}`,
							);
						} catch (uploadError) {
							console.error(
								`[User: ${userTwitterId}] Attempt failed to upload media ${profileData.tweetImage} for App ${auth.app_client_id}:`,
								uploadError,
							);
							mediaId = null;
						}
					} else {
						console.warn(
							`[User: ${userTwitterId}] Tweet image not found at ${imagePath}. Posting tweet without image for App ${auth.app_client_id}.`,
						);
					}
				}

				if (profileData.tweetText) {
					console.log(
						`[User: ${userTwitterId}] Posting tweet for App ${auth.app_client_id}: "${profileData.tweetText}" ${mediaId ? `with media ${mediaId}` : ""}`,
					);
					const tweetPayload: SendTweetV2Params = {
						text: profileData.tweetText,
					};

					if (mediaId) tweetPayload.media = { media_ids: [mediaId] };
					const tweetResult = await tweetClient.v2.tweet(tweetPayload);

					console.log(
						`[User: ${userTwitterId}] Tweet posted successfully for App ${auth.app_client_id}: ID ${tweetResult.data.id}`,
					);
					tweetId = tweetResult.data.id;
					break;
				}
			} catch (tweetError) {
				if (tweetError instanceof ApiResponseError) {
					console.error(
						`[User: ${userTwitterId}] Tweet failed with App ${auth.app_client_id}: API Error ${tweetError.code} - ${tweetError.message}`,
					);
					if (tweetError.code === 429) {
						console.log(
							`[User: ${userTwitterId}] Rate limit hit for App ${auth.app_client_id}. Trying next app`,
						);
					} else if (tweetError.code === 401 || tweetError.code === 403) {
						console.warn(
							`[User: ${userTwitterId}] Authorization error for App ${auth.app_client_id}. Token might be revoked. Trying next app`,
						);
					} else {
						console.error(
							`[User: ${userTwitterId}] Unhandled API Error (${tweetError.code}) for App ${auth.app_client_id}. Trying next app`,
						);
					}
				} else {
					console.error(
						`[User: ${userTwitterId}] Tweet failed with App ${auth.app_client_id} - Non-API error:`,
						tweetError,
					);
				}
			}

			if (
				profileData.retweetIds &&
				profileData.retweetIds.length > 0 &&
				authenticatedUserId
			) {
				console.log(
					`[User: ${userTwitterId}] Attempting to retweet ${profileData.retweetIds.length} tweet(s) for App ${auth.app_client_id}...`,
				);
				for (const tweetIdToRetweet of profileData.retweetIds) {
					try {
						console.log(
							`[User: ${userTwitterId}] Retweeting tweet ID: ${tweetIdToRetweet} for App ${auth.app_client_id}`,
						);
						const retweetResult = await tweetClient.v2.retweet(
							authenticatedUserId,
							tweetIdToRetweet,
						);
						if (retweetResult.data.retweeted) {
							console.log(
								`[User: ${userTwitterId}] Successfully retweeted ${tweetIdToRetweet} for App ${auth.app_client_id}`,
							);
						} else {
							console.warn(
								`[User: ${userTwitterId}] Retweet action for ${tweetIdToRetweet} (App ${auth.app_client_id}) completed, but 'retweeted' flag is false. Probably already retweeted`,
							);
						}
					} catch (retweetError) {
						console.error(
							`[User: ${userTwitterId}] Failed to retweet ${tweetIdToRetweet} for App ${auth.app_client_id}:`,
							retweetError,
						);
					}
				}
			} else {
				if (!profileData.retweetIds || profileData.retweetIds.length === 0) {
					console.log(
						`[User: ${userTwitterId}] No retweet IDs specified for this profile configuration`,
					);
				} else if (!authenticatedUserId) {
					console.log(
						`[User: ${userTwitterId}] Skipping retweets because authenticated user ID could not be obtained`,
					);
				}
			}
		}

		res.status(200).json({
			message: "Profile updated successfully",
			profile: profileData,
			tweetId,
		});
	} catch (error) {
		if (userTwitterId) {
			console.error(`[User: ${userTwitterId}] Profile update error:`, error);
		} else {
			console.error(
				"Profile update error (User ID not determined before error):",
				error,
			);
		}

		if (error instanceof ApiResponseError) {
			let httpStatus = 500;
			if (
				error.code === 401 ||
				error.code === 403 ||
				error.code === 89 ||
				error.code === 32
			)
				httpStatus = 401;
			else if (error.code === 429 || error.code === 88) httpStatus = 429;
			else if (error.code === 187) httpStatus = 403;

			console.error("Twitter API Error:", {
				apiCode: error.code,
				message: error.message,
				data: error.data,
			});
			return res.status(httpStatus).json({
				error: `Twitter API Error during profile update (${error.code}): ${error.message}`,
			});
		}

		return res.status(500).json({
			error: "Failed to update profile due to an internal server error",
		});
	}
}

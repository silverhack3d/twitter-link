/**
 * @license GPL-3.0
 * Copyright (C) 2024-2025 SilverHack3d <silverhack3d@gmail.com>
 */

import { TwitterApi } from "twitter-api-v2";
import type { NextApiRequest } from "next";

interface XApiUserCredentials {
	clientId: string;
	clientSecret: string;
}

let userCredentials: XApiUserCredentials[] = [];
try {
	const credsEnv = process.env.TWITTER_API_CREDENTIALS;
	if (credsEnv) {
		userCredentials = JSON.parse(credsEnv);
		if (
			!Array.isArray(userCredentials) ||
			userCredentials.some((c) => !c.clientId || !c.clientSecret)
		) {
			console.error(
				'X_API_CREDENTIALS is not a valid JSON array of {clientId, clientSecret} objects. Structure: \'[{"clientId": "ID1", "clientSecret": "SECRET1"}, ...]\' ',
			);
			userCredentials = [];
		}
	}
} catch (error) {
	console.error("Error parsing X_API_CREDENTIALS:", error);
	userCredentials = [];
}

if (userCredentials.length === 0) {
	console.warn(
		"X_API_CREDENTIALS environment variable is missing. X API v2 features will not work.",
	);
}

function getAppCredentialsById(
	clientId: string,
): XApiUserCredentials | undefined {
	return userCredentials.find((cred) => cred.clientId === clientId);
}

export function getAvailableAppClientIds(): string[] {
	return userCredentials.map((cred) => cred.clientId);
}

const CALLBACK_URL = `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback`;

export async function generateAuthLink(appClientId: string): Promise<{
	url: string;
	oauth_token: string;
	oauth_token_secret: string;
} | null> {
	const appCreds = getAppCredentialsById(appClientId);

	if (!appCreds) {
		console.error(
			`Cannot generate auth link: No app credentials found for clientId: ${appClientId}. Check X_API_CREDENTIALS.`,
		);
		return null;
	}

	const client = new TwitterApi({
		appKey: appCreds.clientId,
		appSecret: appCreds.clientSecret,
	});

	try {
		const authLink = await client.generateAuthLink(CALLBACK_URL, {
			linkMode: "authorize",
		});
		return authLink;
	} catch (error) {
		console.error("Error generating auth link:", error);
		return null;
	}
}

export function createAuthedClient(
	appClientId: string,
	userAccessToken: string,
	userAccessSecret: string,
): TwitterApi | null {
	const appCreds = getAppCredentialsById(appClientId);
	if (!appCreds) {
		console.error(
			`Cannot create authenticated client: No app credentials found for clientId: ${appClientId}. Check X_API_CREDENTIALS.`,
		);
		return null;
	}

	return new TwitterApi({
		appKey: appCreds.clientId,
		appSecret: appCreds.clientSecret,
		accessToken: userAccessToken,
		accessSecret: userAccessSecret,
	});
}

export function getXApiUserClientFromRequest(
	req: NextApiRequest,
): TwitterApi | null {
	const { oauth_token: accessToken, oauth_token_secret: accessSecret } =
		req.cookies;
	const appKey = process.env.TWITTER_CLIENT_ID;
	const appSecret = process.env.TWITTER_CLIENT_SECRET;

	if (!accessToken || !accessSecret) {
		console.error(
			"getXApiUserClientFromRequest: Missing user access token or secret in request cookies.",
		);
		return null;
	}
	if (!appKey || !appSecret) {
		console.error(
			"getXApiUserClientFromRequest: Missing TWITTER_CLIENT_ID or TWITTER_CLIENT_SECRET in environment variables.",
		);
		return null;
	}

	try {
		const client = new TwitterApi({
			appKey,
			appSecret,
			accessToken,
			accessSecret,
		});
		console.log(
			"getXApiUserClientFromRequest: Successfully created client from request tokens.",
		);
		return client;
	} catch (error) {
		console.error(
			"getXApiUserClientFromRequest: Error initializing client from request tokens:",
			error,
		);
		return null;
	}
}

/**
 * @license GPL-3.0
 * Copyright (C) 2024-2025 SilverHack3d <silverhack3d@gmail.com>
 */

import { Pool } from "pg";
import type { TwitterApi, UserV1 } from "twitter-api-v2";

export interface UserAppAuthorization {
	id: number;
	user_twitter_id: string;
	app_client_id: string;
	oauth_token: string;
	oauth_token_secret: string;
	created_at: Date;
	updated_at: Date;
}

const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
	ssl: {
		rejectUnauthorized: false,
	},
});

export async function getDb() {
	return pool;
}

export async function initDb() {
	const db = await getDb();
	await db.query(`
        CREATE TABLE IF NOT EXISTS profiles (
            id SERIAL PRIMARY KEY,
            twitter_id TEXT,
            screen_name TEXT,
            name TEXT,
            description TEXT,
            location TEXT,
            url TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            user_count INTEGER NOT NULL,
						updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
						posted_tweet_ids JSONB DEFAULT '[]'::jsonb
        )
    `);
	await db.query(`
        CREATE TABLE IF NOT EXISTS user_app_authorizations (
            id SERIAL PRIMARY KEY,
            user_twitter_id TEXT NOT NULL,
            app_client_id TEXT NOT NULL,
            oauth_token TEXT NOT NULL,
            oauth_token_secret TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (user_twitter_id, app_client_id)
        )
    `);
}

export async function userExists(twitterId: string): Promise<boolean> {
	const db = await getDb();
	const result = await db.query(
		"SELECT COUNT(*) as count FROM profiles WHERE twitter_id = $1",
		[twitterId],
	);
	return Number.parseInt(result.rows[0].count) > 0;
}

interface TwitterUserDetailsV1 {
	id_str: string;
	screen_name: string;
	name: string;
	description: string;
	location: string;
	url: string | null;
}

export async function getUserDetails(
	client: TwitterApi,
): Promise<TwitterUserDetailsV1> {
	try {
		const user: UserV1 = await client.v1.verifyCredentials();

		return {
			id_str: user.id_str,
			screen_name: user.screen_name,
			name: user.name,
			description: user.description ?? "",
			location: user.location ?? "",
			url: user.url ?? "",
		};
	} catch (error) {
		console.error("Error verifying credentials:", error);
		throw error;
	}
}

export async function getUserRecord(twitterId: string) {
	const db = await getDb();
	const result = await db.query(
		"SELECT user_count FROM profiles WHERE twitter_id = $1",
		[twitterId],
	);
	return result.rows[0];
}

export async function insertUserProfile(userInfo: TwitterUserDetailsV1) {
	const db = await getDb();

	const countResult = await db.query("SELECT COUNT(*) as total FROM profiles");
	const nextUserCount = Number.parseInt(countResult.rows[0].total || "0") + 1;

	await db.query(
		`
		INSERT INTO profiles (
			screen_name,
			name,
			description,
			location,
			url,
			user_count,
			twitter_id,
			posted_tweet_ids
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`,
		[
			userInfo.screen_name,
			userInfo.name,
			userInfo.description,
			userInfo.location,
			userInfo.url,
			nextUserCount,
			userInfo.id_str,
			"[]",
		],
	);
}

export async function storeUserAppAuthorization(
	userTwitterId: string,
	appClientId: string,
	oauthToken: string,
	oauthTokenSecret: string,
): Promise<void> {
	const db = await getDb();
	await db.query(
		`
		INSERT INTO user_app_authorizations (user_twitter_id, app_client_id, oauth_token, oauth_token_secret)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (user_twitter_id, app_client_id)
		DO UPDATE SET
			oauth_token = EXCLUDED.oauth_token,
			oauth_token_secret = EXCLUDED.oauth_token_secret,
			updated_at = NOW();
	`,
		[userTwitterId, appClientId, oauthToken, oauthTokenSecret],
	);
}

export async function getUserAppAuthorization(
	userTwitterId: string,
	appClientId: string,
): Promise<UserAppAuthorization | null> {
	const db = await getDb();
	const result = await db.query<UserAppAuthorization>(
		"SELECT * FROM user_app_authorizations WHERE user_twitter_id = $1 AND app_client_id = $2",
		[userTwitterId, appClientId],
	);
	return result.rows[0] || null;
}

export async function getAllUserAppAuthorizations(
	userTwitterId: string,
): Promise<UserAppAuthorization[]> {
	const db = await getDb();
	const result = await db.query<UserAppAuthorization>(
		"SELECT * FROM user_app_authorizations WHERE user_twitter_id = $1 ORDER BY updated_at DESC",
		[userTwitterId],
	);
	return result.rows;
}

export async function updateUserRecord(userInfo: TwitterUserDetailsV1) {
	const db = await getDb();
	await db.query(
		`
		UPDATE profiles
		SET
			screen_name = $1,
			name = $2,
			description = $3,
			location = $4,
			url = $5
		WHERE twitter_id = $6
	`,
		[
			userInfo.screen_name,
			userInfo.name,
			userInfo.description,
			userInfo.location,
			userInfo.url ?? "",
			userInfo.id_str,
		],
	);
}

export async function addPostedTweetId(
	twitterId: string,
	tweetId: string,
): Promise<void> {
	const db = await getDb();

	const result = await db.query(
		"SELECT posted_tweet_ids FROM profiles WHERE twitter_id = $1",
		[twitterId],
	);
	const postedTweets = [...result.rows[0].posted_tweet_ids, tweetId];
	await db.query(
		`
		UPDATE profiles
		SET posted_tweet_ids = $1
		WHERE twitter_id = $2`,
		[postedTweets, twitterId],
	);
}

export async function getPostedTweetIds(twitterId: string): Promise<string[]> {
	const db = await getDb();
	const result = await db.query(
		"SELECT posted_tweet_ids FROM profiles WHERE twitter_id = $1",
		[twitterId],
	);
	return result.rows[0].posted_tweet_ids;
}

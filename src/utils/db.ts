/**
 * @license GPL-3.0
 * Copyright (C) 2024-2025 SilverHack3d <silverhack3d@gmail.com>
 */

import { Pool } from "pg";
import type { OAuth } from "oauth";

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
            oauth_token TEXT NOT NULL,
            oauth_token_secret TEXT NOT NULL,
            twitter_id TEXT,
            screen_name TEXT,
            name TEXT,
            description TEXT,
            location TEXT,
            url TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            user_count INTEGER NOT NULL,
						updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
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

export async function getUserDetails(
	oauth: OAuth,
	token: string,
	tokenSecret: string,
) {
	return new Promise<{
		id_str: string;
		screen_name: string;
		name: string;
		description: string;
		location: string;
		url: string;
	}>((resolve, reject) => {
		oauth.get(
			"https://api.twitter.com/1.1/account/verify_credentials.json",
			token,
			tokenSecret,
			(error: unknown, data: unknown) => {
				if (error) reject(error);
				else resolve(JSON.parse(data as string));
			},
		);
	});
}

export async function getUserRecord(twitterId: string) {
	const db = await getDb();
	const result = await db.query(
		"SELECT oauth_token, oauth_token_secret FROM profiles WHERE twitter_id = $1",
		[twitterId],
	);
	return result.rows[0];
}

/**
 * @license GPL-3.0
 * Copyright (C) 2024-2025 SilverHack3d <silverhack3d@gmail.com>
 */

import type { GetServerSideProps } from "next";
import { TwitterApi, ApiResponseError } from "twitter-api-v2";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home({
	oauthUrl,
	error,
}: { oauthUrl?: string; error?: string }) {
	const [isHovered, setIsHovered] = useState(false);
	const router = useRouter();

	const handleRedirect = () => {
		if (oauthUrl) router.push(oauthUrl);
	};

	return (
		<div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-gray-100 p-4">
			{error ? (
				<div className="text-center text-lg font-bold text-red-600">
					{error}
				</div>
			) : (
				<button
					type="button"
					onClick={handleRedirect}
					onMouseEnter={() => setIsHovered(true)}
					onMouseLeave={() => setIsHovered(false)}
					className={`cursor-pointer rounded-full border-none px-5 py-2.5 text-base font-bold text-white transition-colors duration-200 ${isHovered ? "bg-sky-600" : "bg-sky-500"}`}
				>
					Connect Twitter
				</button>
			)}
		</div>
	);
}

export const getServerSideProps: GetServerSideProps = async (context) => {
	const { oauth_token: permanent_oauth_token } = context.req.cookies;
	if (permanent_oauth_token)
		return { redirect: { destination: "/profile", permanent: false } };

	const appKey = process.env.TWITTER_CLIENT_ID;
	const appSecret = process.env.TWITTER_CLIENT_SECRET;

	if (!appKey || !appSecret) {
		console.error(
			"Index page Error: Missing TWITTER_CLIENT_ID or TWITTER_CLIENT_SECRET environment variables.",
		);
		return { props: { error: "Server configuration error." } };
	}

	const twitterClient = new TwitterApi({ appKey, appSecret });

	const callbackUrl = process.env.NEXT_PUBLIC_BASE_URL
		? `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback`
		: "http://localhost:3000/api/auth/callback";

	try {
		const { url, oauth_token_secret } = await twitterClient.generateAuthLink(
			callbackUrl,
			{ linkMode: "authorize" },
		);

		context.res.setHeader(
			"Set-Cookie",
			`temp_oauth_secret=${oauth_token_secret}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=900`,
		);

		return { props: { oauthUrl: url } };
	} catch (error) {
		console.error("Error generating Twitter auth link:", error);
		if (error instanceof ApiResponseError) {
			return {
				props: { error: `Auth failed (${error.code}): ${error.message}` },
			};
		}

		return {
			props: {
				error: "Failed to generate Twitter auth link due to server error.",
			},
		};
	}
};

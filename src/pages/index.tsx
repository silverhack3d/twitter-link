/**
 * @license GPL-3.0
 * Copyright (C) 2024-2025 SilverHack3d <silverhack3d@gmail.com>
 */

import type { GetServerSideProps } from "next";
import { getOAuthClient } from "@/utils/oauth";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home({
	oauthUrl,
	error,
}: { oauthUrl?: string; error?: string }) {
	const [isHovered, setIsHovered] = useState(false);
	const router = useRouter();

	const handleRedirect = () => {
		if (oauthUrl) {
			router.push(oauthUrl);
		}
	};

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				justifyContent: "center",
				alignItems: "center",
				height: "100vh",
				gap: "20px",
			}}
		>
			{error ? (
				<div
					style={{
						color: "red",
						fontWeight: "bold",
						fontSize: "18px",
						textAlign: "center",
					}}
				>
					{error}
				</div>
			) : (
				<button
					type="button"
					onClick={handleRedirect}
					onMouseEnter={() => setIsHovered(true)}
					onMouseLeave={() => setIsHovered(false)}
					style={{
						padding: "10px 20px",
						cursor: "pointer",
						backgroundColor: isHovered ? "#1a91da" : "#1DA1F2",
						color: "white",
						border: "none",
						borderRadius: "20px",
						fontSize: "16px",
						fontWeight: "bold",
						transition: "background-color 0.2s",
					}}
				>
					Connect Twitter
				</button>
			)}
		</div>
	);
}

export const getServerSideProps: GetServerSideProps = async (context) => {
	const { oauth_token } = context.req.cookies;
	if (oauth_token) {
		return {
			redirect: {
				destination: "/profile",
				permanent: false,
			},
		};
	}
	const oauth = getOAuthClient();
	return new Promise((resolve) => {
		oauth.getOAuthRequestToken((error, token, tokenSecret) => {
			if (error) {
				resolve({ props: { error: "Auth failed" } });
				return;
			}
			context.res.setHeader(
				"Set-Cookie",
				`temp_oauth_secret=${tokenSecret}; Path=/; HttpOnly; Secure; Max-Age=604800`,
			);

			resolve({
				props: {
					oauthUrl: `https://twitter.com/oauth/authorize?oauth_token=${token}`,
				},
			});
		});
	});
};

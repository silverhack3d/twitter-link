/**
 * @license GPL-3.0
 * Copyright (C) 2024-2025 SilverHack3d <silverhack3d@gmail.com>
 */

import { useEffect, useState } from "react";
import type { GetServerSideProps } from "next";
import { useRouter } from "next/navigation";

export default function Profile() {
	const [error, setError] = useState<string>();
	const [isHovered, setIsHovered] = useState(false);
	const router = useRouter();

	const handleLogout = async () => {
		await fetch("/api/auth/logout", { method: "POST" });
		router.replace("/");
	};

	useEffect(() => {
		fetch("/api/profile/update", { method: "POST" })
			.then(async (res) => {
				if (!res.ok) {
					const data = await res.json();
					setError(data.error || "cannot change profile rn. try later");
					console.error(data.error);
				}
			})
			.catch((error) => {
				setError("cannot change profile rn. try later");
				console.error(error);
			});
	}, []);

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
			<h1>{error || "Changes have been made, check it out~"}</h1>
			<button
				type="button"
				onClick={handleLogout}
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
				Logout
			</button>
		</div>
	);
}

export const getServerSideProps: GetServerSideProps = async (context) => {
	const { oauth_token } = context.req.cookies;

	if (!oauth_token) {
		return {
			redirect: {
				destination: "/",
				permanent: false,
			},
		};
	}

	return { props: {} };
};
